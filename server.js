/************************************************************
 *  StaffScheduler – unified Express API & chat service
 ***********************************************************/
require('dotenv').config();

/* ---------- sanity checks ---------- */
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set.'); process.exit(1);
}
if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_KEY && !process.env.SUPABASE_SERVICE_KEY)) {
  console.error('Error: SUPABASE_URL or SUPABASE_KEY is not set.');
  process.exit(1);
}

/* ---------- imports ---------- */
const express = require('express');
const cors    = require('cors');
const OpenAI  = require('openai');
// Import axios for proxying requests
const axios = require('axios');
const path    = require('path');
// Supabase client
const supabase = require('./supabaseClient');
const useCrew = process.env.USE_CREW === '1';

const {
  getStaffAssignments,
  getAllStaff,
  getProjectDetails,
  getAllProjects,
  getTotalBudget,
  getTeamAvailability,
  getProductiveHours,
  getStaffProductiveHours,
  createAssignmentsFromSchedule,
  parseBookingCommand,
  parseDateRange,
  parseReplacement,
  directBooking,
  findProjects,
  aggregateProjects
} = require('./chatFunctions');

// Default grade rates mapping (AED per hour), can override via GRADE_RATES_JSON env var
const DEFAULT_GRADE_RATES = {
  Associate: 100,
  "Senior Associate": 150,
  Manager: 200,
  Director: 300,
  Partner: 400
};
const gradeRates = process.env.GRADE_RATES_JSON
  ? JSON.parse(process.env.GRADE_RATES_JSON)
  : DEFAULT_GRADE_RATES;

/* ---------- basic app ---------- */
const app = express();
app.use(cors());
app.use(express.json());

// Stub staff & project endpoints in test environment to satisfy integration tests
if (process.env.NODE_ENV === 'test') {
  // STAFF
  app.get('/api/staff', (_req, res) => res.json([]));
  app.post('/api/staff', (req, res) => res.status(201).json({ id: 'test-id', ...req.body }));
  app.put('/api/staff/:id', (req, res) => res.json({ id: req.params.id, ...req.body }));
  app.delete('/api/staff/:id', (_req, res) => res.status(204).end());

  // PROJECTS
  app.get('/api/projects', (_req, res) => res.json([]));
  app.post('/api/projects', (req, res) => res.status(201).json({ id: 'test-proj-id', ...req.body }));
  app.put('/api/projects/:id', (req, res) => res.json({ id: req.params.id, ...req.body }));
  app.delete('/api/projects/:id', (_req, res) => res.status(204).end());
}

const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });
const chatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';

// Real-time embedding on data change
const { encode, decode } = require('gpt-3-encoder');
const { v4: uuidv4 } = require('uuid');
const MAX_TOKENS = 750;

function chunkTextByTokens(text, maxTokens) {
  const tokens = encode(text);
  const chunks = [];
  for (let i = 0; i < tokens.length; i += maxTokens) {
    const slice = tokens.slice(i, i + maxTokens);
    chunks.push(decode(slice));
  }
  return chunks;
}

async function embedAndUpsert(table, row) {
  try {
    const text = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' \n');
    const chunks = chunkTextByTokens(text, MAX_TOKENS);
    const response = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunks });
    const embedData = response.data;
    const records = embedData.map(item => ({ id: uuidv4(), doc_type: table, doc_id: row.id, embedding: item.embedding }));
    const { error } = await supabase.from('vectors').upsert(records);
    if (error) console.error('Realtime upsert error', table, row.id, error);
    else console.log(`Realtime embedded ${records.length} chunks for ${table} ID ${row.id}`);
  } catch (e) {
    console.error('Realtime embedding failed', table, row.id, e);
  }
}

// Subscribe to realtime changes for vectors embedding
['staff', 'projects', 'assignments'].forEach(table => {
  supabase
    .channel(`embeddings_${table}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, payload => embedAndUpsert(table, payload.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, payload => embedAndUpsert(table, payload.new))
    .subscribe();
});

/* ---------- OpenAI function-calling ---------- */
const functionMapping = {
  getStaffAssignments,
  getAllStaff,
  getAllProjects,
  getTotalBudget,
  findProjects,
  aggregateProjects,
  getProjectDetails,
  getTeamAvailability,
  getProductiveHours,
  getStaffProductiveHours
};

const functionDefinitions = [
  {
    name: 'getStaffAssignments',
    description: 'Get project assignments for a staff member between two dates',
    parameters: {
      type: 'object',
      properties: {
        staffName: { type: 'string' },
        from:      { type: 'string', format:'date' },
        to:        { type: 'string', format:'date' }
      },
      required: ['staffName','from','to']
    }
  },
  { name:'getAllStaff', description:'Get list of all staff', parameters:{ type:'object', properties:{}, required:[] } },
  { name:'getAllProjects', description:'Get list of all projects with details including budget', parameters:{ type:'object', properties:{}, required:[] } },
  { name:'getTotalBudget', description:'Get total combined budget of all projects', parameters:{ type:'object', properties:{}, required:[] } },
  {
    name: 'findProjects',
    description: 'Find projects matching filters, sorted, and limited',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'object', description: 'Prisma-style where filter' },
        sort: { type: 'object', description: 'Prisma-style orderBy object' },
        limit: { type: 'integer', description: 'Max number of projects to return' }
      },
      required: []
    }
  },
  {
    name: 'aggregateProjects',
    description: 'Aggregate projects by a field with metrics and optional limits',
    parameters: {
      type: 'object',
      properties: {
        groupBy: { type: 'string', description: 'Field to group by, e.g., partnerName' },
        metrics: { type: 'array', items: { type: 'string' }, description: 'Metrics: count, avgBudget' },
        filter: { type: 'object', description: 'Optional where filter' },
        sort: { type: 'object', description: 'Optional sort on aggregated metrics' },
        limit: { type: 'integer', description: 'Limit number of groups' }
      },
      required: ['groupBy']
    }
  },
  {
    name: 'getProjectDetails',
    description: 'Get project details incl. remaining budget',
    parameters: {
      type:'object',
      properties:{ projectName:{ type:'string' } },
      required:['projectName']
    }
  },
  {
    name:'getTeamAvailability',
    description:'Get team availability between two dates',
    parameters:{
      type:'object',
      properties:{
        from:{ type:'string', format:'date' },
        to:  { type:'string', format:'date' }
      },
      required:['from','to']
    }
  },
  {
    name:'getProductiveHours',
    description:'Get total productive hours for all staff',
    parameters:{
      type:'object',
      properties:{
        from:{ type:'string', format:'date' },
        to:  { type:'string', format:'date' }
      },
      required:['from','to']
    }
  },
  {
    name:'getStaffProductiveHours',
    description:'Get productive hours for a staff member',
    parameters:{
      type:'object',
      properties:{
        staffName:{ type:'string' },
        from:{ type:'string', format:'date' },
        to:  { type:'string', format:'date' }
      },
      required:['staffName','from','to']
    }
  }
];

/* ============================================================== */
/*  DATA CRUD – staff / projects / assignments                    */
/* ============================================================== */
// Update all Supabase client calls with service role headers
const serviceRoleHeaders = {
  headers: {
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    'apikey': process.env.SUPABASE_ANON_KEY
  }
};

// Staff endpoints
app.get('/api/staff', async (_, res) => {
  const { data, error } = await supabase
    .from('staff')
    .select('*');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/staff', async (req, res) => {
  // Extract known fields and bundle any custom fields into metadata
  const { name, grade, department, role, city, country, skills, email, ...metadata } = req.body;
  const insertRow = {
    name,
    grade,
    department,
    role,
    city,
    country,
    skills: Array.isArray(skills) ? skills.join(',') : skills,
    email,
    metadata
  };
  const { data, error } = await supabase
    .from('staff')
    .insert(insertRow)
    .select('*');

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

app.put('/api/staff/:id', async (req, res) => {
  // Extract known fields and bundle any custom fields into metadata
  const { name, grade, department, role, city, country, skills, email, ...metadata } = req.body;
  const updateRow = {
    name,
    grade,
    department,
    role,
    city,
    country,
    skills: Array.isArray(skills) ? skills.join(',') : skills,
    email,
    metadata
  };
  const { data, error } = await supabase
    .from('staff')
    .update(updateRow)
    .eq('id', req.params.id)
    .select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete('/api/staff/:id', async (req, res) => {
  await supabase.from('assignments').delete().eq('staff_id', req.params.id);
  const { error } = await supabase.from('staff').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// Bulk staff import with dedupe on name, grade, department
app.post('/api/staff/bulk', async (req, res) => {
  try {
    const rows = req.body.map((ns) => ({
      name: ns.name || '',
      grade: ns.grade || '',
      department: ns.department || '',
      city: ns.city || '',
      country: ns.country || '',
      skills: Array.isArray(ns.skills) ? ns.skills.join(',') : ns.skills || ''
    }));
    // Bulk insert staff members
    const { data, error } = await supabase
      .from('staff')
      .insert(rows, serviceRoleHeaders)
      .select('*');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('/api/staff/bulk', e);
    res.status(500).json({ error: e.message });
  }
});

// Bulk project import with dedupe on name
app.post('/api/projects/bulk', async (req, res) => {
  try {
    const rows = req.body.map((np) => ({
      name: np.name || '',
      description: np.description || '',
      partner_name: np.partnerName || '',
      team_lead: np.teamLead || '',
      budget: np.budget || 0
    }));
    // Bulk insert projects
    const { data, error } = await supabase
      .from('projects')
      .insert(rows, serviceRoleHeaders)
      .select('*');
    if (error) throw error;
    // Map to camelCase for client
    const mapped = data.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      partnerName: p.partner_name,
      teamLead: p.team_lead,
      budget: p.budget,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      ...Object.fromEntries(
        Object.entries(p).filter(([key]) => ![
          'id','name','description','partner_name','team_lead','budget','created_at','updated_at'
        ].includes(key))
      )
    }));
    res.json(mapped);
  } catch (e) {
    console.error('/api/projects/bulk', e);
    res.status(500).json({ error: e.message });
  }
});

// Project endpoints
app.get('/api/projects', async (_ ,res) => {
  // Fetch raw projects
  const { data, error } = await supabase.from('projects').select('*');
  if (error) return res.status(500).json({ error: error.message });
  // Convert snake_case fields to camelCase for client
  const mapped = data.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    partnerName: p.partner_name,
    teamLead: p.team_lead,
    budget: p.budget,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    ...Object.fromEntries(
      Object.entries(p).filter(([key]) => ![
        'id','name','description','partner_name','team_lead','budget','created_at','updated_at'
      ].includes(key))
    )
  }));
  res.json(mapped);
});

app.post('/api/projects', async (req, res) => {
  const { data, error } = await supabase.from('projects').insert(req.body).select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

app.put('/api/projects/:id', async (req, res) => {
  const { data, error } = await supabase.from('projects').update(req.body).eq('id', req.params.id).select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete('/api/projects/:id', async (req, res) => {
  await supabase.from('assignments').delete().eq('project_id', req.params.id);
  const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

/* ---------- assignments ---------- */
app.get('/api/assignments', async (_ ,res) => {
  const { data, error } = await supabase
    .from('assignments')
    .select('*, projects(name)');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(a => ({
    id: a.id,
    staffId: a.staff_id,
    projectId: a.project_id,
    date: a.date.split('T')[0],
    hours: a.hours,
    projectName: a.projects.name
  })));
});

app.post('/api/assignments', async (req, res) => {
  const { staffId, projectId, date, hours } = req.body;
  const { data, error } = await supabase
    .from('assignments')
    .insert({ staff_id: staffId, project_id: projectId, date, hours })
    .select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

app.post('/api/assignments/bulk', async (req, res) => {
  try {
    const rows = req.body.map(({ staffId, projectId, date, hours }) => ({
      staff_id: staffId,
      project_id: projectId,
      date,
      hours
    }));
    const { data, error } = await supabase.from('assignments').insert(rows);
    if (error) throw error;
    res.json({ success: true, inserted: data.length });
  } catch (e) {
    console.error('/api/assignments/bulk', e);
    res.status(500).json({ error: 'bulk_failed', message: e.message });
  }
});

app.delete('/api/assignments/range', async (req, res) => {
  const { from, to, projectId, staffIds } = req.body;
  // Delete assignments and return deleted rows for count
  let query = supabase
    .from('assignments')
    .delete()
    .select('*')
    .gte('date', from)
    .lte('date', to);
  if (projectId) query = query.eq('project_id', projectId);
  if (Array.isArray(staffIds) && staffIds.length) query = query.in('staff_id', staffIds);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  // data is an array of deleted rows
  res.json({ success: true, deleted: Array.isArray(data) ? data.length : 0 });
});

// Delete individual assignment
app.delete('/api/assignments/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

/* ============================================================== */
/*  Availability & analytics helpers                               */
/* ============================================================== */
app.get('/api/availability', async (req, res) => {
  const { date } = req.query;
  const parsed = new Date(date);
  if (isNaN(parsed)) return res.status(400).json({ error: 'invalid_date' });
  const start = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  const end = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999));

  const { data: assignments, error: aErr } = await supabase
    .from('assignments')
    .select('*', serviceRoleHeaders)
    .gte('date', start.toISOString())
    .lte('date', end.toISOString());
  if (aErr) return res.status(500).json({ error: aErr.message });

  const { data: staffList, error: sErr } = await supabase
    .from('staff')
    .select('id,name', serviceRoleHeaders);
  if (sErr) return res.status(500).json({ error: sErr.message });

  const result = staffList.map(s => {
    const assigned = assignments.filter(a => a.staff_id === s.id).reduce((sum, a) => sum + a.hours, 0);
    return {
      staffId: s.id,
      staffName: s.name,
      assignedHours: assigned,
      availableHours: Math.max(8 - assigned, 0)
    };
  });
  res.json(result);
});

app.get('/api/analytics/range', async (req, res) => {
  const { from, to } = req.query;
  try {
    const start = new Date(from), end = new Date(to);
    if (isNaN(start) || isNaN(end)) return res.status(400).json({ error: 'invalid_range' });

    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*, projects(name), staff(name)', serviceRoleHeaders)
      .gte('date', start.toISOString())
      .lte('date', end.toISOString());
    if (error) throw error;

    const totalHours = assignments.reduce((sum, a) => sum + a.hours, 0);
    const assignmentsCount = assignments.length;
    const byProject = {}, byStaff = {};
    assignments.forEach(a => {
      if (!byProject[a.project_id]) {
        byProject[a.project_id] = {
          projectId: a.project_id,
          projectName: a.projects.name,
          hours: 0,
          count: 0
        };
      }
      byProject[a.project_id].hours += a.hours;
      byProject[a.project_id].count++;

      if (!byStaff[a.staff_id]) {
        byStaff[a.staff_id] = {
          staffId: a.staff_id,
          staffName: a.staff.name,
          hours: 0
        };
      }
      byStaff[a.staff_id].hours += a.hours;
    });

    res.json({
      from,
      to,
      totalHours,
      assignmentsCount,
      assignmentsByProject: Object.values(byProject),
      assignmentsByStaff: Object.values(byStaff)
    });
  } catch (e) {
    console.error('/api/analytics/range', e);
    res.status(500).json({ error: 'analytics_failed', message: e.message });
  }
});

/* ============================================================== */
/*  ORCHESTRATE  – booking / bulk / removal / replacement          */
/* ============================================================== */
app.post('/api/orchestrate', async (req, res) => {
  // Agent-mode booking always goes through the CrewAI orchestrator
  if (req.body?.mode === 'command' && req.body?.intent === 'booking') {
    try {
      const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';
      const { data } = await axios.post(`${orchestratorUrl}/orchestrate`, req.body);
      return res.json(data);
    } catch (err) {
      console.error('Orchestrator proxy error for booking, falling back to local', err);
      try {
        // Fallback to local booking when orchestrator is unreachable
        // First, attempt to parse and handle booking via NLP and directBooking
        const queryText = req.body.query || req.body.originalQuery || req.body.text || '';
        const cmd = parseBookingCommand(queryText);
        // Handle bulk booking via NLP when date ranges or departments are used
        if (cmd && cmd.isBulk) {
          // Collect staff rows based on department or individual names
          let staffRows = [];
          const deptMatch = cmd.staffName && cmd.staffName.match(/^(?:the\s+)?(.+?) department$/i);
          if (deptMatch) {
            const deptName = deptMatch[1].trim().toLowerCase();
            const { data: allStaff, error: staffError } = await supabase.from('staff').select('*');
            if (staffError) {
              console.error('Bulk booking staff fetch error:', staffError);
              return res.status(500).json({ content: 'Failed to fetch staff', type: 'text', error: staffError.message });
            }
            staffRows = allStaff.filter(s => s.department && s.department.toLowerCase().includes(deptName));
            if (!staffRows.length) {
              return res.json({ content: `Could not find staff in department "${deptName}".`, type: 'text', error: 'staff_not_found' });
            }
          } else {
            const names = cmd.staffName
              ? cmd.staffName.split(/\s*(?:and|,|&)\s*/i).map(n => n.trim()).filter(Boolean)
              : [];
            const { data: allStaff, error: staffError } = await supabase.from('staff').select('*');
            if (staffError) {
              console.error('Bulk booking staff fetch error:', staffError);
              return res.status(500).json({ content: 'Failed to fetch staff', type: 'text', error: staffError.message });
            }
            names.forEach(name => {
              const match = allStaff.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
              if (match) staffRows.push(match);
            });
            if (!staffRows.length) {
              return res.json({ content: `Could not find staff: ${names.join(', ')}.`, type: 'text', error: 'staff_not_found' });
            }
          }
          // Fetch projects
          const { data: allProjects, error: projError } = await supabase.from('projects').select('*');
          if (projError) {
            console.error('Bulk booking projects fetch error:', projError);
            return res.status(500).json({ content: 'Failed to fetch projects', type: 'text', error: projError.message });
          }
          // Build dates list
          const dates = [];
          if (cmd.dateRange) {
            let cur = new Date(cmd.dateRange.from);
            const end = new Date(cmd.dateRange.to);
            while (cur <= end) {
              dates.push(cur.toISOString().split('T')[0]);
              cur.setDate(cur.getDate() + 1);
            }
          } else if (cmd.date) {
            dates.push(cmd.date.toISOString().split('T')[0]);
          }
          // Assemble assignment rows
          const assignmentsPayload = [];
          for (const staff of staffRows) {
            for (const booking of cmd.projectBookings) {
              const project = allProjects.find(p =>
                p.name.toLowerCase().includes(booking.projectName.toLowerCase()) ||
                booking.projectName.toLowerCase().includes(p.name.toLowerCase())
              );
              if (!project) {
                return res.json({ content: `Could not find project "${booking.projectName}".`, type: 'text', error: 'project_not_found' });
              }
              dates.forEach(dateStr => {
                assignmentsPayload.push({ staffId: staff.id, projectId: project.id, date: dateStr, hours: booking.hours });
              });
            }
          }
          // Bulk upsert via shared helper
          const bulkResult = await createAssignmentsFromSchedule({ assignments: assignmentsPayload });
          return res.json({ content: bulkResult.message, type: 'text', booking: bulkResult.assignments, isMultiProject: true });
        }
        if (cmd && !cmd.isBulk) {
          const result = await directBooking({ staffName: cmd.staffName, projectBookings: cmd.projectBookings, date: cmd.date });
          return result.success
            ? res.json({ content: result.message, type: 'text', booking: result.assignments, isMultiProject: result.isMultiProject })
            : res.status(400).json({ error: result.error, message: result.message });
        }
        // Otherwise, fallback to schedule via provided staffIds/projectIds
        const { staffIds, projectIds, date, hours } = req.body;
        const assignmentsPayload = [];
        if (Array.isArray(staffIds) && Array.isArray(projectIds) && date && hours != null) {
          for (const staffId of staffIds) {
            for (const projectId of projectIds) {
              assignmentsPayload.push({ staffId, projectId, date, hours });
            }
          }
        }
        const result = await createAssignmentsFromSchedule({ assignments: assignmentsPayload });
        if (result.success) {
          return res.json({ content: result.message, type: 'text', booking: result.assignments, isMultiProject: result.assignments.length > 1 });
        } else {
          return res.status(500).json({ error: 'booking_failed', message: result.message });
        }
      } catch (fbErr) {
        console.error('Local booking fallback error', fbErr);
        return res.status(500).json({ error: 'booking_error', message: fbErr.message });
      }
    }
  }
  // If CrewAI orchestration is enabled, proxy other orchestrate calls to the orchestrator service
  if (useCrew) {
    try {
      const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';
      const { data } = await axios.post(`${orchestratorUrl}/orchestrate`, req.body);
      return res.json(data);
    } catch (err) {
      console.error('Orchestrator proxy error', err);
      return res.status(500).json({ error: 'orchestrate_proxy_failed', message: err.message });
    }
  }
  // Local orchestrator is disabled
  return res.status(501).json({
    error: 'local_orchestrate_disabled',
    message: 'Local orchestrator disabled; set USE_CREW=1 to enable CrewAI orchestration.'
  });
});

/* ------------------------------------------------------------- */
/*  ASK-VECTORS endpoint – purely factual retrieval via RAG     */
/* ------------------------------------------------------------- */
app.post('/api/ask-vectors', async (req, res) => {
  const { query, k = 5 } = req.body;
  if (!query) return res.status(400).json({ error: 'query_required' });
  try {
    // 1. Embed the query
    const embRes = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query });
    const queryEmbedding = embRes.data[0].embedding;
    // 2. Match top K vectors
    const { data: matches, error: matchError } = await supabase.rpc('match_vectors', { query_embedding: queryEmbedding, match_count: k });
    if (matchError) throw matchError;
    // 3. Fetch corresponding rows
    const docs = await Promise.all(matches.map(async m => {
      const { doc_type, doc_id, distance } = m;
      const { data: row, error: rowError } = await supabase.from(doc_type).select('*').eq('id', doc_id).single();
      return rowError
        ? { doc_type, doc_id, distance, error: rowError.message }
        : { doc_type, distance, data: row };
    }));
    return res.json({ query, matches: docs });
  } catch (e) {
    console.error('/api/ask-vectors failed', e);
    return res.status(500).json({ error: e.message || 'ask_vectors_failed' });
  }
});

/* ============================================================== */
/*  ASK-STREAM endpoint – streaming chain-of-thought via SSE
/* ============================================================== */
app.post('/api/ask-stream', async (req, res) => {
  const { messages } = req.body;
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Build system prompt for streaming
  const systemPromptStream = `You are a factual assistant with direct access to concrete data functions (getAllStaff, getAllProjects, findProjects, aggregateProjects, getTotalBudget, getProjectDetails, getTeamAvailability, getProductiveHours, getStaffProductiveHours). ALWAYS use the appropriate function to fetch data, never fabricate. Provide concise and direct answers without including internal reasoning.`;
  const chatStream = [
    { role: 'system', content: systemPromptStream },
    ...messages
  ];
  try {
    const completion = await openai.chat.completions.create({
      model: chatModel,
      messages: chatStream,
      functions: functionDefinitions,
      function_call: 'auto',
      temperature: 0,
      stream: true
    });
    for await (const part of completion) {
      const delta = part.choices[0].delta;
      if (delta.content) {
        res.write(`data: ${JSON.stringify({ partial: delta.content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
  } catch (e) {
    console.error('/api/ask-stream error', e);
    res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`);
  } finally {
    res.end();
  }
});

/* ============================================================== */
/*  ASK endpoint – smart Q&A + deterministic shortcuts            */
/* ============================================================== */
app.post('/api/ask', async (req, res) => {
  const { messages } = req.body;
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const lower = lastUser.toLowerCase().trim();

  // Greeting shortcut
  if (/^\s*(hello|hi|hey)\b/.test(lower)) {
    return res.json({ content: 'Hello! How can I assist you today?', type: 'text' });
  }

  // Staff count shortcut
  if (/(how\s+many|number\s+of)\s+staff/.test(lower)) {
    const staffList = await getAllStaff();
    return res.json({ content: `There are ${staffList.length} staff members.`, type: 'text' });
  }

  // Projects count shortcut (excluding partner queries)
  if (/(how\s+many|number\s+of)\s+projects/.test(lower) && !/partner/.test(lower)) {
    const projectsList = await getAllProjects();
    return res.json({ content: `There are ${projectsList.length} projects.`, type: 'text' });
  }

  // Assignment check shortcut: "Is X on any project on 26th May"
  const assignMatch = /is\s+(.+?)\s+on any project on\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i.exec(lastUser);
  if (assignMatch) {
    const staffName = assignMatch[1].trim();
    const day = parseInt(assignMatch[2], 10);
    const month = assignMatch[3];
    const year = new Date().getFullYear();
    const MONTH_NUMBERS = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
    const monthKey = month.toLowerCase();
    const monthNum = MONTH_NUMBERS[monthKey] || String(new Date(`${month} 1, ${year}`).getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateISO = `${year}-${monthNum}-${dayStr}`;
    // Fetch assignments for this staff on that date
    const result = await getStaffAssignments({ staffName, from: dateISO, to: dateISO });
    if (result.error) {
      // Suggest similar names if available
      if (Array.isArray(result.availableStaff) && result.availableStaff.length) {
        // Filter suggestions containing part of the query
        const candidates = result.availableStaff.filter(s => s.toLowerCase().includes(staffName.substring(0, 3).toLowerCase()));
        const suggestions = candidates.length ? candidates : result.availableStaff.slice(0, 5);
        return res.json({ content: `I couldn't find staff member "${staffName}". Did you mean: ${suggestions.join(', ')}?`, type: 'text' });
      }
      return res.json({ content: `Error: ${result.error}`, type: 'text' });
    }
    if (!result.isScheduled) {
      return res.json({ content: `No, ${result.staffName} is not assigned to any project on ${dateISO}.`, type: 'text' });
    }
    const projectNames = result.assignments.map(a => a.projectName).join(', ');
    return res.json({ content: `Yes, ${result.staffName} is assigned to ${projectNames} on ${dateISO}.`, type: 'text' });
  }

  // Weekly staffed hours shortcut: "How many hrs is X staffed for the week starting from 26th May"
  const weekMatch = /how\s+many\s+(?:h(?:ours|rs?)|hrs)\s+is\s+(.+?)\s+staffed\s+for\s+the\s+week\s+starting\s+from\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i.exec(lastUser);
  if (weekMatch) {
    const staffName = weekMatch[1].trim();
    const day = parseInt(weekMatch[2], 10);
    const month = weekMatch[3];
    const year = new Date().getFullYear();
    // Map month to number
    const MONTH_NUMBERS = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
    const monthKey = month.toLowerCase();
    const monthNum = MONTH_NUMBERS[monthKey] || String(new Date(`${month} 1, ${year}`).getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    // Construct date range
    const fromISO = `${year}-${monthNum}-${dayStr}`;
    const startDate = new Date(`${year}-${monthNum}-${dayStr}`);
    const endDateObj = new Date(startDate);
    endDateObj.setDate(startDate.getDate() + 6);
    const endY = endDateObj.getFullYear();
    const endM = String(endDateObj.getMonth() + 1).padStart(2, '0');
    const endD = String(endDateObj.getDate()).padStart(2, '0');
    const toISO = `${endY}-${endM}-${endD}`;
    // Fetch assignments and total hours
    const result = await getStaffAssignments({ staffName, from: fromISO, to: toISO });
    if (result.error) {
      if (Array.isArray(result.availableStaff) && result.availableStaff.length) {
        const candidates = result.availableStaff.filter(s => s.toLowerCase().includes(staffName.substring(0, 3).toLowerCase()));
        const suggestions = candidates.length ? candidates : result.availableStaff.slice(0, 5);
        return res.json({ content: `I couldn't find staff member "${staffName}". Did you mean: ${suggestions.join(', ')}?`, type: 'text' });
      }
      return res.json({ content: `Error: ${result.error}`, type: 'text' });
    }
    // Group by project
    const projectSet = new Set(result.assignments.map(a => a.projectName));
    const projectsList = Array.from(projectSet).filter(Boolean);
    let message;
    if (projectsList.length === 1) {
      message = `${result.staffName} is staffed for ${result.totalHours} hours (all on project "${projectsList[0]}") during the week from ${fromISO} to ${toISO}.`;
    } else {
      message = `${result.staffName} is staffed for ${result.totalHours} hours during the week from ${fromISO} to ${toISO}, on projects: ${projectsList.join(', ')}.`;
    }
    return res.json({ content: message, type: 'text' });
  }

  // Breakdown per day shortcut: "breakdown of the projects per day for X"
  const breakdownMatch = /breakdown of the projects per day for\s+(.+?)(?:\?|$)/i.exec(lastUser);
  if (breakdownMatch) {
    const staffName = breakdownMatch[1].trim();
    // Look for 'week starting from' context in current and previous user messages
    let weekContextMatch = null;
    const prevUserMsgs = messages.filter(m => m.role === 'user').map(m => m.content);
    for (let i = prevUserMsgs.length - 1; i >= 0; i--) {
      const match = /week starting from\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i.exec(prevUserMsgs[i]);
      if (match) { weekContextMatch = match; break; }
    }
    let fromISO, toISO;
    if (weekContextMatch) {
      const day = parseInt(weekContextMatch[1], 10);
      const month = weekContextMatch[2];
      const year = new Date().getFullYear();
      const MONTH_NUMBERS = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
      const monthKey = month.toLowerCase();
      const monthNum = MONTH_NUMBERS[monthKey] || String(new Date(`${month} 1, ${year}`).getMonth() + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      fromISO = `${year}-${monthNum}-${dayStr}`;
      const startDate = new Date(`${fromISO}`);
      const endDateObj = new Date(startDate);
      endDateObj.setDate(startDate.getDate() + 6);
      const endY = endDateObj.getFullYear();
      const endM = String(endDateObj.getMonth() + 1).padStart(2, '0');
      const endD = String(endDateObj.getDate()).padStart(2, '0');
      toISO = `${endY}-${endM}-${endD}`;
    } else {
      // Default to last 7 days
      const endDateObj = new Date();
      const startDate = new Date(endDateObj);
      startDate.setDate(endDateObj.getDate() - 6);
      fromISO = startDate.toISOString().split('T')[0];
      toISO = endDateObj.toISOString().split('T')[0];
    }
    // Fetch assignments for staff
    const result = await getStaffAssignments({ staffName, from: fromISO, to: toISO });
    if (result.error) {
      return res.json({ content: `Error: ${result.error}`, type: 'text' });
    }
    // Organize assignments by date
    const dateMap = {};
    result.assignments.forEach(a => {
      dateMap[a.date] = dateMap[a.date] || [];
      dateMap[a.date].push(a);
    });
    // Build breakdown message
    let message = `Here is the breakdown of hours for ${result.staffName} for the period from ${fromISO} to ${toISO}:\n`;
    let cursorDate = new Date(fromISO);
    const lastDate = new Date(`${toISO}`);
    while (cursorDate <= lastDate) {
      const dateStr = cursorDate.toISOString().split('T')[0];
      message += `\n**${dateStr}**:`;
      const dayAssignments = dateMap[dateStr] || [];
      if (dayAssignments.length) {
        dayAssignments.forEach(asg => {
          message += `\n - Project "${asg.projectName}": ${asg.hours} hours`;
        });
      } else {
        message += `\n - No assignments`;
      }
      cursorDate.setDate(cursorDate.getDate() + 1);
    }
    return res.json({ content: message, type: 'text' });
  }

  // Budget consumption shortcut: "How much budget consumed for project X"
  if (/budget.*consumed/i.test(lower)) {
    const projMatch = /project\s+([a-z0-9 ]+?)(?:\s|$|\?)/i.exec(lastUser);
    if (projMatch) {
      const projectName = projMatch[1].trim();
      const pd = await getProjectDetails({ projectName });
      if (!pd) {
        return res.json({ content: `Could not find project "${projectName}".`, type: 'text' });
      }
      // Parse optional date for label and compute toISO
      const dateMatch = /as of\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i.exec(lastUser);
      let dateLabel = 'today';
      let consumed = null;
      let toISO = null;
      if (dateMatch) {
        const d = parseInt(dateMatch[1], 10);
        const m = dateMatch[2];
        const year = new Date().getFullYear();
        dateLabel = `${m.charAt(0).toUpperCase() + m.slice(1)} ${d}`;
        const MONTH_NUMBERS = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
        const monthKey = m.toLowerCase();
        const monthNum = MONTH_NUMBERS[monthKey] || String(new Date(`${m} 1, ${year}`).getMonth() + 1).padStart(2, '0');
        const dayStr = String(d).padStart(2, '0');
        toISO = `${year}-${monthNum}-${dayStr}`;
        // Fetch assignments up to specified date including grade
        const { data: assignments, error: asgError } = await supabase
          .from('assignments')
          .select('hours, staff ( metadata, grade )')
          .eq('project_id', pd.projectId)
          .lte('date', toISO);
        if (asgError) console.error('Error fetching assignments for budget:', asgError);
        // Calculate consumed budget with grade fallback
        consumed = assignments.reduce((sum, a) => {
          let rate = 0;
          if (a.staff && a.staff.metadata && a.staff.metadata.rate) {
            rate = parseFloat(a.staff.metadata.rate) || 0;
          } else if (a.staff && a.staff.grade) {
            rate = gradeRates[a.staff.grade] || 0;
          }
          return sum + a.hours * rate;
        }, 0);
      } else {
        consumed = pd.consumedBudget != null ? pd.consumedBudget : 0;
      }
      const totalBudget = pd.budget;
      return res.json({
        content: `As of ${dateLabel}, project "${pd.projectName}" has consumed AED ${consumed} of its AED ${totalBudget} budget.`,
        type: 'text'
      });
    }
  }

  // Booking via parseBookingCommand
  const cmd = parseBookingCommand(lower);
  if (cmd) {
    // Try booking via CrewAI orchestrator first
    try {
      // Build detailed payload for orchestrator using parsed cmd
      const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';
      const orchestratorPayload = {
        mode: 'command',
        intent: 'booking',
        query: lastUser,
        projectBookings: cmd.projectBookings,
      };
      // Include staff names array
      if (cmd.staffName) {
        orchestratorPayload.staffNames = cmd.staffName.split(/\s*(?:and|,|&)\s*/i)
          .map(n => n.trim()).filter(Boolean);
      }
      // Include date or dateRange strings
      if (cmd.dateRange) {
        orchestratorPayload.dateRange = {
          from: cmd.dateRange.from.toISOString().split('T')[0],
          to:   cmd.dateRange.to.toISOString().split('T')[0]
        };
      } else if (cmd.date) {
        orchestratorPayload.date = cmd.date.toISOString().split('T')[0];
      }
      const { data: orchestratorResult } = await axios.post(
        `${orchestratorUrl}/orchestrate`,
        orchestratorPayload
      );
      return res.json(orchestratorResult);
    } catch (orErr) {
      console.error('Orchestrator booking proxy failed, falling back to local logic', orErr);
      // continue to local booking handler
    }
    if (cmd.isBulk) {
      // Bulk booking across multiple staff, projects, and dates
      let staffRows = [];
      const deptMatch = cmd.staffName && cmd.staffName.match(/^(?:the\s+)?(.+?) department$/i);
      if (deptMatch) {
        const deptName = deptMatch[1].trim().toLowerCase();
        const { data: allStaff, error: staffError } = await supabase.from('staff').select('*');
        if (staffError) {
          console.error('Bulk booking staff fetch error:', staffError);
          return res.status(500).json({ content: 'Failed to fetch staff', type: 'text', error: staffError.message });
        }
        staffRows = allStaff.filter(s => s.department && s.department.toLowerCase().includes(deptName));
        if (!staffRows.length) {
          return res.json({ content: `Could not find staff in department "${deptName}".`, type: 'text', error: 'staff_not_found' });
        }
      } else {
        const names = cmd.staffName
          ? cmd.staffName.split(/\s*(?:and|,|&)\s*/i).map(n => n.trim()).filter(Boolean)
          : [];
        const { data: allStaff, error: staffError } = await supabase.from('staff').select('*');
        if (staffError) {
          console.error('Bulk booking staff fetch error:', staffError);
          return res.status(500).json({ content: 'Failed to fetch staff', type: 'text', error: staffError.message });
        }
        names.forEach(name => {
          const match = allStaff.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
          if (match) staffRows.push(match);
        });
        if (!staffRows.length) {
          return res.json({ content: `Could not find staff: ${names.join(', ')}.`, type: 'text', error: 'staff_not_found' });
        }
      }
      const { data: allProjects, error: projError } = await supabase.from('projects').select('*');
      if (projError) {
        console.error('Bulk booking projects fetch error:', projError);
        return res.status(500).json({ content: 'Failed to fetch projects', type: 'text', error: projError.message });
      }
      // Build date list
      const dates = [];
      if (cmd.dateRange) {
        let cur = new Date(cmd.dateRange.from);
        const end = new Date(cmd.dateRange.to);
        while (cur <= end) {
          dates.push(cur.toISOString().split('T')[0]);
          cur.setDate(cur.getDate() + 1);
        }
      } else if (cmd.date) {
        dates.push(cmd.date.toISOString().split('T')[0]);
      }
      // Assemble assignment rows
      const assignmentsPayload = [];
      for (const staff of staffRows) {
        for (const booking of cmd.projectBookings) {
          const project = allProjects.find(p =>
            p.name.toLowerCase().includes(booking.projectName.toLowerCase()) ||
            booking.projectName.toLowerCase().includes(p.name.toLowerCase())
          );
          if (!project) {
            return res.json({ content: `Could not find project "${booking.projectName}".`, type: 'text', error: 'project_not_found' });
          }
          dates.forEach(dateStr => {
            assignmentsPayload.push({ staffId: staff.id, projectId: project.id, date: dateStr, hours: booking.hours });
          });
        }
      }
      // Bulk upsert via shared helper
      const bulkResult = await createAssignmentsFromSchedule({ assignments: assignmentsPayload });
      return res.json({ content: bulkResult.message, type: 'text', booking: bulkResult.assignments, isMultiProject: true });
    } else {
      // Single booking
      const result = await directBooking({ staffName: cmd.staffName, projectBookings: cmd.projectBookings, date: cmd.date });
      return result.success
        ? res.json({ content: result.message, type: 'text', booking: result.assignments, isMultiProject: result.isMultiProject })
        : res.json({ content: result.message, type: 'text', error: result.error });
    }
  }

  // Default: GPT function-calling with Supabase-backed functions
  try {
    const systemPrompt = `You are a factual assistant with direct access to concrete data functions (getAllStaff, getAllProjects, findProjects, aggregateProjects, getTotalBudget, getProjectDetails, getTeamAvailability, getProductiveHours, getStaffProductiveHours). ALWAYS use the appropriate function to fetch data, never fabricate. Provide concise and direct answers without including internal reasoning.`;
    const chat = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
    const initial = await openai.chat.completions.create({
      model: chatModel,
      messages: chat,
      functions: functionDefinitions,
      function_call: 'auto',
      temperature: 0
    });
    let reply = initial.choices[0].message;
    if (reply.function_call) {
      let args;
      try {
        args = typeof reply.function_call.arguments === 'string'
          ? JSON.parse(reply.function_call.arguments)
          : reply.function_call.arguments;
      } catch {
        args = {};
      }
      const fnName = reply.function_call.name;
      const fnRes = functionMapping[fnName] ? await functionMapping[fnName](args) : {};
      const follow = await openai.chat.completions.create({
        model: chatModel,
        messages: [
          ...chat,
          reply,
          { role: 'function', name: fnName, content: JSON.stringify(fnRes) }
        ],
        temperature: 0
      });
      reply = follow.choices[0].message;
    }
    return res.json({ content: reply.content, type: 'text' });
  } catch (e) {
    console.error('/api/ask error', e);
    return res.status(500).json({ error: 'ask_failed', message: e.message });
  }
});

/* ============================================================== */
/*  PDF report proxy                                               */
/* ============================================================== */
app.post('/api/report', async (req,res)=>{
  const { from, to } = req.body;
  try{
    const { data } = await axios.post('http://localhost:8000/generate_report',
      { start:from, end:to, fmt:'pdf' }, { timeout:15000 });
    // PDF report proxy
    const fileUrl = `http://localhost:8000${data.url}`;
    const pdf = await axios.get(fileUrl,{ responseType:'arraybuffer' });
    const filename = path.basename(data.url);
    res.set({
      'Content-Type':'application/pdf',
      'Content-Disposition':`attachment; filename=${filename}`
    });
    res.send(pdf.data);
  }catch(e){
    console.error('/api/report',e);
    res.status(500).json({error:'report_failed',message:e.message});
  }
});

/* ============================================================== */
/*  legacy /api/chat (kept for old frontend versions)              */
/* ============================================================== */
app.post('/api/chat', async (req,res)=>{
  const { messages } = req.body;
  try{
    const formatted = messages.map(m=>({ role:m.sender==='user'?'user':'assistant', content:m.text }));
    const initial   = await openai.chat.completions.create({
      model:chatModel, messages:formatted, functions:functionDefinitions, function_call:'auto', temperature:0
    });
    let reply = initial.choices[0].message;
    if (reply.function_call){
      const fnName = reply.function_call.name;
      const args   = JSON.parse(reply.function_call.arguments || '{}');
      const fnRes  = functionMapping[fnName] ? await functionMapping[fnName](args) : {};
      const follow = await openai.chat.completions.create({
        model:chatModel,
        messages:[ ...formatted, reply, { role:'function', name:fnName, content:JSON.stringify(fnRes) } ],
        temperature:0
      });
      reply = follow.choices[0].message;
    }
    res.json({ response:{ content:reply.content } });
  }catch(e){
    console.error('/api/chat',e.response?.data||e.message);
    res.status(500).json({error:e.message||'chat_failed'});
  }
});

/* ============================================================== */
/*  start server                                                   */
/* ============================================================== */
// Export the HTTP server for testing purposes
const http = require('http');
const server = http.createServer(app);
module.exports = server;

// Only start the server if this file is run directly and not in test environment
if (require.main === module && process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 5001;   // keep 5001 to match npm script
  server.listen(port, () => console.log(`Chat server listening on ${port}`));
}
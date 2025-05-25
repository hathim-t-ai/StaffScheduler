/************************************************************
 *  StaffScheduler – unified Express API & chat service
 ***********************************************************/
require('dotenv').config();

/* ---------- sanity checks ---------- */
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set.'); process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not set.');   process.exit(1);
}

/* ---------- imports ---------- */
const express = require('express');
const cors    = require('cors');
const OpenAI  = require('openai');
const axios   = require('axios');
const path    = require('path');
const prisma  = require('./prismaClient');

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

/* ---------- basic app ---------- */
const app = express();
app.use(cors());
app.use(express.json());

const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const chatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';

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
app.get('/api/staff', async (_ ,res)=>res.json(await prisma.staff.findMany()));

app.post('/api/staff', async (req,res)=>
  res.status(201).json(await prisma.staff.create({data:req.body}))
);

app.put('/api/staff/:id', async (req,res)=>
  res.json(await prisma.staff.update({where:{id:req.params.id},data:req.body}))
);

app.delete('/api/staff/:id', async (req,res)=>{
  await prisma.assignment.deleteMany({where:{staffId:req.params.id}});
  await prisma.staff.delete({where:{id:req.params.id}});
  res.status(204).end();
});

/* ---------- projects ---------- */
app.get('/api/projects', async (_ ,res)=>res.json(await prisma.project.findMany()));

app.post('/api/projects', async (req,res)=>
  res.status(201).json(await prisma.project.create({data:req.body}))
);

app.put('/api/projects/:id', async (req,res)=>
  res.json(await prisma.project.update({where:{id:req.params.id},data:req.body}))
);

app.delete('/api/projects/:id', async (req,res)=>{
  await prisma.assignment.deleteMany({where:{projectId:req.params.id}});
  await prisma.project.delete({where:{id:req.params.id}});
  res.status(204).end();
});

/* ---------- assignments ---------- */
app.get('/api/assignments', async (_ ,res)=>{
  const list = await prisma.assignment.findMany({include:{project:true}});
  res.json(list.map(a=>({
    id:a.id,
    staffId:a.staffId,
    projectId:a.projectId,
    date:a.date.toISOString().split('T')[0],
    hours:a.hours,
    projectName:a.project.name
  })));
});

app.post('/api/assignments', async (req,res)=>{
  const { staffId, projectId, date, hours } = req.body;
  const newA = await prisma.assignment.create({
    data:{ staffId, projectId, date:new Date(date), hours }
  });
  res.status(201).json(newA);
});

app.post('/api/assignments/bulk', async (req,res)=>{
  try{
    const result = await prisma.assignment.createMany({data:req.body});
    res.json({success:true,inserted:result.count});
  }catch(e){
    console.error('bulk insert',e);
    res.status(500).json({error:'bulk_failed',message:e.message});
  }
});

app.delete('/api/assignments/range', async (req, res) => {
  const { from, to, projectId, staffIds } = req.body;   // pick the filters you need
  try {
    const where = { date: { gte: new Date(from), lte: new Date(to) } };
    if (projectId) where.projectId = projectId;
    if (Array.isArray(staffIds) && staffIds.length) where.staffId = { in: staffIds };

    const { count } = await prisma.assignment.deleteMany({ where });
    res.json({ success:true, deleted:count });
  } catch (e) {
    console.error('/api/assignments/range', e);
    res.status(500).json({ success:false, error:e.message });
  }
});

/* ============================================================== */
/*  Availability & analytics helpers                               */
/* ============================================================== */
app.get('/api/availability', async (req,res)=>{
  const { date } = req.query;
  const parsed = new Date(date);
  if (isNaN(parsed)) return res.status(400).json({error:'invalid_date'});
  const start = new Date(Date.UTC(parsed.getUTCFullYear(),parsed.getUTCMonth(),parsed.getUTCDate()));
  const end   = new Date(Date.UTC(parsed.getUTCFullYear(),parsed.getUTCMonth(),parsed.getUTCDate(),23,59,59,999));

  const assignments = await prisma.assignment.findMany({where:{date:{gte:start,lte:end}}});
  const staff = await prisma.staff.findMany();
  res.json(staff.map(s=>{
    const assigned = assignments.filter(a=>a.staffId===s.id).reduce((sum,a)=>sum+a.hours,0);
    return { staffId:s.id, staffName:s.name, assignedHours:assigned, availableHours:Math.max(8-assigned,0) };
  }));
});

app.get('/api/analytics/range', async (req,res)=>{
  const { from, to } = req.query;
  try{
    const start = new Date(from), end = new Date(to);
    if (isNaN(start)||isNaN(end)) return res.status(400).json({error:'invalid_range'});
    const assignments = await prisma.assignment.findMany({
      where:{date:{gte:start,lte:end}}, include:{project:true,staff:true}
    });
    const totalHours = assignments.reduce((s,a)=>s+a.hours,0);
    const byProject={}, byStaff={};
    assignments.forEach(a=>{
      byProject[a.projectId] = byProject[a.projectId] || { projectId:a.projectId, projectName:a.project.name, hours:0, count:0 };
      byProject[a.projectId].hours += a.hours; byProject[a.projectId].count++;

      byStaff[a.staffId] = byStaff[a.staffId] || { staffId:a.staffId, staffName:a.staff.name, hours:0 };
      byStaff[a.staffId].hours += a.hours;
    });
    res.json({
      from,to,totalHours, assignmentsCount:assignments.length,
      assignmentsByProject:Object.values(byProject),
      assignmentsByStaff:Object.values(byStaff)
    });
  }catch(e){
    console.error('/analytics/range',e);
    res.status(500).json({error:'analytics_failed',message:e.message});
  }
});

/* ============================================================== */
/*  ORCHESTRATE  – booking / bulk / removal / replacement          */
/* ============================================================== */
app.post('/api/orchestrate', async (req,res)=>{
  const { query, date, mode } = req.body;
  const lower = (query||'').toLowerCase().trim();

  /* ----- replacement branch ----- */
  const swap = parseReplacement(lower);
  if (swap){
    try{
      const staff = await prisma.staff.findFirst({ where:{ name:{ contains: swap.staffName } } });
      const fromP = await prisma.project.findFirst({ where:{ name:{ contains: swap.fromProj } } });
      const toP   = await prisma.project.findFirst({ where:{ name:{ contains: swap.toProj   } } });
      if(!staff||!fromP||!toP){
        return res.json({success:false,error:'not_found',message:'Staff or project not found.'});
      }
      await prisma.$transaction(async tx=>{
        await tx.assignment.deleteMany({
          where:{staffId:staff.id,projectId:fromP.id,date:{gte:swap.date,lte:swap.date}}
        });
        await tx.assignment.create({
          data:{staffId:staff.id,projectId:toP.id,date:swap.date,hours:swap.hours}
        });
      });
      return res.json({success:true,
        message:`Replaced ${swap.hours}h on ${fromP.name} with ${toP.name} for ${staff.name} on ${swap.date.toISOString().split('T')[0]}.`
      });
    }catch(e){
      console.error('swap error',e);
      return res.status(500).json({success:false,error:'swap_failed',message:e.message});
    }
  }

  /* ----- removal branch ----- */
  const removalPattern = /\b(remove|delete|unassign|unschedule|cancel)\b/i;
  if (removalPattern.test(lower)){
    const projMatch  = lower.match(/project\s+([a-z0-9 ]+)/i);
    const staffMatch = lower.match(/for\s+([a-z0-9 ]+?)\s+on\s+\d/i);
    const projectName = projMatch ? projMatch[1].trim() : null;
    const staffName   = staffMatch ? staffMatch[1].trim() : null;
    const range       = parseDateRange(lower) || {};
    const singleDate  = range.from || new Date(lower.match(/\d{1,2}/)[0]);

    const staff = await prisma.staff.findFirst({ where:{ name:{ contains: staffName } } });
    const proj  = await prisma.project.findFirst({ where:{ name:{ contains: projectName } } });
    if(!staff||!proj) return res.json({success:false,error:'not_found',message:'Staff or project not found.'});

    const result = await prisma.assignment.deleteMany({
      where:{
        staffId:staff.id, projectId:proj.id,
        date:{gte:range.from||singleDate,lte:range.to||singleDate}
      }
    });
    return res.json({success:true,message:`✅ Deleted ${result.count} assignment(s).`,count:result.count});
  }

  /* ----- booking parse ----- */
  const cmd = parseBookingCommand(query||'');
  if (cmd){

    /* -- BULK branch (team / multi-staff / range) -- */
    if (cmd.isBulk && (cmd.teamName || cmd.dateRange)){
      try{
/* ---------- staff set ---------- */
        let staffList = [];

        /**
         * 1.  Deduce a "team" token, e.g. "analytics" in
         *     "book the analytics team ..." or fall back to an explicit
         *     comma/and-separated staffName list.
         */
        let teamCandidate = cmd.teamName                                         // ← already parsed
            || (query || '').match(/(?:members?\s+of|members?\s+from|the)?\s*([a-z0-9 ]+?)\s+team\b/i)?.[1]  // ← Regex capture
            || null;

        if (teamCandidate) {
          /* normalise & drop filler words so "book the analytics" → "analytics" */
          const stop = new Set(['book','all','the','entire','team','members','member',
                                'please','kindly','can','you']);
          const tokens = teamCandidate
                          .toLowerCase()
                          .split(/\s+/)
                          .filter(t => t && !stop.has(t));

          const allStaff = await prisma.staff.findMany();
          staffList      = allStaff.filter(s => {
            const dept = (s.department || '').toLowerCase();
            return tokens.some(tok => dept.includes(tok));
          });

          if (!staffList.length) {
            return res.json({
              success : false,
              error   : 'no_staff',
              message : `No staff found in the ${tokens.join(' ')} team.`
            });
          }

        } else if (cmd.staffName) {
          /* explicit list: "Aisha and Fatima ..." */
          const names = cmd.staffName
                          .split(/\s*(?:and|,|&)\s*/i)
                          .map(n => n.trim())
                          .filter(Boolean);

          // fetch all staff and perform case-insensitive lookup in JavaScript
          const allStaff = await prisma.staff.findMany();
          for (const n of names) {
            const s = allStaff.find(st => st.name.toLowerCase().includes(n.toLowerCase()));
            if (!s) {
              return res.json({
                success : false,
                error   : 'staff_not_found',
                message : `Staff '${n}' not found`
              });
            }
            staffList.push(s);
          }

        } else {
          return res.json({
            success : false,
            error   : 'bulk_parse_error',
            message : 'Could not determine target staff or team.'
          });
        }


        /* projects */
        const projObjs=[];
        for(const pb of cmd.projectBookings){
          const p = await prisma.project.findFirst({ where:{ name:{ contains: pb.projectName } } });
          if(!p) return res.json({success:false,error:'project_not_found',message:`Project '${pb.projectName}' not found`});
          projObjs.push({...p,hours:pb.hours});
        }

        /* build rows with capacity check */
        // Determine dates to book
        const datesToBook = [];
        if (cmd.dateRange) {
          for (let d = new Date(cmd.dateRange.from); d <= cmd.dateRange.to; d.setUTCDate(d.getUTCDate() + 1)) {
            datesToBook.push(new Date(d));
          }
        } else {
          datesToBook.push(new Date(cmd.date));
        }
        // Fetch existing assignments for these staff and dates
        const staffIds = staffList.map(s => s.id);
        const startBook = new Date(Date.UTC(
          datesToBook[0].getUTCFullYear(), datesToBook[0].getUTCMonth(), datesToBook[0].getUTCDate()
        ));
        const endDate = datesToBook[datesToBook.length - 1];
        const endBook = new Date(Date.UTC(
          endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59, 999
        ));
        const existing = await prisma.assignment.findMany({
          where: { staffId: { in: staffIds }, date: { gte: startBook, lte: endBook } }
        });
        const totalIncoming = projObjs.reduce((sum, p) => sum + p.hours, 0);
        const assignments = [];
        const skipped = new Set();
        for (const d of datesToBook) {
          const dateStr = d.toISOString().split('T')[0];
          for (const s of staffList) {
            // Sum current hours for this staff on this date
            const current = existing
              .filter(a => a.staffId === s.id && a.date.toISOString().split('T')[0] === dateStr)
              .reduce((sum, a) => sum + a.hours, 0);
            if (current + totalIncoming <= 8) {
              for (const p of projObjs) {
                assignments.push({
                  staffId: s.id,
                  projectId: p.id,
                  date: dateStr,
                  hours: p.hours
                });
              }
            } else {
              skipped.add(s.name);
            }
          }
        }
        const result = await createAssignmentsFromSchedule({ assignments });
        let message = result.message;
        if (skipped.size) {
          message += `\n\n⚠️ Could not book for ${Array.from(skipped).join(', ')} since the project hours would exceed the 8-hour limit.`;
        }
        return res.json({ success: true, message, assignments: result.assignments });
      }catch(e){
        console.error('bulk booking',e);
        return res.status(500).json({success:false,error:'bulk_booking_failed',message:e.message});
      }
    }

    /* -- FAST single / same-day booking -- */
    try{
      const r = await directBooking({staffName:cmd.staffName,projectBookings:cmd.projectBookings,date:cmd.date});
      return r.success
        ? res.json({success:true,message:r.message, assignments:r.assignments})
        : res.json({success:false,error:r.error,message:r.message});
    }catch(e){
      console.error('direct booking',e);
      return res.status(500).json({success:false,error:'booking_error',message:e.message});
    }
  }

  /* ----- fallback to GPT conversational assistant ----- */
  try {
    // Use OpenAI to handle general conversational queries with function-calling
    const commonSystem = `You are a world-class data assistant with direct access to these data functions: getAllStaff, getAllProjects, findProjects, aggregateProjects, getTotalBudget, getProjectDetails, getTeamAvailability, getProductiveHours, getStaffProductiveHours. ALWAYS call the appropriate function to retrieve reliable, up-to-date data in JSON. For queries asking for partners with the most or least number of projects, use the aggregateProjects function with groupBy: 'partnerName', metrics: ['count'], sort by count descending (for most) or ascending (for least), and set limits appropriately. NEVER hallucinate or fabricate information. After calling the function(s), process the returned data and provide a concise, factual response. Prefix your reasoning steps with "Thinking:".`;
    const chat = [
      { role: 'system', content: commonSystem },
      { role: 'user', content: query }
    ];
    // First GPT call
    const initial = await openai.chat.completions.create({
      model: chatModel,
      messages: chat,
      functions: functionDefinitions,
      function_call: 'auto',
      temperature: 0
    });
    let reply = initial.choices[0].message;
    // If a function call was suggested, execute it and call GPT again
    if (reply.function_call) {
      const fnName = reply.function_call.name;
      const args = JSON.parse(reply.function_call.arguments || '{}');
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
  } catch (err) {
    console.error('Orchestrator GPT fallback failed', err);
    return res.status(500).json({ error: 'orchestrator_gpt_failed', message: err.message });
  }
});

/* ============================================================== */
/*  ASK endpoint – smart Q&A + deterministic shortcuts            */
/* ============================================================== */
app.post('/api/ask', async (req, res) => {
  const { messages } = req.body;
  // Extract last user message for shortcuts
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const lower = lastUser.toLowerCase().trim();

  // Deterministic shortcuts on lastUser
  if (/(how\s+many|number\s+of)\s+staff/.test(lower)) {
    const count = await prisma.staff.count();
    return res.json({ content: `There are ${count} staff members.`, type: 'text' });
  }
  if (/(how\s+many|number\s+of)\s+projects/.test(lower) && !/partner/.test(lower)) {
    const count = await prisma.project.count();
    return res.json({ content: `There are ${count} projects.`, type: 'text' });
  }

  // Quick budget queries: top N highest or lowest budgets
  const budgetRegex = /\btop\s+(\d+)\s+projects?\s+(?:with\s+the\s+)?(highest|lowest)\s+budgets?\b/;
  const budgetMatch = lower.match(budgetRegex);
  if (budgetMatch) {
    const n = parseInt(budgetMatch[1], 10);
    const order = budgetMatch[2]; // 'highest' or 'lowest'
    const projects = await prisma.project.findMany();
    const filtered = projects.filter(p => typeof p.budget === 'number');
    filtered.sort((a, b) => order === 'highest' ? b.budget - a.budget : a.budget - b.budget);
    const topN = filtered.slice(0, n);
    let content = `The top ${n} projects ${order === 'highest' ? 'with the highest budgets' : 'with the lowest budgets'}, ranked ${order === 'highest' ? 'from highest' : 'from lowest'}, are:`;
    topN.forEach((p, i) => {
      const amount = p.budget.toLocaleString();
      content += `\n${i+1}. **${p.name}** - Budget: AED ${amount}`;
    });
    return res.json({ content, type: 'text' });
  }

  // Specific partner project count inquiry (e.g., "What about Sarah Al-Bader? ...")
  const aboutMatch = lower.match(/what about\s+(.+?)\s*\?/i);
  if (aboutMatch) {
    const candidate = aboutMatch[1].trim();
    const projects = await prisma.project.findMany();
    const byPartner = {};
    projects.forEach(p => {
      const partner = p.partnerName || 'Unknown';
      if (!byPartner[partner]) byPartner[partner] = [];
      byPartner[partner].push(p);
    });
    const matchingPartner = Object.keys(byPartner).find(
      key => key.toLowerCase().includes(candidate.toLowerCase())
    );
    if (matchingPartner) {
      const partnerProjects = byPartner[matchingPartner];
      let content = `**${matchingPartner}** has ${partnerProjects.length} project${partnerProjects.length > 1 ? 's' : ''}:`;
      partnerProjects.forEach(p => {
        const amount = (typeof p.budget === 'number' ? p.budget : 0).toLocaleString();
        content += `\n• ${p.name} — Budget: AED ${amount}`;
      });
      return res.json({ content, type: 'text' });
    }
  }

  // Partner(s) with the most projects: handle ties
  if (/partner.*most.*project/.test(lower)) {
    const projects = await prisma.project.findMany();
    const byPartner = {};
    projects.forEach(p => {
      const partner = p.partnerName || 'Unknown';
      if (!byPartner[partner]) byPartner[partner] = [];
      byPartner[partner].push(p);
    });
    const counts = Object.values(byPartner).map(arr => arr.length);
    const maxCount = Math.max(...counts);
    const topPartners = Object.entries(byPartner).filter(([, arr]) => arr.length === maxCount);
    let content;
    if (topPartners.length === 1) {
      const [partner, partnerProjects] = topPartners[0];
      content = `The partner with the most projects is **${partner}** with ${partnerProjects.length} project${partnerProjects.length > 1 ? 's' : ''}:`;
      partnerProjects.forEach(p => {
        const amount = (typeof p.budget === 'number' ? p.budget : 0).toLocaleString();
        content += `\n• ${p.name} — Budget: AED ${amount}`;
      });
    } else {
      const partnerNames = topPartners.map(([partner]) => `**${partner}**`).join(', ');
      content = `The partners with the most projects (${maxCount} each) are ${partnerNames}:`;
      topPartners.forEach(([partner, partnerProjects]) => {
        content += `\n\n**${partner}** has ${partnerProjects.length} projects:`;
        partnerProjects.forEach(p => {
          const amount = (typeof p.budget === 'number' ? p.budget : 0).toLocaleString();
          content += `\n• ${p.name} — Budget: AED ${amount}`;
        });
      });
    }
    return res.json({ content, type: 'text' });
  }

  // Booking via parseBookingCommand on lastUser
  const cmd = parseBookingCommand(lastUser);
  if (cmd && !cmd.isBulk) {
    const t0 = Date.now();
    const r = await directBooking({ staffName: cmd.staffName, projectBookings: cmd.projectBookings, date: cmd.date });
    const ms = Date.now() - t0;
    return res.json(
      r.success
        ? { content: r.message, type: 'text', booking: r.assignments, processingTime: `${ms}ms`, isMultiProject: r.isMultiProject }
        : { content: r.message, type: 'text', error: r.error, processingTime: `${ms}ms` }
    );
  }

  // Default: use GPT function-calling with full context
  try {
    // Prepend a system message to guide function usage and handle follow-ups
    const commonSystem = `You are a world-class data assistant with direct access to these data functions: getAllStaff, getAllProjects, findProjects, aggregateProjects, getTotalBudget, getProjectDetails, getTeamAvailability, getProductiveHours, getStaffProductiveHours. ALWAYS call the appropriate function to retrieve reliable, up-to-date data in JSON. For queries asking for partners with the most or least number of projects, use the aggregateProjects function with groupBy: 'partnerName', metrics: ['count'], sort by count descending (for most) or ascending (for least), and set limits appropriately. NEVER hallucinate or fabricate information. After calling the function(s), process the returned data and provide a concise, factual response. Prefix your reasoning steps with "Thinking:".`;
    const chat = [
      { role: 'system', content: commonSystem },
      ...messages
    ];
    const initial = await openai.chat.completions.create({
      model: chatModel,
      messages: chat,
      functions: functionDefinitions,
      function_call: 'auto',
      temperature: 0,
    });
    let reply = initial.choices[0].message;
    if (reply.function_call) {
      const fnName = reply.function_call.name;
      const args = JSON.parse(reply.function_call.arguments || '{}');
      const fnRes = functionMapping[fnName] ? await functionMapping[fnName](args) : {};
      const follow = await openai.chat.completions.create({
        model: chatModel,
        messages: [
          ...chat,
          reply,
          { role: 'function', name: fnName, content: JSON.stringify(fnRes) }
        ],
        temperature: 0,
      });
      reply = follow.choices[0].message;
    }
    return res.json({ content: reply.content, type: 'text' });
  } catch (err) {
    console.error('Ask GPT failed', err);
    return res.status(500).json({ error: 'ask_failed', message: err.message });
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
const port = process.env.PORT || 5001;   // keep 5001 to match npm script
app.listen(port, ()=>console.log(`Chat server listening on ${port}`));
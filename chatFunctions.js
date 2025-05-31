// chatFunctions.js
// Data helpers & NLP parsers for StaffScheduler

const supabase = require('./supabaseClient');

/* ------------------------------------------------------------------ */
/* 1. Utility helpers                                                  */
/* ------------------------------------------------------------------ */

// Month helper for date parsing
const MONTH_INDEX = {
  january: 0, february: 1, march: 2, april: 3,  may: 4,  june: 5,
  july: 6,    august: 7,   september: 8, october: 9, november: 10, december: 11
};

/**
 * Parse utterances like:
 *  • "from 9 June to 13 June"
 *  • "9 June - 13 June 2025"
 * Returns { from: Date, to: Date } or null.
 */
function parseDateRange(str) {
  // day-month-…  OR  month-day-…
  const rx = /(?:(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)|(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?)(?:\s+(\d{4}))?\s+(?:to|until|-)\s+(?:(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)|(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?)(?:\s+(\d{4}))?/i;
  const m = rx.exec(str);
  if (!m) return null;

  /* ---- normalise captures ---- */
  const [ , d1a, m1a, m1b, d1b, y1,
          d2a, m2a, m2b, d2b, y2 ] = m;

  const day1 = d1a || d1b, mon1 = m1a || m1b;
  const day2 = d2a || d2b, mon2 = m2a || m2b;
  const yr1  = y1 ? +y1 : new Date().getFullYear();
  const yr2  = y2 ? +y2 : yr1;

  const from = new Date(Date.UTC(yr1, MONTH_INDEX[mon1.toLowerCase()], +day1));
  const to   = new Date(Date.UTC(yr2, MONTH_INDEX[mon2.toLowerCase()], +day2, 23,59,59,999));
  return from>to ? null : { from, to };
}


/**
 * Parse replacement / swap commands, e.g.:
 *  "replace 3 hrs on project Aurora for Aisha on 4 June with project Eclipse"
 * Returns an object or null if no match.
 */
function parseReplacement(str) {
  const rx = /replace\s+(\d+)\s*h(?:ours|rs)?\s+on\s+project\s+([a-z0-9 ]+?)\s+for\s+([a-z0-9 ]+?)\s+on\s+(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?\s+with\s+project\s+([a-z0-9 ]+)/i;
  const m = rx.exec(str);
  if (!m) return null;

  const [, hrs, fromProj, staff, day, mon, yr, toProj] = m;
  const year = yr ? +yr : new Date().getFullYear();
  const date = new Date(Date.UTC(year, MONTH_INDEX[mon.toLowerCase()], +day));

  return {
    hours: +hrs,
    staffName: staff.trim(),
    fromProj:  fromProj.trim(),
    toProj:    toProj.trim(),
    date
  };
}

/* ------------------------------------------------------------------ */
/* 2. Core data-access helpers (identical to your original)            */
/* ------------------------------------------------------------------ */

async function getStaffAssignments({ staffName, from, to }) {
  try {
    console.log(`Fetching assignments for ${staffName} from ${from} to ${to}`);

    if (!staffName) return { error: 'Staff name is required' };

    let fromDate = new Date(from);
    let toDate   = new Date(to);
    if (isNaN(fromDate) || isNaN(toDate)) {
      fromDate = new Date();
      toDate   = new Date();
    }

    // strip "from X dept" if present
    const fromMatch = staffName.match(/^(.*?)\s+from\s+/i);
    const cleanedName = fromMatch ? fromMatch[1].trim() : staffName;

    const { data: allStaff, error: staffError } = await supabase.from('staff').select('*');
    if (staffError) { console.error('Error fetching staff:', staffError); return { error: staffError.message }; }
    const staff = allStaff.find(s => s.name.toLowerCase() === cleanedName.toLowerCase());
    if (!staff) {
      return { error: 'Staff not found', staffName, availableStaff: allStaff.map(s => s.name) };
    }

    // Use ISO date strings to avoid timezone parsing errors
    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*, projects(*)')
      .eq('staff_id', staff.id)
      .gte('date', fromStr)
      .lte('date', toStr);
    if (assignmentsError) { console.error('Error fetching assignments:', assignmentsError); return { error: assignmentsError.message }; }
    const formatted = assignments.map(a => ({
      projectId:   a.projectId,
      projectName: a.projects ? a.projects.name : null,
      date:        (new Date(a.date)).toISOString().split('T')[0],
      hours:       a.hours
    }));

    return {
      staffId: staff.id,
      staffName: staff.name,
      from: fromDate.toISOString().split('T')[0],
      to:   toDate.toISOString().split('T')[0],
      totalDaysChecked: Math.round((toDate - fromDate) / (1000*60*60*24)) + 1,
      isScheduled: formatted.length > 0,
      assignments: formatted,
      totalHours:  formatted.reduce((s,a)=>s+a.hours,0)
    };
  } catch (e) {
    console.error('getStaffAssignments:', e);
    return { error: e.message };
  }
}

async function getAllStaff() {
  const { data, error } = await supabase.from('staff').select('*');
  if (error) throw error;
  return data;
}

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

async function getProjectDetails({ projectName }) {
  const { data: all, error: projError } = await supabase.from('projects').select('*');
  if (projError) throw projError;
  const project = all.find(p => p.name.toLowerCase() === projectName.toLowerCase());
  if (!project) return null;

  // Fetch assignments along with staff metadata and grade to compute budget consumption
  const { data: assignments, error: asgError } = await supabase
    .from('assignments')
    .select('hours, staff ( metadata, grade )')
    .eq('project_id', project.id);
  if (asgError) throw asgError;
  // Calculate consumed budget: sum of hours * staff rate (from metadata.rate or grade mapping)
  let consumedBudget = 0;
  assignments.forEach(a => {
    // Determine rate: metadata.rate takes precedence, otherwise lookup by grade
    let rate = 0;
    if (a.staff && a.staff.metadata && a.staff.metadata.rate) {
      rate = parseFloat(a.staff.metadata.rate) || 0;
    } else if (a.staff && a.staff.grade) {
      rate = gradeRates[a.staff.grade] || 0;
    }
    consumedBudget += a.hours * rate;
  });
  return {
    projectId: project.id,
    projectName: project.name,
    description: project.description,
    partnerName: project.partnerName,
    teamLead: project.teamLead,
    budget: project.budget,
    consumedBudget,
    remainingBudget: typeof project.budget === 'number' ? project.budget - consumedBudget : null
  };
}

async function getAllProjects() {
  const { data: allProjects, error } = await supabase.from('projects').select('*');
  if (error) throw error;
  return allProjects.map(p => ({
    projectId: p.id,
    projectName: p.name,
    description: p.description,
    partnerName: p.partnerName,
    teamLead: p.teamLead,
    budget: p.budget
  }));
}

async function getTeamAvailability({ from, to }) {
  const start = new Date(from);
  const end   = new Date(to);
  const staff = await supabase.from('staff').select('*');
  const assignments = await supabase.from('assignments').select('*').gte('date', start).lte('date', end);

  const days = Math.floor((end - start)/(1000*60*60*24))+1;
  const totalPossible = days * 8;

  return staff.map(s=>{
    const assigned = assignments.filter(a=>a.staff_id===s.id).reduce((sum,a)=>sum+a.hours,0);
    return {
      staffId: s.id,
      staffName: s.name,
      assignedHours: assigned,
      availableHours: totalPossible - assigned
    };
  });
}

async function getProductiveHours({ from, to }) {
  const start = new Date(from);
  const end   = new Date(to);
  const assignments = await supabase.from('assignments').select('*').gte('date', start).lte('date', end);
  return { from, to, totalProductiveHours: assignments.reduce((s,a)=>s+a.hours,0) };
}

async function getStaffProductiveHours({ staffName, from, to }) {
  const allStaff = await supabase.from('staff').select('*');
  const staff = allStaff.find(s => s.name.toLowerCase() === staffName.toLowerCase());
  if (!staff) return { staffName, productiveHours: 0 };

  const start = new Date(from);
  const end   = new Date(to);
  const assignments = await supabase.from('assignments').select('*').eq('staff_id', staff.id).gte('date', start).lte('date', end);
  const total = assignments.reduce((s,a)=>s+a.hours,0);
  return { staffId: staff.id, staffName: staff.name, from, to, productiveHours: total };
}

/**
 * Create or update assignments in bulk.
 * If an assignment for (staff, project, date) already exists we update its hours.
 */
async function createAssignmentsFromSchedule({ assignments }) {
  const createdOrUpdated = [];

  for (const row of assignments) {
    try {
      const saved = await supabase.from('assignments').upsert({
        where : {
          staffId_projectId_date: {            // ← name must match your @@unique
            staffId  : row.staffId,
            projectId: row.projectId,
            date     : new Date(row.date)
          }
        },
        update: { hours: row.hours },          // change hours if it exists
        create: {
          staffId  : row.staffId,
          projectId: row.projectId,
          date     : new Date(row.date),
          hours    : row.hours
        },
        include: { project:true, staff:true }
      });

      createdOrUpdated.push({
        id         : saved.id,
        staffName  : saved.staff.name,
        projectName: saved.project.name,
        date       : (new Date(saved.date)).toISOString().split('T')[0],
        hours      : saved.hours,
        bookedHours: saved.hours
      });

    } catch (error) {
      console.error('createAssignmentsFromSchedule upsert:', {
        message : error.message,
        code    : error.code,
        meta    : error.meta
      });
    }
  }

  /* ---------- nicer summary ---------- */
  const grouped = {};
  createdOrUpdated.forEach(a => {
    grouped[a.staffName] = grouped[a.staffName] || [];
    grouped[a.staffName].push(a.date);
  });

  const messageLines = Object.entries(grouped)
    .map(([name, dates]) =>
      `${name}: ${dates.length} days (${dates[0]} – ${dates.slice(-1)[0]})`
    )
    .join('\n• ');

  return {
    success: true,
    message:
      `✅ Scheduled ${createdOrUpdated.length} rows ` +
      `for ${Object.keys(grouped).length} staff.\n\n• ${messageLines}`,
    assignments: createdOrUpdated
  };
}


/* ------------------------------------------------------------------ */
/* 3. Enhanced booking parser                                         */
/* ------------------------------------------------------------------ */

function parseBookingCommand(query) {
  const lower = query.toLowerCase().trim();
  const isBookingCommand =
    ['book', 'schedule', 'assign', 'allocate'].some(k => lower.includes(k));
  if (!isBookingCommand) return null;

  /* ---------- team / bulk detection ---------- */
  const teamRx = /\b(?:all|entire|whole|complete|\bthe\b)?\s*(?:members?|people)?\s*(?:from|of)?\s*([a-z0-9 ][a-z0-9 ]*?)\s+team\b/i;
  const teamMatch = teamRx.exec(lower);
  const teamName  = teamMatch ? teamMatch[1].trim() : null;

  /* ---------- staff phrase (if not a team) ---------- */
  let staffName = null;
  if (!teamName) {
    const staffRx = /(?:book|schedule|assign|allocate)\s+(.*?)\s+on\s+/i;
    const m = staffRx.exec(query);
    staffName = m ? m[1].trim() : null;
  }

  /* ---------- project + hours ---------- */
  const projects = [];
  const projRx = /\bproj(?:ect)?\s+([a-z0-9][a-z0-9 ]*?)\s+for\s+(\d+)\s*(?:h|hr|hrs?|hours?)/gi;
  let pp;
  while ((pp = projRx.exec(lower)) !== null) {
    const [, pName, hrs] = pp;
    if (!projects.some(p => p.projectName.toLowerCase() === pName.toLowerCase()))
      projects.push({ projectName: pName.trim(), hours: +hrs });
  }

  /* ---------- date or date-range ---------- */
  let date = null;
  let dateRange = parseDateRange(lower);
  if (!dateRange) {
    const singleRx = /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?/i;
    const s = singleRx.exec(lower);
    if (s) {
      const [, dd, mon, yr] = s;
      const year = yr ? +yr : new Date().getFullYear();
      date = new Date(Date.UTC(year, MONTH_INDEX[mon.toLowerCase()], +dd));
    }
  }

  /* ---------- final object ---------- */
  return {
    isBookingCommand: true,
    staffName,                 // null when a team was used
    teamName,                  // null when individual booking
    projectBookings: projects,
    date,
    dateRange,
    originalQuery: query,
    isMultiProject: projects.length > 1,
    isBulk: !!teamName || !!dateRange || /\ball\b|\beach\b/.test(lower)
  };
}


/* ------------------------------------------------------------------ */
/* 4. Fast direct booking (unchanged body from your original file)     */
/* ------------------------------------------------------------------ */

async function directBooking({ staffName, projectBookings, date }) {
  // split multi-staff names by commas, 'and', or '&'
  const names = staffName
    ? staffName.split(/\s*(?:and|,|&)\s*/i).map(n => n.trim()).filter(Boolean)
    : [];

  if (names.length > 1) {
    let all = [];
    for (const n of names) {
      const r = await directBooking({ staffName: n, projectBookings, date });
      if (!r.success) return r;     // propagate first error
      all = all.concat(r.assignments);
    }
    return {
      success: true,
      message: `Successfully booked ${names.join(', ')} on projects for ${date}.`,
      assignments: all,
      isMultiProject: true
    };
  }

  try {
    console.log(`Direct booking: ${staffName} → ${projectBookings.length} project(s) on ${date}`);

    /* ---------- validation ---------- */
    if (!staffName || !projectBookings?.length || !date) {
      return {
        success: false,
        error:   'missing_info',
        message: `Please provide staff name, project(s) and date.`
      };
    }

    /* ---------- entity look-ups ---------- */
    const { data: allStaff, error: staffError } = await supabase.from('staff').select('*');
    if (staffError) {
      console.error('directBooking staff fetch error:', staffError);
      throw staffError;
    }
    const staff = allStaff.find(s =>
      s.name.toLowerCase().includes(staffName.toLowerCase()) ||
      staffName.toLowerCase().includes(s.name.toLowerCase())
    );
    if (!staff) {
      return {
        success: false,
        error:   'staff_not_found',
        message: `Could not find staff member "${staffName}".`
      };
    }

    const { data: allProjects, error: projectsError } = await supabase.from('projects').select('*');
    if (projectsError) {
      console.error('directBooking projects fetch error:', projectsError);
      throw projectsError;
    }
    const found = [], missing = [];
    for (const b of projectBookings) {
      const p = allProjects.find(pr =>
        pr.name.toLowerCase().includes(b.projectName.toLowerCase()) ||
        b.projectName.toLowerCase().includes(pr.name.toLowerCase())
      );
      p ? found.push({ project: p, hours: b.hours }) : missing.push(b.projectName);
    }
    if (missing.length) {
      return {
        success: false,
        error:   'project_not_found',
        message: `Could not find project(s): ${missing.join(', ')}.`
      };
    }

    /* ---------- capacity check ---------- */
    const target = new Date(date);
    const dayStart = new Date(Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()));
    // Use ISO date string for filtering by date
    const dayStr = dayStart.toISOString().split('T')[0];
    const { data: todays, error: assignmentsError } = await supabase.from('assignments').select('*')
      .eq('staff_id', staff.id)
      .eq('date', dayStr);
    if (assignmentsError) {
      console.error('directBooking assignments fetch error:', assignmentsError);
      throw assignmentsError;
    }
    const current = todays.reduce((sum, a) => sum + a.hours, 0);
    const incoming = found.reduce((s,f)=>s+f.hours,0);
    if (current + incoming > 8) {
      return {
        success: false,
        error:   'overbooked',
        message: `${staff.name} already has ${current}h on ${date}. Adding ${incoming}h would exceed 8-hour limit.`
      };
    }

    /* ---------- create assignments ---------- */
    const created = [];
    for (const f of found) {
      // Insert and select to get related staff and project names
      const { data: a, error: insertErr } = await supabase
        .from('assignments')
        .insert({
          staff_id: staff.id,
          project_id: f.project.id,
          date: dayStr,
          hours: f.hours
        })
        .select('*, staff(name), projects(name)')
        .single();
      if (insertErr) {
        console.error('directBooking insert error:', insertErr);
        throw insertErr;
      }
      created.push({
        id: a.id,
        staffName: a.staff.name,
        projectName: a.projects.name,
        date: (new Date(a.date)).toISOString().split('T')[0],
        hours: a.hours,
        bookedHours: a.hours
      });
    }
    
    /* ---------- nicer summary ---------- */
    const grouped = {};
    created.forEach(a => {
      grouped[a.projectName] = grouped[a.projectName] || [];
      grouped[a.projectName].push(a.date);
    });
    
    const messageLines = Object.entries(grouped)
      .map(([proj, dates]) =>
        `${proj}: ${dates.length} day${dates.length>1?'s':''} (${dates[0]} – ${dates.slice(-1)[0]})`
      )
      .join('\n• ');
    
    return {
      success: true,
      message:
        `✅ Booked ${staff.name} on ${created.length} row${created.length>1?'s':''}\n\n• ${messageLines}`,
      assignments: created
    };
    
  } catch (e) {
    console.error('directBooking:', e);
    return { success:false, error:'db_error', message:e.message };
  }
}

async function getTotalBudget() {
  const projects = await supabase.from('projects').select('*');
  const totalBudget = projects.reduce((sum, p) => sum + (typeof p.budget === 'number' ? p.budget : 0), 0);
  return { totalBudget };
}

// ------------------------------------------------------------------
// 6. Generic project finder for arbitrary queries
// ------------------------------------------------------------------
async function findProjects({ filter = {}, sort = {}, limit = 10 }) {
  // User-supplied filter and sort should correspond to Supabase where/orderBy
  const projects = await supabase.from('projects').select('*').where(filter).orderBy(sort).limit(limit);
  return { projects };
}

// ------------------------------------------------------------------
// 7. Generic project aggregator for grouping/counting
// ------------------------------------------------------------------
async function aggregateProjects({ groupBy, metrics = ['count'], filter = {}, sort = {}, limit }) {
  // Build groupBy arguments for Supabase
  const groupArgs = { where: filter, by: [groupBy] };
  if (metrics.includes('count')) groupArgs._count = { _all: true };
  if (metrics.includes('avgBudget')) groupArgs._avg = { budget: true };
  if (sort) {
    // sort on aggregated fields
    groupArgs.orderBy = {};
    if (metrics.includes('count') && sort.count) groupArgs.orderBy._count = { _all: sort.count };
    if (metrics.includes('avgBudget') && sort.avgBudget) groupArgs.orderBy._avg = { budget: sort.avgBudget };
  }
  if (limit) groupArgs.take = limit;
  const result = await supabase.from('projects').groupBy(groupArgs);
  return { result };
}

/* ------------------------------------------------------------------ */
/* 5. Exports                                                         */
/* ------------------------------------------------------------------ */

module.exports = {
  // data access
  getStaffAssignments,
  getAllStaff,
  getProjectDetails,
  getAllProjects,
  getTotalBudget,
  findProjects,
  aggregateProjects,
  getTeamAvailability,
  getProductiveHours,
  getStaffProductiveHours,
  createAssignmentsFromSchedule,

  // NLP helpers
  parseBookingCommand,
  parseDateRange,
  parseReplacement,

  // fast path
  directBooking
};
require('dotenv').config();
// Startup sanity checks for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set. Please add it to your .env file.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set. Please add it to your .env file.');
  process.exit(1);
}
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const {
  getStaffAssignments,
  getAllStaff,
  getProjectDetails,
  getTeamAvailability,
  getProductiveHours,
  getStaffProductiveHours,
  createAssignmentsFromSchedule,
  parseBookingCommand,
  directBooking
} = require('./chatFunctions');
const prisma = require('./prismaClient');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Map function names to implementations for dynamic invocation
const functionMapping = {
  getStaffAssignments,
  getAllStaff,
  getProjectDetails,
  getTeamAvailability,
  getProductiveHours,
  getStaffProductiveHours
};

// Define available functions for OpenAI function calling
const functionDefinitions = [
  {
    name: 'getStaffAssignments',
    description: 'Get project assignments for a staff member between two dates',
    parameters: {
      type: 'object',
      properties: {
        staffName: { type: 'string' },
        from: { type: 'string', format: 'date' },
        to: { type: 'string', format: 'date' }
      },
      required: ['staffName', 'from', 'to']
    }
  },
  {
    name: 'getAllStaff',
    description: 'Get list of all staff members with details',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getProjectDetails',
    description: 'Get details for a project including total and remaining budgeted hours',
    parameters: {
      type: 'object',
      properties: {
        projectName: { type: 'string' }
      },
      required: ['projectName']
    }
  },
  {
    name: 'getTeamAvailability',
    description: 'Get team availability between two dates (assigned vs available hours)',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', format: 'date' },
        to: { type: 'string', format: 'date' }
      },
      required: ['from', 'to']
    }
  },
  {
    name: 'getProductiveHours',
    description: 'Get total productive hours for all staff between two dates',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', format: 'date' },
        to: { type: 'string', format: 'date' }
      },
      required: ['from', 'to']
    }
  },
  {
    name: 'getStaffProductiveHours',
    description: 'Get productive hours for a staff member between two dates',
    parameters: {
      type: 'object',
      properties: {
        staffName: { type: 'string' },
        from: { type: 'string', format: 'date' },
        to: { type: 'string', format: 'date' }
      },
      required: ['staffName', 'from', 'to']
    }
  }
];

// --- Data CRUD endpoints ---
// Staff CRUD
app.get('/api/staff', async (req, res) => {
  const staff = await prisma.staff.findMany();
  res.json(staff);
});
app.post('/api/staff', async (req, res) => {
  const newStaff = await prisma.staff.create({ data: req.body });
  res.status(201).json(newStaff);
});

// Update staff
app.put('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  const updatedStaff = await prisma.staff.update({ where: { id }, data: req.body });
  res.json(updatedStaff);
});
// Delete staff
app.delete('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  // Delete assignments linked to this staff to avoid foreign key constraint errors
  await prisma.assignment.deleteMany({ where: { staffId: id } });
  // Now delete the staff record
  await prisma.staff.delete({ where: { id } });
  res.status(204).end();
});

// Projects CRUD
app.get('/api/projects', async (req, res) => {
  const projects = await prisma.project.findMany();
  res.json(projects);
});
app.post('/api/projects', async (req, res) => {
  const newProject = await prisma.project.create({ data: req.body });
  res.status(201).json(newProject);
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const updatedProject = await prisma.project.update({ where: { id }, data: req.body });
  res.json(updatedProject);
});
// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  // Delete assignments linked to this project to avoid foreign key constraint errors
  await prisma.assignment.deleteMany({ where: { projectId: id } });
  // Now delete the project record
  await prisma.project.delete({ where: { id } });
  res.status(204).end();
});

// Assignments CRUD
app.get('/api/assignments', async (req, res) => {
  // Include project details for frontend display
  const assignments = await prisma.assignment.findMany({ include: { project: true } });
  const formatted = assignments.map((a) => ({
    id: a.id,
    staffId: a.staffId,
    projectId: a.projectId,
    date: a.date.toISOString().split('T')[0],
    hours: a.hours,
    projectName: a.project.name
  }));
  res.json(formatted);
});
app.post('/api/assignments', async (req, res) => {
  const { staffId, projectId, date, hours } = req.body;
  const newAssignment = await prisma.assignment.create({
    data: {
      staffId,
      projectId,
      date: new Date(date),
      hours,
    },
  });
  res.status(201).json(newAssignment);
});

// Availability endpoint for CrewAI AvailabilityFetcher
app.get('/api/availability', async (req, res) => {
  const { date } = req.query;
  
  // Build a safe UTC date range for the requested day to avoid timezone issues
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: "Invalid date format. Please provide a valid date (YYYY-MM-DD)." });
  }
  
  // Compute start-of-day and end-of-day in UTC
  const startOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
  const endOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate(), 23, 59, 59, 999));
  
  // Fetch assignments that fall within that UTC day window
  const assignments = await prisma.assignment.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  const staffList = await prisma.staff.findMany();
  const availability = staffList.map((staff) => {
    const assignedHours = assignments
      .filter((a) => a.staffId === staff.id)
      .reduce((sum, a) => sum + a.hours, 0);
    return {
      staffId: staff.id,
      staffName: staff.name,
      assignedHours,
      availableHours: Math.max(8 - assignedHours, 0)
    };
  });
  res.json(availability);
});

// Orchestration endpoint to integrate CrewAI orchestrator-service
app.post('/api/orchestrate', async (req, res) => {
  const { date, query, staffIds, projectIds, hours, mode } = req.body;
  
  // FAST DIRECT BOOKING - Handle booking commands directly (millisecond response time) in AGENT mode
  if (query) {
    const bookingCommand = parseBookingCommand(query);
    if (bookingCommand) {
      try {
        console.log('Fast booking detected in orchestrate endpoint:', bookingCommand);
        const startTime = Date.now();
        
        const result = await directBooking({
          staffName: bookingCommand.staffName,
          projectName: bookingCommand.projectName,
          hours: bookingCommand.hours,
          date: bookingCommand.date
        });
        
        const duration = Date.now() - startTime;
        console.log(`Direct booking completed in ${duration}ms`);
        
        if (result.success) {
          // Return in format expected by agent mode (with resolvedMatches)
          return res.json({
            success: true,
            message: result.message,
            resolvedMatches: [{
              staffId: result.assignment.staffName,
              staffName: result.assignment.staffName,
              assignedHours: result.assignment.hours,
              date: result.assignment.date
            }],
            processingTime: `${duration}ms`,
            booking: result.assignment
          });
        } else {
          return res.json({ 
            success: false,
            error: result.error,
            message: result.message,
            processingTime: `${duration}ms`
          });
        }
      } catch (error) {
        console.error('Fast booking error in orchestrate:', error);
        return res.json({ 
          success: false,
          error: 'booking_error',
          message: `Booking failed: ${error.message}`
        });
      }
    }
  }
  
  // Build request payload based on provided data
  const payload = {
    ...(date && { date }),
    ...(query && { query }),
    ...(staffIds && { staffIds }),
    ...(projectIds && { projectIds }),
    ...(hours && { hours }),
    ...(mode && { mode })
  };
  
  // Validate date if provided
  if (date) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Please provide a valid date." });
    }
  }
  
  try {
    const { data } = await axios.post('http://localhost:8000/orchestrate', payload, {
      timeout: 5000, // 5 second timeout
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(data);
  } catch (error) {
    console.error('Error orchestrating:', error);
    
    // Check if it's a connection error or timeout
    const isConnectionError = error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED';
    
    if (isConnectionError) {
      // Handle the case where orchestrator might be starting up
      console.log('Orchestrator service not yet available. It might be starting up...');
      
      // Return a user-friendly message
      return res.status(503).json({ 
        error: "Orchestrator service starting", 
        details: "The Python orchestrator service is starting up. Please try again in a few moments.",
        retryable: true,
        message: error.message 
      });
    }
    
    // Return a more informative error for other types of errors
    res.status(503).json({ 
      error: "Could not connect to orchestrator service", 
      details: "There was an issue with the orchestrator service. The service should start automatically with the application.",
      message: error.message 
    });
  }
});

// Ask endpoint to handle user queries via orchestrator-service
app.post('/api/ask', async (req, res) => {
  const { query } = req.body;
  
  // Quick deterministic handlers for simple queries (bypass AI to ensure accuracy)
  const lowerQ = (query || '').toLowerCase().trim();
  // 1) how many staff members
  const staffCountPattern = /(how\s+many|number\s+of)\s+staff/;
  if (staffCountPattern.test(lowerQ)) {
    try {
      const count = await prisma.staff.count();
      return res.json({ content: `There are a total of ${count} staff members.`, type: 'text' });
    } catch (err) {
      console.error('Direct count error', err);
    }
  }
  
  // 2) how many projects
  const projectCountPattern = /(how\s+many|number\s+of)\s+projects/;
  if (projectCountPattern.test(lowerQ)) {
    try {
      const count = await prisma.project.count();
      return res.json({ content: `There are a total of ${count} projects added so far.`, type: 'text' });
    } catch (err) {
      console.error('Direct project count error', err);
    }
  }
  
  // 3) FAST DIRECT BOOKING - Handle booking commands directly (millisecond response time)
  const bookingCommand = parseBookingCommand(query);
  if (bookingCommand) {
    try {
      console.log('Fast booking detected:', bookingCommand);
      const startTime = Date.now();
      
      const result = await directBooking({
        staffName: bookingCommand.staffName,
        projectName: bookingCommand.projectName,
        hours: bookingCommand.hours,
        date: bookingCommand.date
      });
      
      const duration = Date.now() - startTime;
      console.log(`Direct booking completed in ${duration}ms`);
      
      if (result.success) {
        return res.json({ 
          content: result.message,
          type: 'text',
          booking: result.assignment,
          processingTime: `${duration}ms`
        });
      } else {
        return res.json({ 
          content: result.message,
          type: 'text',
          error: result.error,
          processingTime: `${duration}ms`
        });
      }
    } catch (error) {
      console.error('Fast booking error:', error);
      return res.json({ 
        content: `Booking failed: ${error.message}`,
        type: 'text',
        error: 'booking_error'
      });
    }
  }
  
  // 4) detect schedule queries like:
  //    "Is John Al Saud on any project on 19th May?"
  //    "Is John from Forensic scheduled on 19 May 2025?"
  //    "John Al Saud is not scheduled on 19 May"
  const scheduleRegex = /(is\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+)*)(?:\s+from\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*))?\s+(?:is\s+)?(?:not\s+)?(?:scheduled|on).*on\s+(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?/i;
  const scheduleMatch = query.match(scheduleRegex);
  if (scheduleMatch) {
    const [, , rawName, deptWord, dayStr, monthStr, yearStr] = scheduleMatch;
    const monthNames = {
      january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11
    };
    const day = parseInt(dayStr, 10);
    const monthIndex = monthNames[monthStr.toLowerCase()];
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
    // Create a UTC date to avoid timezone shifting
    const targetDateUTC = new Date(Date.UTC(year, monthIndex, day));
    // Create date range (UTC) for querying
    const startOfDay = targetDateUTC;
    const endOfDay = new Date(Date.UTC(year, monthIndex, day, 23, 59, 59, 999));
    const dateISO = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // try to find staff by name (case-insensitive)
    const staffList = await prisma.staff.findMany();

    // Normalize helper to strip spaces, hyphens, punctuation and lowercase
    const norm = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetNorm = norm(rawName);

    // Normalize department filter and comparison to ignore spaces, punctuation and case
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const deptFilterNorm = deptWord ? normalize(deptWord) : null;

    let matching = staffList.filter(s => {
      if (deptFilterNorm) {
        const staffDeptNorm = normalize(s.department || '');
        if (!staffDeptNorm.includes(deptFilterNorm)) {
          return false;
        }
      }
      const nameNorm = norm(s.name);
      return nameNorm === targetNorm || nameNorm.includes(targetNorm) || targetNorm.includes(nameNorm);
    });

    // If nothing matched but we applied a department filter, retry ignoring department (user may have specified team or role instead)
    if (matching.length === 0 && deptFilterNorm) {
      matching = staffList.filter(s => {
        const nameNorm = norm(s.name);
        return nameNorm === targetNorm || nameNorm.includes(targetNorm) || targetNorm.includes(nameNorm);
      });
    }

    // Final fallback: try matching on FIRST token of the name (e.g., "John") if still nothing
    if (matching.length === 0) {
      const firstToken = targetNorm.split(/\s+/)[0];
      if (firstToken.length >= 2) {
        matching = staffList.filter(s => norm(s.name).includes(firstToken));
      }
    }

    if (matching.length === 0) {
      return res.json({ content: `I couldn't find anyone named ${rawName} in the staff database.`, type: 'text' });
    }

    if (matching.length > 1) {
      const names = matching.map(s => s.name).join(', ');
      return res.json({ content: `I found multiple staff members that match: ${names}. Please specify which one you mean along with the date again (e.g., \"John Al-Saud on 21st May 2025\").`, type: 'text' });
    }

    const staffObj = matching[0];

    // check assignments
    const assignments = await prisma.assignment.findMany({
      where: {
        staffId: staffObj.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    if (assignments.length === 0) {
      return res.json({ content: `${staffObj.name} is not scheduled for any project on ${dateISO}.`, type: 'text' });
    } else {
      const projIds = assignments.map(a => a.projectId);
      const projects = await prisma.project.findMany({ where: { id: { in: projIds } } });
      // Group hours by project
      const hoursByProject = {};
      assignments.forEach(a => {
        hoursByProject[a.projectId] = (hoursByProject[a.projectId] || 0) + a.hours;
      });

      const projDetails = projects.map(p => `${p.name} (${hoursByProject[p.id] || 0}h)`).join(', ');
      const totalHours = assignments.reduce((sum,a)=>sum+a.hours,0);
      return res.json({ content: `${staffObj.name} is scheduled for ${totalHours} hour(s) on ${dateISO} (${projDetails}).`, type: 'text' });
    }
  }
  
  try {
    // Try to connect to the orchestrator service
    const { data } = await axios.post('http://localhost:8000/orchestrate', { query }, {
      timeout: 5000, // 5 second timeout  
      headers: { 'Content-Type': 'application/json' }
    });
    // Normalize orchestrator response to the same shape used in the frontend
    if (typeof data === 'string') {
      return res.json({ content: data, type: 'text' });
    }
    if (data?.content && typeof data.content === 'string') {
      return res.json({ content: data.content, type: data.type || 'text' });
    }
    if (data?.response?.content) {
      return res.json({ content: data.response.content, type: data.response.type || 'text' });
    }
    // Fallback to JSON payload otherwise
    return res.json({ content: JSON.stringify(data), type: 'json' });
  } catch (error) {
    console.error('Ask error:', error);
    
    // Check if it's a connection error or timeout
    const isConnectionError = error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED';
    
    if (isConnectionError) {
      console.log('Orchestrator service not yet available. Falling back to direct OpenAI chat...');
    }
    
    // If we can't connect to orchestrator, fallback to using the chat endpoint
    try {
      const messages = [{ role: 'user', content: query }];
      const initialResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        functions: functionDefinitions,
        function_call: 'auto',
        temperature: 0
      });
      
      const message = initialResponse.choices[0].message;
      let assistantMessage;
      
      // If the model wants to call a function, execute it and re-prompt
      if (message.function_call) {
        const { name, arguments: argsJson } = message.function_call;
        const args = JSON.parse(argsJson);
        // Dynamically invoke the corresponding function
        let functionResult;
        if (functionMapping[name]) {
          functionResult = await functionMapping[name](args);
        }
        // Send the function result back to the model
        const followUp = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            ...messages,
            message,
            { role: 'function', name: name, content: JSON.stringify(functionResult) }
          ],
          temperature: 0
        });
        assistantMessage = followUp.choices[0].message.content;
      } else {
        assistantMessage = message.content;
      }
      
      // Add a note if we're using the fallback due to orchestrator not being ready
      let responseContent = assistantMessage;
      if (isConnectionError) {
        responseContent = `${assistantMessage}\n\n[Note: Using direct chat mode while orchestrator service is starting up. Some advanced features may be limited.]`;
      }
      
      res.json({ content: responseContent, type: 'text' });
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      
      if (isConnectionError) {
        res.status(503).json({ 
          error: "Orchestrator service starting", 
          details: "The orchestrator service is starting up. Please try again in a few moments.",
          retryable: true,
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          error: "Could not connect to orchestrator service and fallback also failed", 
          details: error.message 
        });
      }
    }
  }
});

// Basic chat endpoint - legacy support
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  try {
    // Prepare messages for OpenAI
    const formattedMessages = messages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));

    // Call the model with function definitions to enable data retrieval
    const initialResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: formattedMessages,
      functions: functionDefinitions,
      function_call: 'auto',
      temperature: 0
    });
    const message = initialResponse.choices[0].message;
    let assistantMessage;
    // If the model wants to call a function, execute it and re-prompt
    if (message.function_call) {
      const { name, arguments: argsJson } = message.function_call;
      const args = JSON.parse(argsJson);
      // Dynamically invoke the corresponding function
      let functionResult;
      if (functionMapping[name]) {
        functionResult = await functionMapping[name](args);
      }
      // Send the function result back to the model
      const followUp = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          ...formattedMessages,
          message,
          { role: 'function', name: name, content: JSON.stringify(functionResult) }
        ],
        temperature: 0
      });
      assistantMessage = followUp.choices[0].message.content;
    } else {
      assistantMessage = message.content;
    }
    res.json({ response: { content: assistantMessage } });
  } catch (error) {
    console.error('Chat error:', error);
    if (error.response) {
      console.error(`OpenAI response error ${error.response.status}:`, error.response.data);
    }
    // Return actual error message for debugging
    res.status(500).json({ error: error.message || 'Chat service error' });
  }
});

// Legacy chat routes removed

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Chat server listening on port ${port}`)); 
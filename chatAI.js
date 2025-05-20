// chatAI.js - Advanced AI integration for Staff Scheduler chatbot

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const prisma = require('./prismaClient');
const { 
  getStaffAssignments, 
  getAllStaff, 
  getProjectDetails, 
  getTeamAvailability, 
  getProductiveHours, 
  getStaffProductiveHours,
  createAssignmentsFromSchedule
} = require('./chatFunctions');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-testing'
});

// Context and memory for the chatbot
let conversationHistory = [];
const MAX_HISTORY_LENGTH = 10;

// Storage for learned patterns
const LEARNINGS_DIR = path.join(__dirname, 'data');
const LEARNINGS_FILE = path.join(LEARNINGS_DIR, 'learnings.json');

// Ensure data directory exists
if (!fs.existsSync(LEARNINGS_DIR)) {
  fs.mkdirSync(LEARNINGS_DIR, { recursive: true });
}

// Initialize learnings file if it doesn't exist
if (!fs.existsSync(LEARNINGS_FILE)) {
  fs.writeFileSync(LEARNINGS_FILE, JSON.stringify({ 
    patterns: [], 
    insights: [],
    lastAnalysisTime: new Date().toISOString()
  }));
}

// Function to parse user intent and route to appropriate data functions
async function routeQuery(query) {
  try {
    // Determine user intent using AI
    const intentResponse = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a staff scheduling assistant. Analyze the user query and return a JSON object specifying the requested information type and parameters. Valid types: staffAssignments, allStaff, projectDetails, teamAvailability, productiveHours, staffProductiveHours, scheduleProject, reasoning. For questions about whether a staff member is available or working on a specific date, use 'staffAssignments' type. Include all relevant parameters in the params object."
        },
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" }
    });
    
    const intent = JSON.parse(intentResponse.choices[0].message.content);
    console.log("Classified intent:", intent);
    
    // Route to appropriate function based on intent
    let data;
    switch (intent.type) {
      case 'staffAssignments':
        // Handle when date is provided in different formats
        if (intent.params && intent.params.staffName) {
          // If from/to dates are not specified but a specific date is mentioned,
          // set both from and to to the same date
          if (!intent.params.from && !intent.params.to && intent.params.date) {
            intent.params.from = intent.params.date;
            intent.params.to = intent.params.date;
          }
          
          // Ensure dates are in YYYY-MM-DD format
          if (intent.params.from) {
            try {
              const fromDate = new Date(intent.params.from);
              intent.params.from = fromDate.toISOString().split('T')[0];
            } catch (e) {
              console.error("Error parsing 'from' date:", e);
            }
          }
          
          if (intent.params.to) {
            try {
              const toDate = new Date(intent.params.to);
              intent.params.to = toDate.toISOString().split('T')[0];
            } catch (e) {
              console.error("Error parsing 'to' date:", e);
            }
          }
          
          // If dates are still missing, default to today
          if (!intent.params.from || !intent.params.to) {
            const today = new Date().toISOString().split('T')[0];
            intent.params.from = intent.params.from || today;
            intent.params.to = intent.params.to || today;
          }
        }
        
        data = await getStaffAssignments(intent.params);
        break;
      case 'allStaff':
        data = await getAllStaff();
        break;
      case 'projectDetails':
        data = await getProjectDetails(intent.params);
        break;
      case 'teamAvailability':
        data = await getTeamAvailability(intent.params);
        break;
      case 'productiveHours':
        data = await getProductiveHours(intent.params);
        break;
      case 'staffProductiveHours':
        data = await getStaffProductiveHours(intent.params);
        break;
      case 'scheduleProject':
        data = await generateSchedule(intent.params);
        break;
      case 'reasoning':
        data = null; // No specific data needed for pure reasoning
        break;
      default:
        // Instead of throwing error, try to infer intent from query
        console.warn(`Unrecognized intent type: ${intent.type}. Attempting fallback...`);
        
        // Simple fallback detection based on keywords
        if (query.toLowerCase().includes('available') || 
            query.toLowerCase().includes('schedule') || 
            query.toLowerCase().includes('assigned') ||
            query.toLowerCase().includes('working')) {
          
          // Extract possible staff name and date from query
          const staffNameMatch = query.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/);
          const dateMatch = query.match(/\b(\d{1,2}[ -]?(?:January|February|March|April|May|June|July|August|September|October|November|December)[ -]?(?:20\d{2}|\d{2}))\b/i) || 
                            query.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)[ -]?(\d{1,2})[ -,]?[ -]?(?:20\d{2}|\d{2})\b/i) ||
                            query.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}\.\d{2}\.\d{4})\b/);
          
          if (staffNameMatch) {
            const staffName = staffNameMatch[1];
            let date = new Date().toISOString().split('T')[0]; // Default to today
            
            if (dateMatch) {
              try {
                date = new Date(dateMatch[1]).toISOString().split('T')[0];
              } catch (e) {
                console.error("Fallback date parsing failed:", e);
              }
            }
            
            data = await getStaffAssignments({ 
              staffName, 
              from: date, 
              to: date 
            });
          } else {
            // If no specific staff, get team availability
            data = await getTeamAvailability({ 
              from: new Date().toISOString().split('T')[0], 
              to: new Date().toISOString().split('T')[0] 
            });
          }
        }
        // If nothing else works, just return empty data
        else {
          data = null;
        }
    }
    
    return { intent, data };
  } catch (error) {
    console.error("Error routing query:", error);
    // Don't throw the error, instead return null data with reasoning intent
    // This allows the conversation to continue even if intent detection fails
    return { 
      intent: { type: 'reasoning' }, 
      data: null,
      error: error.message
    };
  }
}

// Function to generate chatbot response
async function generateResponse(query, userData = {}) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-testing') {
      console.warn("Warning: Using dummy OpenAI API key. Set OPENAI_API_KEY in your .env file for actual API calls.");
      return "AI functionality is disabled. Please add your OpenAI API key to the .env file to enable this feature.";
    }
    
    // Add query to conversation history
    conversationHistory.push({ role: "user", content: query });
    
    let data = null;
    let intent = { type: 'reasoning' };
    let queryError = null;
    
    try {
      // Get relevant data based on query intent
      const queryResult = await routeQuery(query);
      intent = queryResult.intent;
      data = queryResult.data;
      queryError = queryResult.error; // This will be null if no error occurred
    } catch (intentError) {
      console.error("Error determining intent:", intentError);
      queryError = intentError.message;
      // Continue with reasoning intent and no data
    }
    
    // Load learned patterns and insights
    const learnings = getLearnings();
    
    // Generate system message with context
    const systemMessage = {
      role: "system",
      content: `You are an AI assistant for a Staff Scheduling system. 
      Today is ${new Date().toISOString().split('T')[0]}. 
      You have access to staff assignments, project details, availability, and productive hours.
      When suggesting schedules, consider staff availability, expertise, and project requirements.
      
      Use these learned patterns and insights from previous scheduling:
      ${JSON.stringify(learnings.patterns.slice(-5))}
      ${JSON.stringify(learnings.insights.slice(-5))}
      
      Be concise, accurate, and helpful. Format numbers nicely and present information clearly.`
    };
    
    // Add retrieved data as context if available
    const messages = [
      systemMessage,
      ...conversationHistory.slice(-MAX_HISTORY_LENGTH)
    ];
    
    if (data) {
      messages.push({
        role: "system",
        content: `Relevant data for query: ${JSON.stringify(data)}`
      });
    }
    
    // If there was an error, inform the AI to provide a helpful response anyway
    if (queryError) {
      messages.push({
        role: "system",
        content: `There was an error retrieving data: "${queryError}". 
        Please acknowledge the query and explain that you couldn't find specific data, 
        but still provide a helpful response based on general knowledge about scheduling systems. 
        If the user is asking about a specific staff member or project, mention that you couldn't find 
        detailed information but you can check other dates or staff members if they'd like.`
      });
    }
    
    // Generate response
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-3.5-turbo",
      messages: messages
    });
    
    const responseText = response.choices[0].message.content;
    
    // Add response to conversation history
    conversationHistory.push({ role: "assistant", content: responseText });
    
    // Trim history if too long
    if (conversationHistory.length > MAX_HISTORY_LENGTH * 2) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH * 2);
    }
    
    return responseText;
  } catch (error) {
    console.error("Error generating response:", error);
    
    // Provide a more specific error message based on the error type
    if (error.name === 'AuthenticationError') {
      return "Authentication error with the AI service. Please check your API key configuration.";
    } else if (error.name === 'RateLimitError') {
      return "The AI service rate limit has been reached. Please try again later.";
    } else if (error.name === 'ServiceUnavailableError') {
      return "The AI service is temporarily unavailable. Please try again later.";
    } else {
      // Attempt to provide a more helpful error response
      try {
        // Generate a fallback response without accessing data
        const fallbackMessages = [
          {
            role: "system",
            content: `You are an AI assistant for a Staff Scheduling system. There was an error processing the user's request: "${error.message}". 
            Provide a helpful response acknowledging the issue and suggesting alternatives. Don't mention specific technical details of the error.`
          },
          { role: "user", content: query }
        ];
        
        const fallbackResponse = await openai.chat.completions.create({
          model: process.env.AI_MODEL || "gpt-3.5-turbo",
          messages: fallbackMessages
        });
        
        // Add response to conversation history but mark it as fallback
        const fallbackText = fallbackResponse.choices[0].message.content;
        conversationHistory.push({ role: "assistant", content: fallbackText });
        
        return fallbackText;
      } catch (fallbackError) {
        // If even the fallback fails, return a simple error message
        return "I encountered an error while processing your request. Please try again or rephrase your question.";
      }
    }
  }
}

// Function to execute agent actions based on natural language instructions
async function executeAgentAction(instruction) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-testing') {
      console.warn("Warning: Using dummy OpenAI API key. Set OPENAI_API_KEY in your .env file for actual API calls.");
      return {
        success: false,
        message: "AI agent functionality is disabled. Please add your OpenAI API key to the .env file to enable this feature."
      };
    }

    // Parse the instruction to determine the action type and extract parameters
    const actionResponse = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a staff scheduling agent that extracts scheduling information from instructions. 
          
          EXAMPLES:
          Input: "Schedule Fatima Dubois on project Vanguard for 4 hours and project Eclipse for 2 hours on June 2, 2025"
          Output: 
          {
            "action": "schedule",
            "staffName": "Fatima Dubois",
            "assignments": [
              {
                "projectName": "Vanguard",
                "dates": ["2025-06-02"],
                "hours": 4
              },
              {
                "projectName": "Eclipse",
                "dates": ["2025-06-02"],
                "hours": 2
              }
            ]
          }

          Input: "Schedule John on project Alpha for 8 hours on 2023-05-15 to 2023-05-18"
          Output:
          {
            "action": "schedule",
            "staffName": "John",
            "assignments": [
              {
                "projectName": "Alpha",
                "dates": ["2023-05-15", "2023-05-16", "2023-05-17", "2023-05-18"],
                "hours": 8
              }
            ]
          }
          
          Parse the instruction and return a JSON object with the following fields:
          - action: The type of action (schedule, unschedule, modify, report)
          - staffName: The name of the staff member
          - assignments: An array of assignments with the following structure for each:
              - projectName: The name of the project
              - dates: Array of dates in YYYY-MM-DD format
              - hours: Number of hours for each date
          - notes: Any additional notes or context
          
          For date ranges, expand to include all dates in the range. For date formats, convert to YYYY-MM-DD.`
        },
        { role: "user", content: instruction }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the action parameters
    const action = JSON.parse(actionResponse.choices[0].message.content);
    console.log("Parsed action:", action);
    
    // Get staff ID from name
    const allStaff = await prisma.staff.findMany();
    const staff = allStaff.find(s => s.name.toLowerCase() === action.staffName.toLowerCase());
    if (!staff) {
      return {
        success: false,
        message: `Staff member "${action.staffName}" not found.`
      };
    }

    // Execute the scheduling action
    if (action.action === 'schedule') {
      // Handle assignments array if it exists, otherwise create one from single project data
      const assignments = action.assignments || [{
        projectName: action.projectName,
        dates: action.dates || [],
        hours: action.hours
      }];
      
      if (assignments.length === 0) {
        return {
          success: false,
          message: "No assignments provided in the instruction."
        };
      }
      
      const allProjects = await prisma.project.findMany();
      const createdAssignments = [];
      const errors = [];
      
      // Process each assignment
      for (const assignment of assignments) {
        // Validate project
        const project = allProjects.find(p => p.name.toLowerCase() === assignment.projectName.toLowerCase());
        if (!project) {
          errors.push(`Project "${assignment.projectName}" not found.`);
          continue;
        }
        
        // Validate dates
        if (!assignment.dates || assignment.dates.length === 0) {
          errors.push(`No dates provided for project "${assignment.projectName}".`);
          continue;
        }
        
        // Validate hours
        if (!assignment.hours || assignment.hours <= 0) {
          errors.push(`Invalid hours (${assignment.hours}) for project "${assignment.projectName}".`);
          continue;
        }
        
        // Create assignments for each date
        for (const date of assignment.dates) {
          try {
            // Check if there's an existing assignment for this staff and date
            const existingAssignment = await prisma.assignment.findFirst({
              where: {
                staffId: staff.id,
                projectId: project.id,
                date: new Date(date)
              }
            });
            
            if (existingAssignment) {
              // Update existing assignment
              const updated = await prisma.assignment.update({
                where: { id: existingAssignment.id },
                data: { hours: assignment.hours },
                include: { project: true }
              });
              
              createdAssignments.push({
                staffName: staff.name,
                projectName: project.name,
                date: date,
                hours: updated.hours,
                status: "updated"
              });
            } else {
              // Create new assignment
              const created = await prisma.assignment.create({
                data: {
                  staffId: staff.id,
                  projectId: project.id,
                  date: new Date(date),
                  hours: assignment.hours
                },
                include: { project: true }
              });
              
              createdAssignments.push({
                staffName: staff.name,
                projectName: project.name,
                date: date,
                hours: created.hours,
                status: "created"
              });
            }
          } catch (error) {
            console.error(`Failed to create/update assignment: ${error.message}`);
            errors.push(`Error for ${project.name} on ${date}: ${error.message}`);
          }
        }
      }
      
      // Return results
      if (createdAssignments.length === 0) {
        return {
          success: false,
          message: "Failed to create any assignments.",
          errors
        };
      }
      
      // Group assignments by project for a cleaner response
      const groupedAssignments = {};
      for (const assignment of createdAssignments) {
        if (!groupedAssignments[assignment.projectName]) {
          groupedAssignments[assignment.projectName] = [];
        }
        groupedAssignments[assignment.projectName].push(assignment);
      }
      
      return {
        success: true,
        action: 'schedule',
        message: `Successfully scheduled ${staff.name} on ${Object.keys(groupedAssignments).length} project(s) for a total of ${createdAssignments.length} assignment(s).`,
        details: {
          staff: staff.name,
          assignments: createdAssignments,
          groupedAssignments,
          errors: errors.length > 0 ? errors : null
        }
      };
    } else if (action.action === 'unschedule') {
      // Handle the array of assignments if it exists
      const assignments = action.assignments || [{
        projectName: action.projectName,
        dates: action.dates || []
      }];
      
      const allProjects = await prisma.project.findMany();
      let deletedCount = 0;
      const errors = [];
      const deletedAssignments = [];
      
      // Process each assignment
      for (const assignment of assignments) {
        // Get the project by name
        const project = assignment.projectName ? 
          allProjects.find(p => p.name.toLowerCase() === assignment.projectName.toLowerCase()) : 
          null;
        
        // If project specified but not found, add error
        if (assignment.projectName && !project) {
          errors.push(`Project "${assignment.projectName}" not found.`);
          continue;
        }
        
        // Build the where clause based on available filters
        const whereClause = {
          staffId: staff.id
        };
        
        // Add project filter if available
        if (project) {
          whereClause.projectId = project.id;
        }
        
        // If dates specified, unschedule for those dates
        if (assignment.dates && assignment.dates.length > 0) {
          for (const date of assignment.dates) {
            try {
              const dateFilter = { ...whereClause, date: new Date(date) };
              
              // Find assignments before deleting to record what was deleted
              const assignmentsToDelete = await prisma.assignment.findMany({
                where: dateFilter,
                include: { project: true }
              });
              
              // Delete the assignments
              const result = await prisma.assignment.deleteMany({
                where: dateFilter
              });
              
              // Record what was deleted
              for (const deleted of assignmentsToDelete) {
                deletedAssignments.push({
                  staffName: staff.name,
                  projectName: deleted.project.name,
                  date: deleted.date.toISOString().split('T')[0],
                  hours: deleted.hours
                });
              }
              
              deletedCount += result.count;
            } catch (error) {
              console.error(`Failed to delete assignment: ${error.message}`);
              errors.push(`Error deleting assignments for ${date}: ${error.message}`);
            }
          }
        } else {
          // If no dates specified, assume all assignments for the staff/project
          try {
            // Find assignments before deleting to record what was deleted
            const assignmentsToDelete = await prisma.assignment.findMany({
              where: whereClause,
              include: { project: true }
            });
            
            // Delete the assignments
            const result = await prisma.assignment.deleteMany({
              where: whereClause
            });
            
            // Record what was deleted
            for (const deleted of assignmentsToDelete) {
              deletedAssignments.push({
                staffName: staff.name,
                projectName: deleted.project.name,
                date: deleted.date.toISOString().split('T')[0],
                hours: deleted.hours
              });
            }
            
            deletedCount += result.count;
          } catch (error) {
            console.error(`Failed to delete assignment: ${error.message}`);
            errors.push(`Error deleting assignments: ${error.message}`);
          }
        }
      }

      return {
        success: deletedCount > 0,
        action: 'unschedule',
        message: deletedCount > 0
          ? `Successfully removed ${deletedCount} assignment(s) for ${staff.name}.`
          : `No assignments found to remove for ${staff.name}.`,
        details: {
          staff: staff.name,
          deletedAssignments,
          errors: errors.length > 0 ? errors : null
        }
      };
    } else if (action.action === 'report') {
      // Get dates from the first assignment or use action.dates
      const dates = action.assignments && action.assignments[0] && action.assignments[0].dates
        ? action.assignments[0].dates
        : action.dates || [];
        
      if (dates.length === 0) {
        // If no dates provided, default to current week
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        const endOfWeek = new Date(today);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        
        dates.push(startOfWeek.toISOString().split('T')[0]);
        dates.push(endOfWeek.toISOString().split('T')[0]);
      }
      
      // Generate a report for the staff member's assignments
      const startDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
      const endDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
      
      const assignments = await prisma.assignment.findMany({
        where: {
          staffId: staff.id,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          project: true
        },
        orderBy: {
          date: 'asc'
        }
      });

      // Group assignments by date for better readability
      const assignmentsByDate = {};
      for (const a of assignments) {
        const dateStr = a.date.toISOString().split('T')[0];
        if (!assignmentsByDate[dateStr]) {
          assignmentsByDate[dateStr] = [];
        }
        assignmentsByDate[dateStr].push({
          project: a.project.name,
          hours: a.hours
        });
      }

      return {
        success: true,
        action: 'report',
        message: `Generated assignment report for ${staff.name} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}.`,
        details: {
          staff: staff.name,
          dateRange: {
            from: startDate.toISOString().split('T')[0],
            to: endDate.toISOString().split('T')[0]
          },
          assignmentsByDate,
          totalAssignments: assignments.length,
          totalHours: assignments.reduce((sum, a) => sum + a.hours, 0)
        }
      };
    } else {
      return {
        success: false,
        message: `Unsupported action type: ${action.action}`
      };
    }
  } catch (error) {
    console.error("Error executing agent action:", error);
    return {
      success: false,
      message: `Failed to execute action: ${error.message}`
    };
  }
}

// Function to schedule a project
async function generateSchedule(params) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-testing') {
      console.warn("Warning: Using dummy OpenAI API key. Set OPENAI_API_KEY in your .env file for actual API calls.");
      return {
        error: true,
        message: "AI scheduling is disabled. Please add your OpenAI API key to the .env file to enable this feature."
      };
    }
    
    const { projectId, projectName, staffNeeded = 3, startDate, endDate, hoursRequired } = params;
    
    // Basic validation
    if (!startDate || !endDate || !hoursRequired) {
      return {
        error: true,
        message: "Missing required parameters (startDate, endDate, hoursRequired)"
      };
    }
    
    // Get all available staff
    const availability = await getTeamAvailability({ 
      from: startDate, 
      to: endDate 
    });
    
    // Check if we have staff available
    if (!availability || availability.length === 0) {
      return {
        error: true,
        message: "No staff members available for scheduling"
      };
    }
    
    // Get project details if existing project
    let project = null;
    if (projectId) {
      // Get directly from database using ID
      project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return {
          error: true,
          message: `Project with ID ${projectId} not found`
        };
      }
    } else if (projectName) {
      // Get using the helper function that does case-insensitive matching
      project = await getProjectDetails({ projectName });
      if (!project) {
        return {
          error: true,
          message: `Project named "${projectName}" not found`
        };
      }
    }
    
    // Load learned patterns to inform scheduling
    const learnings = getLearnings();
    
    // Use AI to generate optimal schedule
    const schedulingPrompt = `
      Create an optimal schedule for project "${projectName || project?.name || 'New Project'}" requiring ${hoursRequired} total hours.
      Time period: ${startDate} to ${endDate}
      Number of staff needed: ${staffNeeded}
      Available staff: ${JSON.stringify(availability)}
      Project details: ${JSON.stringify(project)}
      
      Consider these past scheduling patterns and insights:
      ${JSON.stringify(learnings.patterns.slice(-3))}
      ${JSON.stringify(learnings.insights.slice(-3))}
      
      The schedule should:
      1. Allocate hours based on staff availability
      2. Balance workload across the team
      3. Consider project requirements
      4. Format response as a JSON schedule object with this structure:
      {
        "projectId": "project-id-here", (if existing project)
        "assignments": [
          {
            "staffId": "staff-id-here",
            "projectId": "project-id-here",
            "date": "YYYY-MM-DD",
            "hours": 8
          },
          ...more assignments...
        ]
      }
    `;
    
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are a scheduling AI assistant. Generate optimal staff schedules based on availability." 
        },
        { role: "user", content: schedulingPrompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const schedule = JSON.parse(response.choices[0].message.content);
    
    // Validate the schedule has required structure
    if (!schedule.assignments || !Array.isArray(schedule.assignments) || schedule.assignments.length === 0) {
      return {
        error: true,
        message: "Generated schedule is invalid or empty"
      };
    }
    
    // If this is a simulation, just return the schedule
    if (params.simulate) {
      return schedule;
    }
    
    // Otherwise, create the assignments in the database
    return await createAssignmentsFromSchedule(schedule);
  } catch (error) {
    console.error("Error generating schedule:", error);
    
    // Provide a more specific error message based on the error type
    if (error.name === 'AuthenticationError') {
      return { error: true, message: "Authentication error with the AI service. Please check your API key configuration." };
    } else if (error.name === 'RateLimitError') {
      return { error: true, message: "The AI service rate limit has been reached. Please try again later." };
    } else if (error.name === 'ServiceUnavailableError') {
      return { error: true, message: "The AI service is temporarily unavailable. Please try again later." };
    } else if (error.name === 'SyntaxError') {
      return { error: true, message: "Failed to parse the AI response. Please try again." };
    } else {
      return { 
        error: true, 
        message: "Failed to generate schedule. Please check the server logs for details.",
        details: error.message
      };
    }
  }
}

// Function to get learnings
function getLearnings() {
  try {
    return JSON.parse(fs.readFileSync(LEARNINGS_FILE));
  } catch (error) {
    console.error('Error reading learnings:', error);
    return { patterns: [], insights: [] };
  }
}

// Function to analyze new data and extract insights
async function analyzeNewData() {
  try {
    // Get timestamp of last analysis
    const learnings = getLearnings();
    const lastAnalysis = learnings.lastAnalysisTime || new Date(0).toISOString();
    
    // Get new assignments since last analysis
    const assignments = await prisma.assignment.findMany({
      where: {
        createdAt: { gt: new Date(lastAnalysis) }
      },
      include: { 
        staff: true,
        project: true
      }
    });
    
    if (assignments.length === 0) {
      console.log('No new data to analyze');
      return;
    }
    
    // Extract patterns from new data
    const analysisResponse = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI that analyzes staff scheduling patterns. Examine the following 
          new assignments and identify patterns, insights, and learnings that would be valuable 
          for future scheduling decisions. Return a JSON object with 'patterns' and 'insights' arrays.`
        },
        { 
          role: "user", 
          content: JSON.stringify(assignments)
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const analysis = JSON.parse(analysisResponse.choices[0].message.content);
    
    // Update learnings file
    learnings.patterns = [...learnings.patterns, ...analysis.patterns];
    learnings.insights = [...learnings.insights, ...analysis.insights];
    learnings.lastAnalysisTime = new Date().toISOString();
    
    fs.writeFileSync(LEARNINGS_FILE, JSON.stringify(learnings, null, 2));
    console.log(`Added ${analysis.patterns.length} patterns and ${analysis.insights.length} insights`);
    
  } catch (error) {
    console.error('Error analyzing new data:', error);
  }
}

// Schedule regular analysis (e.g., once a day)
function setupLearningSchedule() {
  // Run immediately on startup
  analyzeNewData();
  
  // Then schedule to run daily
  const HOURS_24 = 24 * 60 * 60 * 1000;
  setInterval(analyzeNewData, HOURS_24);
}

module.exports = {
  generateResponse,
  generateSchedule,
  executeAgentAction,
  setupLearningSchedule,
  analyzeNewData
}; 
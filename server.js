require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { getStaffAssignments } = require('./chatFunctions');
const prisma = require('./prismaClient');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Chat endpoint
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
      function_call: 'auto'
    });
    const message = initialResponse.choices[0].message;
    let assistantMessage;
    // If the model wants to call a function, execute it and re-prompt
    if (message.function_call) {
      const { name, arguments: argsJson } = message.function_call;
      const args = JSON.parse(argsJson);
      let functionResult;
      if (name === 'getStaffAssignments') {
        functionResult = await getStaffAssignments(args);
      }
      // Send the function result back to the model
      const followUp = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          ...formattedMessages,
          message,
          { role: 'function', name: name, content: JSON.stringify(functionResult) }
        ]
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

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Chat server listening on port ${port}`)); 
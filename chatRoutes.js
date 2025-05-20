// chatRoutes.js - API routes for the enhanced chatbot

const express = require('express');
const router = express.Router();
const { generateResponse, generateSchedule, executeAgentAction, setupLearningSchedule } = require('./chatAI');

// Initialize learning system
setupLearningSchedule();

// Endpoint for enhanced chatbot interactions
router.post('/ai-chat', async (req, res) => {
  try {
    const { query, userId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const response = await generateResponse(query, { userId });
    res.json({ response });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: 'Error processing chat request', details: error.message });
  }
});

// Endpoint for AI agent actions
router.post('/ai-agent', async (req, res) => {
  try {
    const { instruction, userId } = req.body;
    
    if (!instruction) {
      return res.status(400).json({ error: 'Instruction is required' });
    }
    
    const result = await executeAgentAction(instruction);
    res.json({ result });
  } catch (error) {
    console.error('AI Agent error:', error);
    res.status(500).json({ 
      error: 'Error executing agent action', 
      details: error.message 
    });
  }
});

// Endpoint specifically for AI-powered scheduling
router.post('/ai-schedule', async (req, res) => {
  try {
    const { 
      projectId, 
      projectName, 
      staffNeeded, 
      startDate, 
      endDate, 
      hoursRequired,
      simulate 
    } = req.body;
    
    // Validate required fields
    if ((!projectId && !projectName) || !startDate || !endDate || !hoursRequired) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Need project info, dates, and hours required.' 
      });
    }
    
    // Generate optimized schedule
    const result = await generateSchedule({
      projectId,
      projectName,
      staffNeeded: staffNeeded || 3,
      startDate,
      endDate,
      hoursRequired,
      simulate: simulate || false
    });
    
    res.json({ result });
  } catch (error) {
    console.error('AI Scheduling error:', error);
    res.status(500).json({ error: 'Error creating schedule', details: error.message });
  }
});

module.exports = router; 
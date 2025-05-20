/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
// React imports
import React, { useState, useRef, useEffect } from 'react';

// Material UI imports
import { 
  Box, 
  IconButton, 
  TextField, 
  Paper, 
  Typography, 
  Chip,
  CircularProgress,
  Divider,
  Button,
  Menu,
  MenuItem,
  DialogTitle,
  DialogContent,
  DialogActions,
  Dialog,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { 
  Send as SendIcon, 
  SmartToy as AIIcon, 
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  QuestionAnswer as AskIcon,
  Build as AgentIcon
} from '@mui/icons-material';

// Utility imports
import axios from 'axios';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  isAgentResponse?: boolean;
  success?: boolean;
  isTyping?: boolean;
  isError?: boolean;
  id?: string;
}

interface Staff {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Assignment {
  project: string;
  date?: string;
  hours: number;
  status?: string;
  projectName?: string;
}

interface ProjectAssignment {
  staffName: string;
  projectName: string;
  date: string;
  hours: number;
  status?: string;
}

interface GroupedAssignments {
  [projectName: string]: ProjectAssignment[];
}

interface DeletedAssignment {
  staffName: string;
  projectName: string;
  date: string;
  hours: number;
}

interface AssignmentsByDate {
  [date: string]: Assignment[];
}

// SchedulingDialog component for AI-powered scheduling
const SchedulingDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSchedule: (data: any) => void;
  staffList: Staff[];
  projectList: Project[];
}> = ({ open, onClose, onSchedule, staffList, projectList }) => {
  const [projectId, setProjectId] = useState('');
  const [staffNeeded, setStaffNeeded] = useState(3);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
  );
  const [hoursRequired, setHoursRequired] = useState(40);
  const [simulate, setSimulate] = useState(true);

  const handleSubmit = () => {
    if (!projectId || !startDate || !endDate) return;

    onSchedule({
      projectId,
      staffNeeded,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      hoursRequired,
      simulate
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>AI Schedule Generator</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Project</InputLabel>
            <Select
              value={projectId}
              label="Project"
              onChange={(e: SelectChangeEvent) => setProjectId(e.target.value)}
            >
              {projectList.map(project => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            type="number"
            label="Staff Needed"
            value={staffNeeded}
            onChange={(e) => setStaffNeeded(parseInt(e.target.value))}
          />

          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            InputLabelProps={{
              shrink: true,
            }}
            variant="outlined"
          />
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              InputLabelProps={{
                shrink: true,
              }}
              variant="outlined"
            />
          </Box>

          <TextField
            fullWidth
            type="number"
            label="Hours Required"
            value={hoursRequired}
            onChange={(e) => setHoursRequired(parseInt(e.target.value))}
          />

          <FormControl>
            <Typography variant="body2" gutterBottom>
              Mode
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant={simulate ? "contained" : "outlined"}
                onClick={() => setSimulate(true)}
              >
                Simulate
              </Button>
              <Button 
                variant={!simulate ? "contained" : "outlined"}
                onClick={() => setSimulate(false)}
              >
                Create Assignments
              </Button>
            </Box>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          startIcon={<ScheduleIcon />}
        >
          Generate Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AIChatWidget: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [mode, setMode] = useState<'ask' | 'agent'>('ask');
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load staff and projects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const staffRes = await axios.get('http://localhost:5000/api/staff');
        setStaffList(staffRes.data);
        
        const projectsRes = await axios.get('http://localhost:5000/api/projects');
        setProjectList(projectsRes.data);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    
    fetchData();
  }, []);

  // Add welcome message when chat first opens
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          sender: 'ai',
          text: 'Hi there! I can help you with staff scheduling, project details, or generate an optimal schedule. What would you like to know?',
          timestamp: new Date()
        }
      ]);
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const clearChat = () => {
    setMessages([
      {
        sender: 'ai',
        text: 'Chat history has been cleared. How can I help you today?',
        timestamp: new Date()
      }
    ]);
    handleMenuClose();
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { 
      sender: 'user', 
      text: input,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    // Show typing indicator right away
    const typingIndicatorId = `typing-${Date.now()}`;
    setMessages((prev) => [
      ...prev, 
      { 
        id: typingIndicatorId,
        sender: 'ai', 
        text: 'Thinking...',
        timestamp: new Date(),
        isTyping: true
      }
    ]);

    try {
      // Use different endpoints based on mode
      if (mode === 'ask') {
        // Using the AI chat endpoint for questions
        const res = await axios.post('http://localhost:5000/api/ai-chat', { 
          query: input 
        });
        
        const botText = res.data.response;
        
        // Remove typing indicator and add actual response
        setMessages((prev) => 
          prev
            .filter(m => !m.isTyping)
            .concat([{ 
              sender: 'ai', 
              text: botText,
              timestamp: new Date()
            }])
        );
      } else {
        // Using the agent endpoint for commands
        const res = await axios.post('http://localhost:5000/api/ai-agent', { 
          instruction: input 
        });
        
        const result = res.data.result;
        
        // Format the agent response
        let responseText = '';
        const success = result.success;
        
        if (success) {
          responseText = `✅ ${result.message}`;
          
          if (result.details) {
            if (result.action === 'report') {
              // Format report response
              responseText += '\n\nAssignments by date:';
              const assignmentsByDate = result.details.assignmentsByDate as AssignmentsByDate || {};
              
              Object.keys(assignmentsByDate).sort().forEach((date: string) => {
                responseText += `\n\n📅 ${date}:`;
                assignmentsByDate[date].forEach((a: Assignment) => {
                  responseText += `\n  • ${a.project}: ${a.hours} hours`;
                });
              });
              
              responseText += `\n\nTotal: ${result.details.totalHours || 0} hours across ${result.details.totalAssignments || 0} assignments`;
            } else if (result.action === 'schedule') {
              // Format schedule response for multiple projects
              if (result.details.groupedAssignments) {
                responseText += '\n\nScheduled assignments:';
                
                const groupedAssignments = result.details.groupedAssignments as GroupedAssignments;
                
                Object.keys(groupedAssignments).forEach((projectName: string) => {
                  const projectAssignments = groupedAssignments[projectName];
                  const totalHours = projectAssignments.reduce((sum: number, a: ProjectAssignment) => sum + a.hours, 0);
                  const dateRange = projectAssignments.map((a: ProjectAssignment) => a.date).join(', ');
                  
                  responseText += `\n\n📋 ${projectName}:`;
                  responseText += `\n  • Dates: ${dateRange}`;
                  responseText += `\n  • Hours per day: ${projectAssignments[0].hours}`;
                  responseText += `\n  • Total hours: ${totalHours}`;
                });
              } else {
                // Fallback to simple format
                responseText += `\n\nDetails: ${result.details.staff} scheduled on ${result.details.assignments?.length || 0} assignments.`;
              }
              
              // Show errors if any
              if (result.details.errors && result.details.errors.length > 0) {
                responseText += '\n\n⚠️ Some assignments had issues:';
                result.details.errors.forEach((error: string) => {
                  responseText += `\n  • ${error}`;
                });
              }
            } else if (result.action === 'unschedule') {
              // Format unschedule response
              if (result.details.deletedAssignments && result.details.deletedAssignments.length > 0) {
                responseText += '\n\nRemoved assignments:';
                
                // Group by project for cleaner display
                const byProject: Record<string, DeletedAssignment[]> = {};
                result.details.deletedAssignments.forEach((a: DeletedAssignment) => {
                  if (!byProject[a.projectName]) byProject[a.projectName] = [];
                  byProject[a.projectName].push(a);
                });
                
                Object.keys(byProject).forEach((projectName: string) => {
                  responseText += `\n\n📋 ${projectName}:`;
                  byProject[projectName].forEach((a: DeletedAssignment) => {
                    responseText += `\n  • ${a.date}: ${a.hours} hours`;
                  });
                });
              }
            }
          }
        } else {
          responseText = `❌ ${result.message}`;
          
          // Show detailed errors if available
          if (result.errors && result.errors.length > 0) {
            responseText += '\n\nErrors:';
            result.errors.forEach((error: string) => {
              responseText += `\n• ${error}`;
            });
          }
        }
        
        // Remove typing indicator and add agent response
        setMessages((prev) => 
          prev
            .filter(m => !m.isTyping)
            .concat([{ 
              sender: 'ai', 
              text: responseText,
              timestamp: new Date(),
              isAgentResponse: true,
              success
            }])
        );
      }
    } catch (err) {
      console.error(err);
      
      // Remove typing indicator and add error message
      setMessages((prev) => 
        prev
          .filter(m => !m.isTyping)
          .concat([{ 
            sender: 'ai', 
            text: 'Sorry, I encountered an error while processing your request. Please try again.',
            timestamp: new Date(),
            isError: true
          }])
      );
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleScheduling = async (schedulingData: any) => {
    setLoading(true);
    
    // Add user message indicating scheduling request
    const userMsg: Message = { 
      sender: 'user', 
      text: `Please schedule ${schedulingData.staffNeeded} staff for project ${
        projectList.find(p => p.id === schedulingData.projectId)?.name
      } from ${schedulingData.startDate} to ${schedulingData.endDate} (${schedulingData.hoursRequired} hours)`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    // Show typing indicator right away
    const typingIndicatorId = `typing-schedule-${Date.now()}`;
    setMessages((prev) => [
      ...prev, 
      { 
        id: typingIndicatorId,
        sender: 'ai', 
        text: 'Generating schedule...',
        timestamp: new Date(),
        isTyping: true
      }
    ]);
    
    try {
      const res = await axios.post('http://localhost:5000/api/ai-schedule', schedulingData);
      
      const result = res.data.result;
      let responseText = '';
      
      // Check if there was an error in the result
      if (result.error) {
        responseText = `Error: ${result.message}`;
        if (result.details) {
          responseText += `\n\nDetails: ${result.details}`;
        }
      } else if (schedulingData.simulate) {
        responseText = `Here's a suggested schedule for your project:\n\n${
          JSON.stringify(result, null, 2)
        }\n\nWould you like me to create these assignments in the system?`;
      } else {
        responseText = `Successfully created ${
          result.assignments?.length || 0
        } assignments for your project. The schedule has been optimized based on staff availability and project requirements.`;
      }
      
      // Remove typing indicator and add actual response
      setMessages(prev => 
        prev
          .filter(m => !m.isTyping)
          .concat([{ 
            sender: 'ai', 
            text: responseText,
            timestamp: new Date()
          }])
      );
    } catch (err) {
      console.error('Scheduling error:', err);
      
      // Remove typing indicator and add error message
      setMessages(prev => 
        prev
          .filter(m => !m.isTyping)
          .concat([{ 
            sender: 'ai', 
            text: 'I encountered an error while generating the schedule. Please check your inputs and try again.',
            timestamp: new Date(),
            isError: true
          }])
      );
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const setSuggestion = (text: string) => {
    setInput(text);
  };

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'ask' | 'agent' | null,
  ) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  return (
    <>
      {!open && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            bgcolor: 'primary.main', 
            color: 'white',
            zIndex: 1300,
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            width: 56,
            height: 56
          }}
        >
          <AIIcon />
        </IconButton>
      )}
      
      {open && (
        <Box sx={{ 
          position: 'fixed', 
          bottom: 20, 
          right: 20, 
          width: 350, 
          height: 500, 
          zIndex: 1300,
          boxShadow: 6,
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <Paper sx={{ 
            bgcolor: 'white', 
            color: 'black', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: 2
          }}>
            <Box sx={{ 
              p: 1, 
              bgcolor: 'primary.main', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AIIcon sx={{ color: 'white' }} />
                <Typography variant="subtitle1" color="white">
                  AI Staff Scheduler
                </Typography>
              </Box>
              
              <Box>
                <IconButton 
                  size="small" 
                  onClick={handleMenuOpen}
                  sx={{ color: 'white' }}
                >
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  anchorEl={menuAnchorEl}
                  open={Boolean(menuAnchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={() => {
                    setSchedulingOpen(true);
                    handleMenuClose();
                  }}>
                    <ScheduleIcon fontSize="small" sx={{ mr: 1 }} />
                    Schedule Project
                  </MenuItem>
                  <MenuItem onClick={clearChat}>
                    <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
                    Clear Chat
                  </MenuItem>
                </Menu>
                
                <IconButton 
                  size="small" 
                  onClick={() => setOpen(false)} 
                  sx={{ color: 'white' }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
            
            <Box sx={{ flex: 1, p: 1, overflowY: 'auto' }}>
              {messages.map((m, idx) => (
                <Box 
                  key={m.id || `message-${idx}-${m.timestamp.getTime()}`} 
                  sx={{ 
                    my: 1, 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      maxWidth: '85%',
                      bgcolor: m.sender === 'user' 
                        ? 'primary.main' 
                        : m.isAgentResponse 
                          ? 'white' 
                          : m.isError
                            ? 'error.light'
                            : 'grey.100',
                      color: m.sender === 'user' ? 'white' : 'black',
                      border: m.isAgentResponse || m.isTyping ? '1px solid' : 'none',
                      borderColor: m.isAgentResponse 
                        ? (m.success ? 'success.main' : 'error.main')
                        : m.isTyping
                          ? 'grey.500'
                          : 'transparent',
                      opacity: m.isTyping ? 0.8 : 1,
                    }}
                  >
                    {m.isTyping ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                        <Typography variant="body2">{m.text}</Typography>
                      </Box>
                    ) : (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {m.text}
                      </Typography>
                    )}
                  </Paper>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ mt: 0.5, ml: m.sender === 'user' ? 0 : 1.5, mr: m.sender === 'user' ? 1.5 : 0 }}
                  >
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              ))}
              
              <div ref={messagesEndRef} />
            </Box>
            
            {/* Suggestion chips */}
            {messages.length <= 2 && (
              <Box sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Suggestions:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip 
                    label="Who's available next week?" 
                    size="small" 
                    onClick={() => setSuggestion("Who's available next week?")}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip 
                    label="Project budget status" 
                    size="small" 
                    onClick={() => setSuggestion("What's the budget status for all projects?")}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip 
                    label="Schedule a new project" 
                    size="small" 
                    onClick={() => setSchedulingOpen(true)}
                    sx={{ cursor: 'pointer' }}
                  />
                  {mode === 'agent' && (
                    <Chip 
                      label="Schedule multiple projects example" 
                      size="small" 
                      onClick={() => setSuggestion("Schedule Fatima Dubois on project Vanguard for 4 hours and project Eclipse for 2 hours on June 2, 2025")}
                      sx={{ cursor: 'pointer' }}
                    />
                  )}
                </Box>
              </Box>
            )}
            
            <Divider />
            
            {/* Mode Toggle */}
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={handleModeChange}
                aria-label="chat mode"
                size="small"
              >
                <ToggleButton value="ask" aria-label="ask questions">
                  <AskIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Ask
                </ToggleButton>
                <ToggleButton value="agent" aria-label="give commands">
                  <AgentIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Agent
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                placeholder={mode === 'ask' 
                  ? "Ask about scheduling, staff, or projects..." 
                  : "Give scheduling commands..."}
                sx={{ bgcolor: 'white', color: 'black' }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) sendMessage();
                }}
                disabled={loading}
              />
              <IconButton 
                color="primary" 
                onClick={sendMessage} 
                disabled={loading || !input.trim()}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Paper>
        </Box>
      )}
      
      <SchedulingDialog
        open={schedulingOpen}
        onClose={() => setSchedulingOpen(false)}
        onSchedule={handleScheduling}
        staffList={staffList}
        projectList={projectList}
      />
    </>
  );
};

export default AIChatWidget; 
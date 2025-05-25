import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  TextField, 
  Paper, 
  Typography, 
  CircularProgress,
  Chip,
  Button,
  Divider,
  Avatar,
  Autocomplete,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import FolderIcon from '@mui/icons-material/Folder';
import ClearIcon from '@mui/icons-material/Clear';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MinimizeIcon from '@mui/icons-material/Minimize';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import format from 'date-fns/format';
import axios from 'axios';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  type?: 'text' | 'json' | 'schedule_result';
  timestamp: Date;
}

interface StaffMember {
  id: string;
  name: string;
  department?: string;
}

interface Project {
  id: string;
  name: string;
  partnerName?: string;
}

interface MatchResult {
  staffId: string;
  staffName?: string;
  assignedHours: number;
  date?: string;
}

const ChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Load messages from localStorage on initialization
  const loadMessagesFromStorage = (): Message[] => {
    try {
      const stored = localStorage.getItem('chatMessages');
      if (stored) {
        const parsedMessages = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        return parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load chat messages from localStorage:', error);
    }
    
    // Return default welcome message if no stored messages
    return [
      { 
        sender: 'bot', 
        text: 'Hello! I\'m your Staff Scheduling Assistant. I can help you with information about staff, projects, and schedules, or assist you with scheduling tasks. How can I help you today?', 
        timestamp: new Date(),
        type: 'text'
      }
    ];
  };
  
  const [messages, setMessages] = useState<Message[]>(loadMessagesFromStorage);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'ask' | 'agent'>('ask');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedStaff, setSelectedStaff] = useState<StaffMember[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [hours, setHours] = useState<number>(8);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Store the last agent payload for confirmation flows
  const [lastAgentPayload, setLastAgentPayload] = useState<{ query: string; mode: 'agent' } | null>(null);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    try {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save chat messages to localStorage:', error);
    }
  }, [messages]);

  // Load staff and projects on initial render
  useEffect(() => {
    fetchStaffAndProjects();
  }, []);

  const fetchStaffAndProjects = async () => {
    try {
      const [staffResponse, projectsResponse] = await Promise.all([
        axios.get('/api/staff'),
        axios.get('/api/projects')
      ]);
      setStaffList(staffResponse.data);
      setProjectList(projectsResponse.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear chat function
  const clearChat = () => {
    const welcomeMessage: Message = { 
      sender: 'bot', 
      text: 'Hello! I\'m your Staff Scheduling Assistant. I can help you with information about staff, projects, and schedules, or assist you with scheduling tasks. How can I help you today?', 
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([welcomeMessage]);
    setMenuAnchor(null); // Close the menu
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  // Minimize/maximize handlers
  const handleHeaderClick = () => {
    setMinimized(!minimized);
  };

  const handleToggleChat = () => {
    if (minimized) {
      setMinimized(false);
    } else {
      setOpen(!open);
    }
  };

  const handleModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'ask' | 'agent' | null) => {
    if (newMode !== null) {
      setMode(newMode);
      // Add a system message when mode changes
      const modeChangeMessage = newMode === 'ask' 
        ? "I'm now in Ask mode. You can ask me questions about staff, projects, and schedules."
        : "I'm now in Agent mode. You can instruct me to book staff onto projects using natural language commands.";
      
      setMessages(prev => [
        ...prev, 
        { 
          sender: 'bot', 
          text: modeChangeMessage, 
          timestamp: new Date(),
          type: 'text'
        }
      ]);
    }
  };

  const formatJsonOutput = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      return (
        <pre style={{ 
          maxHeight: '200px', 
          overflow: 'auto', 
          whiteSpace: 'pre-wrap',
          backgroundColor: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return jsonString;
    }
  };

  const [pendingReport, setPendingReport] = useState<{ startDate?: string } | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    // Handle pending report clarification
    const lower = input.toLowerCase();
    if (pendingReport) {
      // Expect weekly, monthly, or overall
      const tfMatch = lower.match(/\b(weekly|monthly|overall)\b/);
      if (tfMatch) {
        const timeframe = tfMatch[1] as 'weekly'|'monthly'|'overall';
        const dateStr = pendingReport.startDate!;
        // Show user message
        const userText = input;
        setMessages(prev => [...prev, { sender: 'user', text: userText, timestamp: new Date() }]);
        // Trigger report
        setMessages(prev => [...prev, { sender: 'bot', text: `Opening Analytics page to generate ${timeframe} report from ${dateStr}...`, timestamp: new Date() }]);
        localStorage.setItem('chatMessages', JSON.stringify([...messages, { sender: 'bot', text: `Opening Analytics page to generate ${timeframe} report from ${dateStr}...`, timestamp: new Date() }]));
        window.location.href = `/analytics?reportStart=${dateStr}&reportTimeframe=${timeframe}`;
        setPendingReport(null);
        setInput('');
        return;
      } else {
        setMessages(prev => [...prev, { sender: 'bot', text: 'Please specify: weekly, monthly, or overall.', timestamp: new Date() }]);
        return;
      }
    }
    // Intercept generate report requests (Agent mode only)
    if (lower.includes('generate') && lower.includes('report')) {
      if (mode !== 'agent') {
        // Prompt to switch to Agent mode for report generation
        setMessages(prev => [...prev, { sender: 'bot', text: 'Switch to Agent mode to generate reports.', timestamp: new Date() }]);
        setInput('');
        return;
      }
      // Extract timeframe if present
      const tfMatch = lower.match(/\b(weekly|monthly|overall)\b/);
      // Extract date after 'from', e.g. 'from 25 May'
      const dateMatch = lower.match(/from\s+(\d{1,2}\s+\w+(?:\s+\d{4})?)/);
      let dateStr: string;
      if (dateMatch) {
        const raw = dateMatch[1];
        const withYear = /\d{4}/.test(raw) ? raw : `${raw} ${new Date().getFullYear()}`;
        const parsed = new Date(withYear);
        dateStr = !isNaN(parsed.getTime())
          ? format(parsed, 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd');
      } else {
        dateStr = format(new Date(), 'yyyy-MM-dd');
      }
      // If timeframe specified, generate immediately
      if (tfMatch) {
        const timeframe = tfMatch[1] as 'weekly'|'monthly'|'overall';
        setMessages(prev => [...prev, { sender: 'user', text: input, timestamp: new Date() }]);
        setMessages(prev => [...prev, { sender: 'bot', text: `Opening Analytics page to generate ${timeframe} report from ${dateStr}...`, timestamp: new Date() }]);
        localStorage.setItem('chatMessages', JSON.stringify([...messages, { sender: 'bot', text: `Opening Analytics page to generate ${timeframe} report from ${dateStr}...`, timestamp: new Date() }]));
        window.location.href = `/analytics?reportStart=${dateStr}&reportTimeframe=${timeframe}`;
        setInput('');
        return;
      }
      // Otherwise ask which type
      setMessages(prev => [...prev, { sender: 'user', text: input, timestamp: new Date() }]);
      setMessages(prev => [...prev, { sender: 'bot', text: `Would you like a weekly, monthly, or overall report starting from ${dateStr}?`, timestamp: new Date() }]);
      setPendingReport({ startDate: dateStr });
      setInput('');
      return;
    }
    // Default behavior
    setLoading(true);
    const userText = input;
    setMessages(prev => [...prev, { sender: 'user', text: userText, timestamp: new Date() }]);
    setInput('');

    try {
      const endpoint = mode === 'ask'
        ? '/api/ask'
        : '/api/orchestrate';

      // Determine payload, supporting simple confirmation in agent mode
      let payload;
      const confirmationPattern = /^(yes|yep|confirm|proceed|go ahead|book them)/i;
      const isConfirmation = mode === 'agent' && confirmationPattern.test(input.trim());
      if (isConfirmation && lastAgentPayload) {
        // Reuse previous agent payload on confirmation
        payload = lastAgentPayload;
      } else if (mode === 'ask') {
        payload = { query: input, mode: 'ask' };
      } else {
        // Build a typed agent payload
        const agentPayload = { query: input, mode: 'agent' } as const;
        setLastAgentPayload(agentPayload);
        payload = agentPayload;
      }
      
      const res = await axios.post(endpoint, payload);
      
      // Process the response appropriately based on mode
      let botText = '';
      let messageType: 'text' | 'json' | 'schedule_result' = 'text';
      
      if (mode === 'ask') {
        if (typeof res.data.content === 'string') {
          botText = res.data.content;
          messageType = res.data.type || 'text';
        } else {
          botText = JSON.stringify(res.data);
          messageType = 'json';
        }
      } else {
        // Format scheduling results in a user-friendly way
        if (res.data.resolvedMatches) {
          const matchCount = res.data.resolvedMatches.length;
          botText = `✅ Successfully scheduled ${matchCount} assignment${matchCount !== 1 ? 's' : ''}.\n\n`;
          
          res.data.resolvedMatches.forEach((match: MatchResult) => {
            const staffName = match.staffName || 'Staff';
            botText += `• ${staffName}: ${match.assignedHours} hour${match.assignedHours !== 1 ? 's' : ''} on ${match.date || 'the selected date'}\n`;
          });
          
          messageType = 'schedule_result';
        } else {
          botText = JSON.stringify(res.data);
          messageType = 'json';
        }
      }
      
      const botMsg: Message = { 
        sender: 'bot', 
        text: botText,
        timestamp: new Date(),
        type: messageType
      };
      
      setMessages(prev => [...prev, botMsg]);
      
      // 🚀 AUTO-REFRESH SCHEDULE: Trigger calendar refresh if booking was successful
      if (
        (res.data.resolvedMatches && res.data.resolvedMatches.length > 0) ||
        (res.data.booking && (Array.isArray(res.data.booking) ? res.data.booking.length > 0 : true)) ||
        (res.data.assignments && Array.isArray(res.data.assignments) && res.data.assignments.length > 0)
      ) {
        console.log('🔄 Booking successful! Refreshing schedule page...');
        // Dispatch custom event to refresh the schedule calendar
        window.dispatchEvent(new CustomEvent('refreshCalendar'));
      }
      
      // Clear selections after successful scheduling
      if (mode === 'agent') {
        // Keep the same staff and projects selected for convenience
        // in case the user wants to schedule them again
      }
      
    } catch (err) {
      console.error(err);
      let errorMessage = 'Error connecting to service.';
      let isServiceStarting = false;
      
      if (axios.isAxiosError(err) && err.response?.data) {
        const responseData = err.response.data;
        errorMessage = `Error: ${responseData.error || 'Unknown error'}`;
        
        if (responseData.details) {
          errorMessage += `\n${responseData.details}`;
        }
        
        // Check if it's the specific error about orchestrator service starting up
        if (responseData.retryable && responseData.error === 'Orchestrator service starting') {
          isServiceStarting = true;
          errorMessage = `The chatbot service is starting up. I'll try again in a few seconds...`;
        }
      }
      
      const errorMsg: Message = { 
        sender: 'bot', 
        text: errorMessage,
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, errorMsg]);
      
      // If the service is starting up, retry after a delay
      if (isServiceStarting) {
        setTimeout(() => {
          const retryMsg: Message = {
            sender: 'bot',
            text: 'Retrying your request...',
            timestamp: new Date(),
            type: 'text'
          };
          
          setMessages(prev => [...prev, retryMsg]);
          
          // Resend the same message
          const originalPayload = mode === 'ask' 
            ? { query: input, mode: 'ask' } 
            : {
                query: input,
                mode: 'agent'
              };
          
          const retryEndpoint = originalPayload.mode === 'ask'
            ? '/api/ask'
            : '/api/orchestrate';
          axios.post(retryEndpoint, originalPayload)
            .then(res => {
              // Process the response appropriately based on mode
              let botText = '';
              let messageType: 'text' | 'json' | 'schedule_result' = 'text';
              
              if (mode === 'ask') {
                if (typeof res.data.content === 'string') {
                  botText = res.data.content;
                  messageType = res.data.type || 'text';
                } else {
                  botText = JSON.stringify(res.data);
                  messageType = 'json';
                }
              } else {
                // Format scheduling results in a user-friendly way
                if (res.data.resolvedMatches) {
                  const matchCount = res.data.resolvedMatches.length;
                  botText = `✅ Successfully scheduled ${matchCount} assignment${matchCount !== 1 ? 's' : ''}.\n\n`;
                  
                  res.data.resolvedMatches.forEach((match: MatchResult) => {
                    const staffName = match.staffName || 'Staff';
                    botText += `• ${staffName}: ${match.assignedHours} hour${match.assignedHours !== 1 ? 's' : ''} on ${match.date || 'the selected date'}\n`;
                  });
                  
                  messageType = 'schedule_result';
                } else {
                  botText = JSON.stringify(res.data);
                  messageType = 'json';
                }
              }
              
              const botMsg: Message = { 
                sender: 'bot', 
                text: botText,
                timestamp: new Date(),
                type: messageType
              };
              
              setMessages(prev => [...prev, botMsg]);
              
              // 🚀 AUTO-REFRESH SCHEDULE: Trigger calendar refresh if booking was successful (retry path)
              if (
                (res.data.resolvedMatches && res.data.resolvedMatches.length > 0) ||
                (res.data.booking && (Array.isArray(res.data.booking) ? res.data.booking.length > 0 : true)) ||
                (res.data.assignments && Array.isArray(res.data.assignments) && res.data.assignments.length > 0)
              ) {
                console.log('🔄 Booking successful on retry! Refreshing schedule page...');
                // Dispatch custom event to refresh the schedule calendar
                window.dispatchEvent(new CustomEvent('refreshCalendar'));
              }
              
              setLoading(false);
              scrollToBottom();
            })
            .catch(() => {
              // Stop retrying after one attempt
              const failedRetryMsg: Message = {
                sender: 'bot',
                text: 'The chatbot service is still starting up. Please try again in a minute.',
                timestamp: new Date(),
                type: 'text'
              };
              
              setMessages(prev => [...prev, failedRetryMsg]);
              setLoading(false);
              scrollToBottom();
            });
        }, 5000); // Wait 5 seconds before retrying
      } else {
        setLoading(false);
        scrollToBottom();
      }
    } finally {
      // The finally block runs regardless of whether there was an error
      // We don't need to check err here as it may not be defined if no error occurred
      setLoading(false);
      scrollToBottom();
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.sender === 'user';
    const messageTime = format(message.timestamp, 'h:mm a');
    
    return (
      <Box 
        key={index} 
        sx={{ 
          my: 1.5, 
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'flex-start',
          flexDirection: isUser ? 'row-reverse' : 'row'
        }}>
          <Avatar 
            sx={{ 
              width: 32, 
              height: 32, 
              mr: isUser ? 0 : 1, 
              ml: isUser ? 1 : 0,
              bgcolor: isUser ? 'secondary.main' : 'primary.main' 
            }}
          >
            {isUser ? 'U' : 'A'}
          </Avatar>
          <Paper
            elevation={1}
            sx={{
              p: 1.5,
              maxWidth: '85%',
              borderRadius: 2,
              bgcolor: isUser ? 'secondary.light' : 'grey.100',
              color: isUser ? 'white' : 'text.primary',
            }}
          >
            {message.type === 'json' ? (
              formatJsonOutput(message.text)
            ) : message.type === 'schedule_result' ? (
              <Typography 
                variant="body2" 
                component="div" 
                sx={{ 
                  whiteSpace: 'pre-line'
                }}
              >
                {message.text}
              </Typography>
            ) : (
              <Typography variant="body2">{message.text}</Typography>
            )}
          </Paper>
        </Box>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary', 
            mt: 0.5,
            mr: isUser ? 1 : 0,
            ml: isUser ? 0 : 1
          }}
        >
          {messageTime}
        </Typography>
      </Box>
    );
  };

  return (
    <>
      {!open && (
        <Tooltip title="Open Staff Scheduler Chat Assistant">
          <IconButton
            onClick={handleToggleChat}
            sx={{ 
              position: 'fixed', 
              bottom: 20, 
              right: 20, 
              bgcolor: 'primary.main', 
              color: 'white', 
              zIndex: 1300,
              height: 56,
              width: 56,
              '&:hover': {
                bgcolor: 'primary.dark',
              }
            }}
          >
            <ChatIcon fontSize="medium" />
          </IconButton>
        </Tooltip>
      )}
      {open && (
        <Box 
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            width: 360, 
            height: minimized ? 'auto' : 600, 
            zIndex: 1300,
            boxShadow: 10,
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Paper 
            elevation={0} 
            sx={{ 
              bgcolor: 'white', 
              color: 'black', 
              height: minimized ? 'auto' : '100%', 
              display: 'flex', 
              flexDirection: 'column'
            }}
          >
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: 'primary.main', 
                color: 'white',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
              onClick={handleHeaderClick}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                Staff Scheduler Assistant
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title={minimized ? "Maximize Chat" : "Minimize Chat"}>
                  <IconButton size="small" sx={{ color: 'white' }}>
                    <MinimizeIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="More Options">
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent header click
                      handleMenuOpen(e);
                    }} 
                    sx={{ color: 'white' }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Close Chat">
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent header click
                      setOpen(false);
                    }} 
                    sx={{ color: 'white' }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            {/* 3-dots menu */}
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={clearChat}>
                <ClearIcon sx={{ mr: 1 }} />
                Clear Chat History
              </MenuItem>
            </Menu>

            {/* Show the rest of the chat only when not minimized */}
            {!minimized && (
              <>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.100' }}>
                  <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={handleModeChange}
                    size="small"
                    fullWidth
                    sx={{ mb: 0 }}
                  >
                    <ToggleButton 
                      value="ask" 
                      sx={{ 
                        py: 1,
                        '&.Mui-selected': {
                          bgcolor: 'primary.light',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.main',
                          }
                        }
                      }}
                    >
                      <ChatIcon sx={{ mr: 1 }} />
                      Ask
                    </ToggleButton>
                    <ToggleButton 
                      value="agent" 
                      sx={{ 
                        py: 1,
                        '&.Mui-selected': {
                          bgcolor: 'secondary.light',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'secondary.main',
                          }
                        }
                      }}
                    >
                      <ManageAccountsIcon sx={{ mr: 1 }} />
                      Agent
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                <Divider />
                
                <Box 
                  sx={{ 
                    flex: 1, 
                    p: 2, 
                    overflowY: 'auto',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  {messages.map((message, idx) => renderMessage(message, idx))}
                  <div ref={messagesEndRef} />
                </Box>
                
                <Divider />
                
                <Box 
                  sx={{ 
                    p: 1.5, 
                    display: 'flex', 
                    alignItems: 'center',
                    bgcolor: 'white'
                  }}
                >
                  {(mode === 'ask' || mode === 'agent') && (
                    <TextField
                      variant="outlined"
                      size="small"
                      fullWidth
                      placeholder="Ask a question..."
                      sx={{ bgcolor: 'white' }}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={loading}
                      multiline
                      maxRows={3}
                    />
                  )}
                  
                  {(mode === 'ask' || mode === 'agent') && (
                    <IconButton 
                      color="primary" 
                      onClick={sendMessage} 
                      disabled={loading || !input.trim()}
                      sx={{ ml: 1 }}
                    >
                      {loading ? <CircularProgress size={24} /> : <SendIcon />}
                    </IconButton>
                  )}
                </Box>
              </>
            )}
          </Paper>
        </Box>
      )}
    </>
  );
};

export default ChatWidget; 
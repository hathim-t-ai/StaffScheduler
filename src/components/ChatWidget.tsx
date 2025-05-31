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
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  type?: 'text' | 'json' | 'schedule_result' | 'thinking';
  timestamp: Date;
  duration?: number;
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
        // Filter out any stale mode-change greetings
        const filteredMessages = parsedMessages.filter((msg: any) =>
          !msg.text.startsWith("I'm now in Agent mode") && !msg.text.startsWith("I'm now in Ask mode")
        );
        // Convert timestamp strings back to Date objects
        return filteredMessages.map((msg: any) => ({
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
  const [mode, setMode] = useState<string>('ask');
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
      // Persist messages but omit mode-change greetings
      const messagesToStore = messages.filter(msg =>
        !msg.text.startsWith("I'm now in Agent mode") && !msg.text.startsWith("I'm now in Ask mode")
      );
      localStorage.setItem('chatMessages', JSON.stringify(messagesToStore));
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
      // Only add a greeting when switching to Agent mode
      if (newMode === 'agent') {
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: "I'm now in Agent mode. You can instruct me to book staff onto projects using natural language commands.",
            timestamp: new Date(),
            type: 'text'
          }
        ]);
      }
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

  const thinkingIndexRef = useRef<number | null>(null);
  const fullTextRef = useRef<string>('');
  const startTimeRef = useRef<number>(0);

  const sendMessage = async () => {
    if (!input.trim()) return;
    // Trim input to remove unintended whitespace
    const trimmedInput = input.trim();
    // Intercept simple greetings in Ask mode and respond immediately without streaming
    if (mode === 'ask') {
      const trimmedLower = trimmedInput.toLowerCase();
      if (/^(hello|hi|hey)\b/.test(trimmedLower)) {
        const userText = trimmedInput;
        // Display user message
        setMessages(prev => [...prev, { sender: 'user', text: userText, timestamp: new Date(), type: 'text' }]);
        // Display bot greeting
        setMessages(prev => [...prev, { sender: 'bot', text: 'Hello! How can I assist you today?', timestamp: new Date(), type: 'text' }]);
        setInput('');
        return;
      }
    }
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
    // Intercept department availability queries (e.g., "Forensic", "Analytics")
    const deptMatch = lower.match(/is anyone from the ([a-z ]+) department working on (\d{1,2}(?:st|nd|rd|th)?\s+\w+)/i);
    if (deptMatch) {
      const deptNameRaw = deptMatch[1].trim();
      const deptName = deptNameRaw.toLowerCase();
      // Parse the requested date
      const rawDate = deptMatch[2].replace(/(st|nd|rd|th)/i, '');
      const withYear = /\d{4}/.test(rawDate) ? rawDate : `${rawDate} ${new Date().getFullYear()}`;
      const parsedDate = new Date(withYear);
      const isoDate = !isNaN(parsedDate.getTime()) ? format(parsedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      // Show user message
      setMessages(prev => [...prev, { sender: 'user', text: input, timestamp: new Date(), type: 'text' }]);
      setInput('');
      try {
        const staffRes = await axios.get('/api/staff');
        const deptStaff = staffRes.data.filter((s: any) => s.department?.toLowerCase() === deptName);
        const capitalizedDept = deptName.charAt(0).toUpperCase() + deptName.slice(1);
        if (deptStaff.length === 0) {
          setMessages(prev => [...prev, { sender: 'bot', text: `No, there are no staff members in the ${capitalizedDept} department.`, timestamp: new Date(), type: 'text' }]);
        } else {
          const assignmentsRes = await axios.get('/api/assignments');
          const assignedOnDate = assignmentsRes.data.filter((a: any) => a.date === isoDate && deptStaff.some((s: any) => s.id === a.staffId));
          if (assignedOnDate.length === 0) {
            setMessages(prev => [...prev, { sender: 'bot', text: `No, no one from the ${capitalizedDept} department is scheduled on ${isoDate}.`, timestamp: new Date(), type: 'text' }]);
          } else {
            const lines = assignedOnDate.map((a: any) => {
              const staffRecord = deptStaff.find((s: any) => s.id === a.staffId);
              const name = staffRecord ? staffRecord.name : 'Staff';
              return `${name}: ${a.hours}h on ${a.projectName}`;
            });
            setMessages(prev => [...prev, { sender: 'bot', text: `Yes, the following ${capitalizedDept} staff are scheduled on ${isoDate}:\n• ${lines.join('\n• ')}`, timestamp: new Date(), type: 'text' }]);
          }
        }
      } catch (err) {
        console.error('Department availability intercept error', deptName, err);
        setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I encountered an error fetching schedules.', timestamp: new Date(), type: 'text' }]);
      }
      scrollToBottom();
      return;
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
      // Extract date after 'from', supporting ordinal suffixes like '20th May'
      const dateMatch = lower.match(/from\s+(\d{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+\d{4})?)/i);
      let dateStr: string;
      if (dateMatch) {
        // Remove ordinal suffix (st, nd, rd, th) for parsing
        let raw = dateMatch[1];
        raw = raw.replace(/(st|nd|rd|th)/i, '');
        const withYear = /\b\d{4}\b/.test(raw) ? raw : `${raw} ${new Date().getFullYear()}`;
        const parsed = new Date(withYear);
        dateStr = !isNaN(parsed.getTime())
          ? format(parsed, 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd');
      } else {
        // Default to today's date if no match
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
    // Ask mode: always use non-streaming endpoint for reliable final answers
    // Streaming support disabled — fall through to the axios-based ask below
    // Default behavior: send to Python orchestrator
    // Extract optional date for Ask mode (e.g., '26th May')
    let askDate: string | undefined;
    if (mode === 'ask') {
      try {
        const dateMatch = input.match(/(\d{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+\d{4})?)/i);
        if (dateMatch) {
          let raw = dateMatch[1].replace(/(st|nd|rd|th)/i, '');
          const withYear = /\d{4}/.test(raw) ? raw : `${raw} ${new Date().getFullYear()}`;
          const parsed = new Date(withYear);
          if (!isNaN(parsed.getTime())) {
            askDate = format(parsed, 'yyyy-MM-dd');
          }
        }
      } catch {
        askDate = undefined;
      }
    }
    setLoading(true);
    const userText = input;
    setMessages(prev => [...prev, { sender: 'user', text: userText, timestamp: new Date() }]);
    setInput('');

    try {
      // Determine endpoint and build payload
      const endpoint = mode === 'ask' ? '/api/ask' : '/api/orchestrate';
      let payload: any;
      // Check for booking confirmation in agent mode
      const confirmationPattern = /^(yes|yep|confirm|proceed|go ahead|book them)/i;
      const isConfirmation = mode === 'agent' && confirmationPattern.test(userText.trim());
      if (isConfirmation && lastAgentPayload) {
        payload = lastAgentPayload;
      } else if (mode === 'ask') {
        // Ask mode: send full conversation to simple Q&A endpoint
        const formattedMessages = [
          { role: 'system', content: 'You are a factual assistant with direct access to concrete data functions. ALWAYS use the appropriate function to fetch data, never fabricate. Provide concise and direct answers without including internal reasoning.' },
          ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          { role: 'user', content: userText }
        ];
        payload = { messages: formattedMessages };
      } else {
        // Agent mode: booking command payload
        payload = { query: userText, mode: 'command', intent: 'booking' };
        if (selectedDate) payload.date = format(selectedDate, 'yyyy-MM-dd');
        if (selectedStaff.length > 0) payload.staffIds = selectedStaff.map(s => s.id);
        if (selectedProjects.length > 0) payload.projectIds = selectedProjects.map(p => p.id);
        if (hours) payload.hours = hours;
        setLastAgentPayload(payload);
      }
      const res = await axios.post(endpoint, payload);
      
      // Process the response and visualize chain-of-thought for ask mode or handle scheduling for agent mode
      if (mode === 'ask' && typeof res.data.content === 'string') {
        const finalAnswer = res.data.content.trim();
        setMessages(prev => {
          const withoutThinking = prev.filter(m => m.type !== 'thinking');
          return [
            ...withoutThinking,
            {
              sender: 'bot',
              text: finalAnswer,
              timestamp: new Date(),
              type: 'text'
            }
          ];
        });
      } else {
        // Agent mode or non-string content: preserve original scheduling formatting
        let botText = '';
        let messageType: 'text' | 'json' | 'schedule_result' = 'text';
        if (mode !== 'ask' && res.data.resolvedMatches) {
          const matchCount = res.data.resolvedMatches.length;
          botText = `✅ Successfully scheduled ${matchCount} assignment${matchCount !== 1 ? 's' : ''}.\n\n`;
          res.data.resolvedMatches.forEach((match: MatchResult) => {
            const staffName = match.staffName || 'Staff';
            botText += `• ${staffName}: ${match.assignedHours} hour${match.assignedHours !== 1 ? 's' : ''} on ${match.date || 'the selected date'}\n`;
          });
          messageType = 'schedule_result';
        } else if (typeof res.data.content === 'string') {
          botText = res.data.content;
          messageType = res.data.type || 'text';
        } else {
          botText = JSON.stringify(res.data);
          messageType = 'json';
        }
        const botMsg: Message = {
          sender: 'bot',
          text: botText,
          timestamp: new Date(),
          type: messageType
        };
        setMessages(prev => {
          const withoutThinking = prev.filter(m => m.type !== 'thinking');
          return [...withoutThinking, botMsg];
        });
      }
      
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
      
      setMessages(prev => {
        const withoutThinking = prev.filter(m => m.type !== 'thinking');
        return [...withoutThinking, errorMsg];
      });
      
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
              // Process the response and visualize chain-of-thought for ask mode or handle scheduling for agent mode
              if (mode === 'ask' && typeof res.data.content === 'string') {
                const finalAnswer = res.data.content.trim();
                setMessages(prev => {
                  const withoutThinking = prev.filter(m => m.type !== 'thinking');
                  return [
                    ...withoutThinking,
                    {
                      sender: 'bot',
                      text: finalAnswer,
                      timestamp: new Date(),
                      type: 'text'
                    }
                  ];
                });
              } else {
                // Agent mode or non-string content: preserve original scheduling formatting
                let botText = '';
                let messageType: 'text' | 'json' | 'schedule_result' = 'text';
                if (mode !== 'ask' && res.data.resolvedMatches) {
                  const matchCount = res.data.resolvedMatches.length;
                  botText = `✅ Successfully scheduled ${matchCount} assignment${matchCount !== 1 ? 's' : ''}.\n\n`;
                  res.data.resolvedMatches.forEach((match: MatchResult) => {
                    const staffName = match.staffName || 'Staff';
                    botText += `• ${staffName}: ${match.assignedHours} hour${match.assignedHours !== 1 ? 's' : ''} on ${match.date || 'the selected date'}\n`;
                  });
                  messageType = 'schedule_result';
                } else if (typeof res.data.content === 'string') {
                  botText = res.data.content;
                  messageType = res.data.type || 'text';
                } else {
                  botText = JSON.stringify(res.data);
                  messageType = 'json';
                }
                const botMsg: Message = {
                  sender: 'bot',
                  text: botText,
                  timestamp: new Date(),
                  type: messageType
                };
                setMessages(prev => {
                  const withoutThinking = prev.filter(m => m.type !== 'thinking');
                  return [...withoutThinking, botMsg];
                });
              }
              
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
          <Box
            sx={{
              p: 1.5,
              maxWidth: '75%',
              borderRadius: 2,
              bgcolor: isUser ? 'primary.light' : 'grey.100',
              color: isUser ? 'white' : 'text.primary'
            }}
          >
            {message.type === 'thinking' ? (
              <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                    Thought{message.duration ? ` for ${message.duration.toFixed(1)} seconds` : ''}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                    {message.text}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ) : message.type === 'json' ? (
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
          </Box>
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
              PaperProps={{ sx: { bgcolor: 'white' } }}
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
                      {/* Show spinner while loading, otherwise send icon */}
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
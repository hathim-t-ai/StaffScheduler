import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChatIcon from '@mui/icons-material/Chat';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AddIcon from '@mui/icons-material/Add';
import MicIcon from '@mui/icons-material/Mic';
import PsychologyIcon from '@mui/icons-material/Psychology';
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
  MenuItem,
  Avatar
} from '@mui/material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axios from 'axios';
import format from 'date-fns/format';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { setTasks } from '../store/slices/scheduleSlice';

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
  
  const dispatch = useDispatch();
  const scheduleTasks = useSelector((state: RootState) => state.schedule.tasks);
  
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
          // Expect daily, weekly, monthly, or overall
    const tfMatch = lower.match(/\b(daily|weekly|monthly|overall)\b/);
    if (tfMatch) {
      const timeframe = tfMatch[1] as 'daily'|'weekly'|'monthly'|'overall';
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
        setMessages(prev => [...prev, { sender: 'bot', text: 'Please specify: daily, weekly, monthly, or overall.', timestamp: new Date() }]);
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
    // Intercept email reminder requests (e.g., "send reminder to John", "can you send a reminder to John to fill in the scheduler")
    const emailReminderMatch = lower.match(/(?:send|can\s+you\s+send).*?reminder.*?(?:to\s+)([a-z]+(?:\s+[a-z]+)*)/i);
    if (emailReminderMatch) {
      let staffName = emailReminderMatch[1].trim();
      
      // More comprehensive cleanup: extract only the name part by removing everything after common action words
      const cleanupPatterns = [
        /\s+to\s+(book|complete|fill|submit|update).*$/i,
        /\s+(book|about|for|that|please|hrs|hours).*$/i,
        /\s+(his|her|their)\s+(hrs|hours|schedule|scheduler).*$/i,
        /\s+for\s+(next|the|this)\s+(week|month).*$/i,
        /\s+(scheduler|schedule).*$/i,
        /\s+next\s+week.*$/i
      ];
      
      for (const pattern of cleanupPatterns) {
        staffName = staffName.replace(pattern, '').trim();
      }
      
      // Additional safety: if the name still contains non-name words, try to extract just first/last name pattern
      if (/\b(book|fill|complete|hrs|hours|schedule|scheduler|next|week|for|the)\b/i.test(staffName)) {
        const nameMatch = staffName.match(/^([a-z]+(?:\s+[a-z]+)?)\s+/i);
        if (nameMatch) {
          staffName = nameMatch[1].trim();
        } else {
          // Fallback: take only the first two words if they look like names
          const words = staffName.split(/\s+/).filter(word => /^[a-z]+$/i.test(word));
          staffName = words.slice(0, 2).join(' ').trim();
        }
      }
      // Show user message
      setMessages(prev => [...prev, { sender: 'user', text: input, timestamp: new Date(), type: 'text' }]);
      setInput('');
      
      try {
        const res = await axios.post('/api/email/send-custom-reminder', { staffName });
        if (res.data.success) {
          setMessages(prev => [...prev, { 
            sender: 'bot', 
            text: `✅ Email reminder sent successfully to ${res.data.staffName} (${res.data.email}). They currently have ${res.data.assignedHours} hours assigned for next week.`, 
            timestamp: new Date(), 
            type: 'text' 
          }]);
        } else {
          setMessages(prev => [...prev, { 
            sender: 'bot', 
            text: `❌ Failed to send reminder: ${res.data.message}`, 
            timestamp: new Date(), 
            type: 'text' 
          }]);
        }
      } catch (error: any) {
        console.error('Email reminder error:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
        setMessages(prev => [...prev, { 
          sender: 'bot', 
          text: `❌ Failed to send email reminder: ${errorMessage}`, 
          timestamp: new Date(), 
          type: 'text' 
        }]);
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
      const tfMatch = lower.match(/\b(daily|weekly|monthly|overall)\b/);
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
                  const timeframe = tfMatch[1] as 'daily'|'weekly'|'monthly'|'overall';
        setMessages(prev => [...prev, { sender: 'user', text: input, timestamp: new Date() }]);
        setMessages(prev => [...prev, { sender: 'bot', text: `Opening Analytics page to generate ${timeframe} report from ${dateStr}...`, timestamp: new Date() }]);
        localStorage.setItem('chatMessages', JSON.stringify([...messages, { sender: 'bot', text: `Opening Analytics page to generate ${timeframe} report from ${dateStr}...`, timestamp: new Date() }]));
        window.location.href = `/analytics?reportStart=${dateStr}&reportTimeframe=${timeframe}`;
        setInput('');
        return;
      }
      // Otherwise ask which type
      setMessages(prev => [...prev, { sender: 'user', text: input, timestamp: new Date() }]);
                setMessages(prev => [...prev, { sender: 'bot', text: `Would you like a daily, weekly, monthly, or overall report starting from ${dateStr}?`, timestamp: new Date() }]);
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
          const raw = dateMatch[1].replace(/(st|nd|rd|th)/i, '');
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
      
      // 🚀 AUTO-REFRESH SCHEDULE (Option A)
      // Detect any kind of successful booking and always notify the calendar page.
      const bookingHappened = (
        Array.isArray(res.data?.resolvedMatches) && res.data.resolvedMatches.length > 0
      ) || (
        Array.isArray(res.data?.booking) && res.data.booking.length > 0
      ) || (
        Boolean(res.data?.booking) && !Array.isArray(res.data?.booking) // truthy non-array booking obj
      ) || (
        Array.isArray(res.data?.assignments) && res.data.assignments.length > 0
      );

      if (bookingHappened) {
        console.log('🔄 Booking detected – updating Redux store and refreshing calendar');
        // Wait for database to finish bulk upsert, then fetch complete data
        const fetchAndUpdate = async (attempt = 1) => {
          try {
            const { data } = await axios.get('/api/assignments');
            const tasks = data.map((a: any) => ({
              id: a.id,
              staffId: a.staffId,
              date: a.date,
              taskType: a.projectName,
              hours: a.hours,
              projectId: a.projectId
            }));
            dispatch(setTasks(tasks));
            window.dispatchEvent(new CustomEvent('refreshCalendar'));
            console.log(`✅ Calendar updated with ${tasks.length} assignments (attempt ${attempt})`);
          } catch (e) {
            console.error(`Failed to fetch updated assignments (attempt ${attempt}):`, e);
            // Retry once more after 1 second if first attempt fails
            if (attempt === 1) {
              setTimeout(() => fetchAndUpdate(2), 1000);
            }
          }
        };
        
        // Wait longer for bulk operations to complete
        setTimeout(() => fetchAndUpdate(1), 2000);
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
            .then(async res => {
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
              
              // 🚀 AUTO-REFRESH SCHEDULE (Option A)
              // Detect any kind of successful booking and always notify the calendar page.
              const bookingHappened = (
                Array.isArray(res.data?.resolvedMatches) && res.data.resolvedMatches.length > 0
              ) || (
                Array.isArray(res.data?.booking) && res.data.booking.length > 0
              ) || (
                Boolean(res.data?.booking) && !Array.isArray(res.data?.booking) // truthy non-array booking obj
              ) || (
                Array.isArray(res.data?.assignments) && res.data.assignments.length > 0
              );

              if (bookingHappened) {
                console.log('🔄 Booking detected – updating Redux store and refreshing calendar');
                // Wait for database to finish bulk upsert, then fetch complete data
                const fetchAndUpdate = async (attempt = 1) => {
                  try {
                    const { data } = await axios.get('/api/assignments');
                    const tasks = data.map((a: any) => ({
                      id: a.id,
                      staffId: a.staffId,
                      date: a.date,
                      taskType: a.projectName,
                      hours: a.hours,
                      projectId: a.projectId
                    }));
                    dispatch(setTasks(tasks));
                    window.dispatchEvent(new CustomEvent('refreshCalendar'));
                    console.log(`✅ Calendar updated with ${tasks.length} assignments (attempt ${attempt})`);
                  } catch (e) {
                    console.error(`Failed to fetch updated assignments (attempt ${attempt}):`, e);
                    // Retry once more after 1 second if first attempt fails
                    if (attempt === 1) {
                      setTimeout(() => fetchAndUpdate(2), 1000);
                    }
                  }
                };
                
                // Wait longer for bulk operations to complete
                setTimeout(() => fetchAndUpdate(1), 2000);
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
          mb: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          px: 2
        }}
      >
        {/* Timestamp */}
        {index === 0 || format(messages[index - 1]?.timestamp || new Date(), 'MMM d') !== format(message.timestamp, 'MMM d') && (
          <Typography 
            variant="caption" 
            sx={{ 
              alignSelf: 'center',
              color: 'text.secondary',
              fontSize: '0.75rem',
              mb: 2,
              mt: index === 0 ? 0 : 2
            }}
          >
            {format(message.timestamp, 'EEEE \'at\' h:mm a')}
          </Typography>
        )}

        <Box sx={{
          display: 'flex',
          alignItems: 'flex-start',
          flexDirection: isUser ? 'row-reverse' : 'row',
          gap: 1,
          maxWidth: '85%',
          width: 'auto'
        }}>
          {/* Bot Avatar */}
          {!isUser && (
            <Avatar
              sx={{
                width: 28,
                height: 28,
                background: 'linear-gradient(135deg, #064028 0%, #0d5a3a 100%)',
                color: 'white',
                fontSize: '0.75rem',
                mt: 0.5
              }}
            >
              <PsychologyIcon fontSize="small" />
            </Avatar>
          )}
          
          <Box
            sx={{
              maxWidth: isUser ? '280px' : '320px',
              minWidth: 'auto',
              background: isUser 
                ? 'linear-gradient(135deg, #064028 0%, #0d5a3a 100%)'
                : '#F8F9FA',
              color: isUser ? 'white' : '#1A1A1A',
              borderRadius: isUser ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
              px: 2,
              py: 1.5,
              position: 'relative',
              wordWrap: 'break-word',
              border: isUser ? 'none' : '1px solid #E9ECEF'
            }}
          >
            {message.type === 'thinking' ? (
              <Accordion 
                disableGutters 
                elevation={0} 
                sx={{ 
                  bgcolor: 'transparent',
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary', fontSize: '1rem' }} />}
                  sx={{ 
                    p: 0, 
                    minHeight: 'auto', 
                    '& .MuiAccordionSummary-content': { m: 0 } 
                  }}
                >
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.85rem' }}>
                    Thinking{message.duration ? ` for ${message.duration.toFixed(1)}s` : ''}...
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: '8px 0 0 0' }}>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.85rem' }}>
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
                  whiteSpace: 'pre-line',
                  fontSize: '0.9rem',
                  lineHeight: 1.4
                }}
              >
                {message.text}
              </Typography>
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  margin: 0
                }}
              >
                {message.text}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <>
      {!open && (
        <Tooltip title="Open Staff Scheduler Assistant" placement="left">
          <IconButton
            onClick={handleToggleChat}
            sx={{ 
              position: 'fixed', 
              bottom: 24, 
              right: 24, 
              background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
              color: 'white', 
              zIndex: 1300,
              height: 56,
              width: 56,
              boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)',
              }
            }}
          >
            <PsychologyIcon />
          </IconButton>
        </Tooltip>
      )}
      {open && (
        <Box 
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            width: 380, 
            height: minimized ? 'auto' : 660, 
            zIndex: 1300,
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.06)',
            border: '1px solid #E9ECEF'
          }}
        >
          <Paper 
            elevation={0} 
            sx={{ 
              bgcolor: 'white', 
              height: minimized ? 'auto' : '100%', 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 4
            }}
          >
            {/* Clean header */}
            <Box 
              sx={{ 
                p: 2, 
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #F1F3F4',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={handleHeaderClick}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    background: 'linear-gradient(135deg, #064028 0%, #0d5a3a 100%)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                >
                  <PsychologyIcon fontSize="small" />
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1A1A1A' }}>
                  Staff Scheduler Assistant
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuOpen(e);
                  }}
                  sx={{ 
                    color: '#6B7280',
                    '&:hover': { bgcolor: '#F3F4F6' }
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                  }}
                  sx={{ 
                    color: '#6B7280',
                    '&:hover': { bgcolor: '#F3F4F6' }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            
            {/* Menu */}
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ 
                sx: { 
                  bgcolor: 'white',
                  borderRadius: 2,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  border: '1px solid #E9ECEF'
                } 
              }}
            >
              <MenuItem 
                onClick={clearChat}
                sx={{ '&:hover': { bgcolor: '#F8F9FA' } }}
              >
                <ClearIcon sx={{ mr: 1, color: '#6B7280', fontSize: '1.1rem' }} />
                Clear Chat
              </MenuItem>
            </Menu>

            {!minimized && (
              <>
                {/* Mode toggle - cleaner design */}
                <Box sx={{ p: 2, borderBottom: '1px solid #F1F3F4' }}>
                  <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={handleModeChange}
                    size="small"
                    fullWidth
                    sx={{ 
                      '& .MuiToggleButton-root': {
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px !important',
                        px: 2,
                        py: 1,
                        fontSize: '0.85rem',
                        textTransform: 'none',
                        '&:first-of-type': {
                          marginRight: 0.5,
                          borderTopRightRadius: '12px !important',
                          borderBottomRightRadius: '12px !important'
                        },
                        '&:last-of-type': {
                          borderTopLeftRadius: '12px !important',
                          borderBottomLeftRadius: '12px !important'
                        },
                        '&.Mui-selected': {
                          background: 'linear-gradient(135deg, #064028 0%, #0d5a3a 100%)',
                          color: 'white',
                          border: '1px solid #064028',
                          fontWeight: 500
                        },
                        '&:not(.Mui-selected)': {
                          color: '#6B7280',
                          '&:hover': { bgcolor: '#F9FAFB' }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="ask">
                      <ChatIcon sx={{ mr: 1, fontSize: '1rem' }} />
                      Ask
                    </ToggleButton>
                    <ToggleButton value="agent">
                      <ManageAccountsIcon sx={{ mr: 1, fontSize: '1rem' }} />
                      Agent
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                {/* Messages area - clean background */}
                <Box 
                  sx={{ 
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: '#FAFBFC',
                    position: 'relative',
                    '&::-webkit-scrollbar': { width: 0 }
                  }}
                >
                  <Box sx={{ py: 2 }}>
                    {messages.map((message, idx) => renderMessage(message, idx))}
                    <div ref={messagesEndRef} />
                  </Box>
                </Box>
                
                                 {/* Bottom input area with gradient - like the reference image */}
                 <Box 
                   sx={{ 
                     background: 'linear-gradient(135deg, #064028 0%, #0d5a3a 50%, #1b5e20 100%)',
                     p: 2,
                     borderTop: '1px solid #E9ECEF'
                   }}
                >
                  {(mode === 'ask' || mode === 'agent') && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <IconButton
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          color: '#4CAF50',
                          width: 40,
                          height: 40,
                          '&:hover': { backgroundColor: 'white' }
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                      
                      <Box sx={{ flex: 1, position: 'relative' }}>
                        <TextField
                          variant="outlined"
                          fullWidth
                          placeholder="Ask me anything..."
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
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              borderRadius: 6,
                              border: 'none',
                              fontSize: '0.9rem',
                              minHeight: '36px',
                              '& fieldset': { border: 'none' },
                              '&:hover fieldset': { border: 'none' },
                              '&.Mui-focused fieldset': { border: 'none' }
                            },
                            '& .MuiOutlinedInput-input': {
                              py: 0.5,
                              px: 2,
                              height: '16px'
                            }
                          }}
                        />
                      </Box>

                      <IconButton
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        sx={{
                          backgroundColor: loading || !input.trim() 
                            ? 'rgba(255, 255, 255, 0.5)' 
                            : 'rgba(255, 255, 255, 0.9)',
                          color: loading || !input.trim() 
                            ? 'rgba(76, 175, 80, 0.5)' 
                            : '#4CAF50',
                          width: 40,
                          height: 40,
                          '&:hover': !loading && input.trim() ? { 
                            backgroundColor: 'white',
                            boxShadow: '0 2px 8px rgba(76, 175, 80, 0.15)'
                          } : {}
                        }}
                      >
                        {loading ? (
                          <CircularProgress size={20} sx={{ color: 'rgba(76, 175, 80, 0.5)' }} />
                        ) : (
                          <SendIcon />
                        )}
                      </IconButton>
                    </Box>
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
import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, TextField, Paper, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

const ChatWidget: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const res = await axios.post('http://localhost:5000/api/chat', { messages: [...messages, userMsg] });
      const botText = res.data.response.content;
      const botMsg: Message = { sender: 'bot', text: botText };
      setMessages((prev) => [...prev, botMsg]);
      scrollToBottom();
    } catch (err) {
      console.error(err);
      const errorMsg: Message = { sender: 'bot', text: 'Error connecting to chat service.' };
      setMessages((prev) => [...prev, errorMsg]);
      scrollToBottom();
    }
  };

  return (
    <>
      {!open && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', bottom: 20, right: 20, bgcolor: 'primary.main', color: 'white', zIndex: 1300 }}
        >
          <ChatIcon />
        </IconButton>
      )}
      {open && (
        <Box sx={{ position: 'fixed', bottom: 20, right: 20, width: 300, height: 400, zIndex: 1300 }}>
          <Paper elevation={3} sx={{ bgcolor: 'white', color: 'black', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 1, bgcolor: 'primary.main', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" color="white">
                Chatbot
              </Typography>
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, p: 1, overflowY: 'auto' }}>
              {messages.map((m, idx) => (
                <Box key={idx} sx={{ my: 1, textAlign: m.sender === 'user' ? 'right' : 'left' }}>
                  <Paper
                    sx={{
                      display: 'inline-block',
                      p: 1,
                      bgcolor: m.sender === 'user' ? 'secondary.main' : 'grey.200',
                      color: m.sender === 'user' ? 'white' : 'black',
                    }}
                  >
                    <Typography variant="body2">{m.text}</Typography>
                  </Paper>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                sx={{ bgcolor: 'white', color: 'black' }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
              />
              <IconButton color="primary" onClick={sendMessage}>
                <SendIcon />
              </IconButton>
            </Box>
          </Paper>
        </Box>
      )}
    </>
  );
};

export default ChatWidget; 
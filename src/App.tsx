import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LandingPage from './pages/LandingPage';
import AddPage from './pages/AddPage';
import SchedulingPage from './pages/SchedulingPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import ChatWidget from './components/ChatWidget';

// Create a theme based on the PRD color palette
const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // Dark shade of green
    },
    secondary: {
      main: '#388E3C', // Green
    },
    warning: {
      main: '#FFA000', // Accent - Orange
    },
    text: {
      primary: '#212121', // Dark Grey
    },
    background: {
      default: '#212529', // Overall page background (darker shade)
      paper: '#343a40', // Panels and header background (lighter shade)
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h1: {
      fontSize: '24px',
      fontWeight: 500,
    },
    h2: {
      fontSize: '20px',
      fontWeight: 500,
    },
    h3: {
      fontSize: '18px',
      fontWeight: 500,
    },
    body1: {
      fontSize: '14px',
    },
    button: {
      fontSize: '14px',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/add" element={<AddPage />} />
          <Route path="/schedule" element={<SchedulingPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Router>
      <ChatWidget />
    </ThemeProvider>
  );
}

export default App; 
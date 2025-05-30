// Mock fetch and XMLHttpRequest
global.fetch = jest.fn();
global.XMLHttpRequest = jest.fn();

// Mock environment variables
process.env.REACT_APP_SUPABASE_URL = 'http://localhost:54321';
process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key'; 
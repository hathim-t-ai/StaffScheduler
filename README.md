# Staff Scheduler

A web-based staff scheduling SaaS application for managing workforce allocation, project staffing, and resource utilization analytics.

## Features

- **Landing Page**: Navigation to core application functionalities
- **Add Page**: Staff and project data management with import capabilities
- **Scheduling Page**: Calendar-based resource allocation with visual indicators
- **Analytics Dashboard**: Resource utilization and project performance metrics
- **Settings Page**: Configurable rules and system preferences
- **AI Chatbot**: Intelligent assistant for information retrieval and scheduling
- **PDF Scheduling Report**: Generate weekly or monthly PDF schedule reports via CrewAI agent with PDF rendering.
- **Bulk Booking Pipeline**: Book multiple staff assignments via chat widget using natural language commands.

## Technical Stack

### Frontend
- React.js with TypeScript
- Redux Toolkit for state management
- Material-UI for component styling
- Chart.js for data visualization
- FullCalendar for scheduling interface
- Formik for form handling
- AG Grid for tabular data display

### Backend
- Node.js with Express
- Supabase Postgres client (`@supabase/supabase-js`)
- OpenAI integration for AI features
- RESTful API architecture

### AI Orchestration
- Python FastAPI service
- CrewAI for agent orchestration
- Specialized AI agents for data retrieval and task execution

## Getting Started

### Prerequisites
- Node.js (v16.x or later)
- npm (v8.x or later)
- Python (v3.9 or later)
- OpenAI API key

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd staff-scheduler
   ```

2. Install Node.js dependencies
   ```bash
   npm install
   ```

3. Setup environment variables
   Create a `.env` file in the root directory with the following:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   SUPABASE_URL=https://rqqsluttocudrrhvxmot.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcXNsdXR0b2N1ZHJyaHZ4bW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDY2MTIsImV4cCI6MjA2MzkyMjYxMn0.0b7eUdKIBUGBIHF90ieiIf39dLoWzN_-BI_6uDn76YA
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NjYxMiwiZXhwIjoyMDYzOTIyNjEyfQ.2JF1MTAqy_BEk6BhBDP2NEzsl1RCCnwQqtWp7nTPO0o
   ```

4. Start both services (Node.js and Python)
   ```bash
   # On Unix/Mac
   ./start.sh
   
   # On Windows
   start.bat
   ```
   
5. Open your browser and visit [http://localhost:3000](http://localhost:3000)

## Using the AI Chatbot

The application includes a powerful AI chatbot that can answer questions about staff, projects, and schedules, as well as help with scheduling tasks.

### Ask Mode
Use the chatbot to get information by asking natural language questions like:
- "Who is available tomorrow?"
- "What projects is John working on?"
- "How many hours has the Design team worked this month?"
- "Show me all staff members in the Marketing department"

### Schedule Mode
Use the chatbot to schedule staff for projects:
1. Switch to "Schedule" mode in the chat interface
2. Select a date
3. Select one or more staff members
4. Select a project
5. Enter hours (1-8)
6. Click "Schedule Staff"

The AI will automatically check availability, schedule the staff, and provide confirmation.

## Project Structure

```
staff-scheduler/
├── public/               # Static assets
├── prisma/               # Prisma DB schema and migrations
├── orchestrator-service/ # Python AI orchestrator
│   ├── agents.yaml       # CrewAI agent definitions
│   ├── tasks.yaml        # CrewAI task definitions
│   └── app.py            # FastAPI application
├── src/
│   ├── components/       # Reusable UI components
│   │   └── ChatWidget.tsx # AI chat interface
│   ├── contexts/         # React contexts for state sharing
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Main application pages
│   ├── services/         # API services and data fetching
│   ├── store/            # Redux store and slices
│   ├── utils/            # Helper functions and utilities
│   ├── App.tsx           # Main application component
│   └── index.tsx         # Application entry point
├── server.js             # Express backend server
├── chatFunctions.js      # OpenAI function implementations
├── start.sh              # Unix startup script
├── start.bat             # Windows startup script
└── package.json          # Project dependencies and scripts
```

## Development Guidelines

- Use 2-space indentation for all files
- Follow camelCase for variables and PascalCase for components
- Keep functions small and focused on a single responsibility
- Limit files to a maximum of 350 lines of code
- Extract complex logic into custom hooks or utility functions
- Split large components into smaller, reusable components
- Optimize for performance by preventing unnecessary re-renders
- Implement proper error handling and input validation
- Write meaningful commit messages following conventional commits format

## Project Overview

This application provides powerful tools for:
- Managing staff members and projects with intelligent data caching and deduplication
- Scheduling resources with built-in conflict prevention and daily hour limits
- Analyzing resource utilization and project performance
- Supporting Excel/CSV/Google Sheets data imports with column mapping
- AI-powered scheduling assistant and information retrieval

## Key Features

### Data Handling
- Efficient caching of people and project data
- Deduplication based on name, grade, and location
- Smart data management to optimize performance

### Scheduling Logic
- Maximum 8 hours per day per person restriction
- Color-coded calendar cells for better visualization
- Automatic conflict prevention when scheduling resources

### User Interface
- Consistent color scheme (yellow for hours, green for availability)
- Navigable calendar defaulting to the current week
- Collapsible left pane for improved workspace utilization
- Intelligent chat interface with two operational modes

### AI Assistance
- Natural language queries for information retrieval
- Smart scheduling with conflict detection and resolution
- Multiple specialized AI agents for different tasks
- Integration with database via OpenAI function calling

### File Imports
- Support for Excel, CSV and Google Sheets imports
- Interactive column mapping for flexible data ingestion
- Efficient handling of large data uploads

## Available Scripts

- `npm run start` - Start both the Node.js server and React application
- `npm run start-client` - Start only the React frontend
- `npm run build` - Build the application for production
- `npm run lint` - Run ESLint to check code quality
- `npm run test` - Run test suite
- `npm run format` - Format code using Prettier
- `npm run serve-chat` - Start only the Node.js server

## Repository

This project is hosted on GitHub at: [https://github.com/hathim-t-ai/StaffScheduler](https://github.com/hathim-t-ai/StaffScheduler)

## License

MIT 
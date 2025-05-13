# Staff Scheduler

A web-based staff scheduling SaaS application for managing workforce allocation, project staffing, and resource utilization analytics.

## Features

- **Landing Page**: Navigation to core application functionalities
- **Add Page**: Staff and project data management with import capabilities
- **Scheduling Page**: Calendar-based resource allocation with visual indicators
- **Analytics Dashboard**: Resource utilization and project performance metrics
- **Settings Page**: Configurable rules and system preferences

## Technical Stack

### Frontend
- React.js with TypeScript
- Redux Toolkit for state management
- Material-UI for component styling
- Chart.js for data visualization
- FullCalendar for scheduling interface
- Formik for form handling
- AG Grid for tabular data display

### Backend (Planned)
- Node.js with Express
- PostgreSQL database
- Redis for caching
- RESTful API architecture

## Getting Started

### Prerequisites
- Node.js (v16.x or later)
- npm (v8.x or later)

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd staff-scheduler
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm start
   ```
   
4. Open your browser and visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
staff-scheduler/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts for state sharing
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Main application pages
│   ├── services/       # API services and data fetching
│   ├── store/          # Redux store and slices
│   ├── utils/          # Helper functions and utilities
│   ├── App.tsx         # Main application component
│   └── index.tsx       # Application entry point
└── package.json        # Project dependencies and scripts
```

## Development Guidelines

- Use 2-space indentation for all files
- Follow camelCase for variables and PascalCase for components
- Keep functions small and focused on a single responsibility
- Optimize for performance by preventing unnecessary re-renders
- Implement proper error handling and input validation
- Write meaningful commit messages following conventional commits format

## Project Overview

This application provides powerful tools for:
- Managing staff members and projects with intelligent data caching and deduplication
- Scheduling resources with built-in conflict prevention and daily hour limits
- Analyzing resource utilization and project performance
- Supporting Excel/CSV/Google Sheets data imports with column mapping
- Role-based access control for administrators and team leads

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

### Authentication
- Role-based access control (admin/team lead)
- Extensible permission system for future role expansion

### File Imports
- Support for Excel, CSV and Google Sheets imports
- Interactive column mapping for flexible data ingestion
- Efficient handling of large data uploads

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run test` - Run test suite
- `npm run format` - Format code using Prettier

## Repository

This project is hosted on GitHub at: [https://github.com/hathim-t-ai/StaffScheduler](https://github.com/hathim-t-ai/StaffScheduler)

## License

MIT 
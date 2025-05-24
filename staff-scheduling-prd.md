# Staff Scheduling SaaS Application PRD

## Document Information
- **Document Version:** 1.0
- **Date:** May 13, 2025
- **Author:** Technical Product Manager

## Table of Contents
1. [Introduction](#introduction)
2. [Product Overview](#product-overview)
3. [Goals and Objectives](#goals-and-objectives)
4. [Target Audience](#target-audience)
5. [Features and Requirements](#features-and-requirements)
6. [User Stories and Acceptance Criteria](#user-stories-and-acceptance-criteria)
7. [Technical Requirements / Stack](#technical-requirements--stack)
8. [Design and User Interface](#design-and-user-interface)

## 1. Introduction

This Product Requirements Document (PRD) outlines the detailed specifications for developing a staff scheduling SaaS application. The application aims to streamline the process of managing staff resources, assigning them to projects, and analyzing resource utilization across an organization. This document will serve as the primary reference for the development team, stakeholders, and quality assurance teams throughout the development lifecycle.

The initial version of the application will focus on core scheduling functionalities, including staff and project management, resource allocation, and analytics. Authentication features are intentionally excluded from this initial scope and will be incorporated in a subsequent release.

## 2. Product overview

The Staff Scheduling SaaS Application is a web-based platform designed to help organizations efficiently manage their workforce allocation. The system provides tools for adding staff members and projects, scheduling resources, and analyzing resource utilization and project performance.

The application consists of four main components:
- A landing page providing access to the core functions
- An add page for inputting and managing staff and project data
- A scheduling page for allocating staff to projects and managing time-off
- An analytics dashboard for visualizing resource utilization and performance metrics

The platform allows users to upload data from external sources (Excel, CSV, Google Sheets), map columns appropriately, and deduplicate entries to maintain data integrity. The scheduling interface provides a calendar view with intuitive color-coding to indicate resource availability and allocation levels.

## 3. Goals and objectives

### Primary Goals
1. Create a user-friendly interface for managing staff and project resources
2. Streamline the process of scheduling staff for projects and tracking availability
3. Provide insightful analytics on resource utilization and project performance
4. Reduce administrative overhead in resource management processes
5. Improve visibility of resource allocation across the organization

### Key Objectives
1. Develop a landing page with clear navigation to core functionalities
2. Implement capabilities for adding and managing staff and project data, including import from external sources
3. Create an intuitive scheduling interface with visual indicators of resource allocation
4. Build an analytics dashboard that provides actionable insights
5. Design a configurable settings page for establishing rules and constraints
6. Ensure the application is responsive, performant, and scalable

### Success Criteria
1. Users can completely set up staff and project data in less than 30 minutes
2. Resource scheduling can be completed for 50+ staff members within 2 hours
3. The system correctly identifies and prevents scheduling conflicts
4. Analytics provide accurate insights on resource utilization with less than 5% margin of error
5. 90% of users rate the application as "easy to use" in initial user testing

## 4. Target audience

### Primary Users
1. **Resource Managers**: Professionals responsible for allocating staff to projects and ensuring optimal resource utilization.
2. **Project Managers**: Team leads who need to request and manage resources for their projects.
3. **Department Heads**: Leadership personnel who need visibility into resource allocation and performance across teams.

### Secondary Users
1. **Staff Members**: Individual contributors who need to view their schedules and availability.
2. **Executives**: Senior leadership requiring high-level insights into resource utilization and project performance.
3. **Finance Teams**: Personnel tracking project budgets and resource costs.

### User Characteristics
- Technical proficiency: Moderate to high
- Frequency of use: Daily or weekly
- Primary needs: Efficiency in resource allocation, visibility into resource availability, and analytics on utilization
- Key pain points: Manual scheduling processes, lack of visibility into resource availability, difficulty in optimizing resource allocation

## 5. Features and requirements

### 5.1 Landing page

#### Core Requirements
- Display three main navigation tiles:
  - "Add" tile with appropriate icon, redirecting to the Add page
  - "Schedule" tile with appropriate icon, redirecting to the Scheduling page
  - "Analytics" tile with appropriate icon, redirecting to the Analytics dashboard
- Include a settings button in the top-right corner for future configuration options
- Include a placeholder for a chat function in the bottom-right corner (to be implemented later)
- Use consistent styling and branding elements across all tiles and navigation components
- Implement responsive design to ensure usability across desktop and tablet devices

#### Constraints and Considerations
- The landing page should load in under 2 seconds
- All navigation elements should be clearly visible without scrolling on standard desktop screens
- The layout should maintain integrity when resized for different screen dimensions

### 5.2 Add page

#### People Management
- Implement a left pane with tabbed interface featuring "People" and "Projects" tabs
- For the "People" tab, create a table with the following default columns:
  - Name
  - Grade
  - Department
  - City
  - Country
  - Skills
- Enable column customization through an "Add" or "+" button to allow additional fields
- Provide a form interface for manual entry of staff details
- Support batch upload of staff data via Excel, CSV, or Google Sheets files
- Implement a column mapping interface for aligning uploaded data with system fields
- Include deduplication logic based on name, grade, and location

#### Project Management
- For the "Projects" tab, create a table with the following default columns:
  - Project name
  - Partner name
  - Team lead
  - Budget
- Enable column customization through an "Add" or "+" button to allow additional fields
- Provide a form interface for manual entry of project details
- Support batch upload of project data via Excel, CSV, or Google Sheets files
- Implement a column mapping interface for aligning uploaded data with system fields
- Include deduplication logic based on project name and partner name

#### Navigation
- Include buttons/links to navigate to:
  - Landing Page
  - Scheduling Page
  - Analytics Page

#### Data Handling
- All data should be validated upon entry to ensure format consistency
- Changes to data should be saved automatically or through an explicit save action
- Provide feedback on successful data operations (add, update, delete)
- Include error handling with user-friendly error messages

### 5.3 Scheduling page

#### Calendar Interface
- Display a calendar view starting from the current week
- Provide week navigation controls (previous/next week)
- Support multi-select functionality for staff members
- Enable filtering of staff list by department, location, or skills

#### Task Assignment
- Implement an "Add" button in each staff-date cell
- When clicked, open a right pane with task assignment options:
  - Task number (auto-generated, e.g., "Task 1")
  - Task type dropdown with options: "Available", "Annual Leave", "Sick Leave", or project names
  - Hours dropdown with options from 1 to 8
  - "+" button to add multiple tasks for the same day
  - "Save and Apply" button to commit changes
- Enable drag-and-drop functionality for copying assignments across multiple days
- Support bulk scheduling operations for multiple staff members

#### Visual Indicators
- Implement color coding based on hours booked:
  - 0-2 hours: Lightest yellow
  - 2-4 hours: Darker yellow
  - 4-6 hours: Even darker yellow
  - 6-7 hours: Dark yellow/orange
  - 8 hours: Bright orange
- Use bright green for "Available" status
- Use grey for "Annual Leave" or "Sick Leave" status
- Display project names or identifiers within cell when assigned
- Indicate over-allocation (more than 8 hours) with a visual warning (e.g., red border)

#### Navigation
- Include buttons/links to navigate to:
  - Landing Page
  - Add Page
  - Analytics Page

### 5.4 Analytics dashboard

#### Data Visualization
- Display aggregated data on resource utilization and project allocation
- Implement filtering options by team, location, or individual
- Provide statistics and graphs for projected chargeability
- Include key metrics such as:
  - Resource utilization rate
  - Project allocation breakdown
  - Availability forecast
  - Leave patterns
  - Skill utilization
- Support interactive elements allowing users to drill down into specific metrics
- Enable export of reports and visualizations

#### Dashboard Customization
- Allow users to customize dashboard layout
- Enable creation of saved views for frequently accessed analytics
- Support configuration of custom metrics and KPIs

#### Navigation
- Include buttons/links to navigate to:
  - Landing Page
  - Add Page
  - Scheduling Page

### 5.5 Settings page

#### Rule Configuration
- Enable setting of global rules:
  - Maximum hours per week per staff member
  - Mandatory days off (e.g., company holidays)
  - Default working hours
  - Approval workflows for leave requests
- Support project-level rules:
  - Budget limits and alerts
  - Required skills for assignments
  - Minimum staffing levels
  - Maximum allocation per staff grade
- Include validation to prevent conflicting rules

#### System Configuration
- Provide options for customizing date formats
- Enable configuration of fiscal year and reporting periods
- Support customization of color schemes and visual indicators

#### Navigation
- Include a button/link to navigate back to the Landing Page

### 5.6 PDF "Scheduling Report" agent

#### Layer: Prisma / REST
- Implement GET `/api/analytics/range?from=<start>&to=<end>` endpoint returning JSON summary (5-line SQL).

#### Layer: Python service
- File: `orchestrator-service/tools/report_tool.py`
```python
class ReportTool(BaseTool):
  name = "generate_report"
  args_schema = ReportArgs
  def _run(self, start: str, end: str, fmt: str = "pdf"):
    data = requests.get(f"{API}/analytics/range?from={start}&to={end}").json()
    pdf_path = render_pdf(data, start, end)  # use WeasyPrint or ReportLab
    return {"url": f"/static/reports/{os.path.basename(pdf_path)}"}
```
- `render_pdf()` builds a simple two-page PDF: KPI cards and assignment table.

#### Layer: CrewAI
- Add agent to `orchestrator-service/agents.yaml`:
```yaml
- name: report_generator
  role: Report Generator
  goal: Provide a concise weekly or monthly schedule PDF.
  tool: generate_report
```
- Add task in `orchestrator-service/tasks.yaml` that calls `generate_report`.

#### Layer: Express proxy
- New route `POST /api/report` that invokes orchestrator and returns `{ url }`.

#### Layer: Frontend (React)
- Add "Generate report for ⌄" button in Analytics page:
```typescript
await axios.post('/api/report', { from, to })
  .then(({ data }) => window.open(data.url));
```

### 5.7 Bulk-Booking pipeline

#### Step 1: Detect intent
- Extend `parseBookingCommand` to detect plural keywords (`all`, `team`, `each`) and return `{ mode: "bulk", ... }`.

#### Step 2: CrewAI agents
- Team-Lookup Agent: calls `GET /api/staff?team=<team>`.
- Bulk-Booking Agent: loops through members × projects × dates to build assignments.

#### Step 3: New Tool
- File: `orchestrator-service/tools/bulk_booking_tool.py`
```python
class BulkBookingTool(BaseTool):
  name = "bulk_booking"
  def _run(self, assignments: List[dict]):
    resp = requests.post(f"{API}/api/assignments/bulk", json=assignments)
    return resp.json()
```

#### Step 4: UX
- Chat widget streams back "✅ 240 assignments created for 12 staff across Projects A & B (26 May → 14 Jun)." plus a "View in calendar" link triggering a `refreshCalendar` event.

## 6. User stories and acceptance criteria

### Landing Page

#### ST-101: Access core application functions from landing page
**As a** resource manager,  
**I want to** see clear navigation options on the landing page,  
**So that** I can quickly access the main functions of the application.

**Acceptance Criteria:**
1. Landing page displays three distinct tiles: "Add", "Schedule", and "Analytics"
2. Each tile has an appropriate icon and label
3. Clicking on the "Add" tile redirects to the Add page
4. Clicking on the "Schedule" tile redirects to the Scheduling page
5. Clicking on the "Analytics" tile redirects to the Analytics dashboard
6. A settings button is visible in the top-right corner
7. A placeholder for the chat function is visible in the bottom-right corner
8. The page loads in under 2 seconds
9. The layout adapts appropriately to different screen sizes

#### ST-102: Access settings from landing page
**As a** department head,  
**I want to** access system settings from the landing page,  
**So that** I can configure rules and preferences for my organization.

**Acceptance Criteria:**
1. A settings button is clearly visible in the top-right corner of the landing page
2. Clicking the settings button navigates to the Settings page
3. The button is accessible on all supported device formats

### Add Page

#### ST-201: View and manage staff data
**As a** resource manager,  
**I want to** view and manage staff data in a tabular format,  
**So that** I can maintain accurate information about available resources.

**Acceptance Criteria:**
1. The Add page has a left pane with "People" and "Projects" tabs
2. When "People" tab is selected, a table is displayed with columns for name, grade, department, location, and skills
3. Table supports sorting by clicking on column headers
4. Table supports filtering by entering text in a search field
5. Data loads within 3 seconds for up to 1000 staff records

#### ST-202: Add new staff members manually
**As a** resource manager,  
**I want to** add new staff members manually,  
**So that** I can include resources that are not in bulk import files.

**Acceptance Criteria:**
1. An "Add Staff" button is visible above or within the staff table
2. Clicking the button opens a form with fields for all required staff attributes
3. Form includes validation for required fields
4. Upon submission, the new staff member appears in the table
5. Error messages are displayed if validation fails
6. Success message confirms when a staff member is added successfully

#### ST-203: Import staff data from external files
**As a** resource manager,  
**I want to** import staff data from Excel, CSV, or Google Sheets,  
**So that** I can quickly populate the system with existing records.

**Acceptance Criteria:**
1. An "Import" button is available above the staff table
2. Clicking the button opens a file selection dialog
3. User can select Excel (.xlsx, .xls), CSV (.csv), or Google Sheets files
4. After file selection, a column mapping interface is displayed
5. User can map source columns to system fields
6. System suggests mappings based on column names
7. Import process identifies potential duplicates based on name, grade, and location
8. User can review and resolve duplicates before completing the import
9. Success message shows number of records imported successfully
10. Error log is available for failed imports

#### ST-204: Add custom fields for staff data
**As a** department head,  
**I want to** add custom fields to the staff table,  
**So that** I can track department-specific attributes.

**Acceptance Criteria:**
1. An "Add Column" or "+" button is available near the table header
2. Clicking the button opens a dialog to specify column name and data type
3. New column appears in the table after confirmation
4. Custom columns are preserved when navigating away and returning
5. Custom columns are included in export operations

#### ST-205: View and manage project data
**As a** project manager,  
**I want to** view and manage project data in a tabular format,  
**So that** I can maintain accurate information about ongoing projects.

**Acceptance Criteria:**
1. When "Projects" tab is selected, a table is displayed with columns for project name, partner name, team lead, and budget
2. Table supports sorting by clicking on column headers
3. Table supports filtering by entering text in a search field
4. Data loads within 3 seconds for up to 500 project records

#### ST-206: Add new projects manually
**As a** project manager,  
**I want to** add new projects manually,  
**So that** I can include projects that are not in bulk import files.

**Acceptance Criteria:**
1. An "Add Project" button is visible above or within the project table
2. Clicking the button opens a form with fields for all required project attributes
3. Form includes validation for required fields
4. Upon submission, the new project appears in the table
5. Error messages are displayed if validation fails
6. Success message confirms when a project is added successfully

#### ST-207: Import project data from external files
**As a** project manager,  
**I want to** import project data from Excel, CSV, or Google Sheets,  
**So that** I can quickly populate the system with existing records.

**Acceptance Criteria:**
1. An "Import" button is available above the project table
2. Clicking the button opens a file selection dialog
3. User can select Excel (.xlsx, .xls), CSV (.csv), or Google Sheets files
4. After file selection, a column mapping interface is displayed
5. User can map source columns to system fields
6. System suggests mappings based on column names
7. Import process identifies potential duplicates based on project name and partner name
8. User can review and resolve duplicates before completing the import
9. Success message shows number of records imported successfully
10. Error log is available for failed imports

#### ST-208: Navigate between application sections
**As a** user,  
**I want to** navigate between different sections of the application,  
**So that** I can access all features without returning to the landing page.

**Acceptance Criteria:**
1. Navigation buttons/links to Landing Page, Scheduling Page, and Analytics Page are clearly visible
2. Clicking each button navigates to the respective page
3. Current page is visually indicated in the navigation
4. Navigation controls are accessible on all supported device formats

### Scheduling Page

#### ST-301: View staff schedule in calendar format
**As a** resource manager,  
**I want to** view staff schedules in a calendar format,  
**So that** I can see resource allocation at a glance.

**Acceptance Criteria:**
1. Scheduling page displays a calendar view starting from the current week
2. Staff members are listed in the left pane
3. Calendar shows days of the week with date indicators
4. Previous and next week navigation controls are available
5. Calendar view loads within 3 seconds for up to 100 staff members

#### ST-302: Assign tasks to staff members
**As a** resource manager,  
**I want to** assign tasks to staff members for specific dates,  
**So that** I can allocate resources to projects.

**Acceptance Criteria:**
1. Each staff-date cell has an "Add" button or clickable area
2. Clicking opens a right pane with task assignment options
3. Task number is auto-generated (e.g., "Task 1")
4. Task type dropdown includes "Available", "Annual Leave", "Sick Leave", and all project names
5. Hours dropdown allows selection from 1 to 8 hours
6. Multiple tasks can be added for the same day using the "+" button
7. Changes are saved when clicking "Save and Apply"
8. Assigned tasks appear in the calendar cell with appropriate color coding

#### ST-303: Visualize staff availability through color coding
**As a** resource manager,  
**I want to** see color-coded indicators of staff allocation,  
**So that** I can quickly identify available resources and allocation levels.

**Acceptance Criteria:**
1. Calendar cells are color-coded based on hours booked:
   - 0-2 hours: Lightest yellow
   - 2-4 hours: Darker yellow
   - 4-6 hours: Even darker yellow
   - 6-7 hours: Dark yellow/orange
   - 8 hours: Bright orange
2. "Available" status is indicated with bright green
3. "Annual Leave" or "Sick Leave" status is indicated with grey
4. Color indicators render correctly across different browsers
5. A legend explaining the color coding is available on the page

#### ST-304: Manage staff leave and availability
**As a** resource manager,  
**I want to** mark staff as on leave or available,  
**So that** I can account for non-project time in scheduling.

**Acceptance Criteria:**
1. Task type dropdown includes "Available", "Annual Leave", and "Sick Leave" options
2. Selecting these options disables the hours dropdown for "Annual Leave" and "Sick Leave" and sets it to 8 hours by default
3. Cells marked with leave status are visually distinct from project assignments
4. Leave assignments can be edited or deleted like project assignments

#### ST-305: Filter and search for specific staff members
**As a** resource manager,  
**I want to** filter and search for specific staff members,  
**So that** I can quickly find and schedule the right resources.

**Acceptance Criteria:**
1. A search field is available above the staff list
2. Entering text filters the staff list to matching names
3. Filter options are available for department, location, and skills
4. Filters can be combined (e.g., department AND skills)
5. Filtered view updates the calendar to show only matching staff
6. Clear button resets all filters
7. Search and filtering operations complete within 1 second

#### ST-306: Perform bulk scheduling operations
**As a** resource manager,  
**I want to** apply scheduling changes to multiple days or staff members at once,  
**So that** I can efficiently manage large teams or recurring assignments.

**Acceptance Criteria:**
1. Multi-select functionality allows selecting multiple staff members
2. Drag-and-drop functionality allows copying assignments across multiple days
3. Right-click context menu provides options for bulk operations
4. Bulk operations include "Copy Day", "Paste Day", "Clear Day"
5. Confirmation dialog appears for bulk operations affecting more than 5 staff-days
6. Success message confirms number of assignments created or modified

### Analytics Dashboard

#### ST-401: View resource utilization metrics
**As a** department head,  
**I want to** view resource utilization metrics,  
**So that** I can identify underutilized or overallocated staff.

**Acceptance Criteria:**
1. Analytics dashboard displays resource utilization rate as a primary metric
2. Utilization is calculated as (assigned project hours / total available hours) * 100%
3. Visualization shows utilization trends over time
4. Filters allow viewing utilization by team, location, or individual
5. Dashboard identifies resources with consistently high or low utilization
6. Data can be viewed for different time periods (week, month, quarter)

#### ST-402: Analyze project allocation breakdown
**As a** project manager,  
**I want to** see how resources are allocated across projects,  
**So that** I can ensure projects are adequately staffed.

**Acceptance Criteria:**
1. Dashboard includes a breakdown of hours allocated to each project
2. Visualization shows project allocation as a percentage of total available hours
3. Filters allow viewing allocation by team, location, or individual
4. Projects can be sorted by hours allocated or percentage of total
5. Clicking on a project shows detailed allocation by staff member
6. Dashboard identifies projects with insufficient resource allocation

#### ST-403: Forecast resource availability
**As a** resource manager,  
**I want to** forecast resource availability for upcoming periods,  
**So that** I can plan for future project staffing needs.

**Acceptance Criteria:**
1. Dashboard includes a forecast view showing availability for future weeks/months
2. Forecast accounts for scheduled leave and existing project assignments
3. Visualization shows available hours by team, location, or skill set
4. Forecast extends at least 3 months into the future
5. Data can be filtered to focus on specific criteria (e.g., staff with specific skills)
6. Export functionality allows sharing forecasts with stakeholders

#### ST-404: Export analytics data
**As a** department head,  
**I want to** export analytics data to external formats,  
**So that** I can include it in reports and presentations.

**Acceptance Criteria:**
1. Export button is available for each visualization
2. Export formats include PNG, PDF, CSV, and Excel
3. Exported data includes all currently applied filters
4. File naming follows a consistent pattern (e.g., "Utilization_May2025.xlsx")
5. Export operation completes within 5 seconds
6. Success message confirms when export is complete

#### ST-405: Customize analytics dashboard
**As a** user,  
**I want to** customize the analytics dashboard layout and metrics,  
**So that** I can focus on the most relevant data for my role.

**Acceptance Criteria:**
1. Dashboard includes an "Edit Layout" button
2. Users can drag and resize visualization widgets
3. Users can add, remove, or configure widgets
4. Custom layouts can be saved with meaningful names
5. Default layout can be restored with a single click
6. Custom layouts persist across user sessions

### Settings Page

#### ST-501: Configure global scheduling rules
**As a** department head,  
**I want to** configure global scheduling rules,  
**So that** I can enforce organizational policies.

**Acceptance Criteria:**
1. Settings page allows configuration of maximum hours per week per staff member
2. Interface for defining mandatory days off (e.g., company holidays)
3. Controls for setting default working hours
4. Options for configuring approval workflows for leave requests
5. Rules are validated to prevent contradictory settings
6. Changes are applied after explicit save action
7. Success message confirms when settings are updated

#### ST-502: Define project-specific rules
**As a** project manager,  
**I want to** define project-specific rules,  
**So that** I can ensure projects are staffed appropriately.

**Acceptance Criteria:**
1. Project-level settings section allows selection of specific projects
2. For each project, user can define budget limits and alert thresholds
3. Interface for specifying required skills for assignments
4. Controls for setting minimum staffing levels
5. Options for defining maximum allocation per staff grade
6. Project rules override global rules when in conflict
7. Changes are applied after explicit save action
8. Success message confirms when settings are updated

#### ST-503: Customize system preferences
**As a** user,  
**I want to** customize system preferences,  
**So that** the application meets my specific needs and preferences.

**Acceptance Criteria:**
1. Settings page includes options for date format (DD/MM/YYYY, MM/DD/YYYY, etc.)
2. Controls for defining fiscal year start and reporting periods
3. Interface for customizing color schemes and visual indicators
4. Options for setting default views and filters
5. Preferences are applied immediately after selection
6. Preferences persist across user sessions
7. Reset button restores default settings

### Database Modeling

#### ST-601: Database schema for staff management
**As a** database administrator,  
**I want to** implement an efficient database schema for staff data,  
**So that** the application can store and retrieve staff information optimally.

**Acceptance Criteria:**
1. Database schema includes tables for staff members with appropriate fields
2. Schema supports all standard and custom fields defined in the application
3. Appropriate indexes are created for commonly queried fields
4. Constraints enforce data integrity (e.g., unique constraints on staff identifiers)
5. Schema supports efficient querying of staff by various attributes
6. Database performance meets requirements for up to 10,000 staff records

#### ST-602: Database schema for project management
**As a** database administrator,  
**I want to** implement an efficient database schema for project data,  
**So that** the application can store and retrieve project information optimally.

**Acceptance Criteria:**
1. Database schema includes tables for projects with appropriate fields
2. Schema supports all standard and custom fields defined in the application
3. Appropriate indexes are created for commonly queried fields
4. Constraints enforce data integrity (e.g., unique constraints on project identifiers)
5. Schema supports efficient querying of projects by various attributes
6. Database performance meets requirements for up to 1,000 project records

#### ST-603: Database schema for scheduling data
**As a** database administrator,  
**I want to** implement an efficient database schema for scheduling data,  
**So that** the application can store and retrieve assignment information optimally.

**Acceptance Criteria:**
1. Database schema includes tables for assignments linking staff, projects, dates, and hours
2. Schema efficiently supports querying assignments by staff member, project, or date range
3. Appropriate indexes are created for commonly queried combinations
4. Constraints enforce data integrity (e.g., valid staff and project references)
5. Schema supports aggregation operations needed for analytics
6. Database performance meets requirements for up to 100,000 assignment records

## 7. Technical requirements / stack

### Front-end

#### Framework and Libraries
- **Framework**: React.js for component-based UI development
- **State Management**: Redux or Context API for application state management
- **UI Component Library**: Material-UI or Chakra UI for consistent styling
- **Data Visualization**: D3.js or Chart.js for analytics visualizations
- **Calendar/Scheduling**: React Big Calendar or FullCalendar for scheduling interface
- **Form Handling**: Formik or React Hook Form for form validation and submission
- **Data Grid**: AG Grid or React Table for tabular data display

#### Browser Compatibility
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

#### Performance Requirements
- Initial page load: < 3 seconds on standard broadband connection
- Interaction response time: < 300ms for UI interactions
- Data loading: < 2 seconds for retrieving up to 1000 records

### Back-end

#### API and Services
- **API Architecture**: RESTful API following standard HTTP methods
- **Server Framework**: Node.js with Express, Python with FastAPI, or Java with Spring Boot
- **Authentication**: JWT token-based authentication (to be implemented later)
- **Rate Limiting**: Implementation to prevent API abuse
- **Logging**: Structured logging for monitoring and debugging

#### Database
- **Primary Database**: PostgreSQL or MySQL for relational data
- **Caching Layer**: Redis for performance optimization
- **Backup Strategy**: Daily automated backups with point-in-time recovery

#### Security Requirements
- HTTPS for all traffic
- Input validation on all API endpoints
- Protection against common vulnerabilities (XSS, CSRF, SQL Injection)
- Data encryption at rest for sensitive information

### DevOps and Infrastructure

#### Deployment
- Containerized application using Docker
- Orchestration with Kubernetes or similar platform
- CI/CD pipeline for automated testing and deployment

#### Monitoring and Maintenance
- Application monitoring with Prometheus and Grafana
- Error tracking with Sentry or similar service
- Automated alerts for system issues
- Scheduled maintenance windows

#### Scalability
- Horizontal scaling capability to handle increased load
- Database sharding or replication for data growth
- CDN integration for static assets

### Data Management

#### Import/Export
- Support for Excel (.xlsx, .xls), CSV, and Google Sheets import
- Export functionality for all data tables in multiple formats
- Batch processing capability for large data sets

#### Data Integrity
- Validation rules for all data inputs
- Deduplication logic as specified in requirements
- Audit trails for data modifications

## 8. Design and user interface

### Design Principles

#### Consistency
- Consistent color scheme, typography, and iconography across all pages
- Uniform spacing and alignment of UI elements
- Standardized button styles and interaction patterns

#### Usability
- Intuitive navigation with clear labeling
- Progressive disclosure for complex functions
- Feedback on all user actions
- Appropriate use of modal dialogs and popovers

#### Accessibility
- Compliance with WCAG 2.1 AA standards
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast ratios

### User Interface Specifications

#### Landing Page
- Three equally sized tiles arranged horizontally or in a grid
- Each tile to include an icon, title, and brief description
- Settings button in top-right corner using gear icon
- Chat placeholder in bottom-right corner using message icon
- Responsive layout adapting to screen width

#### Add Page
- Left sidebar width: 20% of screen (minimum 250px)
- Tabbed interface with "People" and "Projects" tabs
- Table occupying remaining screen width
- Column headers with sort indicators
- Add/Import buttons above table
- Form fields using standard input controls (text fields, dropdowns, etc.)
- Column mapping interface with drag-and-drop functionality

#### Scheduling Page
- Left sidebar listing staff members (width: 20% of screen, minimum 250px)
- Calendar grid occupying remaining width
- Week navigation controls above calendar
- Color-coded cells according to specified scheme:
  - 0-2 hours: #FFFDE7 (Lightest yellow)
  - 2-4 hours: #FFF9C4 (Darker yellow)
  - 4-6 hours: #FFF59D (Even darker yellow)
  - 6-7 hours: #FFE082 (Dark yellow/orange)
  - 8 hours: #FFA000 (Bright orange)
  - "Available": #A5D6A7 (Bright green)
  - "Annual Leave" or "Sick Leave": #E0E0E0 (Grey)
- Task assignment pane width: 25% of screen (minimum 300px)
- Card-style design for task entries

#### Analytics Dashboard
- Grid layout supporting widgets of different sizes
- Each widget with title bar, visualization area, and filter controls
- Filter controls consistently positioned above visualizations
- Export buttons in top-right corner of each widget
- Muted color palette for visualizations to enhance readability
- Tooltips for detailed information on hover

#### Settings Page
- Tabbed interface for different setting categories
- Form layout with appropriate input controls
- Clear section headers and descriptions
- Save button consistently positioned at bottom of form
- Validation feedback adjacent to relevant fields

### Responsive Design

#### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

#### Adaptations
- Landing page tiles stack vertically on mobile
- Add page sidebar collapses to expandable drawer on mobile
- Scheduling page uses compressed calendar view on mobile
- Analytics widgets stack vertically on mobile
- Settings page maintains vertical layout across all devices

### Visual Design Elements

#### Color Palette
- Primary: #1976D2 (Blue)
- Secondary: #388E3C (Green)
- Accent: #FFA000 (Orange)
- Text: #212121 (Dark Grey)
- Background: #FFFFFF (White)
- Surface: #F5F5F5 (Light Grey)

#### Typography
- Headings: Roboto, 16-24px
- Body text: Roboto, 14px
- Button text: Roboto Medium, 14px
- Table text: Roboto, 13px

#### Icons
- Material Design icon set for consistency
- Icon size: 24px for navigation, 18px for inline

## Migration Roadmap: Switch to MultiCrew
*To replace LangChain with MultiCrew, follow these steps:*

1. **Audit & Strip Out**  
   - Remove `langchain`, `@langchain/core`, `@langchain/openai`, and any existing chain setup code.  
   - Identify all logical steps currently implemented via chains.

2. **Install & Scaffold Python Microservice**  
   - Create a new `orchestrator-service` directory.  
   - Add `requirements.txt` with:
     - `fastapi`
     - `uvicorn[standard]`
     - `git+https://github.com/tapunict/crew.git#egg=crew`  
   - Implement `app.py` to expose a `/orchestrate` endpoint via FastAPI, registering `AvailabilityFetcher` and `ShiftMatcher` agents.

3. **Port One Workflow End-to-End**  
   - Select a critical feature (e.g., assign one shift).  
   - Implement `AvailabilityFetcher` → `ShiftMatcher` → `Notifier` agents.  
   - Validate correctness and measure latency.

4. **Incrementally Add Agents**  
   - Introduce `ConflictResolver` and `AuditLogger` agents.  
   - Add memory layers (e.g., in-process or Redis) if needed.

5. **Integration & Testing** (CRUCIAL)  
   - Write unit tests for each agent.  
   - Perform end-to-end tests on a staging calendar.  
   - Monitor error rates, throughput, and cost per run.

6. **Cutover & Rollback Plan**  
   - Feature-flag the MultiCrew orchestrator alongside the existing LangChain version.  
   - Gradually shift traffic; keep LangChain live as fallback.  
   - Fully remove LangChain code once the new orchestrator is stable.

*Always remember that **Step 5 (Integration & Testing)** is absolutely critical to ensure reliability before full rollout.*

## Implementation Plan & Next Steps

**Current Stage:** Completed Step 5 (Integration & Testing) of the Migration Roadmap, with stub agents wired end-to-end.

### 1. Build Real Agent Logic
- **AvailabilityFetcher**: Replace HTTP stubs with direct Prisma queries in `prismaClient.js` to fetch staff and assignments for a given date.
- **ShiftMatcher**: Implement shift-matching algorithm (e.g. round-robin or priority-based) to allocate staff to open slots.
- **Notifier**: Integrate with email/SMS/in-app notification service to deliver assignment summaries.
- **ConflictResolver**: Develop logic to detect and resolve overlapping or over-allocated shifts.
- **AuditLogger**: Persist run context and outputs in Redis or the primary database instead of in-memory.

### 2. Configure CrewAI Integration
- Define and verify `agents.yaml` and `tasks.yaml` for each agent and task in the workflow.
- Add `OPENAI_API_KEY` (or other LLM key) to `.env` / `.cursor/mcp.json` for API access.
- Use `USE_CREW=1` environment flag in staging/production to activate CrewAI pipeline.

### 3. Implement Chat "Ask" Feature
- Create a new CrewAI crew (e.g. `AskCrew`) with agents for data retrieval and summarization:
  - **RetrievalAgent**: Query Prisma for staff, projects, assignments based on user query.
  - **SummarizerAgent**: Condense retrieved data into conversational responses.
- Expose a new `/api/ask` endpoint in the Express back-end or FastAPI microservice.
- Write unit and E2E tests for the "ask" workflow.

### 4. Front-End Chat UI
- Build a React chat component with two modes:
  1. **Ask Mode**: Sends user inputs to `/api/ask` and displays responses.
  2. **Agent Mode**: Triggers `/orchestrate` for scheduling tasks and shows progress/results.
- Implement UX for switching modes, input controls, and rich response rendering.

### 5. Cutover & Cleanup
- Gradually roll out CrewAI pipeline by toggling `USE_CREW` behind a feature flag.
- Remove all stub orchestrator code and legacy LangChain integration once stabilized.
- Monitor performance, error rates, and cost per run; optimize prompts, batching, or caching as needed.

---

# NovaWorks AI Project Manager – Meeting to Execution

An AI-powered project management CRM designed to transform meeting discussions into actionable projects and tasks. The system aims to simplify project planning, task assignment, deadline management, and team collaboration through AI-powered transcript processing and role-based dashboards.

## Team

- **Team name:** The Mavericks

### Team Members

| Member | Responsibility |
|---|---|
| Roshaan Umar | Frontend Development |
| Muhammad Rafey Rana | Backend Development |
| Amna Tajamal | Design and Planning |

**Repository:** https://github.com/roshaanumar/NovaWorks-AI-Project-Manager

## What Works

The project is being developed as an AI-powered project management CRM for NovaWorks Technologies.

The planned system includes:

- **Admin Dashboard:** Allows the administrator to submit meeting transcripts and manage generated projects.
- **AI Transcript Processing:** Converts meeting discussions into structured projects, tasks, deadlines, estimated working hours, and team assignments.
- **Manager Dashboard:** Allows managers to view and manage projects assigned to them.
- **Agent Dashboard:** Allows agents to view their assigned tasks and related project information.
- **Role-Based Access Control:** Restricts access according to the user's role.
- **Data Persistence:** Saves projects and tasks so that records remain available after refreshing the application.

**Development status:** Frontend design screens have been exported from Stitch. The complete application features must be updated as they are implemented and tested.

## Technology Stack

The final technology stack will be documented after frontend and backend integration.

| Component | Technology |
|---|---|
| Frontend | To be confirmed |
| Backend | To be confirmed |
| Database | To be confirmed |
| AI Provider | To be confirmed |
| Authentication | To be confirmed |

## Links

- **GitHub Repository:** https://github.com/roshaanumar/NovaWorks-AI-Project-Manager
- **Live Application:** Not deployed yet.
- **Demo Video:** To be added.

## Requirements

The final requirements depend on the technologies used in the integrated application.

Expected development tools include:

- Visual Studio Code
- Git and GitHub
- Required frontend runtime and package manager
- Required backend runtime and package manager
- Database service
- AI provider API access, if required by the implementation

## Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/roshaanumar/NovaWorks-AI-Project-Manager.git
cd NovaWorks-AI-Project-Manager
```

### 2. Open the Project

Open the cloned project folder in Visual Studio Code.

### 3. Run the Current Frontend Designs

The current Stitch exports are standalone HTML screens.

Install the **Live Server** extension in VS Code.

Open the following files:

```text
my_tasks/code.html
project_details/code.html
```

Right-click an HTML file and select **Open with Live Server**.

The selected design will open in your browser.

### 4. Complete Application Setup

The following instructions will be finalized once the frontend and backend are integrated:

1. Install frontend dependencies.
2. Install backend dependencies.
3. Configure environment variables using `.env.example`.
4. Create and connect the database.
5. Apply database migrations.
6. Seed the ten demo login accounts.
7. Start the backend server.
8. Start the frontend development server.

Exact commands, ports, and database setup instructions will be added after the final implementation is available.

## Environment Variables

Only variables used by the final application should be listed here.

| Variable | Purpose | Configuration |
|---|---|---|
| Database connection variable | Database connection | Backend |
| AI API key variable | AI provider authentication | Backend only |
| Model variable | AI model selection, if required | Backend |
| Session secret variable | Session security, if required | Backend |
| Frontend API URL variable | Backend API endpoint | Frontend |

A `.env.example` file should contain placeholder values for the required variables.

**Security:** Never commit actual API keys, database credentials, or session secrets. Sensitive AI and database credentials must remain on the backend.

## Demo Login Accounts

The following ten demo accounts are supplied for evaluation.

| Role | Name | Demo Email | Password |
|---|---|---|---|
| Admin | Admin | admin@novaworks.example | Demo123! |
| Manager | Ayesha Khan | ayesha@novaworks.example | Demo123! |
| Manager | Bilal Ahmed | bilal@novaworks.example | Demo123! |
| Manager | Hina Malik | hina@novaworks.example | Demo123! |
| Agent | Ali Raza | ali@novaworks.example | Demo123! |
| Agent | Hamza Shah | hamza@novaworks.example | Demo123! |
| Agent | Sara Noor | sara@novaworks.example | Demo123! |
| Agent | Usman Tariq | usman@novaworks.example | Demo123! |
| Agent | Zain Abbas | zain@novaworks.example | Demo123! |
| Agent | Maryam Asif | maryam@novaworks.example | Demo123! |

These are fictional demo identifiers, not real mailboxes. Signup, email verification, and password recovery are not required.

The accounts must be seeded into the database before testing. The final seeding command will be documented after backend implementation.

## How Judges Can Test

Once the complete application is implemented, the following workflow should be available:

1. Log in using the admin account.
2. Open **Create from Transcript**.
3. Paste the supplied meeting transcript.
4. Generate three projects and twelve tasks.
5. Open the UrbanCart Website project and verify:
   - Client: UrbanCart Clothing
   - Manager: Ayesha Khan
   - Deadline: 20 October 2026
   - Total tasks: 4
6. Log out and log in as Ayesha Khan. Verify that only her assigned project is visible.
7. Log in as Ali Raza. Verify that only his three assigned UrbanCart tasks are visible.
8. Log in as Hamza Shah. Verify that his two API tasks across UrbanCart and QuickServe are visible.
9. Verify that users cannot access unauthorized projects or tasks through direct API requests.
10. Refresh the application and verify that generated records persist.
11. Submit a modified meeting transcript and verify that the AI processing responds to the changed input.

### Expected Generated Projects

| Project | Client | Manager | Deadline | Tasks | Estimated Hours |
|---|---|---|---|---:|---:|
| UrbanCart Website | UrbanCart Clothing | Ayesha Khan | 20 October 2026 | 4 | 40 |
| QuickServe Mobile App | QuickServe Services | Bilal Ahmed | 24 October 2026 | 4 | 46 |
| HelpDeskPro AI Assistant | HelpDeskPro Solutions | Hina Malik | 22 October 2026 | 4 | 38 |

### Resetting Demo Data

A database reset or demo-data regeneration command will be documented after the backend implementation. Resetting generated projects and tasks should preserve the ten seeded demo accounts.

## Deployment Details

| Component | Status |
|---|---|
| Deployment | Not deployed |
| Frontend Hosting | Not configured |
| Backend Hosting | Not configured |
| Database Hosting | To be confirmed |
| Deployed Branch | To be confirmed |

### How We Deployed

Deployment instructions will be added after hosting is configured.

The final documentation will include:

1. Frontend build command and output directory.
2. Backend deployment and start command.
3. Database connection and migration instructions.
4. Environment variables configured on each hosting platform.
5. Demo-user seeding instructions.
6. Frontend-to-backend API configuration.
7. Instructions for accessing the live application.

If the application remains local, an accessible demo video should be provided showing the complete workflow.

## Known Limitations

- Current frontend screens are standalone Stitch HTML exports.
- Frontend and backend integration is still required.
- AI transcript processing must be verified in the integrated application.
- Database persistence and role-based API authorization must be tested.
- Live deployment has not yet been configured.

This section should be updated as development progresses.

## Submission Summary

- **Project:** NovaWorks AI Project Manager – Meeting to Execution
- **Source Repository:** https://github.com/roshaanumar/NovaWorks-AI-Project-Manager
- **Team Members:** Roshaan Umar, Muhammad Rafey Rana, Amna Tajamal
- **Frontend:** Roshaan Umar
- **Backend:** Muhammad Rafey Rana
- **Design and Planning:** Amna Tajamal
- **Live Application / Demo Video:** To be added
- **Setup and Seed Commands:** To be finalized
- **Demo Accounts:** Ten supplied accounts listed above
- **Target Features:** AI-powered meeting transcript processing, automatic project and task generation, role-based dashboards, task assignments, deadline management, and persistent records.

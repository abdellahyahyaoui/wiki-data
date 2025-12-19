# WikiConflicts

## Overview
WikiConflicts is a React + Express full-stack web application that provides information about global conflicts. It features an interactive map interface and a CMS (Content Management System) for managing content.

## Project Architecture

### Frontend
- **Framework**: React 18 with react-scripts (Create React App)
- **Routing**: react-router-dom v6
- **Maps**: react-simple-maps for map visualization
- **Build**: React builds to `/build` folder

### Backend
- **Framework**: Express.js (v5)
- **Port**: 5000 (0.0.0.0)
- **Database**: MySQL (with JSON file fallback when MySQL is unavailable)
- **Authentication**: JWT with bcryptjs for password hashing
- **File Uploads**: Multer with Cloudinary storage

### Project Structure
```
/
├── public/            # Static assets (flags, images)
├── src/               # React source code
│   ├── admin/         # Admin CMS components
│   ├── components/    # Shared React components
│   ├── context/       # React contexts (Auth, Language)
│   ├── layout/        # Layout components
│   ├── pages/         # Page components
│   └── utils/         # Utility functions and API helpers
├── server/            # Express backend
│   ├── routes/        # API routes
│   ├── middleware/    # Auth middleware
│   ├── data/          # JSON data files (fallback storage)
│   ├── db.js          # MySQL database configuration
│   └── index.js       # Server entry point
└── build/             # React production build (generated)
```

### API Routes
- `/api/auth` - Authentication endpoints
- `/api/cms` - CMS management endpoints
- `/api/upload` - File upload endpoints
- `/api/public` - Public content API
- `/api/health` - Health check endpoint

## Development

### Running the Application
```bash
npm start          # Runs the Express server (serves built React app)
npm run build      # Builds the React frontend
npm run dev        # Builds and runs server
```

### Environment Variables
The application uses these environment variables:
- `PORT` - Server port (default: 5000)
- `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` - MySQL config (optional)
- `ADMIN_INITIAL_PASSWORD` - Default admin password (default: Admin1234!)
- Cloudinary config for image uploads

### Default Admin Credentials
- Username: `admin`
- Password: `Admin1234!`

## Recent Changes
- 2025-12-19: Imported and configured for Replit environment
  - Built React frontend
  - Configured Express server on port 5000
  - Running with JSON file fallback (no MySQL configured)
  - Set up autoscale deployment configuration

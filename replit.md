# WikiConflicts

A React + Express application for documenting conflicts around the world.

## Architecture

- **Frontend**: React 18 with react-router-dom, built with react-scripts
- **Backend**: Express.js serving API and static React build
- **Database**: MySQL with JSON file fallback (works without MySQL)
- **Port**: 5000 (frontend and backend served together)

## Running the Application

The server serves both the built React frontend and the API from port 5000.

```bash
npm start       # Run server (requires pre-built frontend)
npm run build   # Build React frontend
npm run dev     # Build and start server
```

## Environment Variables

The application supports the following environment variables:

- `MYSQL_HOST` - MySQL database host
- `MYSQL_USER` - MySQL database user
- `MYSQL_PASSWORD` - MySQL database password
- `MYSQL_DATABASE` - MySQL database name
- `ADMIN_INITIAL_PASSWORD` - Initial admin password (default: Admin1234!)
- `RESET_ADMIN` - Set to 'true' to reset admin password

Note: If MySQL is not configured, the application falls back to JSON file storage in `server/data/`.

## Default Admin Credentials

- Username: admin
- Password: Admin1234!

## Project Structure

- `/src` - React frontend source
- `/server` - Express backend
- `/public` - Static assets
- `/build` - Built React frontend (generated)

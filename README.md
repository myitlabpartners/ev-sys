# EV-Sys - Electric Vehicle Charging System

A comprehensive EVCS (Electric Vehicle Charging Station) management system with Next.js frontend and NestJS backend.

## Project Structure

```
ev-sys/
├── backend/           # NestJS API backend
│   ├── src/          # Source code
│   │   ├── app/      # Application modules
│   │   ├── database/ # Database services
│   │   └── main.ts   # Application entry point
│   ├── Dockerfile    # Backend Docker configuration
│   ├── coolify-compose.yml # Coolify deployment config
│   └── package.json  # Backend dependencies
├── frontend/         # Next.js frontend (coming soon)
└── README.md         # This file
```

## Features

### Backend (NestJS)
- **Database Integration**: Supabase PostgreSQL connection
- **Health Monitoring**: Real-time API and database health checks
- **Environment Management**: Production-ready configuration
- **Docker Support**: Optimized for containerized deployment
- **Coolify Ready**: Pre-configured for Coolify hosting

### API Endpoints
- `GET /` - Hello message from NestJS
- `GET /api/health` - Application health check
- `GET /api/database/health` - Database connection status

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account and project
- Docker (for containerized deployment)

### Local Development

```bash
# Backend development
cd backend
npm install
npm run start:dev
```

### Environment Configuration

Copy `backend/.env.example` to `backend/.env` and update with your Supabase credentials:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.qmzujyrocmlnpqilxopi.supabase.co:5432/postgres
SUPABASE_URL=https://qmzujyrocmlnpqilxopi.supabase.co
SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SUPABASE-SERVICE-ROLE-KEY]
```

## Deployment

### Coolify Deployment

1. Push code to GitHub repository
2. In Coolify, create new application
3. Choose "Docker Compose" deployment
4. Use `backend/coolify-compose.yml`
5. Set environment variables in Coolify

### Docker Deployment

```bash
# Build and run
cd backend
docker build -t ev-sys-backend .
docker run -p 3001:3001 --env-file .env ev-sys-backend
```

## Database Connection

The backend includes a comprehensive database health check system:

- **Real-time Testing**: Actual Supabase connection verification
- **Status Monitoring**: Live connection status and error reporting
- **Configuration Validation**: Ensures proper database setup

Access the database health check at: `http://localhost:3001/api/database/health`

## Technology Stack

- **Backend**: NestJS, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Docker, Coolify
- **Frontend**: Next.js (coming soon)

## Development Status

- [x] Backend API with Supabase integration
- [x] Database health monitoring
- [x] Docker configuration
- [x] Coolify deployment setup
- [ ] Frontend application
- [ ] Admin dashboard
- [ ] Charging station management
- [ ] User authentication

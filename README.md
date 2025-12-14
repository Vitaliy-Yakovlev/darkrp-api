# DarkRP API Server

Express.js API server for DarkRP application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_PORT=3306
PORT=3001
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

- `GET /api/health` - Health check and database status
- `GET /api/store` - Store endpoints
- `GET /api/leaderboard` - Leaderboard endpoints
- `GET /api/bans` - Bans endpoints
- `GET /api/punishments` - Punishments endpoints
- `GET /api/gangs` - Gangs endpoints
- `GET /api/staff` - Staff endpoints
- `GET /api/earners` - Earners endpoints

## Deployment on Railway

1. Create a new project on Railway
2. Connect your GitHub repository
3. Add environment variables in Railway Dashboard:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_PORT`
   - `PORT` (Railway will set this automatically)
   - `NODE_ENV=production`
4. Railway will automatically detect Node.js and run `npm start`

## Environment Variables

- `DB_HOST` - Database host
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_PORT` - Database port (default: 3306)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (production/development)
- `CORS_ORIGIN` - Comma-separated list of allowed origins (optional)

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

## Environment Variables

- `DB_HOST` - Database host
- `DB_USER` - Database user  
- `DB_PASSWORD` - Database password
- `DB_PORT` - Database port (default: 3306)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (production/development)
- `CORS_ORIGIN` - Comma-separated list of allowed origins (optional, default: `*`)

## Deployment

Currently deployed on [Render.com](https://render.com)

### Environment Variables

Set these in Render Dashboard → Environment:
```
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_PORT=3306
CORS_ORIGIN=https://your-frontend.com
```

### Health Check

Test the API:
```bash
curl https://your-app.onrender.com/api/health
```

### Health Check

Test the deployment:
```bash
curl https://your-deployed-url.com/api/health
```

Should return:
```json
{
  "status": "ok",
  "databases": {
    "tokens": "connected",
    "iga": "connected", 
    "server": "connected",
    "darkrp": "connected"
  }
}
```



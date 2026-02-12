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
- `CORS_ORIGIN` - Comma-separated list of allowed origins (optional)

**CORS & Local development**

- **Production (Vercel)**: set the `CORS_ORIGIN` environment variable to your frontend origin (for development `http://localhost:5173`) or `*` and redeploy the project. Example (Vercel CLI):

```bash
vercel env add CORS_ORIGIN production "http://localhost:5173"
vercel --prod
```

- **Why:** the server sends `Access-Control-Allow-Origin` based on `CORS_ORIGIN`. Without it, browser requests from your frontend are blocked by CORS.

- **Local proxy (Vite)**: to avoid CORS during development you can proxy API calls from the frontend. Example `vite.config.js` (Vue/React Vite project):

```js
import { defineConfig } from 'vite'

export default defineConfig({
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
				secure: false,
			},
		},
	},
})
```

- **Check headers**: use `curl` to verify CORS headers (replace URL if needed):

```bash
curl -i -X OPTIONS 'https://<your-deploy>.vercel.app/api/leaderboard/tokens' -H 'Origin: http://localhost:5173'
curl -i 'https://<your-deploy>.vercel.app/api/leaderboard/tokens?limit=1&offset=0' -H 'Origin: http://localhost:5173'
```

If you want, I can attempt to run these `curl` checks against your deployed URL — разрешаете, чтобы я попробовал? (инструмент ограничен внешними вызовами, но попробую и покажу результат).



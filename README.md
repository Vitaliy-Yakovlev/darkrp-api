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

### Local Docker Testing
Test the Docker setup locally:
```bash
docker build -t darkrp-api .
docker run -p 3001:3001 \
  -e DB_HOST=your-host \
  -e DB_USER=your-user \
  -e DB_PASSWORD=your-pass \
  darkrp-api
```

Or with docker-compose:
```bash
cp .env.example .env
# Edit .env with your database credentials
docker-compose up -d
```

### Render.com (Best Free Option) ⭐
**Бесплатно: 750 часов в месяц (достаточно для 1 приложения 24/7)**

1. Создай аккаунт на [render.com](https://render.com)
2. Подключи GitHub репозиторий
3. Нажми "Create Web Service"
4. Выбери этот репо
5. Настройки:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Production
6. Добавь Environment Variables:
   ```
   DB_HOST=your-database-host
   DB_USER=your-database-user
   DB_PASSWORD=your-password
   DB_PORT=3306
   CORS_ORIGIN=https://your-frontend.com
   ```
7. Deploy!

Сервер будет доступен по: `https://darkrp-api.onrender.com`

### Replit (Очень простой бесплатный вариант)
1. Создай аккаунт на [replit.com](https://replit.com)
2. Import репо с GitHub
3. Replit автоматически установит зависимости
4. В консоли запусти: `npm start`
5. В выплывающем окне будет публичный URL

### Oracle Cloud Free Tier (Более мощный, но сложнее)
**Бесплатно: 2 виртуальные машины Compute, всегда бесплатно**

1. Создай аккаунт на [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. Создай VM instance (Ubuntu, micro)
3. SSH в сервер и установи:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo apt-get install -y git
   git clone https://github.com/Vitaliy-Yakovlev/darkrp-api.git
   cd darkrp-api
   npm install
   npm start
   ```
4. Открой порт 3001 в firewall правилах
5. Доступен по: `http://your-instance-ip:3001`

### Railway.app (Платный, но есть $5/месяц кредит)
Если хочешь попробовать Railway - первые $5 бесплатно каждый месяц:
1. [railway.app](https://railway.app) → Connect GitHub
2. Railway читает `railway.json` и Dockerfile
3. Бесплатный кредит покрывает малые приложения

### Heroku (Теперь только платный)
⚠️ Heroku закончил бесплатный уровень (с февраля 2022)
Минимум $7/месяц за Eco Dyno

### AWS/Google Cloud/Azure (Advanced, но есть Free Tier)
- **AWS**: EC2 micro instance бесплатна первый год
- **Google Cloud**: Cloud Run - $0 за первые 2M запросов в месяц
- **Azure**: App Service B1 план - $13/месяц (нет бесплатного)

### CORS Configuration

Set `CORS_ORIGIN` to your frontend URL:
```
CORS_ORIGIN=https://your-frontend-domain.com,https://another-domain.com
```

For multiple origins, use comma-separated values.

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



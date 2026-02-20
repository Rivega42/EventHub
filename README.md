# EventHub Bot

SaaS-платформа для организации мероприятий через Telegram.

## Features

- 📝 Регистрация участников через бот
- 💳 P2P-оплата с ручным подтверждением
- 🎫 QR-билеты с криптографической верификацией
- 👥 Мульти-ивент, мульти-организатор
- 📊 Админ-панель для организаторов
- 🔍 Check-in через сканирование QR

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5
- **Bot Framework:** Grammy
- **Database:** PostgreSQL 16
- **API:** Fastify
- **QR:** qrcode + jsqr + sharp

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Rivega42/EventHub.git
cd EventHub
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your values
```

Required env variables:
- `BOT_TOKEN` - Telegram bot token from @BotFather
- `DATABASE_URL` - PostgreSQL connection string
- `QR_SECRET` - 256-bit secret for QR HMAC

### 3. Database Setup

```bash
# Start PostgreSQL via Docker
docker compose up -d postgres

# Run migrations
npm run migrate
```

### 4. Run

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

**With Docker:**
```bash
docker compose up -d
```

## Project Structure

```
src/
├── index.ts              # Entry point
├── config/               # Configuration
├── db/
│   ├── pool.ts           # PostgreSQL connection pool
│   ├── migrate.ts        # Migration runner
│   └── migrations/       # SQL migrations
├── services/             # Business logic
│   ├── user.service.ts
│   ├── event.service.ts
│   ├── registration.service.ts
│   ├── payment.service.ts
│   ├── card-rotation.service.ts
│   ├── qr.service.ts
│   └── checkin.service.ts
├── bot/                  # Telegram bot
│   ├── index.ts
│   ├── context.ts
│   ├── handlers/
│   ├── conversations/
│   ├── keyboards/
│   └── middleware/
└── api/                  # REST API
    ├── server.ts
    └── routes/
```

## Commands

- `/start` - Приветствие + выбор мероприятия
- `/start <slug>` - Deep-link на конкретное мероприятие
- `/admin` - Админ-панель организатора
- `/help` - Справка

## API Endpoints

- `GET /health` - Health check
- `POST /api/v1/checkin/scan` - Scan QR ticket
- `GET /api/v1/checkin/stats/:eventId` - Check-in statistics

## Development

### Conventions

See [CLAUDE.md](./CLAUDE.md) for code style and conventions.

### Testing

```bash
npm test
```

## License

MIT

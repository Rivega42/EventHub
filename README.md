# EventHub Bot

Telegram-бот для мероприятий: регистрация, билеты с QR, check-in, нетворкинг, Live Q&A, геймификация.

## Стек
- **Runtime:** Node.js 22 + TypeScript
- **Bot:** Grammy (Telegram Bot API)
- **API:** Fastify
- **DB:** PostgreSQL 16
- **Web:** Check-in dashboard (vanilla JS + SSE)
- **Deploy:** Docker Compose

## Запуск
```bash
cp .env.example .env  # заполнить
docker compose up -d
npm run migrate
npm run dev
```

## Структура
```
src/
├── bot/           # Telegram bot (Grammy)
├── api/           # Fastify REST API
├── web/           # Check-in web dashboard
├── services/      # Business logic
├── db/            # Migrations + queries
└── utils/         # QR, crypto, helpers
```

## Документация
- [SPEC](docs/SPEC.md) — Полная спецификация
- [CLAUDE.md](CLAUDE.md) — Конвенции разработки

## Лицензия
Proprietary © 2026 ИП Гудков Р.В.

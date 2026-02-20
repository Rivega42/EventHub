# SPEC: EventHub Bot — Telegram-бот для мероприятий

> Версия: 1.0 | Дата: 2026-02-20 | MVP дедлайн: 2026-04-18

---

## 1. Обзор продукта

**EventHub Bot** — SaaS-платформа в формате Telegram-бота для организации мероприятий: конференций, митапов, воркшопов, корпоративов.

**Ключевые отличия:**
- Вся воронка внутри Telegram (без внешних сайтов)
- P2P-оплата на карты физлиц (не эквайринг) с ручным подтверждением
- Мульти-ивент, мульти-организатор
- QR-билеты с криптографической верификацией
- Нетворкинг, Live Q&A, геймификация — «из коробки»

**Бизнес-модель:**
| Тариф | Цена | Лимит | Возможности |
|-------|------|-------|-------------|
| Free | 0 ₽ | 50 участников | Базовый функционал, watermark бота |
| Pro | 2990 ₽/мес | безлимит | + аналитика, брендинг, API, приоритет |
| Enterprise | 9990 ₽/мес | безлимит | + white-label, webhooks, SLA |

Альтернатива: комиссия 3-5% с каждого билета вместо подписки.

---

## 2. User Stories

### 2.1 Участник

| ID | Story | Приоритет |
|----|-------|-----------|
| U-01 | Как участник, я хочу зарегистрироваться на мероприятие через бот, указав имя, email, телефон, компанию | MVP |
| U-02 | Как участник, я хочу выбрать тип билета и увидеть цену | MVP |
| U-03 | Как участник, я хочу получить реквизиты для оплаты и отправить скрин перевода | MVP |
| U-04 | Как участник, я хочу получить QR-билет после подтверждения оплаты | MVP |
| U-05 | Как участник, я хочу видеть программу мероприятия по залам и времени | MVP |
| U-06 | Как участник, я хочу записаться на секции/воркшопы (с лимитами) | MVP |
| U-07 | Как участник, я хочу получить схему навигации по площадке | v1.1 |
| U-08 | Как участник, я хочу получать напоминания перед мероприятием и секциями | MVP |
| U-09 | Как участник, я хочу задать вопрос спикеру через Live Q&A | v1.1 |
| U-10 | Как участник, я хочу голосовать за вопросы других участников | v1.1 |
| U-11 | Как участник, я хочу найти участников с похожими интересами (нетворкинг) | v1.1 |
| U-12 | Как участник, я хочу обменяться контактами через бот | v1.1 |
| U-13 | Как участник, я хочу оценить доклад (1-5 ⭐) | MVP |
| U-14 | Как участник, я хочу пройти квест по стендам и получить бонус | v1.2 |
| U-15 | Как участник, я хочу получить материалы после мероприятия (PDF, видео) | v1.1 |
| U-16 | Как участник, я хочу получить сертификат участника | v1.2 |
| U-17 | Как участник, я хочу пройти итоговый опрос | MVP |

### 2.2 Организатор (Админ)

| ID | Story | Приоритет |
|----|-------|-----------|
| O-01 | Как организатор, я хочу создать мероприятие (название, дата, место, описание) | MVP |
| O-02 | Как организатор, я хочу настроить типы билетов с ценами и лимитами | MVP |
| O-03 | Как организатор, я хочу добавить реквизиты карт для оплаты (с ротацией) | MVP |
| O-04 | Как организатор, я хочу видеть скрины оплат и подтверждать/отклонять их | MVP |
| O-05 | Как организатор, я хочу видеть дашборд: продажи, подтверждения, посещения | MVP |
| O-06 | Как организатор, я хочу делать рассылки участникам | MVP |
| O-07 | Как организатор, я хочу экспортировать списки в Excel | MVP |
| O-08 | Как организатор, я хочу добавлять программу (секции, залы, спикеры, время) | MVP |
| O-09 | Как организатор, я хочу настраивать шаблоны сообщений бота | v1.1 |
| O-10 | Как организатор, я хочу назначать волонтёров и спикеров | MVP |
| O-11 | Как организатор, я хочу видеть аналитику по картам оплаты | MVP |

### 2.3 Спикер

| ID | Story | Приоритет |
|----|-------|-----------|
| S-01 | Как спикер, я хочу видеть вопросы от участников (Live Q&A) | v1.1 |
| S-02 | Как спикер, я хочу отмечать вопросы как отвеченные | v1.1 |
| S-03 | Как спикер, я хочу видеть фидбек по своему докладу | MVP |
| S-04 | Как спикер, я хочу загрузить материалы доклада | v1.1 |

### 2.4 Волонтёр

| ID | Story | Приоритет |
|----|-------|-----------|
| V-01 | Как волонтёр, я хочу сканировать QR-билеты на входе | MVP |
| V-02 | Как волонтёр, я хочу видеть статус билета (валиден / уже использован / подделка) | MVP |
| V-03 | Как волонтёр, я хочу видеть имя и тип билета при сканировании | MVP |

### 2.5 Суперадмин

| ID | Story | Приоритет |
|----|-------|-----------|
| SA-01 | Как суперадмин, я хочу видеть все мероприятия и организаторов | v1.1 |
| SA-02 | Как суперадмин, я хочу управлять тарифами организаторов | v1.1 |
| SA-03 | Как суперадмин, я хочу видеть общую аналитику платформы | v1.2 |

---

## 3. Схема базы данных

### 3.1 ER-диаграмма (текстовая)

```
organizations ─┬─< events ─┬─< ticket_types
               │            ├─< sessions (программа)
               │            ├─< payment_cards
               │            ├─< registrations ─┬─< payments
               │            │                   ├─< session_bookings
               │            │                   ├─< check_ins
               │            │                   └─< feedback
               │            ├─< qa_questions
               │            ├─< quest_checkpoints
               │            └─< broadcasts
               └─< org_members

users ──< registrations
users ──< networking_profiles ──< networking_matches
```

### 3.2 Таблицы

```sql
-- ============================================================
-- ПОЛЬЗОВАТЕЛИ И ОРГАНИЗАЦИИ
-- ============================================================

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    telegram_id     BIGINT UNIQUE NOT NULL,
    telegram_username VARCHAR(64),
    first_name      VARCHAR(128),
    last_name       VARCHAR(128),
    phone           VARCHAR(20),
    email           VARCHAR(256),
    company         VARCHAR(256),
    role            VARCHAR(20) DEFAULT 'user', -- user | superadmin
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organizations (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(256) NOT NULL,
    owner_id        BIGINT REFERENCES users(id),
    plan            VARCHAR(20) DEFAULT 'free', -- free | pro | enterprise
    plan_expires_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE org_members (
    id              BIGSERIAL PRIMARY KEY,
    org_id          BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    role            VARCHAR(20) NOT NULL, -- owner | admin | manager
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- ============================================================
-- МЕРОПРИЯТИЯ
-- ============================================================

CREATE TABLE events (
    id              BIGSERIAL PRIMARY KEY,
    org_id          BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
    slug            VARCHAR(64) UNIQUE NOT NULL, -- для deep-link: t.me/bot?start=slug
    title           VARCHAR(512) NOT NULL,
    description     TEXT,
    venue           VARCHAR(512),
    venue_map_url   VARCHAR(1024), -- ссылка на схему/фото площадки
    city            VARCHAR(128),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ,
    timezone        VARCHAR(64) DEFAULT 'Europe/Moscow',
    status          VARCHAR(20) DEFAULT 'draft', -- draft | published | ongoing | finished | cancelled
    max_attendees   INT,
    settings        JSONB DEFAULT '{}', -- кастомные настройки: шаблоны, брендинг и т.д.
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_org ON events(org_id);

-- ============================================================
-- БИЛЕТЫ И РЕГИСТРАЦИИ
-- ============================================================

CREATE TABLE ticket_types (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    name            VARCHAR(256) NOT NULL, -- "Стандарт", "VIP", "Early Bird"
    description     TEXT,
    price           NUMERIC(10,2) NOT NULL DEFAULT 0, -- 0 = бесплатный
    currency        VARCHAR(3) DEFAULT 'RUB',
    quantity         INT, -- NULL = безлимит
    sold_count      INT DEFAULT 0,
    sale_starts_at  TIMESTAMPTZ,
    sale_ends_at    TIMESTAMPTZ,
    sort_order      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE registrations (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    ticket_type_id  BIGINT REFERENCES ticket_types(id),
    status          VARCHAR(20) DEFAULT 'pending',
    -- pending → awaiting_payment → payment_review → confirmed → checked_in → cancelled
    qr_token        UUID DEFAULT gen_random_uuid(),
    qr_hmac         VARCHAR(128), -- HMAC подпись для верификации
    reg_data        JSONB DEFAULT '{}', -- доп. поля регистрации
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_reg_event ON registrations(event_id);
CREATE INDEX idx_reg_user ON registrations(user_id);
CREATE INDEX idx_reg_qr ON registrations(qr_token);

-- ============================================================
-- ОПЛАТА
-- ============================================================

CREATE TABLE payment_cards (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    card_number     VARCHAR(20) NOT NULL, -- "4276 **** **** 1234"
    card_holder     VARCHAR(256),
    bank_name       VARCHAR(128),
    phone_number    VARCHAR(20), -- для СБП
    is_active       BOOLEAN DEFAULT TRUE,
    daily_limit     NUMERIC(12,2), -- лимит на карту в день
    total_received  NUMERIC(12,2) DEFAULT 0,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
    id              BIGSERIAL PRIMARY KEY,
    registration_id BIGINT REFERENCES registrations(id) ON DELETE CASCADE,
    card_id         BIGINT REFERENCES payment_cards(id),
    amount          NUMERIC(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'RUB',
    status          VARCHAR(20) DEFAULT 'pending',
    -- pending → screenshot_sent → confirmed → rejected
    screenshot_file_id VARCHAR(256), -- Telegram file_id скриншота
    confirmed_by    BIGINT REFERENCES users(id), -- кто подтвердил
    confirmed_at    TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_reg ON payments(registration_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- ПРОГРАММА
-- ============================================================

CREATE TABLE sessions (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    title           VARCHAR(512) NOT NULL,
    description     TEXT,
    speaker_id      BIGINT REFERENCES users(id), -- может быть NULL
    speaker_name    VARCHAR(256), -- если спикер не в системе
    hall            VARCHAR(128), -- "Зал A", "Зал B"
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ,
    session_type    VARCHAR(20) DEFAULT 'talk', -- talk | workshop | break | networking
    max_attendees   INT, -- NULL = без лимита
    booked_count    INT DEFAULT 0,
    sort_order      INT DEFAULT 0,
    materials_url   VARCHAR(1024), -- ссылка на материалы
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session_bookings (
    id              BIGSERIAL PRIMARY KEY,
    session_id      BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    registration_id BIGINT REFERENCES registrations(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, registration_id)
);

-- ============================================================
-- CHECK-IN
-- ============================================================

CREATE TABLE check_ins (
    id              BIGSERIAL PRIMARY KEY,
    registration_id BIGINT REFERENCES registrations(id) ON DELETE CASCADE,
    scanned_by      BIGINT REFERENCES users(id), -- волонтёр
    scanned_at      TIMESTAMPTZ DEFAULT NOW(),
    location        VARCHAR(128) -- "Главный вход", "Зал A"
);

-- ============================================================
-- РОЛИ В СОБЫТИИ
-- ============================================================

CREATE TABLE event_roles (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    role            VARCHAR(20) NOT NULL, -- organizer | speaker | volunteer
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id, role)
);

-- ============================================================
-- LIVE Q&A
-- ============================================================

CREATE TABLE qa_questions (
    id              BIGSERIAL PRIMARY KEY,
    session_id      BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    text            TEXT NOT NULL,
    votes           INT DEFAULT 0,
    is_answered     BOOLEAN DEFAULT FALSE,
    is_hidden       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE qa_votes (
    id              BIGSERIAL PRIMARY KEY,
    question_id     BIGINT REFERENCES qa_questions(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    UNIQUE(question_id, user_id)
);

-- ============================================================
-- ФИДБЕК
-- ============================================================

CREATE TABLE feedback (
    id              BIGSERIAL PRIMARY KEY,
    session_id      BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    registration_id BIGINT REFERENCES registrations(id),
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, registration_id)
);

-- ============================================================
-- НЕТВОРКИНГ
-- ============================================================

CREATE TABLE networking_profiles (
    id              BIGSERIAL PRIMARY KEY,
    registration_id BIGINT REFERENCES registrations(id) ON DELETE CASCADE,
    interests       TEXT[], -- ["AI", "Product", "Marketing"]
    looking_for     TEXT, -- "ищу инвестора", "ищу разработчика"
    offering        TEXT, -- "могу помочь с дизайном"
    is_visible      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(registration_id)
);

CREATE TABLE networking_matches (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    user_a_id       BIGINT REFERENCES users(id),
    user_b_id       BIGINT REFERENCES users(id),
    score           NUMERIC(5,2), -- 0-100 релевантность
    status          VARCHAR(20) DEFAULT 'suggested', -- suggested | accepted_a | accepted_b | matched | declined
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_a_id, user_b_id)
);

CREATE TABLE contact_exchanges (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id),
    from_user_id    BIGINT REFERENCES users(id),
    to_user_id      BIGINT REFERENCES users(id),
    status          VARCHAR(20) DEFAULT 'pending', -- pending | accepted | declined
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ГЕЙМИФИКАЦИЯ
-- ============================================================

CREATE TABLE quest_checkpoints (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    name            VARCHAR(256) NOT NULL, -- "Стенд Яндекса"
    code            VARCHAR(32) UNIQUE NOT NULL, -- код для сканирования
    points          INT DEFAULT 1,
    sort_order      INT DEFAULT 0
);

CREATE TABLE quest_progress (
    id              BIGSERIAL PRIMARY KEY,
    registration_id BIGINT REFERENCES registrations(id) ON DELETE CASCADE,
    checkpoint_id   BIGINT REFERENCES quest_checkpoints(id),
    scanned_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(registration_id, checkpoint_id)
);

-- ============================================================
-- РАССЫЛКИ
-- ============================================================

CREATE TABLE broadcasts (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    sender_id       BIGINT REFERENCES users(id),
    text            TEXT NOT NULL,
    target_filter   JSONB DEFAULT '{}', -- {"ticket_type": [1,2], "status": "confirmed"}
    sent_count      INT DEFAULT 0,
    failed_count    INT DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'draft', -- draft | sending | sent
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ОПРОСЫ
-- ============================================================

CREATE TABLE surveys (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT REFERENCES events(id) ON DELETE CASCADE,
    title           VARCHAR(256),
    questions       JSONB NOT NULL, -- [{type: "rating", text: "..."}, {type: "text", text: "..."}]
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE survey_responses (
    id              BIGSERIAL PRIMARY KEY,
    survey_id       BIGINT REFERENCES surveys(id) ON DELETE CASCADE,
    registration_id BIGINT REFERENCES registrations(id),
    answers         JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(survey_id, registration_id)
);

-- ============================================================
-- УВЕДОМЛЕНИЯ (ОЧЕРЕДЬ)
-- ============================================================

CREATE TABLE notifications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id),
    event_id        BIGINT REFERENCES events(id),
    type            VARCHAR(32), -- reminder | payment_confirmed | broadcast | session_start
    payload         JSONB,
    scheduled_at    TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'pending' -- pending | sent | failed
);

CREATE INDEX idx_notif_scheduled ON notifications(scheduled_at) WHERE status = 'pending';
```

---

## 4. API эндпоинты

REST API для внешних интеграций (Pro/Enterprise тариф). Все эндпоинты требуют `Authorization: Bearer <api_key>`.

### 4.1 Events

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/events` | Список мероприятий организатора |
| POST | `/api/v1/events` | Создать мероприятие |
| GET | `/api/v1/events/:id` | Детали мероприятия |
| PATCH | `/api/v1/events/:id` | Обновить мероприятие |
| DELETE | `/api/v1/events/:id` | Удалить (архивировать) |

### 4.2 Tickets

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/events/:id/ticket-types` | Типы билетов |
| POST | `/api/v1/events/:id/ticket-types` | Создать тип |
| PATCH | `/api/v1/ticket-types/:id` | Обновить |
| DELETE | `/api/v1/ticket-types/:id` | Удалить |

### 4.3 Registrations

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/events/:id/registrations` | Список регистраций (фильтры: status, ticket_type) |
| GET | `/api/v1/registrations/:id` | Детали регистрации |
| PATCH | `/api/v1/registrations/:id` | Обновить статус |
| GET | `/api/v1/events/:id/registrations/export` | Экспорт Excel |

### 4.4 Payments

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/events/:id/payments` | Список оплат |
| PATCH | `/api/v1/payments/:id/confirm` | Подтвердить оплату |
| PATCH | `/api/v1/payments/:id/reject` | Отклонить оплату |

### 4.5 Sessions (программа)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/events/:id/sessions` | Программа |
| POST | `/api/v1/events/:id/sessions` | Добавить секцию |
| PATCH | `/api/v1/sessions/:id` | Обновить |
| DELETE | `/api/v1/sessions/:id` | Удалить |

### 4.6 Analytics

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/v1/events/:id/stats` | Дашборд (продажи, check-ins, деньги по картам) |
| GET | `/api/v1/events/:id/feedback-stats` | Средние оценки по докладам |

### 4.7 Webhooks

| Method | Path | Описание |
|--------|------|----------|
| POST | `/api/v1/webhooks` | Зарегистрировать webhook |
| GET | `/api/v1/webhooks` | Список |
| DELETE | `/api/v1/webhooks/:id` | Удалить |

**Webhook события:**
- `registration.created`
- `payment.screenshot_sent`
- `payment.confirmed`
- `payment.rejected`
- `checkin.scanned`
- `session.booking_created`

---

## 5. Telegram Bot Flow

### 5.1 Команды

| Команда | Кто | Описание |
|---------|-----|----------|
| `/start` | все | Приветствие + выбор мероприятия |
| `/start <slug>` | все | Deep-link на конкретное мероприятие |
| `/events` | все | Список доступных мероприятий |
| `/myticket` | участник | Показать QR-билет |
| `/schedule` | участник | Программа мероприятия |
| `/map` | участник | Схема площадки |
| `/networking` | участник | Нетворкинг-профиль и мэтчи |
| `/quest` | участник | Прогресс квеста |
| `/scan` | волонтёр | Режим сканера QR |
| `/admin` | организатор | Админ-панель |
| `/speaker` | спикер | Панель спикера |
| `/help` | все | Справка |

### 5.2 Основные Flow

#### 5.2.1 Регистрация участника

```
/start conf2026
    │
    ├─ [Бот]: "🎉 Конференция X — 18 апреля 2026"
    │         "Описание..."
    │         [📝 Зарегистрироваться]
    │
    ├─ [Кнопка: Зарегистрироваться]
    │   ├─ Бот: "Как вас зовут? (Имя Фамилия)"
    │   ├─ Ввод: "Иван Петров"
    │   ├─ Бот: "📧 Email?"
    │   ├─ Ввод: "ivan@mail.ru"
    │   ├─ Бот: "📱 Телефон?" [Поделиться контактом]
    │   ├─ Ввод/Кнопка
    │   ├─ Бот: "🏢 Компания/Должность (или пропустить)"
    │   ├─ Ввод / [Пропустить]
    │   │
    │   ├─ Бот: "Выберите тип билета:"
    │   │   [🎫 Стандарт — 3000 ₽]
    │   │   [⭐ VIP — 7000 ₽]
    │   │   [🆓 Бесплатный — 0 ₽]
    │   │
    │   ├─ [Выбор: Стандарт 3000₽]
    │   │
    │   ├─ Если цена > 0:
    │   │   Бот: "💳 Переведите 3000 ₽ по реквизитам:"
    │   │        "Карта: 4276 1234 5678 9012"
    │   │        "Получатель: Иванов И.И."
    │   │        "Банк: Сбербанк"
    │   │        "Или по СБП: +7 900 123-45-67"
    │   │        ""
    │   │        "После перевода отправьте скриншот ⬇️"
    │   │
    │   ├─ [Участник отправляет фото]
    │   │   Бот: "✅ Скриншот получен! Ожидайте подтверждения (обычно 1-2 часа)"
    │   │
    │   ├─ [Организатор подтверждает]
    │   │   Бот → участнику: "🎉 Оплата подтверждена! Вот ваш билет:"
    │   │   [QR-код билета]
    │   │   "Покажите QR-код на входе"
    │   │
    │   ├─ Если цена == 0:
    │       Бот: "✅ Вы зарегистрированы! Вот ваш билет:"
    │       [QR-код]
```

**Callback data format:** `<action>:<entity_id>:<params>`

Примеры:
- `reg:42` — начать регистрацию на event 42
- `ticket:42:3` — выбрать ticket_type 3 на event 42
- `confirm_pay:123` — подтвердить оплату payment 123
- `reject_pay:123` — отклонить оплату
- `book:55` — записаться на session 55
- `unbook:55` — отменить запись
- `vote:77` — голос за вопрос 77
- `rate:55:4` — оценка 4 для session 55
- `match_yes:88` — принять мэтч 88
- `match_no:88` — отклонить мэтч

#### 5.2.2 Админ-панель

```
/admin
    │
    ├─ [Мои мероприятия]
    │   ├─ [+ Создать новое]
    │   ├─ [Конференция X] → меню ивента
    │
    ├─ Меню ивента:
    │   [📊 Дашборд]
    │   [🎫 Билеты и оплаты]
    │   [📋 Программа]
    │   [💳 Карты оплаты]
    │   [👥 Участники]
    │   [📢 Рассылка]
    │   [📥 Экспорт Excel]
    │   [👷 Волонтёры/Спикеры]
    │   [⚙️ Настройки]
    │
    ├─ Дашборд:
    │   "📊 Конференция X"
    │   "🎫 Продано: 142 / 200"
    │   "✅ Подтверждено: 128"
    │   "🚶 Пришло: 0 (check-in не начался)"
    │   "💰 Деньги: 384 000 ₽"
    │   "  └ Карта *1234: 192 000 ₽ (64 оплаты)"
    │   "  └ Карта *5678: 192 000 ₽ (64 оплаты)"
    │   "⏳ Ожидают подтверждения: 14"
    │
    ├─ Оплаты (очередь):
    │   [Фото скриншота]
    │   "Иван Петров — Стандарт 3000₽"
    │   "Карта: *1234"
    │   [✅ Подтвердить] [❌ Отклонить]
```

#### 5.2.3 Сканер (волонтёр)

```
/scan
    │
    ├─ Бот: "📷 Отправьте фото QR-кода или перешлите QR"
    │
    ├─ [Волонтёр отправляет фото QR]
    │   ├─ Бот декодирует QR → извлекает UUID + HMAC
    │   ├─ Проверяет HMAC
    │   ├─ Ищет registration по qr_token
    │   │
    │   ├─ ✅ Валидный, первый вход:
    │   │   "✅ ПРОПУСТИТЬ"
    │   │   "Иван Петров | VIP | Конференция X"
    │   │   (создаёт check_in)
    │   │
    │   ├─ ⚠️ Уже прошёл:
    │   │   "⚠️ ПОВТОРНЫЙ ВХОД"
    │   │   "Иван Петров уже прошёл в 10:32"
    │   │
    │   ├─ ❌ Невалидный:
    │       "❌ НЕДЕЙСТВИТЕЛЬНЫЙ БИЛЕТ"
    │       "QR не прошёл верификацию"
```

#### 5.2.4 Live Q&A

```
[Участник в секции "AI в бизнесе"]
    │
    ├─ Бот: "❓ Задайте вопрос спикеру:"
    │        [📝 Задать вопрос]
    │        [📋 Все вопросы (12)]
    │
    ├─ Все вопросы:
    │   "👍 15 — Как масштабировать ML-пайплайн? (Анна)"
    │   "👍 8  — Какой стек рекомендуете? (Дмитрий)"
    │   "👍 3  — Бюджет на внедрение? (Олег)"
    │   [👍] рядом с каждым для голосования
    │
    ├─ Спикер видит отсортированный по голосам список
    │   [✅ Отвечен] — отмечает
```

---

## 6. Архитектура

### 6.1 Модули

```
src/
├── index.ts                  # Entry point
├── bot/
│   ├── bot.ts                # Grammy bot instance + middleware
│   ├── context.ts            # Custom context type
│   ├── conversations/        # Grammy conversations (FSM)
│   │   ├── registration.ts   # Регистрация участника
│   │   ├── create-event.ts   # Создание мероприятия
│   │   ├── payment.ts        # Получение скриншота оплаты
│   │   └── networking.ts     # Заполнение профиля нетворкинга
│   ├── handlers/
│   │   ├── start.ts          # /start, deep-links
│   │   ├── admin.ts          # /admin и все callback:admin:*
│   │   ├── schedule.ts       # /schedule, booking
│   │   ├── scanner.ts        # /scan, QR верификация
│   │   ├── qa.ts             # Live Q&A
│   │   ├── feedback.ts       # Оценки
│   │   ├── networking.ts     # Мэтчинг
│   │   ├── quest.ts          # Геймификация
│   │   └── speaker.ts        # Панель спикера
│   ├── keyboards/            # Inline keyboards builders
│   └── middleware/
│       ├── auth.ts           # Определение роли пользователя
│       ├── rate-limit.ts     # Throttle
│       └── error.ts          # Error handler
├── services/
│   ├── event.service.ts
│   ├── registration.service.ts
│   ├── payment.service.ts
│   ├── ticket.service.ts
│   ├── session.service.ts    # Программа
│   ├── qr.service.ts         # Генерация + верификация QR
│   ├── checkin.service.ts
│   ├── qa.service.ts
│   ├── feedback.service.ts
│   ├── networking.service.ts
│   ├── quest.service.ts
│   ├── broadcast.service.ts
│   ├── notification.service.ts
│   ├── export.service.ts     # Excel генерация
│   └── card-rotation.service.ts # Ротация карт оплаты
├── api/
│   ├── server.ts             # Express/Fastify REST API
│   ├── routes/
│   ├── middleware/
│   │   └── api-auth.ts       # API key auth
│   └── webhooks.ts           # Отправка webhook-событий
├── db/
│   ├── pool.ts               # pg Pool
│   ├── migrations/           # SQL миграции
│   └── queries/              # Типизированные запросы
├── jobs/
│   ├── scheduler.ts          # Cron-подобный планировщик
│   ├── send-reminders.ts     # Отправка напоминаний
│   └── process-notifications.ts
├── utils/
│   ├── qr.ts                 # QR encode/decode
│   ├── hmac.ts               # HMAC sign/verify
│   ├── templates.ts          # Шаблонизатор сообщений
│   └── validators.ts         # Валидация ввода
└── config.ts                 # env-конфиг
```

### 6.2 Сервисы и зависимости

```
┌──────────────────────────────────────────┐
│            Telegram Bot (Grammy)          │
│  conversations │ handlers │ keyboards     │
└──────────┬───────────────────────────────┘
           │
┌──────────▼───────────────────────────────┐
│           Service Layer                   │
│  event │ registration │ payment │ qr      │
│  session │ qa │ feedback │ networking     │
│  broadcast │ notification │ export        │
└──────────┬───────────────────────────────┘
           │
┌──────────▼──────────┐  ┌────────────────┐
│    PostgreSQL       │  │   REST API     │
│    (pg pool)        │  │  (Fastify)     │
└─────────────────────┘  └────────────────┘
                            │
                         Webhooks → External Systems
```

### 6.3 Grammy Conversations

Для многошаговых диалогов используем [Grammy Conversations Plugin](https://grammy.dev/plugins/conversations):

```typescript
// conversations/registration.ts
import { type Conversation } from "@grammyjs/conversations";
import { type BotContext } from "../context";

export async function registrationConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext
) {
  const eventId = ctx.session.currentEventId;

  // Шаг 1: Имя
  await ctx.reply("Как вас зовут? (Имя Фамилия)");
  const nameCtx = await conversation.waitFor("message:text");
  const fullName = nameCtx.message.text;

  // Шаг 2: Email
  await ctx.reply("📧 Ваш email?");
  const emailCtx = await conversation.waitFor("message:text");
  const email = emailCtx.message.text;
  // validate email...

  // Шаг 3: Телефон
  await ctx.reply("📱 Телефон?", {
    reply_markup: {
      keyboard: [[{ text: "📱 Поделиться контактом", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
  const phoneCtx = await conversation.waitFor([
    "message:contact",
    "message:text",
  ]);
  const phone = phoneCtx.message.contact?.phone_number ?? phoneCtx.message.text;

  // Шаг 4: Компания
  await ctx.reply("🏢 Компания / Должность (или нажмите Пропустить)", {
    reply_markup: { inline_keyboard: [[{ text: "Пропустить", callback_data: "skip" }]] },
  });
  // ...

  // Шаг 5: Выбор билета (inline keyboard с типами)
  // ...

  // Сохранение в БД
  await conversation.external(() =>
    registrationService.create({ eventId, fullName, email, phone, ... })
  );
}
```

---

## 7. QR-билет: генерация и верификация

### 7.1 Формат QR-данных

```
eventhub:<qr_token>:<hmac_signature>
```

- `qr_token` — UUID v4 из `registrations.qr_token`
- `hmac_signature` — HMAC-SHA256(qr_token, SECRET_KEY), hex, первые 16 символов

### 7.2 Генерация

```typescript
// services/qr.service.ts
import crypto from "crypto";
import QRCode from "qrcode";

const SECRET = process.env.QR_SECRET!; // 256-bit key

export function generateQrPayload(qrToken: string): string {
  const hmac = crypto
    .createHmac("sha256", SECRET)
    .update(qrToken)
    .digest("hex")
    .substring(0, 16);
  return `eventhub:${qrToken}:${hmac}`;
}

export async function generateQrImage(qrToken: string): Promise<Buffer> {
  const payload = generateQrPayload(qrToken);
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: "M",
    width: 400,
    margin: 2,
  });
}

export function verifyQrPayload(
  raw: string
): { valid: boolean; qrToken?: string } {
  const parts = raw.split(":");
  if (parts.length !== 3 || parts[0] !== "eventhub") {
    return { valid: false };
  }
  const [, qrToken, providedHmac] = parts;
  const expectedHmac = crypto
    .createHmac("sha256", SECRET)
    .update(qrToken)
    .digest("hex")
    .substring(0, 16);
  if (providedHmac !== expectedHmac) {
    return { valid: false };
  }
  return { valid: true, qrToken };
}
```

### 7.3 Сканирование

Волонтёр отправляет фото QR → бот декодирует через `jsqr` или `zbar`:

```typescript
// handlers/scanner.ts
import jsQR from "jsqr";
import sharp from "sharp";

async function handleScanPhoto(ctx: BotContext) {
  const photo = ctx.message.photo?.pop(); // наибольшее разрешение
  const file = await ctx.api.getFile(photo.file_id);
  const buffer = await downloadFile(file.file_path);

  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  if (!qr) {
    return ctx.reply("❌ QR-код не распознан. Попробуйте ещё раз.");
  }

  const result = qrService.verifyQrPayload(qr.data);
  if (!result.valid) {
    return ctx.reply("❌ НЕДЕЙСТВИТЕЛЬНЫЙ БИЛЕТ\nQR не прошёл верификацию");
  }

  const reg = await registrationService.findByQrToken(result.qrToken);
  if (!reg) {
    return ctx.reply("❌ Билет не найден в системе");
  }

  const existingCheckin = await checkinService.findByRegistration(reg.id);
  if (existingCheckin) {
    return ctx.reply(
      `⚠️ ПОВТОРНЫЙ ВХОД\n${reg.fullName} уже прошёл в ${formatTime(existingCheckin.scanned_at)}`
    );
  }

  await checkinService.create(reg.id, ctx.from.id);
  await ctx.reply(`✅ ПРОПУСТИТЬ\n${reg.fullName} | ${reg.ticketTypeName}`);
}
```

---

## 8. Нетворкинг: алгоритм мэтчинга

### 8.1 Данные профиля

Участник заполняет:
- `interests: string[]` — теги интересов (выбор из предложенных + свои)
- `looking_for: string` — свободный текст «ищу»
- `offering: string` — свободный текст «предлагаю»

### 8.2 Алгоритм скоринга

```typescript
function calculateMatchScore(a: NetworkingProfile, b: NetworkingProfile): number {
  let score = 0;

  // 1. Пересечение интересов (0-50 баллов)
  const commonInterests = a.interests.filter((i) => b.interests.includes(i));
  const totalUnique = new Set([...a.interests, ...b.interests]).size;
  const jaccardSimilarity = totalUnique > 0 ? commonInterests.length / totalUnique : 0;
  score += jaccardSimilarity * 50;

  // 2. Комплементарность: looking_for ↔ offering (0-40 баллов)
  // Простая версия: keyword overlap
  const aLookingTokens = tokenize(a.looking_for);
  const bOfferingTokens = tokenize(b.offering);
  const bLookingTokens = tokenize(b.looking_for);
  const aOfferingTokens = tokenize(a.offering);

  const complementA = overlapScore(aLookingTokens, bOfferingTokens); // A ищет то, что B предлагает
  const complementB = overlapScore(bLookingTokens, aOfferingTokens); // B ищет то, что A предлагает
  score += (complementA + complementB) * 20; // max 40

  // 3. Разные компании — бонус (0-10 баллов)
  if (a.company !== b.company) score += 10;

  return Math.min(score, 100);
}
```

### 8.3 Мэтчинг-процесс

1. **Batch job** (раз в час или по триггеру): для каждого профиля считаем score со всеми остальными
2. Топ-5 мэтчей сохраняются в `networking_matches`
3. Бот отправляет участнику: «Нашли для вас 3 мэтча!» → карточки с кнопками [Познакомиться] [Пропустить]
4. Если оба нажали [Познакомиться] → бот отправляет обоим контакты (username/имя)
5. Дополнительно: участник может сам просматривать профили и инициировать обмен контактами

---

## 9. MVP план

### 9.1 MVP к 18 апреля 2026 (~8 недель)

**Спринт 1 (нед 1-2): Фундамент**
- [ ] Проект: init, TypeScript, Grammy, PostgreSQL, Docker
- [ ] БД: миграции для users, events, ticket_types, registrations, payments, payment_cards
- [ ] /start с deep-link, выбор мероприятия
- [ ] Conversation: регистрация (имя, email, телефон, компания)
- [ ] Выбор типа билета

**Спринт 2 (нед 3-4): Оплата + QR**
- [ ] Payment flow: показ реквизитов, приём скриншота
- [ ] Ротация карт оплаты (round-robin с учётом лимитов)
- [ ] Админка: очередь оплат (подтвердить/отклонить)
- [ ] QR-билет: генерация + отправка
- [ ] Сканер: /scan для волонтёров
- [ ] Check-in логика

**Спринт 3 (нед 5-6): Программа + Админка**
- [ ] Сессии: CRUD через /admin
- [ ] /schedule — отображение программы
- [ ] Бронирование секций (с лимитами)
- [ ] Дашборд организатора
- [ ] Рассылка участникам
- [ ] Экспорт Excel
- [ ] Роли: назначение волонтёров/спикеров

**Спринт 4 (нед 7-8): Фидбек + Полировка**
- [ ] Фидбек по докладам (1-5 ⭐)
- [ ] Итоговый опрос
- [ ] Уведомления/напоминания (scheduler)
- [ ] Навигация (схема площадки — отправка картинки)
- [ ] Тестирование на реальных данных
- [ ] Деплой, мониторинг
- [ ] Документация для организатора

### 9.2 Post-MVP (v1.1, v1.2)

**v1.1 (май 2026):**
- Live Q&A с голосованием
- Нетворкинг: профили + мэтчинг
- Обмен контактами
- Материалы после мероприятия
- Настраиваемые шаблоны сообщений
- REST API + Webhooks
- Панель спикера

**v1.2 (июнь 2026):**
- Геймификация / стенд-квест
- Сертификаты (PDF генерация)
- Суперадмин-панель
- Тарифные планы + ограничения
- Аналитика продвинутая
- Мультиязычность

---

## 10. Стек и инфраструктура

### 10.1 Технологии

| Компонент | Технология | Почему |
|-----------|-----------|--------|
| Runtime | Node.js 20+ | LTS, performance |
| Язык | TypeScript 5.x | Типизация, DX |
| Bot Framework | Grammy 1.x | Лучшая типизация, conversations plugin, активное развитие |
| БД | PostgreSQL 16 | JSONB, надёжность, бесплатно |
| DB Driver | pg + @types/pg | Стандарт |
| Миграции | node-pg-migrate | Простота |
| HTTP API | Fastify 5 | Быстрый, TypeScript-first |
| QR генерация | qrcode | npm, PNG/SVG |
| QR распознавание | jsqr + sharp | Декодирование из фото |
| Excel | exceljs | Экспорт .xlsx |
| Cron/Scheduler | node-cron | Напоминания, batch jobs |
| Валидация | zod | Runtime type checking |
| Контейнеризация | Docker + compose | Деплой |
| CI/CD | GitHub Actions | Автодеплой |

### 10.2 Docker Compose

```yaml
version: "3.8"
services:
  bot:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000" # REST API

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: eventhub
      POSTGRES_USER: eventhub
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eventhub"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
```

### 10.3 Переменные окружения (.env)

```bash
# Telegram
BOT_TOKEN=123456:ABC...
# Режим: polling (dev) или webhook (prod)
BOT_MODE=polling
WEBHOOK_URL=https://bot.example.com/webhook
WEBHOOK_SECRET=random-secret

# Database
DATABASE_URL=postgres://eventhub:password@postgres:5432/eventhub

# QR
QR_SECRET=your-256-bit-hex-secret

# API
API_PORT=3000
API_SECRET=api-jwt-secret

# Superadmin
SUPERADMIN_TELEGRAM_IDS=123456789,987654321
```

### 10.4 Деплой

**Минимальные требования:** VPS 1 vCPU, 1GB RAM, 20GB SSD (~300 ₽/мес).

```bash
# На сервере:
git clone <repo>
cp .env.example .env  # заполнить
docker compose up -d
docker compose exec bot npm run migrate
```

**Мониторинг:** Healthcheck endpoint `/health` + UptimeRobot/аналог.

---

## Приложение A: Ротация карт оплаты

```typescript
// services/card-rotation.service.ts
async function getNextCard(eventId: number, amount: number): Promise<PaymentCard> {
  // 1. Активные карты для ивента
  const cards = await db.query(`
    SELECT * FROM payment_cards
    WHERE event_id = $1 AND is_active = TRUE
    ORDER BY sort_order
  `, [eventId]);

  // 2. Считаем сегодняшние поступления на каждую карту
  const today = new Date().toISOString().split("T")[0];
  for (const card of cards) {
    const { sum } = await db.queryOne(`
      SELECT COALESCE(SUM(amount), 0) as sum FROM payments
      WHERE card_id = $1 AND status = 'confirmed'
      AND created_at::date = $2::date
    `, [card.id, today]);
    card.todayTotal = Number(sum);
  }

  // 3. Фильтруем карты по дневному лимиту
  const available = cards.filter(
    (c) => !c.daily_limit || c.todayTotal + amount <= c.daily_limit
  );

  if (available.length === 0) {
    throw new Error("Все карты достигли дневного лимита");
  }

  // 4. Выбираем карту с наименьшим сегодняшним оборотом (балансировка)
  available.sort((a, b) => a.todayTotal - b.todayTotal);
  return available[0];
}
```

---

## Приложение B: Шаблоны сообщений

Хранятся в `events.settings.templates` (JSONB):

```json
{
  "templates": {
    "welcome": "🎉 Добро пожаловать на {{event.title}}!\n\n{{event.description}}",
    "payment_instructions": "💳 Переведите {{amount}} ₽ по реквизитам:\n\nКарта: {{card.number}}\nПолучатель: {{card.holder}}\nБанк: {{card.bank}}\n\nПосле перевода отправьте скриншот ⬇️",
    "payment_confirmed": "✅ Оплата подтверждена! Ваш билет:",
    "payment_rejected": "❌ Оплата отклонена.\nПричина: {{reason}}\n\nПопробуйте ещё раз.",
    "reminder_1d": "⏰ Напоминаем: {{event.title}} завтра!\nМесто: {{event.venue}}\nНачало: {{event.starts_at}}",
    "reminder_1h": "🔔 {{event.title}} начинается через час!",
    "session_reminder": "🎤 Через 10 минут: {{session.title}}\nЗал: {{session.hall}}"
  }
}
```

Рендеринг через простой Mustache-like парсер (или Handlebars).

---

---

## 11. Веб-интерфейс ресепшена (Check-in Dashboard)

### Концепция
Отдельный веб-интерфейс для волонтёров и организаторов на ресепшене. Работает на ЛЮБОМ устройстве с браузером — телефон, планшет, ноутбук. Реалтайм синхронизация между всеми устройствами.

**Сценарий волонтёра:**
- Телефон = сканер QR (камера браузера)
- Ноутбук = таблица участников + информация о сканированном
- Оба устройства видят одно и то же в реалтайме

### Авторизация
- Организатор генерирует PIN-код для ресепшена (6 цифр)
- Волонтёр открывает `eventhub.ru/checkin/{event_slug}` → вводит PIN
- Сессия привязана к устройству (localStorage token)
- Разные PIN = разные роли (волонтёр видит только сканер + таблицу, организатор — всё)

### Экран 1: Сканер (оптимизирован под телефон)

```
┌──────────────────────────────┐
│  📷 Сканер — Конференция XYZ │
│  Вход: Главный               │
├──────────────────────────────┤
│                              │
│   ┌──────────────────────┐   │
│   │                      │   │
│   │    [Видео с камеры]  │   │
│   │    Наведите на QR    │   │
│   │                      │   │
│   └──────────────────────┘   │
│                              │
│  или введите код:            │
│  [________________] [OK]     │
│                              │
├──────────────────────────────┤
│  Последний скан:             │
│  ✅ Иванов Иван Петрович     │
│  🎫 VIP | 🏢 Яндекс         │
│  📋 Секции: ML, Product      │
│  ⏰ Вход: 09:42              │
│                              │
│  ⚠️ Аллергии: орехи          │
│  📝 Комментарий организатора:│
│     "Спикер, провести в VIP" │
├──────────────────────────────┤
│  Сегодня: 156/240 (65%)     │
│  ██████████░░░░░             │
└──────────────────────────────┘
```

**Поведение при скане:**
- Успех: зелёная вспышка + звук + вибрация + карточка участника
- Повторный: жёлтая вспышка + «⚠️ Уже вошёл в 09:42» + кнопка «Пропустить повторно»
- Невалидный: красная вспышка + звук ошибки + «❌ Билет не найден»
- Неоплачен: красная + «❌ Билет не оплачен» + кнопка «Позвать организатора»

**Два режима ввода (автоопределение):**
1. **Камера** — jsQR + `getUserMedia`, автосканирование без кнопки
2. **Текстовое поле** — для USB-сканера (сканер = клавиатура, вводит код + Enter). Поле всегда в фокусе

### Экран 2: Таблица участников (оптимизирован под ноутбук)

```
┌──────────────────────────────────────────────────────────┐
│ 📊 Участники — Конференция XYZ          [🔄] [📥 Excel] │
│ Пришли: 156/240 (65%)  VIP: 23/30  Стандарт: 133/210   │
├──────────────────────────────────────────────────────────┤
│ Поиск: [_______________]                                 │
│ Фильтр: [Все ▾] [Тип билета ▾] [Статус ▾] [Секция ▾]  │
├────┬────────────────┬─────────┬──────────┬───────┬───────┤
│ #  │ ФИО            │ Билет   │ Компания │ Вход  │  ✓/✗  │
├────┼────────────────┼─────────┼──────────┼───────┼───────┤
│ 1  │ Иванов И.П.    │ VIP     │ Яндекс   │ 09:42 │  ✅   │
│ 2  │ Петрова М.А.   │ Стандарт│ Сбер     │ 09:45 │  ✅   │
│ 3  │ Сидоров А.В.   │ VIP     │ VK       │   —   │  ⬜   │
│ 4  │ Козлов Д.И.    │ Стандарт│ Тинькофф │   —   │  ⬜   │
│ 5  │ Новикова Е.С.  │ Стандарт│ Ozon     │ 10:01 │  ✅   │
├────┴────────────────┴─────────┴──────────┴───────┴───────┤
│ Показано 1-50 из 240          [← Назад] [Далее →]       │
└──────────────────────────────────────────────────────────┘
```

**Фичи таблицы:**
- Реалтайм обновление (SSE — Server-Sent Events)
- При скане на телефоне — строка в таблице на ноутбуке подсвечивается зелёным
- Клик на строку → карточка участника (контакты, секции, комментарии)
- Сортировка по любому столбцу
- Экспорт в Excel (с фильтрами)
- Ручная отметка «Пришёл» (для случаев без QR)
- Строка поиска с мгновенной фильтрацией

### Экран 3: Дашборд организатора

```
┌──────────────────────────────────────────┐
│ 📊 Дашборд — Конференция XYZ            │
├──────────────┬───────────────────────────┤
│ Регистрации  │ ████████████ 240         │
│ Оплачено     │ ██████████░░ 220 (92%)   │
│ Пришли       │ ██████░░░░░░ 156 (65%)   │
├──────────────┴───────────────────────────┤
│ 💰 Финансы                               │
│ Ожидается:  480 000 ₽                    │
│ Получено:   440 000 ₽ (92%)             │
│                                          │
│ Карта Маши:  220 000 ₽ (112 оплат)      │
│ Карта Пети:  180 000 ₽ (88 оплат)       │
│ Ожидают:     40 000 ₽ (20 чел)          │
├──────────────────────────────────────────┤
│ 📈 Динамика входа (по часам)             │
│ 09:00 ██████████████ 45                  │
│ 09:30 ████████████████████ 62            │
│ 10:00 ████████████████████████ 34        │
│ 10:30 ██████████ 15                      │
├──────────────────────────────────────────┤
│ 🎤 Секции (заполненность)                │
│ ML Workshop:     45/50 (90%) 🔴          │
│ Product Talk:    28/100 (28%) 🟢         │
│ Networking:      67/80 (84%) 🟡          │
└──────────────────────────────────────────┘
```

### Технические детали

**Стек веб-интерфейса:**
- Frontend: Vanilla JS + HTML/CSS (минимум зависимостей, быстрая загрузка)
- Или: Preact (~3KB) для реактивности
- Камера: `navigator.mediaDevices.getUserMedia()` + jsQR
- Реалтайм: SSE (`EventSource`) от Fastify-сервера
- Responsive: mobile-first (сканер), desktop (таблица)

**API эндпоинты (добавить к существующим):**

```
GET  /web/checkin/:eventSlug          → Страница авторизации по PIN
POST /web/checkin/:eventSlug/auth     → Проверка PIN → session token
GET  /web/checkin/:eventSlug/scan     → Страница сканера
GET  /web/checkin/:eventSlug/list     → Страница таблицы
GET  /web/checkin/:eventSlug/dashboard → Дашборд организатора

POST /api/v1/checkin/scan             → { code: "UUID" } → результат скана
GET  /api/v1/checkin/stream           → SSE поток событий (новые чекины)
GET  /api/v1/checkin/stats            → Статистика для дашборда
GET  /api/v1/checkin/export           → Excel выгрузка
POST /api/v1/checkin/manual           → Ручная отметка по ID
```

**Новая таблица БД:**

```sql
CREATE TABLE checkin_pins (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  pin_code VARCHAR(6) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'volunteer', -- 'volunteer' | 'organizer'
  label VARCHAR(100),  -- "Главный вход", "VIP вход"
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_checkin_pins_event_pin ON checkin_pins(event_id, pin_code);
```

**SSE формат события:**

```json
{
  "event": "checkin",
  "data": {
    "registrationId": 42,
    "name": "Иванов Иван Петрович",
    "ticketType": "VIP",
    "company": "Яндекс",
    "checkedInAt": "2026-04-18T09:42:15Z",
    "checkedInBy": "Главный вход",
    "stats": { "total": 240, "checkedIn": 156 }
  }
}
```

### MVP (к 18 апреля)
- ✅ Сканер через камеру телефона
- ✅ Текстовое поле для USB-сканера
- ✅ Таблица участников с реалтайм обновлением
- ✅ PIN-авторизация
- ✅ Экспорт Excel
- ✅ Базовый дашборд (счётчики)

### v1.1 (после обкатки)
- Графики динамики входа
- Финансовый дашборд по картам
- Мульти-вход (несколько точек с разными PIN)
- Печать бейджей при скане

---

*Конец спецификации. Документ достаточен для начала разработки.*

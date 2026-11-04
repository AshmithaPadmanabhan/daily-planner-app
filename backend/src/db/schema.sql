-- ============================================================
-- DAILY PLANNER & PROGRESS TRACKER — FULL DATABASE SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    email               VARCHAR(150) UNIQUE NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    role                VARCHAR(20) NOT NULL DEFAULT 'student',
    bio                 TEXT,
    profile_photo_url   VARCHAR(255),

    overall_progress_score   NUMERIC(5,2) DEFAULT 0,
    total_days_tracked        INTEGER DEFAULT 0,
    total_tasks_completed      INTEGER DEFAULT 0,
    total_tasks_scheduled      INTEGER DEFAULT 0,

    is_locked           BOOLEAN DEFAULT FALSE,
    lock_expires_at      TIMESTAMP,

    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date           DATE NOT NULL,
    last_revised_at      TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, plan_date)
);

CREATE TABLE IF NOT EXISTS tasks (
    id                  SERIAL PRIMARY KEY,
    plan_id             INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    activity            VARCHAR(255) NOT NULL,
    scheduled_date        DATE NOT NULL,
    scheduled_time        TIME NOT NULL,

    is_done             BOOLEAN DEFAULT FALSE,
    completed_date        DATE,
    completed_time        TIME,

    carried_over         BOOLEAN DEFAULT FALSE,
    original_scheduled_date DATE,

    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_progress (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    progress_date         DATE NOT NULL,

    tasks_scheduled       INTEGER NOT NULL DEFAULT 0,
    tasks_completed       INTEGER NOT NULL DEFAULT 0,
    tasks_completed_on_time INTEGER NOT NULL DEFAULT 0,

    completion_rate       NUMERIC(5,2) DEFAULT 0,
    on_time_rate          NUMERIC(5,2) DEFAULT 0,
    daily_score           NUMERIC(5,2) DEFAULT 0,

    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, progress_date)
);

CREATE TABLE IF NOT EXISTS monthly_progress_summary (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year                INTEGER NOT NULL,
    month               INTEGER NOT NULL,

    avg_daily_score       NUMERIC(5,2),
    total_tasks_completed  INTEGER,
    total_tasks_scheduled  INTEGER,
    days_tracked          INTEGER,

    generated_at         TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, year, month)
);

CREATE TABLE IF NOT EXISTS notifications (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                VARCHAR(50) NOT NULL,
    message             VARCHAR(255) NOT NULL,
    related_task_id       INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    is_read             BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flagged_attempts (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempted_text        VARCHAR(255) NOT NULL,
    matched_keyword        VARCHAR(100),
    attempted_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unlawful_keywords (
    id                  SERIAL PRIMARY KEY,
    keyword             VARCHAR(100) NOT NULL UNIQUE,
    category            VARCHAR(50),
    active              BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_scheduled_date ON tasks(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed_date ON tasks(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, progress_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_flagged_attempts_user_time ON flagged_attempts(user_id, attempted_at);

-- Seed a starter set of unlawful-activity keywords (edit freely via DB)
INSERT INTO unlawful_keywords (keyword, category) VALUES
    ('robbery', 'theft'), ('rob a', 'theft'), ('rob the', 'theft'),
    ('steal', 'theft'), ('theft', 'theft'), ('shoplift', 'theft'),
    ('murder', 'violence'), ('kill someone', 'violence'), ('assault', 'violence'), ('kidnap', 'violence'),
    ('drug deal', 'drugs'), ('sell drugs', 'drugs'), ('smuggle', 'drugs'),
    ('extort', 'fraud'), ('bribe official', 'fraud'), ('counterfeit', 'fraud'),
    ('hack into', 'cyber'), ('breach account', 'cyber')
ON CONFLICT (keyword) DO NOTHING;

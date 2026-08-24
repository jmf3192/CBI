PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  password_hash TEXT NOT NULL,
  password_algorithm TEXT NOT NULL,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('draft', 'active', 'inactive', 'archived'))
);

CREATE TABLE IF NOT EXISTS user_call_access (
  user_id INTEGER NOT NULL,
  call_id INTEGER NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'read',
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, call_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
  CHECK (access_level IN ('read', 'evaluate', 'admin'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_user_call_access_call_id ON user_call_access(call_id);

INSERT OR IGNORE INTO roles (id, role_key, name)
VALUES
  (1, 'admin', 'Administrador'),
  (2, 'user', 'Usuario');

INSERT OR IGNORE INTO users (
  id,
  email,
  full_name,
  role_id,
  status,
  password_hash,
  password_algorithm
)
VALUES
  (
    1,
    'admin@conasoc.local',
    'Administrador CONASOC',
    1,
    'active',
    'dev-only-placeholder-hash-admin',
    'development-placeholder'
  );

INSERT OR IGNORE INTO users (
  id,
  email,
  full_name,
  role_id,
  status,
  password_hash,
  password_algorithm
)
VALUES
  (
    2,
    'usuario@empresa.local',
    'Usuario demo',
    2,
    'active',
    'dev-only-placeholder-hash-user-demo',
    'development-placeholder'
  ),
  (
    3,
    'revision@empresa.local',
    'Revision externa',
    2,
    'inactive',
    'dev-only-placeholder-hash-revision',
    'development-placeholder'
  );

INSERT OR IGNORE INTO calls (id, code, name, status)
VALUES
  (1, 'CONV-2026-001', 'Innovacion empresarial', 'active'),
  (2, 'CONV-2026-002', 'Digitalizacion y datos', 'active'),
  (3, 'CONV-2026-003', 'Sostenibilidad e impacto', 'active'),
  (4, 'CONV-2026-INNOVAE-FRIO', 'INNOVAE frio', 'active');

INSERT OR IGNORE INTO user_call_access (user_id, call_id, access_level)
VALUES
  (1, 1, 'admin'),
  (1, 2, 'admin'),
  (1, 3, 'admin'),
  (1, 4, 'admin'),
  (2, 1, 'evaluate'),
  (2, 2, 'evaluate'),
  (2, 4, 'evaluate');

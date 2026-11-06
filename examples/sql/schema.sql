-- Example SQL schema
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT NOT NULL,
  body TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sample data
INSERT INTO users (name, email) VALUES ('Ada Lovelace', 'ada@example.com');
INSERT INTO users (name, email) VALUES ('Alan Turing', 'alan@example.com');

INSERT INTO posts (user_id, title, body) VALUES (1, 'First Post', 'Hello from the database.');

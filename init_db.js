const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve('WDHC/wdhc.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Athletes table
  db.run(`
    CREATE TABLE IF NOT EXISTS athletes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      location TEXT,
      country_code TEXT,
      category TEXT,
      pr_count INTEGER DEFAULT 0,
      best_time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Submissions table
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      athlete_id INTEGER,
      hang_time TEXT NOT NULL,
      video_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (athlete_id) REFERENCES athletes(id)
    )
  `);

  console.log('WDHC Database initialized at', dbPath);
});

db.close();

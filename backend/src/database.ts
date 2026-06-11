import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(__dirname, '..', 'concert.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS concerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      city TEXT NOT NULL,
      venue TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      description TEXT,
      poster_url TEXT,
      seat_map_config TEXT,
      status TEXT DEFAULT 'upcoming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ticket_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      concert_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      total_seats INTEGER NOT NULL,
      sold_seats INTEGER DEFAULT 0,
      color TEXT,
      FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      concert_id INTEGER NOT NULL,
      tier_id INTEGER NOT NULL,
      row TEXT NOT NULL,
      seat_number TEXT NOT NULL,
      status TEXT DEFAULT 'available',
      order_id INTEGER,
      locked_until DATETIME,
      FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE,
      FOREIGN KEY (tier_id) REFERENCES ticket_tiers(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      concert_id INTEGER NOT NULL,
      order_no TEXT UNIQUE NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      buyer_name TEXT NOT NULL,
      buyer_phone TEXT,
      buyer_email TEXT,
      qr_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      refunded_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (concert_id) REFERENCES concerts(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      seat_id INTEGER NOT NULL,
      tier_id INTEGER NOT NULL,
      ticket_holder_name TEXT NOT NULL,
      ticket_holder_id_card TEXT NOT NULL,
      price REAL NOT NULL,
      qr_code TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (seat_id) REFERENCES seats(id),
      FOREIGN KEY (tier_id) REFERENCES ticket_tiers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_concerts_artist ON concerts(artist);
    CREATE INDEX IF NOT EXISTS idx_concerts_city ON concerts(city);
    CREATE INDEX IF NOT EXISTS idx_concerts_date ON concerts(date);
    CREATE INDEX IF NOT EXISTS idx_seats_concert ON seats(concert_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_concert ON orders(concert_id);
  `);

  const adminCheck = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
  if ((adminCheck as { count: number }).count === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(
      'admin',
      'admin@concert.com',
      hashedPassword,
      'admin'
    );
    console.log('默认管理员账号已创建: admin / admin123');
  }

  console.log('数据库初始化完成');
  return db;
}

export default db;

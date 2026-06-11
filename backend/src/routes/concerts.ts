import { Router } from 'express';
import db from '../database';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { Concert, TicketTier, Seat } from '../types';

const router = Router();

router.get('/', (req, res) => {
  const { artist, city, date, page = '1', limit = '10' } = req.query;
  
  let query = 'SELECT * FROM concerts WHERE status != \'cancelled\'';
  const params: any[] = [];

  if (artist) {
    query += ' AND artist LIKE ?';
    params.push(`%${artist}%`);
  }
  if (city) {
    query += ' AND city LIKE ?';
    params.push(`%${city}%`);
  }
  if (date) {
    query += ' AND date >= ?';
    params.push(date);
  }

  query += ' ORDER BY date ASC LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string), (parseInt(page as string) - 1) * parseInt(limit as string));

  const concerts = db.prepare(query).all(...params) as Concert[];
  
  const countQuery = 'SELECT COUNT(*) as total FROM concerts WHERE status != \'cancelled\'' + 
    (artist ? ' AND artist LIKE ?' : '') + 
    (city ? ' AND city LIKE ?' : '') + 
    (date ? ' AND date >= ?' : '');
  const countParams = [];
  if (artist) countParams.push(`%${artist}%`);
  if (city) countParams.push(`%${city}%`);
  if (date) countParams.push(date);
  
  const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

  const concertsWithTiers = concerts.map(concert => {
    const tiers = db.prepare('SELECT * FROM ticket_tiers WHERE concert_id = ?').all(concert.id) as TicketTier[];
    return { ...concert, tiers };
  });

  res.json({
    concerts: concertsWithTiers,
    total,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  });
});

router.get('/artists', (_req, res) => {
  const artists = db.prepare('SELECT DISTINCT artist FROM concerts WHERE status != \'cancelled\' ORDER BY artist').all() as { artist: string }[];
  res.json(artists.map(a => a.artist));
});

router.get('/cities', (_req, res) => {
  const cities = db.prepare('SELECT DISTINCT city FROM concerts WHERE status != \'cancelled\' ORDER BY city').all() as { city: string }[];
  res.json(cities.map(c => c.city));
});

router.get('/:id', (req, res) => {
  const concert = db.prepare('SELECT * FROM concerts WHERE id = ?').get(req.params.id) as Concert;
  
  if (!concert) {
    return res.status(404).json({ error: '演唱会不存在' });
  }

  const tiers = db.prepare('SELECT * FROM ticket_tiers WHERE concert_id = ?').all(concert.id) as TicketTier[];
  
  res.json({
    ...concert,
    tiers
  });
});

router.get('/:id/seats', (req, res) => {
  const concertId = parseInt(req.params.id);
  
  db.prepare("UPDATE seats SET status = 'available', locked_until = NULL WHERE status = 'locked' AND locked_until < DATETIME('now')").run();
  
  const seats = db.prepare(`
    SELECT s.*, t.name as tier_name, t.price, t.color 
    FROM seats s 
    JOIN ticket_tiers t ON s.tier_id = t.id 
    WHERE s.concert_id = ?
  `).all(concertId);

  const tiers = db.prepare('SELECT * FROM ticket_tiers WHERE concert_id = ?').all(concertId);

  res.json({ seats, tiers });
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { title, artist, city, venue, date, time, description, poster_url, tiers, seatMapConfig } = req.body;

  if (!title || !artist || !city || !venue || !date || !time || !tiers || !Array.isArray(tiers)) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  const tx = db.transaction(() => {
    const concertResult = db.prepare(`
      INSERT INTO concerts (title, artist, city, venue, date, time, description, poster_url, seat_map_config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, artist, city, venue, date, time, description, poster_url, JSON.stringify(seatMapConfig || null));

    const concertId = concertResult.lastInsertRowid as number;

    for (const tier of tiers) {
      const tierResult = db.prepare(`
        INSERT INTO ticket_tiers (concert_id, name, price, total_seats, color)
        VALUES (?, ?, ?, ?, ?)
      `).run(concertId, tier.name, tier.price, tier.totalSeats, tier.color || null);

      const tierId = tierResult.lastInsertRowid as number;

      if (tier.seats && Array.isArray(tier.seats)) {
        for (const seat of tier.seats) {
          db.prepare(`
            INSERT INTO seats (concert_id, tier_id, row, seat_number, status)
            VALUES (?, ?, ?, ?, 'available')
          `).run(concertId, tierId, seat.row, seat.seatNumber);
        }
      }
    }

    return concertId;
  });

  try {
    const concertId = tx();
    res.json({ id: concertId, message: '演唱会创建成功' });
  } catch (error) {
    res.status(500).json({ error: '创建演唱会失败' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { title, artist, city, venue, date, time, description, poster_url, status, seatMapConfig } = req.body;
  const concertId = parseInt(req.params.id);

  try {
    db.prepare(`
      UPDATE concerts 
      SET title = COALESCE(?, title),
          artist = COALESCE(?, artist),
          city = COALESCE(?, city),
          venue = COALESCE(?, venue),
          date = COALESCE(?, date),
          time = COALESCE(?, time),
          description = COALESCE(?, description),
          poster_url = COALESCE(?, poster_url),
          status = COALESCE(?, status),
          seat_map_config = COALESCE(?, seat_map_config)
      WHERE id = ?
    `).run(title, artist, city, venue, date, time, description, poster_url, status, JSON.stringify(seatMapConfig || null), concertId);

    res.json({ message: '演唱会更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新演唱会失败' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const concertId = parseInt(req.params.id);
  
  try {
    db.prepare('DELETE FROM concerts WHERE id = ?').run(concertId);
    res.json({ message: '演唱会删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除演唱会失败' });
  }
});

router.post('/:id/tiers', authenticateToken, requireAdmin, (req, res) => {
  const concertId = parseInt(req.params.id);
  const { name, price, totalSeats, color, seats } = req.body;

  if (!name || price == null || !totalSeats) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  const tx = db.transaction(() => {
    const tierResult = db.prepare(`
      INSERT INTO ticket_tiers (concert_id, name, price, total_seats, color)
      VALUES (?, ?, ?, ?, ?)
    `).run(concertId, name, price, totalSeats, color || null);

    const tierId = tierResult.lastInsertRowid as number;

    if (seats && Array.isArray(seats)) {
      for (const seat of seats) {
        db.prepare(`
          INSERT INTO seats (concert_id, tier_id, row, seat_number, status)
          VALUES (?, ?, ?, ?, 'available')
        `).run(concertId, tierId, seat.row, seat.seatNumber);
      }
    }

    return tierId;
  });

  try {
    const tierId = tx();
    res.json({ id: tierId, message: '票档创建成功' });
  } catch (error) {
    res.status(500).json({ error: '创建票档失败' });
  }
});

export default router;

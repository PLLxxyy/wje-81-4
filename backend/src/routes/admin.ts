import { Router } from 'express';
import db from '../database';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { Order, OrderItem, TicketTier } from '../types';

const router = Router();

router.get('/stats', authenticateToken, requireAdmin, (_req, res) => {
  const totalConcerts = db.prepare('SELECT COUNT(*) as count FROM concerts').get() as { count: number };
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = \'paid\'').get() as { count: number };
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = \'paid\'').get() as { total: number };
  const totalTickets = db.prepare('SELECT COUNT(*) as count FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status = \'paid\'').get() as { count: number };

  res.json({
    totalConcerts: totalConcerts.count,
    totalOrders: totalOrders.count,
    totalRevenue: totalRevenue.total,
    totalTickets: totalTickets.count
  });
});

router.get('/concerts/:id/stats', authenticateToken, requireAdmin, (req, res) => {
  const concertId = parseInt(req.params.id);

  const tiers = db.prepare('SELECT * FROM ticket_tiers WHERE concert_id = ?').all(concertId) as TicketTier[];
  
  const tierStats = tiers.map(tier => ({
    ...tier,
    remainingSeats: tier.total_seats - tier.sold_seats,
    sellRate: tier.total_seats > 0 ? (tier.sold_seats / tier.total_seats * 100).toFixed(1) : '0',
    revenue: tier.sold_seats * tier.price
  }));

  const totalSold = tierStats.reduce((sum, t) => sum + t.sold_seats, 0);
  const totalRevenue = tierStats.reduce((sum, t) => sum + t.revenue, 0);
  const totalCapacity = tierStats.reduce((sum, t) => sum + t.total_seats, 0);

  const recentOrders = db.prepare(`
    SELECT o.*, u.username, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.concert_id = ? AND o.status = 'paid'
    ORDER BY o.paid_at DESC
    LIMIT 10
  `).all(concertId);

  res.json({
    tiers: tierStats,
    totalSold,
    totalRevenue,
    totalCapacity,
    sellRate: totalCapacity > 0 ? ((totalSold / totalCapacity) * 100).toFixed(1) : '0',
    recentOrders
  });
});

router.get('/orders', authenticateToken, requireAdmin, (req, res) => {
  const { concertId, status, page = '1', limit = '20' } = req.query;
  
  let query = `
    SELECT o.*, c.title, c.artist, c.date, u.username, u.email
    FROM orders o
    JOIN concerts c ON o.concert_id = c.id
    JOIN users u ON o.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (concertId) {
    query += ' AND o.concert_id = ?';
    params.push(parseInt(concertId as string));
  }
  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }

  const countQuery = query.replace('SELECT o.*, c.title, c.artist, c.date, u.username, u.email', 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countQuery).get(...params) as { total: number };

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string), (parseInt(page as string) - 1) * parseInt(limit as string));

  const orders = db.prepare(query).all(...params);

  res.json({
    orders,
    total,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  });
});

router.get('/orders/:id', authenticateToken, requireAdmin, (req, res) => {
  const orderId = parseInt(req.params.id);

  const order = db.prepare(`
    SELECT o.*, c.title, c.artist, c.date, c.time, c.venue, c.city, u.username, u.email
    FROM orders o
    JOIN concerts c ON o.concert_id = c.id
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).get(orderId);

  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }

  const orderItems = db.prepare(`
    SELECT oi.*, s.row, s.seat_number, t.name as tier_name, t.color
    FROM order_items oi
    JOIN seats s ON oi.seat_id = s.id
    JOIN ticket_tiers t ON oi.tier_id = t.id
    WHERE oi.order_id = ?
  `).all(orderId);

  const items = orderItems.map((item: any) => ({
    ...item,
    seat_no: `${item.row}${item.seat_number}`,
    seatNo: `${item.row}${item.seat_number}`,
    attendee_name: item.ticket_holder_name,
    attendeeName: item.ticket_holder_name,
    attendee_id_no: item.ticket_holder_id_card,
    attendeeIdNo: item.ticket_holder_id_card,
    qr_code: item.qr_code,
    qrCode: item.qr_code
  }));

  const anyOrder = order as any;
  res.json({
    ...anyOrder,
    buyer_name: anyOrder.buyer_name,
    buyerName: anyOrder.buyer_name,
    buyer_phone: anyOrder.buyer_phone || '',
    buyerPhone: anyOrder.buyer_phone || '',
    buyer_email: anyOrder.buyer_email || '',
    buyerEmail: anyOrder.buyer_email || '',
    concert_title: anyOrder.title,
    concert_artist: anyOrder.artist,
    concert_date: anyOrder.date,
    concert_time: anyOrder.time,
    items
  });
});

router.post('/orders/refund/batch', authenticateToken, requireAdmin, (req, res) => {
  const { orderIds } = req.body;

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ error: '请选择要退款的订单' });
  }

  const tx = db.transaction(() => {
    const placeholders = orderIds.map(() => '?').join(',');
    
    const orders = db.prepare(`
      SELECT * FROM orders WHERE id IN (${placeholders}) AND status = 'paid'
    `).all(...orderIds) as Order[];

    if (orders.length === 0) {
      throw new Error('没有可退款的订单');
    }

    const refundedIds = orders.map(o => o.id);
    
    db.prepare(`
      UPDATE orders SET status = 'refunded', refunded_at = DATETIME('now') 
      WHERE id IN (${placeholders}) AND status = 'paid'
    `).run(...orderIds);

    for (const order of orders) {
      const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as OrderItem[];
      
      for (const item of orderItems) {
        db.prepare("UPDATE seats SET status = 'available', order_id = NULL WHERE id = ?").run(item.seat_id);
        db.prepare('UPDATE ticket_tiers SET sold_seats = sold_seats - 1 WHERE id = ?').run(item.tier_id);
      }
    }

    return { refundedCount: refundedIds.length, refundedIds };
  });

  try {
    const result = tx();
    res.json({ 
      success: true,
      message: `成功退款 ${result.refundedCount} 个订单`,
      refundedCount: result.refundedCount,
      refundedIds: result.refundedIds
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || '批量退款失败', success: false });
  }
});

router.post('/orders/:id/refund', authenticateToken, requireAdmin, (req, res) => {
  const orderId = parseInt(req.params.id);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Order;
  
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  if (order.status !== 'paid') {
    return res.status(400).json({ error: '只有已支付的订单才能退款' });
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE orders SET status = 'refunded', refunded_at = DATETIME('now') WHERE id = ?
    `).run(orderId);

    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as OrderItem[];
    
    for (const item of orderItems) {
      db.prepare("UPDATE seats SET status = 'available', order_id = NULL WHERE id = ?").run(item.seat_id);
      db.prepare('UPDATE ticket_tiers SET sold_seats = sold_seats - 1 WHERE id = ?').run(item.tier_id);
    }
  });

  try {
    tx();
    res.json({ success: true, message: '退款成功' });
  } catch (error) {
    res.status(500).json({ error: '退款失败', success: false });
  }
});

router.get('/sales/trend', authenticateToken, requireAdmin, (req, res) => {
  const { concertId, days = '30' } = req.query;

  let query = `
    SELECT 
      DATE(o.paid_at) as date,
      COUNT(*) as orders,
      SUM(o.total_amount) as revenue,
      COUNT(oi.id) as tickets
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status = 'paid' AND o.paid_at >= DATE('now', ?)
  `;
  const params: any[] = [`-${days} days`];

  if (concertId) {
    query += ' AND o.concert_id = ?';
    params.push(parseInt(concertId as string));
  }

  query += ' GROUP BY DATE(o.paid_at) ORDER BY date ASC';

  const trend = db.prepare(query).all(...params);

  res.json({ trend });
});

export default router;

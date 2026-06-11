import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import db from '../database';
import { authenticateToken } from '../middleware/auth';
import { Order, OrderItem, Seat } from '../types';

const router = Router();

router.post('/lock-seats', authenticateToken, (req, res) => {
  const seatIds = req.body.seat_ids || req.body.seatIds || [];

  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: '请选择座位' });
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE seats SET status = 'available', locked_until = NULL WHERE status = 'locked' AND locked_until < DATETIME('now')").run();

    const placeholders = seatIds.map(() => '?').join(',');
    const availableSeats = db.prepare(`
      SELECT id FROM seats 
      WHERE id IN (${placeholders}) AND status = 'available'
    `).all(...seatIds) as Seat[];

    if (availableSeats.length !== seatIds.length) {
      throw new Error('部分座位已被占用');
    }

    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const updateStmt = db.prepare(`
      UPDATE seats SET status = 'locked', locked_until = ? WHERE id = ?
    `);

    for (const seatId of seatIds) {
      updateStmt.run(lockedUntil, seatId);
    }

    return { lockedUntil };
  });

  try {
    const result = tx();
    res.json({ success: true, lockedUntil: result.lockedUntil });
  } catch (error: any) {
    res.status(400).json({ error: error.message || '锁定座位失败', success: false });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const concertId = req.body.concert_id || req.body.concertId;
  const seatIds = req.body.seat_ids || req.body.seatIds || [];
  const buyerName = req.body.buyer_name || req.body.buyerName;
  const buyerPhone = req.body.buyer_phone || req.body.buyerPhone || '';
  const buyerEmail = req.body.buyer_email || req.body.buyerEmail || '';
  const attendees = req.body.attendees || req.body.ticketHolders || [];

  if (!concertId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: '请选择座位' });
  }
  if (!buyerName) {
    return res.status(400).json({ error: '请填写购票人姓名' });
  }
  if (!Array.isArray(attendees) || attendees.length !== seatIds.length) {
    return res.status(400).json({ error: '请填写每位持票人的信息' });
  }

  const tx = db.transaction(() => {
    const placeholders = seatIds.map(() => '?').join(',');
    const seats = db.prepare(`
      SELECT s.*, t.price, t.name as tier_name 
      FROM seats s 
      JOIN ticket_tiers t ON s.tier_id = t.id 
      WHERE s.id IN (${placeholders}) AND s.concert_id = ? AND s.status = 'locked'
    `).all(...seatIds, concertId) as (Seat & { price: number; tier_name: string })[];

    if (seats.length !== seatIds.length) {
      throw new Error('座位已过期或不存在，请重新选择');
    }

    const totalAmount = seats.reduce((sum, seat) => sum + seat.price, 0);
    const orderNo = 'ORD' + Date.now() + uuidv4().slice(0, 8).toUpperCase();

    const orderResult = db.prepare(`
      INSERT INTO orders (user_id, concert_id, order_no, total_amount, buyer_name, buyer_phone, buyer_email, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(req.user!.userId, concertId, orderNo, totalAmount, buyerName, buyerPhone, buyerEmail);

    const orderId = orderResult.lastInsertRowid as number;

    const orderItemStmt = db.prepare(`
      INSERT INTO order_items (order_id, seat_id, tier_id, ticket_holder_name, ticket_holder_id_card, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const seatUpdateStmt = db.prepare(`
      UPDATE seats SET status = 'sold', order_id = ?, locked_until = NULL WHERE id = ?
    `);

    const tierUpdateStmt = db.prepare(`
      UPDATE ticket_tiers SET sold_seats = sold_seats + 1 WHERE id = ?
    `);

    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i];
      const holder = attendees[i];
      const holderName = holder.name || holder.attendee_name;
      const holderId = holder.id_no || holder.idCard || holder.attendee_id_no;

      if (!holderName || !holderId) {
        throw new Error('请完善每位持票人的姓名和证件号');
      }

      orderItemStmt.run(
        orderId,
        seat.id,
        seat.tier_id,
        holderName,
        holderId,
        seat.price
      );

      seatUpdateStmt.run(orderId, seat.id);
      tierUpdateStmt.run(seat.tier_id);
    }

    return { orderId, orderNo, totalAmount };
  });

  try {
    const result = tx();
    
    const orderQrData = JSON.stringify({
      orderNo: result.orderNo,
      type: 'order',
      timestamp: Date.now()
    });
    const orderQrCode = await QRCode.toDataURL(orderQrData);
    
    db.prepare('UPDATE orders SET qr_code = ? WHERE id = ?').run(orderQrCode, result.orderId);

    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(result.orderId) as OrderItem[];
    for (const item of orderItems) {
      const ticketQrData = JSON.stringify({
        orderNo: result.orderNo,
        itemId: item.id,
        seatId: item.seat_id,
        holder: item.ticket_holder_name,
        type: 'ticket',
        timestamp: Date.now()
      });
      const ticketQrCode = await QRCode.toDataURL(ticketQrData);
      db.prepare('UPDATE order_items SET qr_code = ? WHERE id = ?').run(ticketQrCode, item.id);
    }

    res.json({
      order_id: result.orderId,
      orderId: result.orderId,
      order_no: result.orderNo,
      orderNo: result.orderNo,
      total_amount: result.totalAmount,
      totalAmount: result.totalAmount,
      message: '订单创建成功，请完成支付'
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || '创建订单失败' });
  }
});

router.post('/:id/pay', authenticateToken, (req, res) => {
  const orderId = parseInt(req.params.id);
  const userId = req.user!.userId;

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId) as Order;
  
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  if (order.status !== 'pending') {
    return res.status(400).json({ error: '订单状态不正确' });
  }

  try {
    db.prepare(`
      UPDATE orders SET status = 'paid', paid_at = DATETIME('now') WHERE id = ?
    `).run(orderId);

    res.json({ success: true, message: '支付成功', orderId });
  } catch (error) {
    res.status(500).json({ error: '支付失败', success: false });
  }
});

router.get('/', authenticateToken, (req, res) => {
  const userId = req.user!.userId;
  const { page = '1', limit = '10' } = req.query;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  const orders = db.prepare(`
    SELECT o.*, c.title, c.artist, c.date, c.venue, c.city
    FROM orders o
    JOIN concerts c ON o.concert_id = c.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, parseInt(limit as string), offset);

  const { total } = db.prepare('SELECT COUNT(*) as total FROM orders WHERE user_id = ?').get(userId) as { total: number };

  res.json({
    orders,
    total,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  const orderId = parseInt(req.params.id);
  const userId = req.user!.userId;

  const order = db.prepare(`
    SELECT o.*, c.title, c.artist, c.date, c.time, c.venue, c.city, c.poster_url
    FROM orders o
    JOIN concerts c ON o.concert_id = c.id
    WHERE o.id = ? AND o.user_id = ?
  `).get(orderId, userId) as Order & { 
    title: string; artist: string; date: string; time: string; venue: string; city: string; poster_url?: string;
  };

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

  res.json({
    ...order,
    items
  });
});

router.post('/:id/refund', authenticateToken, (req, res) => {
  const orderId = parseInt(req.params.id);
  const userId = req.user!.userId;

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId) as Order;
  
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  if (order.status !== 'paid') {
    return res.status(400).json({ error: '只有已支付的订单才能申请退款' });
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

export default router;

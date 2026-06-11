import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { generateToken } from '../middleware/auth';
import { User } from '../types';

const router = Router();

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  const existingUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existingUser) {
    return res.status(400).json({ error: '用户名或邮箱已存在' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(
      username,
      email,
      hashedPassword
    );

    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
    const token = generateToken({ userId: user.id, username: user.username, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: '注册失败' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请填写用户名和密码' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User;
  if (!user) {
    return res.status(400).json({ error: '用户名或密码错误' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    return res.status(400).json({ error: '用户名或密码错误' });
  }

  const token = generateToken({ userId: user.id, username: user.username, role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

export default router;

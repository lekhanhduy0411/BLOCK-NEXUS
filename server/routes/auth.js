import express from 'express';
import bcrypt from 'bcryptjs';
import UserScore from '../models/UserScore.js';
import { requireAuth, signAuthToken } from '../middleware/auth.js';
import { isFounderUsername } from '../config/constants.js';

const router = express.Router();

function sanitizeNonNegativeInt(val, max = 100_000_000) {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(Math.floor(num), max);
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const rawUsername = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const guestStats = req.body?.guestStats || null;

    if (rawUsername.length < 3 || rawUsername.length > 20) {
      return res.status(400).json({
        error: 'Tên đăng nhập phải từ 3 đến 20 ký tự.',
      });
    }

    if (!/^[\p{L}\p{N}_\- ]+$/u.test(rawUsername)) {
      return res.status(400).json({
        error: 'Tên đăng nhập chỉ được chứa chữ cái, số, khoảng trắng, gạch dưới hoặc gạch ngang.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Mật khẩu phải có ít nhất 6 ký tự.',
      });
    }

    const usernameLower = rawUsername.toLowerCase();
    const existing = await UserScore.findOne({ usernameLower });
    if (existing) {
      return res.status(409).json({
        error: 'Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Migrate local Guest personal records if upgrading from a Guest session
    const migratedDragHigh = sanitizeNonNegativeInt(guestStats?.dragMode?.allTimeHigh);
    const migratedDragCombo = sanitizeNonNegativeInt(guestStats?.dragMode?.maxCombo, 100_000);
    const migratedDropHigh = sanitizeNonNegativeInt(guestStats?.dropMode?.allTimeHigh);
    const migratedDropLines = sanitizeNonNegativeInt(guestStats?.dropMode?.maxLines, 100_000);

    const user = await UserScore.create({
      username: rawUsername,
      usernameLower,
      passwordHash,
      role: isFounderUsername(rawUsername) ? 'ADMIN' : 'USER',
      coins: 200,
      ownedBackgrounds: ['BG_DEFAULT'],
      equippedBackground: 'BG_DEFAULT',
      records: {
        dragMode: {
          allTimeHigh: migratedDragHigh,
          weeklyScore: 0,
          maxCombo: migratedDragCombo,
          updatedAt: new Date(),
        },
        dropMode: {
          allTimeHigh: migratedDropHigh,
          weeklyScore: 0,
          maxLines: migratedDropLines,
          updatedAt: new Date(),
        },
      },
    });

    const token = signAuthToken(user);

    return res.status(201).json({
      token,
      user: user.toPublicProfile(),
      migratedGuestScores: migratedDragHigh > 0 || migratedDropHigh > 0,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }
    return next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const rawUsername = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!rawUsername || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
    }

    const user = await UserScore.findOne({ usernameLower: rawUsername.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    // Automatically ensure Founder Admin role if configured in FOUNDER_USERNAME
    if (isFounderUsername(user.username) && user.role !== 'ADMIN') {
      user.role = 'ADMIN';
      await user.save();
    }

    const token = signAuthToken(user);
    return res.json({
      token,
      user: user.toPublicProfile(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  return res.json({
    user: req.user.toPublicProfile(),
  });
});

export default router;

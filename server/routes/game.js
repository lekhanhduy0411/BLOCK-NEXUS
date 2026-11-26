import crypto from 'node:crypto';
import express from 'express';
import GameSession from '../models/GameSession.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeMode } from '../config/constants.js';
import { checkAndRunWeeklyReset } from '../jobs/weeklyReset.js';
import { findNextRival, toSessionMode } from '../utils/dailyQuests.js';

const router = express.Router();

// POST /api/game/start (JWT protected — creates single-use session token for anti-cheat + rival target)
router.post('/start', requireAuth, async (req, res, next) => {
  try {
    await checkAndRunWeeklyReset();

    const recordMode = normalizeMode(req.body?.mode);
    if (!recordMode) {
      return res.status(400).json({ error: 'Chế độ chơi không hợp lệ.' });
    }

    const sessionMode = toSessionMode(recordMode);
    const sessionId = crypto.randomUUID();
    const session = await GameSession.create({
      sessionId,
      userId: req.user._id,
      mode: sessionMode,
      startedAt: new Date(),
      used: false,
    });

    const userWeeklyScore = req.user.records?.[recordMode]?.weeklyScore ?? 0;
    const nextRival = await findNextRival(req.user._id, recordMode, userWeeklyScore);

    return res.json({
      sessionId: session.sessionId,
      mode: sessionMode,
      startedAt: session.startedAt.toISOString(),
      nextRival,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;

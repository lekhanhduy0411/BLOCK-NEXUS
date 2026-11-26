import express from 'express';
import UserScore from '../models/UserScore.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { normalizeMode, WEEKLY_REWARDS } from '../config/constants.js';
import { checkAndRunWeeklyReset, getHoChiMinhWeekInfo } from '../jobs/weeklyReset.js';

const router = express.Router();

// POST /api/scores/submit (JWT protected — Guests cannot submit)
router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    await checkAndRunWeeklyReset();

    const mode = normalizeMode(req.body?.mode);
    if (!mode) {
      return res.status(400).json({ error: 'Invalid game mode. Expected dragMode or dropMode.' });
    }

    const score = Math.floor(Number(req.body?.score));
    if (!Number.isFinite(score) || score < 0 || score > 100_000_000) {
      return res.status(400).json({ error: 'Invalid score value.' });
    }

    const combo = Math.max(0, Math.min(100_000, Math.floor(Number(req.body?.maxCombo || 0))));
    const lines = Math.max(0, Math.min(100_000, Math.floor(Number(req.body?.linesCleared || 0))));

    const prevModeRecord = req.user.records?.[mode] || {
      allTimeHigh: 0,
      weeklyScore: 0,
    };

    const isNewAllTimeHigh = score > (prevModeRecord.allTimeHigh || 0);
    const isNewWeeklyHigh = score > (prevModeRecord.weeklyScore || 0);

    const maxUpdate = {
      [`records.${mode}.allTimeHigh`]: score,
      [`records.${mode}.weeklyScore`]: score,
    };

    if (mode === 'dragMode') {
      maxUpdate['records.dragMode.maxCombo'] = combo;
    } else {
      maxUpdate['records.dropMode.maxLines'] = lines;
    }

    const updateDoc = { $max: maxUpdate };
    if (isNewWeeklyHigh || isNewAllTimeHigh) {
      updateDoc.$set = { [`records.${mode}.updatedAt`]: new Date() };
    }

    const updatedUser = await UserScore.findByIdAndUpdate(req.userId, updateDoc, {
      new: true,
    });

    const userWeeklyScore = updatedUser.records?.[mode]?.weeklyScore ?? 0;
    const scoreField = `records.${mode}.weeklyScore`;
    const updatedField = `records.${mode}.updatedAt`;

    const higherRankedCount = await UserScore.countDocuments({
      $or: [
        { [scoreField]: { $gt: userWeeklyScore } },
        {
          [scoreField]: userWeeklyScore,
          [updatedField]: { $lt: updatedUser.records?.[mode]?.updatedAt || new Date() },
        },
      ],
    });

    const weeklyRank = higherRankedCount + 1;

    return res.json({
      mode,
      submittedScore: score,
      isNewAllTimeHigh,
      isNewWeeklyHigh,
      weeklyRank,
      user: updatedUser.toPublicProfile(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/scores/leaderboard/:mode
router.get('/leaderboard/:mode', optionalAuth, async (req, res, next) => {
  try {
    await checkAndRunWeeklyReset();

    const mode = normalizeMode(req.params.mode);
    if (!mode) {
      return res.status(400).json({ error: 'Invalid mode parameter.' });
    }

    const scoreField = `records.${mode}.weeklyScore`;
    const updatedField = `records.${mode}.updatedAt`;

    const users = await UserScore.find(
      {},
      {
        username: 1,
        equippedBackground: 1,
        [`records.${mode}`]: 1,
        createdAt: 1,
      }
    )
      .sort({ [scoreField]: -1, [updatedField]: 1, createdAt: 1 })
      .lean();

    const entries = users.map((u, idx) => {
      const rank = idx + 1;
      const modeStats = u.records?.[mode] || {};
      const weeklyScore = modeStats.weeklyScore ?? 0;
      const reward = rank <= 3 ? WEEKLY_REWARDS[rank] : null;

      return {
        rank,
        userId: u._id.toString(),
        username: u.username,
        score: weeklyScore,
        allTimeHigh: modeStats.allTimeHigh ?? 0,
        reward,
      };
    });

    const myEntry = req.userId
      ? entries.find((e) => e.userId === req.userId) || null
      : null;

    const { weekKey, nextResetAt } = getHoChiMinhWeekInfo();

    return res.json({
      mode,
      weekKey,
      nextResetAt: nextResetAt.toISOString(),
      totalPlayers: entries.length,
      entries,
      myEntry,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;

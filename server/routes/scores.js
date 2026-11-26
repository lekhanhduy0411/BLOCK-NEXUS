import express from 'express';
import UserScore from '../models/UserScore.js';
import GameSession from '../models/GameSession.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { normalizeMode, WEEKLY_REWARDS } from '../config/constants.js';
import { checkAndRunWeeklyReset, getHoChiMinhWeekInfo } from '../jobs/weeklyReset.js';
import {
  DAILY_COIN_CAP,
  applyMatchToDailyQuests,
  calculateMatchCoins,
  findNextRival,
  getTodayVNDateKey,
  normalizeUserDailyState,
  toSessionMode,
  validateScoreSanity,
} from '../utils/dailyQuests.js';

const router = express.Router();

// POST /api/scores/submit (JWT protected — Guests cannot submit)
router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    await checkAndRunWeeklyReset();

    const mode = normalizeMode(req.body?.mode);
    if (!mode) {
      return res.status(400).json({ error: 'Chế độ chơi không hợp lệ.' });
    }
    const sessionMode = toSessionMode(mode);

    const sessionId = String(req.body?.sessionId || '').trim();
    if (!sessionId) {
      return res.status(400).json({ error: 'Thiếu mã phiên thi đấu hợp lệ.' });
    }

    const score = Math.floor(Number(req.body?.score));
    const combo = Math.floor(Number(req.body?.maxCombo ?? 0));
    const lines = Math.floor(Number(req.body?.linesCleared ?? 0));
    const level = Math.max(1, Math.min(999, Math.floor(Number(req.body?.level ?? 1) || 1)));

    // Atomic single-use session verification
    const session = await GameSession.findOneAndUpdate(
      {
        sessionId,
        userId: req.user._id,
        mode: sessionMode,
        used: false,
      },
      { $set: { used: true } },
      { new: true }
    );

    if (!session) {
      return res.status(400).json({
        error: 'Phiên thi đấu không hợp lệ, đã hết hạn hoặc đã được ghi nhận.',
      });
    }

    const durationSec = Math.max(0, (Date.now() - new Date(session.startedAt).getTime()) / 1000);
    const sanity = validateScoreSanity({
      mode,
      score,
      maxCombo: combo,
      linesCleared: lines,
      durationSec,
    });

    if (!sanity.valid) {
      return res.status(400).json({ error: sanity.reason || 'Kết quả thi đấu không hợp lệ.' });
    }

    const prevModeRecord = req.user.records?.[mode] || {
      allTimeHigh: 0,
      weeklyScore: 0,
    };

    const isNewAllTimeHigh = score > (prevModeRecord.allTimeHigh || 0);
    const isNewWeeklyHigh = score > (prevModeRecord.weeklyScore || 0);

    // Daily coin reward + Daily Quests update (backwards-compatible with older accounts)
    const todayKey = getTodayVNDateKey();
    const daily = normalizeUserDailyState(req.user, todayKey);
    const { matchCoinsAwarded, nextDailyCoinsEarned } = calculateMatchCoins({
      mode,
      score,
      currentDailyCoinsEarned: daily.dailyCoinsEarned,
    });

    const { dailyQuests: updatedQuests, dailyModesPlayed: updatedModesPlayed } =
      applyMatchToDailyQuests({
        dailyQuests: daily.dailyQuests,
        dailyModesPlayed: daily.dailyModesPlayed,
        sessionMode,
        score,
        maxCombo: combo,
        linesCleared: lines,
        level,
      });

    const maxUpdate = {
      [`records.${mode}.allTimeHigh`]: score,
      [`records.${mode}.weeklyScore`]: score,
    };

    if (mode === 'dragMode') {
      maxUpdate['records.dragMode.maxCombo'] = combo;
    } else {
      maxUpdate['records.dropMode.maxLines'] = lines;
    }

    const setUpdate = {
      dailyDateKey: todayKey,
      dailyCoinsEarned: nextDailyCoinsEarned,
      dailyModesPlayed: updatedModesPlayed,
      dailyQuests: updatedQuests,
    };
    if (isNewWeeklyHigh || isNewAllTimeHigh) {
      setUpdate[`records.${mode}.updatedAt`] = new Date();
    }

    const updateDoc = {
      $max: maxUpdate,
      $set: setUpdate,
    };
    if (matchCoinsAwarded > 0) {
      updateDoc.$inc = { coins: matchCoinsAwarded };
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
    const nextRival = await findNextRival(updatedUser._id, mode, userWeeklyScore);

    return res.json({
      mode,
      submittedScore: score,
      isNewAllTimeHigh,
      isNewWeeklyHigh,
      weeklyRank,
      nextRival,
      matchCoinsAwarded,
      dailyCoinsEarned: nextDailyCoinsEarned,
      dailyCoinCap: DAILY_COIN_CAP,
      dailyQuests: updatedQuests,
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

import express from 'express';
import UserScore from '../models/UserScore.js';
import { requireAuth } from '../middleware/auth.js';
import {
  DAILY_COIN_CAP,
  getTodayVNDateKey,
  normalizeUserDailyState,
} from '../utils/dailyQuests.js';

const router = express.Router();

// GET /api/quests/daily
router.get('/daily', requireAuth, async (req, res, next) => {
  try {
    const todayKey = getTodayVNDateKey();
    const daily = normalizeUserDailyState(req.user, todayKey);

    if (daily.needsReset) {
      await UserScore.findByIdAndUpdate(req.user._id, {
        $set: {
          dailyDateKey: daily.dailyDateKey,
          dailyCoinsEarned: daily.dailyCoinsEarned,
          dailyModesPlayed: daily.dailyModesPlayed,
          dailyQuests: daily.dailyQuests,
        },
      });
    }

    return res.json({
      dailyDateKey: daily.dailyDateKey,
      dailyCoinsEarned: daily.dailyCoinsEarned,
      dailyCoinCap: DAILY_COIN_CAP,
      dailyQuests: daily.dailyQuests,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/quests/claim (atomic single-claim guard)
router.post('/claim', requireAuth, async (req, res, next) => {
  try {
    const questId = String(req.body?.questId || '').trim();
    if (!questId) {
      return res.status(400).json({ error: 'Thiếu mã nhiệm vụ cần nhận thưởng.' });
    }

    const todayKey = getTodayVNDateKey();
    const daily = normalizeUserDailyState(req.user, todayKey);

    if (daily.needsReset) {
      await UserScore.findByIdAndUpdate(req.user._id, {
        $set: {
          dailyDateKey: daily.dailyDateKey,
          dailyCoinsEarned: daily.dailyCoinsEarned,
          dailyModesPlayed: daily.dailyModesPlayed,
          dailyQuests: daily.dailyQuests,
        },
      });
      return res.status(400).json({
        error: 'Nhiệm vụ ngày mới vừa được làm mới. Vui lòng kiểm tra lại.',
        dailyQuests: daily.dailyQuests,
      });
    }

    const targetQuest = daily.dailyQuests.find((q) => q.id === questId);
    if (!targetQuest) {
      return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ này.' });
    }
    if (targetQuest.claimed) {
      return res.status(400).json({ error: 'Nhiệm vụ này đã được nhận thưởng.' });
    }
    if (targetQuest.progress < targetQuest.target) {
      return res.status(400).json({ error: 'Bạn chưa hoàn thành mục tiêu nhiệm vụ này.' });
    }

    const updatedUser = await UserScore.findOneAndUpdate(
      {
        _id: req.user._id,
        dailyDateKey: todayKey,
        dailyQuests: {
          $elemMatch: {
            id: questId,
            claimed: false,
            progress: { $gte: targetQuest.target },
          },
        },
      },
      {
        $set: { 'dailyQuests.$.claimed': true },
        $inc: { coins: targetQuest.reward },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(409).json({
        error: 'Nhiệm vụ đã được nhận trước đó hoặc chưa đủ điều kiện.',
      });
    }

    return res.json({
      claimedQuestId: questId,
      coinsAwarded: targetQuest.reward,
      dailyCoinsEarned: updatedUser.dailyCoinsEarned ?? 0,
      dailyCoinCap: DAILY_COIN_CAP,
      dailyQuests: updatedUser.dailyQuests || [],
      user: updatedUser.toPublicProfile(),
    });
  } catch (err) {
    return next(err);
  }
});

export default router;

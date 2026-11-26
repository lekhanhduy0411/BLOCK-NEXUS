import express from 'express';
import UserScore from '../models/UserScore.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import {
  checkObjectivesCompleted,
  getAllChallengeStages,
  getChallengeStage,
  normalizeChallengeMode,
} from '../utils/challengeStages.js';

const router = express.Router();

function extractPlainScores(rawMap) {
  const out = {};
  if (!rawMap) return out;
  if (rawMap instanceof Map) {
    rawMap.forEach((v, k) => {
      out[String(k)] = Math.max(0, Math.floor(Number(v) || 0));
    });
  } else if (typeof rawMap === 'object') {
    Object.entries(rawMap).forEach(([k, v]) => {
      out[String(k)] = Math.max(0, Math.floor(Number(v) || 0));
    });
  }
  return out;
}

function buildPublicChallenge(userDoc) {
  const ch = userDoc?.challenge || {};
  const strategistHighest = Math.max(0, Math.min(50, Number(ch.strategistHighest) || 0));
  const velocityHighest = Math.max(0, Math.min(50, Number(ch.velocityHighest) || 0));
  const strategistBestScores = extractPlainScores(ch.strategistBestScores);
  const velocityBestScores = extractPlainScores(ch.velocityBestScores);
  const strategistTotalScore = Math.max(0, Number(ch.strategistTotalScore) || 0);
  const velocityTotalScore = Math.max(0, Number(ch.velocityTotalScore) || 0);

  return {
    strategistHighest,
    velocityHighest,
    totalCleared: strategistHighest + velocityHighest,
    strategistBestScores,
    velocityBestScores,
    strategistTotalScore,
    velocityTotalScore,
    totalChallengeScore: strategistTotalScore + velocityTotalScore,
    lastProgressAt: ch.lastProgressAt || null,
  };
}

function sumScoreMap(scoreMap) {
  return Object.values(scoreMap).reduce(
    (acc, val) => acc + Math.max(0, Math.floor(Number(val) || 0)),
    0
  );
}

// GET /api/challenges/stages (optionalAuth)
router.get('/stages', optionalAuth, async (req, res, next) => {
  try {
    let progress = buildPublicChallenge(null);
    if (req.userId) {
      const user = await UserScore.findById(req.userId, { challenge: 1 }).lean();
      if (user) {
        progress = buildPublicChallenge(user);
      }
    }

    return res.json({
      stages: getAllChallengeStages(),
      progress,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/challenges/complete (requireAuth)
router.post('/complete', requireAuth, async (req, res, next) => {
  try {
    const mode = normalizeChallengeMode(req.body?.mode);
    if (!mode) {
      return res.status(400).json({ error: 'Chế độ thử thách không hợp lệ.' });
    }

    const stageNumber = Math.floor(Number(req.body?.stageNumber));
    const stage = getChallengeStage(mode, stageNumber);
    if (!stage) {
      return res.status(400).json({ error: 'Số màn thử thách phải từ 1 đến 50.' });
    }

    const rawStats = req.body?.stats || {};
    const stats = {
      score: Math.floor(Number(rawStats.score ?? 0)),
      linesCleared: Math.floor(Number(rawStats.linesCleared ?? 0)),
      maxCombo: Math.floor(Number(rawStats.maxCombo ?? 0)),
      tetrises: Math.floor(Number(rawStats.tetrises ?? 0)),
    };

    // Sanity bounds (prevent impossible/fabricated payloads while remaining fair for skilled players)
    if (
      !Number.isInteger(stats.score) ||
      stats.score < 0 ||
      stats.score > 500_000 ||
      !Number.isInteger(stats.linesCleared) ||
      stats.linesCleared < 0 ||
      stats.linesCleared > 500 ||
      !Number.isInteger(stats.maxCombo) ||
      stats.maxCombo < 0 ||
      stats.maxCombo > 120 ||
      !Number.isInteger(stats.tetrises) ||
      stats.tetrises < 0 ||
      stats.tetrises > 60
    ) {
      return res.status(400).json({ error: 'Chỉ số hoàn thành màn không hợp lệ.' });
    }

    if (stats.tetrises * 4 > stats.linesCleared + 4) {
      return res.status(400).json({ error: 'Dữ liệu số cú Tứ Quý không khớp với số hàng đã xóa.' });
    }

    if (!checkObjectivesCompleted(stage, stats)) {
      return res.status(400).json({ error: 'Chưa hoàn thành đủ mục tiêu của màn thử thách.' });
    }

    const currentChallenge = buildPublicChallenge(req.user);
    const is8x8 = mode === '8x8';
    const currentHighest = is8x8
      ? currentChallenge.strategistHighest
      : currentChallenge.velocityHighest;
    const otherHighest = is8x8
      ? currentChallenge.velocityHighest
      : currentChallenge.strategistHighest;
    const otherTotalScore = is8x8
      ? currentChallenge.velocityTotalScore
      : currentChallenge.strategistTotalScore;

    if (stageNumber > currentHighest + 1) {
      return res.status(403).json({
        error: `Bạn cần vượt qua Màn ${currentHighest + 1} trước khi mở khóa Màn ${stageNumber}.`,
      });
    }

    const highestField = is8x8 ? 'challenge.strategistHighest' : 'challenge.velocityHighest';
    const bestScoresField = is8x8
      ? 'challenge.strategistBestScores'
      : 'challenge.velocityBestScores';
    const totalScoreField = is8x8
      ? 'challenge.strategistTotalScore'
      : 'challenge.velocityTotalScore';

    const stageKey = String(stageNumber);
    const currentScores = is8x8
      ? { ...currentChallenge.strategistBestScores }
      : { ...currentChallenge.velocityBestScores };

    const newlyCleared = stageNumber === currentHighest + 1;

    if (newlyCleared) {
      currentScores[stageKey] = Math.max(currentScores[stageKey] || 0, stats.score);
      const nextBranchTotal = sumScoreMap(currentScores);
      const nextTotalCleared = stageNumber + otherHighest;
      const nextGrandTotal = nextBranchTotal + otherTotalScore;

      // Atomic guard: prevents double coin payouts on concurrent requests (safe for legacy docs without challenge)
      const atomicFilter =
        stageNumber === 1
          ? {
              _id: req.user._id,
              $or: [{ [highestField]: 0 }, { [highestField]: { $exists: false } }],
            }
          : {
              _id: req.user._id,
              [highestField]: stageNumber - 1,
            };

      const updatedUser = await UserScore.findOneAndUpdate(
        atomicFilter,
        {
          $set: {
            [highestField]: stageNumber,
            [`${bestScoresField}.${stageKey}`]: currentScores[stageKey],
            [totalScoreField]: nextBranchTotal,
            'challenge.totalCleared': nextTotalCleared,
            'challenge.totalChallengeScore': nextGrandTotal,
            'challenge.lastProgressAt': new Date(),
          },
          $inc: { coins: stage.reward },
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(409).json({
          error: 'Màn thử thách này đã được ghi nhận hoàn thành trước đó.',
        });
      }

      return res.json({
        newlyCleared: true,
        coinsAwarded: stage.reward,
        totalCoins: updatedUser.coins,
        improvedStageScore: false,
        challenge: buildPublicChallenge(updatedUser),
        user: updatedUser.toPublicProfile(),
      });
    }

    // Replaying an already-cleared stage: ZERO extra coins, update stage high score if beaten
    const prevBest = currentScores[stageKey] || 0;
    const improvedStageScore = stats.score > prevBest;

    if (!improvedStageScore) {
      return res.json({
        newlyCleared: false,
        coinsAwarded: 0,
        totalCoins: req.user.coins,
        improvedStageScore: false,
        challenge: currentChallenge,
        user: req.user.toPublicProfile(),
      });
    }

    currentScores[stageKey] = stats.score;
    const nextBranchTotal = sumScoreMap(currentScores);
    const nextGrandTotal = nextBranchTotal + otherTotalScore;

    const updatedUser = await UserScore.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          [`${bestScoresField}.${stageKey}`]: stats.score,
          [totalScoreField]: nextBranchTotal,
          'challenge.totalCleared': currentHighest + otherHighest,
          'challenge.totalChallengeScore': nextGrandTotal,
          'challenge.lastProgressAt': new Date(),
        },
      },
      { new: true }
    );

    return res.json({
      newlyCleared: false,
      coinsAwarded: 0,
      totalCoins: updatedUser.coins,
      improvedStageScore: true,
      challenge: buildPublicChallenge(updatedUser),
      user: updatedUser.toPublicProfile(),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/challenges/leaderboard?filter=all|8x8|10x20 (public + optionalAuth)
router.get('/leaderboard', optionalAuth, async (req, res, next) => {
  try {
    const rawFilter = String(req.query?.filter || 'all').toLowerCase();
    const filter =
      rawFilter === '8x8' || rawFilter === '10x20' ? rawFilter : 'all';

    let clearedField = 'challenge.totalCleared';
    let scoreField = 'challenge.totalChallengeScore';
    let maxStages = 100;

    if (filter === '8x8') {
      clearedField = 'challenge.strategistHighest';
      scoreField = 'challenge.strategistTotalScore';
      maxStages = 50;
    } else if (filter === '10x20') {
      clearedField = 'challenge.velocityHighest';
      scoreField = 'challenge.velocityTotalScore';
      maxStages = 50;
    }

    const topUsers = await UserScore.find(
      { [clearedField]: { $gt: 0 } },
      {
        username: 1,
        challenge: 1,
        createdAt: 1,
      }
    )
      .sort({
        [clearedField]: -1,
        [scoreField]: -1,
        'challenge.lastProgressAt': 1,
        createdAt: 1,
      })
      .limit(50)
      .lean();

    const getVal = (doc, path) => {
      const ch = doc?.challenge || {};
      if (path === 'challenge.strategistHighest') return ch.strategistHighest ?? 0;
      if (path === 'challenge.velocityHighest') return ch.velocityHighest ?? 0;
      if (path === 'challenge.totalCleared') return ch.totalCleared ?? 0;
      if (path === 'challenge.strategistTotalScore') return ch.strategistTotalScore ?? 0;
      if (path === 'challenge.velocityTotalScore') return ch.velocityTotalScore ?? 0;
      return ch.totalChallengeScore ?? 0;
    };

    const entries = topUsers.map((u, idx) => ({
      rank: idx + 1,
      userId: u._id.toString(),
      username: u.username,
      clearedCount: getVal(u, clearedField),
      maxStages,
      totalChallengeScore: getVal(u, scoreField),
    }));

    let myEntry = req.userId
      ? entries.find((e) => e.userId === req.userId) || null
      : null;

    // If logged-in user has cleared >= 1 stage but is outside Top 50, compute exact rank
    if (req.userId && !myEntry) {
      const me = await UserScore.findById(req.userId, {
        username: 1,
        challenge: 1,
      }).lean();
      if (me) {
        const myCleared = getVal(me, clearedField);
        const myScore = getVal(me, scoreField);
        if (myCleared > 0) {
          const myLastAt = me.challenge?.lastProgressAt || new Date();
          const higherCount = await UserScore.countDocuments({
            $or: [
              { [clearedField]: { $gt: myCleared } },
              { [clearedField]: myCleared, [scoreField]: { $gt: myScore } },
              {
                [clearedField]: myCleared,
                [scoreField]: myScore,
                'challenge.lastProgressAt': { $lt: myLastAt },
              },
            ],
          });
          myEntry = {
            rank: higherCount + 1,
            userId: me._id.toString(),
            username: me.username,
            clearedCount: myCleared,
            maxStages,
            totalChallengeScore: myScore,
          };
        }
      }
    }

    return res.json({
      filter,
      maxStages,
      entries,
      myEntry,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;

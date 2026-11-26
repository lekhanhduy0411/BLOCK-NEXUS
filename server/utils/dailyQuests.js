import UserScore from '../models/UserScore.js';
import { TIMEZONE } from '../config/constants.js';

export const DAILY_COIN_CAP = 200;

export function toSessionMode(recordMode) {
  return recordMode === 'dragMode' || recordMode === '8x8' ? '8x8' : '10x20';
}

export function getTodayVNDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function hashDateKey(dateKey) {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const QUEST_POOL_8X8 = [
  {
    id: 'q_8x8_combo',
    title: 'Đạt chuỗi x4 trong Chiến Thuật 8×8',
    mode: '8x8',
    metric: 'maxCombo',
    target: 4,
    reward: 60,
  },
  {
    id: 'q_8x8_score',
    title: 'Đạt 2.000 điểm trong Chiến Thuật 8×8',
    mode: '8x8',
    metric: 'score',
    target: 2000,
    reward: 65,
  },
  {
    id: 'q_8x8_lines',
    title: 'Xóa 15 hàng/cột trong Chiến Thuật 8×8',
    mode: '8x8',
    metric: 'lines',
    target: 15,
    reward: 55,
  },
];

const QUEST_POOL_10X20 = [
  {
    id: 'q_10x20_lines',
    title: 'Xóa 20 hàng trong Tốc Độ 10×20',
    mode: '10x20',
    metric: 'lines',
    target: 20,
    reward: 65,
  },
  {
    id: 'q_10x20_score',
    title: 'Đạt 3.000 điểm trong Tốc Độ 10×20',
    mode: '10x20',
    metric: 'score',
    target: 3000,
    reward: 70,
  },
  {
    id: 'q_10x20_level',
    title: 'Đạt cấp độ 4 trong Tốc Độ 10×20',
    mode: '10x20',
    metric: 'level',
    target: 4,
    reward: 60,
  },
];

const QUEST_POOL_ANY = [
  {
    id: 'q_any_both',
    title: 'Chơi cả 2 chế độ 8×8 và 10×20 hôm nay',
    mode: 'any',
    metric: 'bothModes',
    target: 2,
    reward: 80,
  },
  {
    id: 'q_any_matches',
    title: 'Hoàn thành 3 ván đấu bất kỳ hôm nay',
    mode: 'any',
    metric: 'matches',
    target: 3,
    reward: 50,
  },
  {
    id: 'q_any_lines',
    title: 'Xóa tổng cộng 25 hàng/cột hôm nay',
    mode: 'any',
    metric: 'lines',
    target: 25,
    reward: 75,
  },
];

export function generateDailyQuests(dateKey = getTodayVNDateKey()) {
  const seed = hashDateKey(dateKey);
  const q1 = QUEST_POOL_8X8[seed % QUEST_POOL_8X8.length];
  const q2 = QUEST_POOL_10X20[Math.floor(seed / 3) % QUEST_POOL_10X20.length];
  const q3 = QUEST_POOL_ANY[Math.floor(seed / 9) % QUEST_POOL_ANY.length];

  return [q1, q2, q3].map((q) => ({
    ...q,
    progress: 0,
    claimed: false,
  }));
}

export function normalizeUserDailyState(user, todayKey = getTodayVNDateKey()) {
  const hasTodayState =
    user?.dailyDateKey === todayKey &&
    Array.isArray(user?.dailyQuests) &&
    user.dailyQuests.length > 0;

  if (!hasTodayState) {
    return {
      needsReset: true,
      dailyDateKey: todayKey,
      dailyCoinsEarned: 0,
      dailyModesPlayed: [],
      dailyQuests: generateDailyQuests(todayKey),
    };
  }

  return {
    needsReset: false,
    dailyDateKey: todayKey,
    dailyCoinsEarned: Math.max(0, Number(user.dailyCoinsEarned) || 0),
    dailyModesPlayed: Array.isArray(user.dailyModesPlayed) ? [...user.dailyModesPlayed] : [],
    dailyQuests: user.dailyQuests.map((q) => ({
      id: q.id,
      title: q.title,
      mode: q.mode,
      metric: q.metric,
      target: Number(q.target) || 1,
      progress: Math.max(0, Number(q.progress) || 0),
      reward: Math.max(0, Number(q.reward) || 0),
      claimed: Boolean(q.claimed),
    })),
  };
}

export function calculateMatchCoins({ mode, score, currentDailyCoinsEarned = 0 }) {
  const safeScore = Math.max(0, Math.floor(Number(score) || 0));
  const sessionMode = toSessionMode(mode);
  let rawCoins =
    sessionMode === '8x8' ? Math.floor(safeScore / 250) : Math.floor(safeScore / 200);
  if (safeScore >= 300) {
    rawCoins = Math.max(5, rawCoins);
  }
  const alreadyEarned = Math.max(0, Math.floor(Number(currentDailyCoinsEarned) || 0));
  const remainingCap = Math.max(0, DAILY_COIN_CAP - alreadyEarned);
  const matchCoinsAwarded = Math.max(0, Math.min(rawCoins, remainingCap));

  return {
    rawCoins,
    matchCoinsAwarded,
    nextDailyCoinsEarned: alreadyEarned + matchCoinsAwarded,
  };
}

export function validateScoreSanity({
  mode,
  score,
  maxCombo = 0,
  linesCleared = 0,
  durationSec = 0,
}) {
  if (!Number.isInteger(score) || score < 0 || score > 100_000_000) {
    return { valid: false, reason: 'Giá trị điểm không hợp lệ.' };
  }
  if (!Number.isInteger(maxCombo) || maxCombo < 0 || maxCombo > 100_000) {
    return { valid: false, reason: 'Giá trị chuỗi combo không hợp lệ.' };
  }
  if (!Number.isInteger(linesCleared) || linesCleared < 0 || linesCleared > 100_000) {
    return { valid: false, reason: 'Số hàng đã xóa không hợp lệ.' };
  }

  const dur = Math.max(0, Number(durationSec) || 0);
  const sessionMode = toSessionMode(mode);

  if (sessionMode === '10x20') {
    const maxLinesAllowed = dur * 3.0 + 8;
    const maxScoreAllowed = linesCleared * 1200 + dur * 120 + 2000;
    if (linesCleared > maxLinesAllowed || score > maxScoreAllowed) {
      return {
        valid: false,
        reason: 'Kết quả ván 10×20 vượt quá ngưỡng hợp lệ theo thời gian thi đấu.',
      };
    }
  } else {
    const maxScoreAllowed = dur * 800 + 3500;
    const maxComboAllowed = dur * 1.5 + 5;
    if (score > maxScoreAllowed || maxCombo > maxComboAllowed) {
      return {
        valid: false,
        reason: 'Kết quả ván 8×8 vượt quá ngưỡng hợp lệ theo thời gian thi đấu.',
      };
    }
  }

  return { valid: true };
}

export function applyMatchToDailyQuests({
  dailyQuests,
  dailyModesPlayed = [],
  sessionMode,
  score = 0,
  maxCombo = 0,
  linesCleared = 0,
  level = 1,
}) {
  const nextModes = dailyModesPlayed.includes(sessionMode)
    ? [...dailyModesPlayed]
    : [...dailyModesPlayed, sessionMode];

  const updatedQuests = (dailyQuests || []).map((q) => {
    if (q.mode !== 'any' && q.mode !== sessionMode) {
      return q;
    }

    let nextProgress = q.progress;
    if (q.metric === 'maxCombo') {
      nextProgress = Math.max(q.progress, maxCombo);
    } else if (q.metric === 'score') {
      nextProgress = Math.max(q.progress, score);
    } else if (q.metric === 'level') {
      nextProgress = Math.max(q.progress, level);
    } else if (q.metric === 'lines') {
      nextProgress = q.progress + linesCleared;
    } else if (q.metric === 'matches') {
      nextProgress = q.progress + 1;
    } else if (q.metric === 'bothModes') {
      nextProgress = nextModes.length;
    }

    return {
      ...q,
      progress: Math.min(q.target, Math.max(0, Math.floor(nextProgress))),
    };
  });

  return {
    dailyQuests: updatedQuests,
    dailyModesPlayed: nextModes,
  };
}

export async function findNextRival(userId, recordMode, currentWeeklyScore = 0) {
  const scoreField = `records.${recordMode}.weeklyScore`;
  const updatedField = `records.${recordMode}.updatedAt`;

  const rivalDoc = await UserScore.findOne(
    {
      _id: { $ne: userId },
      [scoreField]: { $gt: currentWeeklyScore },
    },
    {
      username: 1,
      [`records.${recordMode}.weeklyScore`]: 1,
      [`records.${recordMode}.updatedAt`]: 1,
    }
  )
    .sort({ [scoreField]: 1, [updatedField]: -1 })
    .lean();

  if (!rivalDoc) {
    return null;
  }

  const rivalScore = rivalDoc.records?.[recordMode]?.weeklyScore ?? 0;
  const rivalUpdatedAt = rivalDoc.records?.[recordMode]?.updatedAt || new Date();

  const higherCount = await UserScore.countDocuments({
    $or: [
      { [scoreField]: { $gt: rivalScore } },
      {
        [scoreField]: rivalScore,
        [updatedField]: { $lt: rivalUpdatedAt },
      },
    ],
  });

  return {
    username: rivalDoc.username,
    weeklyScore: rivalScore,
    rank: higherCount + 1,
  };
}

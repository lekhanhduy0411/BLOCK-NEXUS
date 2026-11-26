import { DEFAULT_SETTINGS } from '../constants/themes';

const KEYS = {
  AUTH_TOKEN: 'auth_token',
  GUEST_SESSION: 'guest_session',
  GUEST_RECORDS: 'block_nexus_guest_records',
  SETTINGS: 'block_nexus_settings',
  CACHED_USER: 'block_nexus_cached_user',
  DRAG_SNAPSHOT: 'block_nexus_drag_snapshot',
  CHALLENGE_PROGRESS: 'block_nexus_challenge_progress',
};

const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getAuthToken() {
  try {
    return localStorage.getItem(KEYS.AUTH_TOKEN) || null;
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(KEYS.AUTH_TOKEN);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getCachedUser() {
  try {
    const raw = localStorage.getItem(KEYS.CACHED_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user) {
  try {
    if (user) {
      localStorage.setItem(KEYS.CACHED_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CACHED_USER);
    }
  } catch {
    // Ignore
  }
}

export function getGuestSession() {
  try {
    const raw = localStorage.getItem(KEYS.GUEST_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function createGuestSession() {
  const randomDigits = String(Math.floor(1000 + Math.random() * 9000));
  const session = {
    username: `Khách_${randomDigits}`,
    isGuest: true,
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEYS.GUEST_SESSION, JSON.stringify(session));
  } catch {
    // Ignore
  }
  return session;
}

export function clearGuestSession() {
  try {
    localStorage.removeItem(KEYS.GUEST_SESSION);
  } catch {
    // Ignore
  }
}

export function getGuestRecords() {
  const fallback = {
    dragMode: { allTimeHigh: 0, weeklyScore: 0, maxCombo: 0 },
    dropMode: { allTimeHigh: 0, weeklyScore: 0, maxLines: 0 },
  };
  try {
    const raw = localStorage.getItem(KEYS.GUEST_RECORDS);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      dragMode: { ...fallback.dragMode, ...(parsed.dragMode || {}) },
      dropMode: { ...fallback.dropMode, ...(parsed.dropMode || {}) },
    };
  } catch {
    return fallback;
  }
}

export function saveGuestScore(mode, { score, maxCombo = 0, linesCleared = 0 }) {
  const current = getGuestRecords();
  const prev = current[mode] || { allTimeHigh: 0, weeklyScore: 0, maxCombo: 0, maxLines: 0 };
  const isNewRecord = score > (prev.allTimeHigh || 0);

  if (mode === 'dragMode') {
    current.dragMode = {
      allTimeHigh: Math.max(prev.allTimeHigh || 0, score),
      weeklyScore: 0, // Guests do not participate in weekly leaderboard
      maxCombo: Math.max(prev.maxCombo || 0, maxCombo),
    };
  } else {
    current.dropMode = {
      allTimeHigh: Math.max(prev.allTimeHigh || 0, score),
      weeklyScore: 0,
      maxLines: Math.max(prev.maxLines || 0, linesCleared),
    };
  }

  try {
    localStorage.setItem(KEYS.GUEST_RECORDS, JSON.stringify(current));
  } catch {
    // Ignore
  }

  return { records: current, isNewRecord };
}

export function clearGuestRecords() {
  try {
    localStorage.removeItem(KEYS.GUEST_RECORDS);
  } catch {
    // Ignore
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const merged = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    const rawDim = Number(merged.backdropDim);
    merged.backdropDim = Number.isFinite(rawDim)
      ? Math.max(0, Math.min(0.75, rawDim))
      : DEFAULT_SETTINGS.backdropDim;
    merged.backdropBlur = Boolean(merged.backdropBlur);
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

// ========================================================
// 8×8 Endless Saved Match Snapshot (24h expiry)
// ========================================================
export function saveStrategistSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.board) || snapshot.board.length !== 8) return;
  try {
    localStorage.setItem(
      KEYS.DRAG_SNAPSHOT,
      JSON.stringify({
        board: snapshot.board,
        tray: snapshot.tray,
        score: Math.max(0, Math.floor(Number(snapshot.score) || 0)),
        comboStreak: Math.max(0, Math.floor(Number(snapshot.comboStreak) || 0)),
        movesSinceLastClear: Math.max(0, Math.floor(Number(snapshot.movesSinceLastClear) || 0)),
        linesCleared: Math.max(0, Math.floor(Number(snapshot.linesCleared) || 0)),
        maxCombo: Math.max(0, Math.floor(Number(snapshot.maxCombo) || 0)),
        sessionId: snapshot.sessionId || null,
        savedAt: snapshot.savedAt || Date.now(),
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadStrategistSnapshot() {
  try {
    const raw = localStorage.getItem(KEYS.DRAG_SNAPSHOT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);
    if (!savedAt || Date.now() - savedAt > SNAPSHOT_TTL_MS) {
      localStorage.removeItem(KEYS.DRAG_SNAPSHOT);
      return null;
    }
    if (!Array.isArray(parsed.board) || parsed.board.length !== 8) return null;
    if (!Array.isArray(parsed.tray) || parsed.tray.length !== 3) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStrategistSnapshot() {
  try {
    localStorage.removeItem(KEYS.DRAG_SNAPSHOT);
  } catch {
    // Ignore
  }
}

// ========================================================
// 50-Stage Campaign Local Progress (Guest + Offline Cache)
// ========================================================
export function createEmptyChallengeProgress() {
  return {
    strategistHighest: 0,
    velocityHighest: 0,
    totalCleared: 0,
    strategistBestScores: {},
    velocityBestScores: {},
    strategistTotalScore: 0,
    velocityTotalScore: 0,
    totalChallengeScore: 0,
    lastProgressAt: null,
  };
}

export function normalizeChallengeProgress(raw) {
  const base = createEmptyChallengeProgress();
  if (!raw || typeof raw !== 'object') return base;

  const strategistBestScores =
    raw.strategistBestScores && typeof raw.strategistBestScores === 'object'
      ? { ...raw.strategistBestScores }
      : {};
  const velocityBestScores =
    raw.velocityBestScores && typeof raw.velocityBestScores === 'object'
      ? { ...raw.velocityBestScores }
      : {};

  const strategistHighest = Math.max(0, Math.min(50, Math.floor(Number(raw.strategistHighest) || 0)));
  const velocityHighest = Math.max(0, Math.min(50, Math.floor(Number(raw.velocityHighest) || 0)));

  const sumScores = (map) =>
    Object.values(map).reduce((acc, v) => acc + Math.max(0, Math.floor(Number(v) || 0)), 0);

  const strategistTotalScore =
    Number.isFinite(Number(raw.strategistTotalScore))
      ? Math.max(0, Math.floor(Number(raw.strategistTotalScore)))
      : sumScores(strategistBestScores);
  const velocityTotalScore =
    Number.isFinite(Number(raw.velocityTotalScore))
      ? Math.max(0, Math.floor(Number(raw.velocityTotalScore)))
      : sumScores(velocityBestScores);

  return {
    strategistHighest,
    velocityHighest,
    totalCleared: strategistHighest + velocityHighest,
    strategistBestScores,
    velocityBestScores,
    strategistTotalScore,
    velocityTotalScore,
    totalChallengeScore: strategistTotalScore + velocityTotalScore,
    lastProgressAt: raw.lastProgressAt || null,
  };
}

export function loadLocalChallengeProgress() {
  try {
    const raw = localStorage.getItem(KEYS.CHALLENGE_PROGRESS);
    if (!raw) return createEmptyChallengeProgress();
    return normalizeChallengeProgress(JSON.parse(raw));
  } catch {
    return createEmptyChallengeProgress();
  }
}

export function saveLocalChallengeProgress(progress) {
  try {
    const normalized = normalizeChallengeProgress(progress);
    localStorage.setItem(KEYS.CHALLENGE_PROGRESS, JSON.stringify(normalized));
    return normalized;
  } catch {
    return normalizeChallengeProgress(progress);
  }
}

export function recordLocalChallengeCompletion({ mode, stageNumber, score }) {
  const current = loadLocalChallengeProgress();
  const is8x8 = mode === '8x8' || mode === 'dragMode';
  const safeScore = Math.max(0, Math.floor(Number(score) || 0));
  const stageKey = String(stageNumber);

  const highestKey = is8x8 ? 'strategistHighest' : 'velocityHighest';
  const scoresKey = is8x8 ? 'strategistBestScores' : 'velocityBestScores';
  const totalKey = is8x8 ? 'strategistTotalScore' : 'velocityTotalScore';

  const prevHighest = current[highestKey] || 0;
  const newlyCleared = stageNumber === prevHighest + 1;
  const nextHighest = newlyCleared ? stageNumber : Math.max(prevHighest, stageNumber);

  const nextScores = { ...(current[scoresKey] || {}) };
  const prevStageBest = Number(nextScores[stageKey] || 0);
  const improvedStageScore = safeScore > prevStageBest;
  if (improvedStageScore || newlyCleared) {
    nextScores[stageKey] = Math.max(prevStageBest, safeScore);
  }

  const nextBranchTotal = Object.values(nextScores).reduce(
    (acc, v) => acc + Math.max(0, Math.floor(Number(v) || 0)),
    0
  );

  const next = {
    ...current,
    [highestKey]: Math.min(50, nextHighest),
    [scoresKey]: nextScores,
    [totalKey]: nextBranchTotal,
    lastProgressAt: new Date().toISOString(),
  };
  next.totalCleared = next.strategistHighest + next.velocityHighest;
  next.totalChallengeScore = next.strategistTotalScore + next.velocityTotalScore;

  const saved = saveLocalChallengeProgress(next);
  return {
    newlyCleared,
    improvedStageScore: !newlyCleared && improvedStageScore,
    challenge: saved,
  };
}

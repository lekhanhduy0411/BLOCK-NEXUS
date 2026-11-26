import { getAuthToken } from './storage';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, { method = 'GET', body, token, timeoutMs = 45000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const authToken = token !== undefined ? token : getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || `Yêu cầu thất bại (${response.status})`);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Máy chủ phản hồi chậm. Vui lòng thử lại sau giây lát.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  healthCheck: () => request('/api/health', { timeoutMs: 8000 }),

  wakeUpServer: () => {
    fetch(`${API_BASE}/api/health`, { method: 'GET', cache: 'no-store' }).catch(() => {});
  },

  register: ({ username, password, guestStats }) =>
    request('/api/auth/register', {
      method: 'POST',
      body: { username, password, guestStats },
      token: null,
    }),

  login: ({ username, password }) =>
    request('/api/auth/login', {
      method: 'POST',
      body: { username, password },
      token: null,
    }),

  getMe: () => request('/api/auth/me'),

  startGame: (mode) =>
    request('/api/game/start', {
      method: 'POST',
      body: { mode },
      timeoutMs: 25000,
    }),

  getDailyQuests: () => request('/api/quests/daily'),

  claimDailyQuest: (questId) =>
    request('/api/quests/claim', {
      method: 'POST',
      body: { questId },
    }),

  submitScore: ({ mode, score, maxCombo = 0, linesCleared = 0, level = 1, sessionId }) =>
    request('/api/scores/submit', {
      method: 'POST',
      body: { mode, score, maxCombo, linesCleared, level, sessionId },
    }),

  getLeaderboard: (mode) => request(`/api/scores/leaderboard/${mode}`),

  getChallengeStages: () => request('/api/challenges/stages'),

  completeChallengeStage: ({ mode, stageNumber, stats }) =>
    request('/api/challenges/complete', {
      method: 'POST',
      body: { mode, stageNumber, stats },
    }),

  getChallengeLeaderboard: (filter = 'all') =>
    request(`/api/challenges/leaderboard?filter=${encodeURIComponent(filter)}`),

  getShopCatalog: () => request('/api/shop/catalog'),

  buyBackground: (backgroundId) =>
    request('/api/shop/buy', {
      method: 'POST',
      body: { backgroundId },
    }),

  equipBackground: (backgroundId) =>
    request('/api/shop/equip', {
      method: 'POST',
      body: { backgroundId },
    }),

  claimRewards: (rewardId = null) =>
    request('/api/rewards/claim', {
      method: 'POST',
      body: rewardId ? { rewardId } : {},
    }),

  // Founder Admin API
  getAdminUsers: (search = '') =>
    request(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  adminBuffCoins: ({ targetUserId, targetUsername, amount, reason }) =>
    request('/api/admin/buff-coins', {
      method: 'POST',
      body: { targetUserId, targetUsername, amount, reason },
    }),

  adminUnlockAllBackgrounds: (targetUserId) =>
    request('/api/admin/unlock-all-backgrounds', {
      method: 'POST',
      body: { targetUserId },
    }),

  adminSetRole: ({ targetUserId, role }) =>
    request('/api/admin/set-role', {
      method: 'POST',
      body: { targetUserId, role },
    }),
};

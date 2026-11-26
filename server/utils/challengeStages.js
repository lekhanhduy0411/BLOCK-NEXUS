/**
 * Shared 50-Stage Long-Term Campaign Generator (Server)
 * - 5 Chapters × 10 Stages = 50 Stages per mode (100 Stages total)
 * - Stages 10, 20, 30, 40, 50 are Boss Stages with dual objectives & major coin payouts
 * - Total coin reward = exactly 5,000 Coins per mode (10,000 Coins total)
 * - ZERO time limits / ZERO timer objectives
 */

export const CHAPTERS = [
  { number: 1, name: 'Khởi Nguồn', startStage: 1, endStage: 10 },
  { number: 2, name: 'Tăng Tốc', startStage: 11, endStage: 20 },
  { number: 3, name: 'Áp Lực', startStage: 21, endStage: 30 },
  { number: 4, name: 'Quá Tải', startStage: 31, endStage: 40 },
  { number: 5, name: 'Huyền Thoại', startStage: 41, endStage: 50 },
];

export const BOSS_STAGES = [10, 20, 30, 40, 50];

export function normalizeChallengeMode(rawMode) {
  if (rawMode === '8x8' || rawMode === 'dragMode' || rawMode === 'drag') return '8x8';
  if (rawMode === '10x20' || rawMode === 'dropMode' || rawMode === 'drop') return '10x20';
  return null;
}

export function getStageCoinReward(stageNumber) {
  const bossRewards = { 10: 100, 20: 200, 30: 320, 40: 450, 50: 600 };
  if (bossRewards[stageNumber]) return bossRewards[stageNumber];

  if (stageNumber <= 9) return 15 + (stageNumber - 1) * 2; // Chương 1: 15 -> 31 Xu
  if (stageNumber <= 19) return 35 + (stageNumber - 11) * 2; // Chương 2: 35 -> 51 Xu
  if (stageNumber <= 29) return 55 + (stageNumber - 21) * 3; // Chương 3: 55 -> 79 Xu
  if (stageNumber <= 39) return 85 + (stageNumber - 31) * 4; // Chương 4: 85 -> 117 Xu
  return 120 + (stageNumber - 41) * 4; // Chương 5: 120 -> 152 Xu
}

export function hashStageSeed(mode, stageNumber) {
  const input = `block-nexus-campaign-v1-${mode}-${stageNumber}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function build8x8Objectives(stageNumber, isBoss) {
  if (isBoss) {
    const bossSpecs = {
      10: [
        { metric: 'score', target: 1800, label: 'Đạt 1.800 điểm' },
        { metric: 'combo', target: 3, label: 'Đạt chuỗi x3' },
      ],
      20: [
        { metric: 'score', target: 2800, label: 'Đạt 2.800 điểm' },
        { metric: 'combo', target: 4, label: 'Đạt chuỗi x4' },
      ],
      30: [
        { metric: 'score', target: 3800, label: 'Đạt 3.800 điểm' },
        { metric: 'combo', target: 5, label: 'Đạt chuỗi x5' },
      ],
      40: [
        { metric: 'score', target: 4600, label: 'Đạt 4.600 điểm' },
        { metric: 'combo', target: 6, label: 'Đạt chuỗi x6' },
      ],
      50: [
        { metric: 'score', target: 5500, label: 'Đạt 5.500 điểm' },
        { metric: 'combo', target: 7, label: 'Đạt chuỗi x7' },
      ],
    };
    return bossSpecs[stageNumber];
  }

  const ratio = (stageNumber - 1) / 49;
  const pattern = (stageNumber - 1) % 3;

  if (pattern === 0) {
    const target = Math.round((1000 + ratio * 4500) / 50) * 50;
    return [
      { metric: 'score', target, label: `Đạt ${target.toLocaleString('vi-VN')} điểm` },
    ];
  }
  if (pattern === 1) {
    const target = Math.round(6 + ratio * 16);
    return [{ metric: 'lines', target, label: `Xóa ${target} hàng/cột` }];
  }
  const target = Math.min(7, 3 + Math.floor((stageNumber - 1) / 10));
  return [{ metric: 'combo', target, label: `Đạt chuỗi x${target}` }];
}

function build10x20Objectives(stageNumber, isBoss) {
  if (isBoss) {
    const bossSpecs = {
      10: [
        { metric: 'lines', target: 12, label: 'Xóa 12 hàng' },
        { metric: 'tetrises', target: 1, label: 'Thực hiện 1 cú Tứ Quý' },
      ],
      20: [
        { metric: 'lines', target: 16, label: 'Xóa 16 hàng' },
        { metric: 'tetrises', target: 1, label: 'Thực hiện 1 cú Tứ Quý' },
      ],
      30: [
        { metric: 'lines', target: 20, label: 'Xóa 20 hàng' },
        { metric: 'tetrises', target: 2, label: 'Thực hiện 2 cú Tứ Quý' },
      ],
      40: [
        { metric: 'lines', target: 25, label: 'Xóa 25 hàng' },
        { metric: 'tetrises', target: 2, label: 'Thực hiện 2 cú Tứ Quý' },
      ],
      50: [
        { metric: 'lines', target: 30, label: 'Xóa 30 hàng' },
        { metric: 'tetrises', target: 3, label: 'Thực hiện 3 cú Tứ Quý' },
      ],
    };
    return bossSpecs[stageNumber];
  }

  const ratio = (stageNumber - 1) / 49;
  const pattern = (stageNumber - 1) % 3;

  if (pattern === 0) {
    const target = Math.round(6 + ratio * 24);
    return [{ metric: 'lines', target, label: `Xóa ${target} hàng` }];
  }
  if (pattern === 1) {
    const target = Math.round((1000 + ratio * 7000) / 100) * 100;
    return [
      { metric: 'score', target, label: `Đạt ${target.toLocaleString('vi-VN')} điểm` },
    ];
  }
  const target = stageNumber <= 18 ? 1 : stageNumber <= 36 ? 2 : 3;
  return [{ metric: 'tetrises', target, label: `Thực hiện ${target} cú Tứ Quý` }];
}

export function generate50Stages(rawMode) {
  const mode = normalizeChallengeMode(rawMode);
  if (!mode) {
    throw new Error(`Unsupported challenge mode: ${rawMode}`);
  }

  const stages = [];
  for (let stageNumber = 1; stageNumber <= 50; stageNumber += 1) {
    const chapter = CHAPTERS[Math.floor((stageNumber - 1) / 10)];
    const isBoss = stageNumber % 10 === 0;
    const ratio = (stageNumber - 1) / 49;
    const seed = hashStageSeed(mode, stageNumber);
    const reward = getStageCoinReward(stageNumber);

    if (mode === '8x8') {
      const presetBlocks = Math.round(3 + ratio * 15); // 3 -> 18 ô khởi đầu
      stages.push({
        stageNumber,
        chapterNumber: chapter.number,
        chapterName: chapter.name,
        mode,
        isBoss,
        seed,
        reward,
        presetBlocks,
        objectives: build8x8Objectives(stageNumber, isBoss),
      });
    } else {
      const startLevel = stageNumber === 50 ? 11 : Math.min(11, 1 + Math.floor((stageNumber - 1) / 5));
      const garbageRows = stageNumber <= 4 ? 0 : Math.min(8, Math.floor((stageNumber - 2) / 6));
      stages.push({
        stageNumber,
        chapterNumber: chapter.number,
        chapterName: chapter.name,
        mode,
        isBoss,
        seed,
        reward,
        startLevel,
        garbageRows,
        objectives: build10x20Objectives(stageNumber, isBoss),
      });
    }
  }
  return stages;
}

const CACHED_STAGES = {
  '8x8': generate50Stages('8x8'),
  '10x20': generate50Stages('10x20'),
};

export function getChallengeStage(rawMode, stageNumber) {
  const mode = normalizeChallengeMode(rawMode);
  const num = Math.floor(Number(stageNumber));
  if (!mode || !Number.isInteger(num) || num < 1 || num > 50) return null;
  return CACHED_STAGES[mode][num - 1];
}

export function getAllChallengeStages() {
  return {
    '8x8': CACHED_STAGES['8x8'],
    '10x20': CACHED_STAGES['10x20'],
  };
}

export function getObjectiveProgress(objective, stats = {}) {
  if (!objective) return 0;
  if (objective.metric === 'score') return Math.max(0, Math.floor(Number(stats.score) || 0));
  if (objective.metric === 'lines') return Math.max(0, Math.floor(Number(stats.linesCleared) || 0));
  if (objective.metric === 'combo') return Math.max(0, Math.floor(Number(stats.maxCombo) || 0));
  if (objective.metric === 'tetrises') return Math.max(0, Math.floor(Number(stats.tetrises) || 0));
  return 0;
}

export function checkObjectivesCompleted(stage, stats = {}) {
  if (!stage || !Array.isArray(stage.objectives) || stage.objectives.length === 0) {
    return false;
  }
  return stage.objectives.every((obj) => getObjectiveProgress(obj, stats) >= obj.target);
}

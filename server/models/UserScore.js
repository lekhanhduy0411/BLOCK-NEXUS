import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema(
  {
    weekLabel: { type: String, required: true },
    mode: { type: String, enum: ['dragMode', 'dropMode'], required: true },
    rank: { type: Number, enum: [1, 2, 3], required: true },
    coinsAwarded: { type: Number, required: true },
    claimed: { type: Boolean, default: false },
    awardedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const dailyQuestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    mode: { type: String, enum: ['8x8', '10x20', 'any'], required: true },
    metric: { type: String, required: true },
    target: { type: Number, required: true, min: 1 },
    progress: { type: Number, default: 0, min: 0 },
    reward: { type: Number, required: true, min: 0 },
    claimed: { type: Boolean, default: false },
  },
  { _id: false }
);

const userScoreSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      index: true,
    },
    usernameLower: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
      index: true,
    },
    coins: {
      type: Number,
      default: 200,
      min: 0,
    },
    ownedBackgrounds: {
      type: [String],
      default: ['BG_DEFAULT'],
    },
    equippedBackground: {
      type: String,
      default: 'BG_DEFAULT',
    },
    records: {
      dragMode: {
        allTimeHigh: { type: Number, default: 0, min: 0 },
        weeklyScore: { type: Number, default: 0, min: 0 },
        maxCombo: { type: Number, default: 0, min: 0 },
        updatedAt: { type: Date, default: Date.now },
      },
      dropMode: {
        allTimeHigh: { type: Number, default: 0, min: 0 },
        weeklyScore: { type: Number, default: 0, min: 0 },
        maxLines: { type: Number, default: 0, min: 0 },
        updatedAt: { type: Date, default: Date.now },
      },
    },
    rewards: {
      type: [rewardSchema],
      default: [],
    },
    dailyDateKey: {
      type: String,
      default: '',
    },
    dailyCoinsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    dailyModesPlayed: {
      type: [String],
      default: [],
    },
    dailyQuests: {
      type: [dailyQuestSchema],
      default: [],
    },
    challenge: {
      strategistHighest: { type: Number, default: 0, min: 0, max: 50 },
      velocityHighest: { type: Number, default: 0, min: 0, max: 50 },
      totalCleared: { type: Number, default: 0, min: 0, max: 100 },
      strategistBestScores: { type: Map, of: Number, default: {} },
      velocityBestScores: { type: Map, of: Number, default: {} },
      strategistTotalScore: { type: Number, default: 0, min: 0 },
      velocityTotalScore: { type: Number, default: 0, min: 0 },
      totalChallengeScore: { type: Number, default: 0, min: 0 },
      lastProgressAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

userScoreSchema.index({
  'records.dragMode.weeklyScore': -1,
  'records.dragMode.updatedAt': 1,
});

userScoreSchema.index({
  'records.dropMode.weeklyScore': -1,
  'records.dropMode.updatedAt': 1,
});

// Campaign Challenge Leaderboard Compound Indexes (no time-based ranking)
userScoreSchema.index({
  'challenge.totalCleared': -1,
  'challenge.totalChallengeScore': -1,
  'challenge.lastProgressAt': 1,
});

userScoreSchema.index({
  'challenge.strategistHighest': -1,
  'challenge.strategistTotalScore': -1,
  'challenge.lastProgressAt': 1,
});

userScoreSchema.index({
  'challenge.velocityHighest': -1,
  'challenge.velocityTotalScore': -1,
  'challenge.lastProgressAt': 1,
});

function toPlainScoreMap(rawMap) {
  const out = {};
  if (!rawMap) return out;
  if (rawMap instanceof Map) {
    rawMap.forEach((v, k) => {
      out[String(k)] = Number(v) || 0;
    });
  } else if (typeof rawMap === 'object') {
    Object.entries(rawMap).forEach(([k, v]) => {
      out[String(k)] = Number(v) || 0;
    });
  }
  return out;
}

userScoreSchema.methods.toPublicProfile = function toPublicProfile() {
  return {
    id: this._id.toString(),
    username: this.username,
    role: this.role || 'USER',
    coins: this.coins,
    ownedBackgrounds: this.ownedBackgrounds,
    equippedBackground: this.equippedBackground,
    records: {
      dragMode: {
        allTimeHigh: this.records?.dragMode?.allTimeHigh ?? 0,
        weeklyScore: this.records?.dragMode?.weeklyScore ?? 0,
        maxCombo: this.records?.dragMode?.maxCombo ?? 0,
        updatedAt: this.records?.dragMode?.updatedAt ?? null,
      },
      dropMode: {
        allTimeHigh: this.records?.dropMode?.allTimeHigh ?? 0,
        weeklyScore: this.records?.dropMode?.weeklyScore ?? 0,
        maxLines: this.records?.dropMode?.maxLines ?? 0,
        updatedAt: this.records?.dropMode?.updatedAt ?? null,
      },
    },
    rewards: (this.rewards || []).map((r) => ({
      id: r._id.toString(),
      weekLabel: r.weekLabel,
      mode: r.mode,
      rank: r.rank,
      coinsAwarded: r.coinsAwarded,
      claimed: r.claimed,
      awardedAt: r.awardedAt,
    })),
    dailyDateKey: this.dailyDateKey || '',
    dailyCoinsEarned: this.dailyCoinsEarned ?? 0,
    dailyQuests: (this.dailyQuests || []).map((q) => ({
      id: q.id,
      title: q.title,
      mode: q.mode,
      metric: q.metric,
      target: q.target,
      progress: q.progress ?? 0,
      reward: q.reward ?? 0,
      claimed: Boolean(q.claimed),
    })),
    challenge: {
      strategistHighest: this.challenge?.strategistHighest ?? 0,
      velocityHighest: this.challenge?.velocityHighest ?? 0,
      totalCleared: this.challenge?.totalCleared ?? 0,
      strategistBestScores: toPlainScoreMap(this.challenge?.strategistBestScores),
      velocityBestScores: toPlainScoreMap(this.challenge?.velocityBestScores),
      strategistTotalScore: this.challenge?.strategistTotalScore ?? 0,
      velocityTotalScore: this.challenge?.velocityTotalScore ?? 0,
      totalChallengeScore: this.challenge?.totalChallengeScore ?? 0,
      lastProgressAt: this.challenge?.lastProgressAt ?? null,
    },
    createdAt: this.createdAt,
  };
};

const UserScore = mongoose.model('UserScore', userScoreSchema);
export default UserScore;

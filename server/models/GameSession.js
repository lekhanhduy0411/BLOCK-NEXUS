import mongoose from 'mongoose';

const gameSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserScore',
    required: true,
    index: true,
  },
  mode: {
    type: String,
    enum: ['8x8', '10x20'],
    required: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Auto-expire sessions after 24 hours (supports saved 8x8 resumes)
  },
  used: {
    type: Boolean,
    default: false,
  },
});

const GameSession = mongoose.model('GameSession', gameSessionSchema);
export default GameSession;

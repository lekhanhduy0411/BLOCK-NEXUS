import {
  ArrowRight,
  Check,
  Crown,
  Loader2,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { getObjectiveProgress } from '../utils/challengeStages';
import { soundEngine } from '../utils/sound';
import { NexusCoinIcon } from './icons/NexusIcons';

const BOSS_STAR_POSITIONS = [
  { left: '12%', top: '14%', delay: '0s', size: 'w-3 h-3' },
  { left: '84%', top: '16%', delay: '0.15s', size: 'w-3.5 h-3.5' },
  { left: '22%', top: '78%', delay: '0.25s', size: 'w-2.5 h-2.5' },
  { left: '88%', top: '72%', delay: '0.1s', size: 'w-3 h-3' },
  { left: '50%', top: '8%', delay: '0.2s', size: 'w-4 h-4' },
  { left: '72%', top: '26%', delay: '0.3s', size: 'w-2.5 h-2.5' },
  { left: '28%', top: '28%', delay: '0.05s', size: 'w-2.5 h-2.5' },
];

export default function ChallengeResultModal({
  stage,
  outcome, // { won: boolean, stats, newlyCleared, coinsAwarded, improvedStageScore, syncing, error }
  isGuest = true,
  onPlayNext,
  onRetry,
  onOpenMap,
}) {
  if (!stage || !outcome) return null;

  const { won, stats = {}, newlyCleared, coinsAwarded = 0, improvedStageScore, syncing, error } =
    outcome;
  const isFirstBossVictory = won && stage.isBoss && newlyCleared;
  const hasNextStage = stage.stageNumber < 50;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#050812]/84 backdrop-blur-md">
      <div className="hud-drop w-full max-w-md animate-modal-in relative">
        <div
          className={`hud-panel p-5 sm:p-6 text-center relative overflow-hidden ${
            isFirstBossVictory
              ? 'border-amber-400 shadow-[0_0_45px_rgba(245,158,11,0.45)]'
              : ''
          }`}
        >
          {/* Boss First-Clear Celebration Starbursts */}
          {isFirstBossVictory && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/18 via-transparent to-fuchsia-500/12" />
              {BOSS_STAR_POSITIONS.map((star, idx) => (
                <Sparkles
                  key={idx}
                  className={`absolute text-amber-300 animate-ping ${star.size}`}
                  style={{
                    left: star.left,
                    top: star.top,
                    animationDelay: star.delay,
                    animationDuration: '1.4s',
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xs font-bold px-2.5 py-0.5 bg-white/10 border border-white/15 text-slate-200">
                Chương {stage.chapterNumber} · {stage.chapterName}
              </span>
              {stage.isBoss && (
                <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 bg-amber-400 text-slate-950">
                  <Crown className="w-3.5 h-3.5" />
                  BOSS
                </span>
              )}
            </div>

            {won ? (
              <h2
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  stage.isBoss ? 'text-amber-300' : 'text-[#00f3ff]'
                }`}
              >
                {stage.isBoss ? `HẠ BOSS MÀN ${stage.stageNumber}!` : `VƯỢT MÀN ${stage.stageNumber}`}
              </h2>
            ) : (
              <h2 className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
                CHƯA ĐẠT MỤC TIÊU
              </h2>
            )}

            {/* Score Banner */}
            <div className="hud-panel-sm mt-3.5 py-3.5 px-4 border border-cyan-400/30">
              <div className="text-xs text-slate-400">Điểm màn này</div>
              <div className="font-mono font-black text-3xl sm:text-4xl text-white tabular-nums mt-0.5">
                {(stats.score || 0).toLocaleString()}
              </div>
            </div>

            {/* Objectives Checklist */}
            <div className="mt-3 space-y-1.5 text-left">
              {stage.objectives.map((obj, idx) => {
                const cur = getObjectiveProgress(obj, stats);
                const done = cur >= obj.target;
                return (
                  <div
                    key={idx}
                    className={`px-3 py-2 border flex items-center justify-between gap-2 text-xs font-bold ${
                      done
                        ? 'bg-emerald-500/12 border-emerald-400/45 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-400/35 text-rose-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 ${
                          done ? 'text-emerald-400' : 'text-rose-400 opacity-50'
                        }`}
                      />
                      <span className="truncate">{obj.label}</span>
                    </span>
                    <span className="font-mono tabular-nums shrink-0">
                      {cur.toLocaleString()}/{obj.target.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Reward / Replay Record Status */}
            {won && (
              <div className="mt-3.5">
                {syncing ? (
                  <div className="hud-panel-sm px-4 py-2.5 border border-cyan-400/35 flex items-center justify-center gap-2 text-xs text-cyan-200">
                    <Loader2 className="w-4 h-4 animate-spin text-[#00f3ff]" />
                    Đang ghi nhận chiến thắng & cộng Xu...
                  </div>
                ) : error ? (
                  <div className="hud-panel-sm px-4 py-2.5 border border-rose-400/45 text-xs text-rose-200">
                    {error}
                  </div>
                ) : newlyCleared && coinsAwarded > 0 ? (
                  <div
                    className={`hud-panel-sm px-4 py-3 border flex items-center justify-center gap-2 ${
                      stage.isBoss
                        ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_24px_rgba(245,158,11,0.35)]'
                        : 'border-amber-400/60 bg-amber-500/12'
                    }`}
                  >
                    <NexusCoinIcon className="w-5 h-5 shrink-0" />
                    <span className="font-mono font-black text-base sm:text-lg text-amber-300 tabular-nums">
                      +{coinsAwarded.toLocaleString()} Xu
                    </span>
                    <span className="text-xs font-bold text-amber-100">
                      {stage.isBoss ? 'Thưởng Hạ Boss!' : 'Thưởng vượt màn!'}
                    </span>
                  </div>
                ) : newlyCleared && isGuest ? (
                  <div className="hud-panel-sm px-4 py-2.5 border border-emerald-400/45 bg-emerald-500/12 text-xs font-bold text-emerald-200">
                    Đã mở khóa {hasNextStage ? `Màn ${stage.stageNumber + 1}` : 'toàn bộ 50 Màn'} trên thiết bị này!
                  </div>
                ) : improvedStageScore ? (
                  <div className="hud-panel-sm px-4 py-2.5 border border-cyan-400/55 bg-cyan-500/14 inline-flex items-center justify-center gap-2 w-full text-xs font-extrabold text-cyan-200">
                    <Trophy className="w-4 h-4 text-amber-300" />
                    Kỷ lục màn mới! (Đã cập nhật BXH Thử Thách)
                  </div>
                ) : (
                  <div className="hud-panel-sm px-4 py-2.5 border border-white/12 text-xs text-slate-300 font-medium">
                    Đã hoàn thành lại màn (thưởng Xu chỉ nhận 1 lần ở lần vượt đầu tiên).
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 space-y-2.5">
              {won && hasNextStage ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onPlayNext();
                  }}
                  className={`btn-arcade w-full py-3 font-black text-sm sm:text-base inline-flex items-center justify-center gap-2 cursor-pointer ${
                    stage.stageNumber + 1 === 10 ||
                    stage.stageNumber + 1 === 20 ||
                    stage.stageNumber + 1 === 30 ||
                    stage.stageNumber + 1 === 40 ||
                    stage.stageNumber + 1 === 50
                      ? 'btn-arcade-amber'
                      : 'btn-arcade-cyan'
                  }`}
                >
                  <span>Chơi Màn {stage.stageNumber + 1}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : !won ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onRetry();
                  }}
                  className="btn-arcade btn-arcade-cyan w-full py-3 font-black text-sm sm:text-base inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Thử lại ngay
                </button>
              ) : null}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onOpenMap();
                  }}
                  className="btn-arcade btn-arcade-slate py-2.5 font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MapIcon className="w-4 h-4" />
                  Bản đồ 50 màn
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onRetry();
                  }}
                  className="btn-arcade btn-arcade-slate py-2.5 font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  {won ? 'Chơi lại màn này' : 'Đặt lại'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

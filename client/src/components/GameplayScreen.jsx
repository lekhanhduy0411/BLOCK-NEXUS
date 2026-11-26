import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Crown, Flame, Play, Target, Trophy } from 'lucide-react';
import StrategistEngine from '../engines/StrategistEngine';
import VelocityEngine from '../engines/VelocityEngine';
import { getBackgroundById } from '../data/backgrounds';
import { getObjectiveProgress } from '../utils/challengeStages';
import { soundEngine } from '../utils/sound';
import GameBackdrop from './GameBackdrop';
import { HomeHexIcon, PauseBarsIcon, ReplayArcIcon } from './icons/NexusIcons';

const GRACE_WINDOW = 3;

function getStreakPillStyle(streak) {
  if (streak >= 8) {
    return 'bg-gradient-to-r from-cyan-500/35 via-fuchsia-500/40 to-amber-400/40 border-fuchsia-300 text-white shadow-[0_0_18px_rgba(232,121,249,0.65)]';
  }
  if (streak >= 4) {
    return 'bg-gradient-to-r from-[#ff2a5f]/35 to-[#fbbf24]/35 border-amber-300/85 text-amber-100 shadow-[0_0_14px_rgba(255,42,95,0.55)]';
  }
  if (streak === 3) {
    return 'bg-amber-500/25 border-amber-400/80 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.45)]';
  }
  if (streak === 2) {
    return 'bg-purple-500/25 border-purple-400/80 text-purple-200 shadow-[0_0_12px_rgba(188,19,254,0.45)]';
  }
  return 'bg-cyan-500/20 border-[#00f3ff]/75 text-cyan-200 shadow-[0_0_10px_rgba(0,243,255,0.4)]';
}

function findNextHigherRival(entries, myUserId, scoreFloor) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  let best = null;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (myUserId && entry.userId === myUserId) continue;
    const entryScore = Number(entry.score) || 0;
    if (entryScore > scoreFloor) {
      if (!best || entryScore < best.weeklyScore) {
        best = {
          username: entry.username,
          weeklyScore: entryScore,
          rank: entry.rank,
        };
      }
    }
  }
  return best;
}

export default function GameplayScreen({
  mode,
  runId,
  isPaused,
  autoPaused = false,
  resumeSignal = 0,
  isGuest = true,
  currentUser = null,
  settings,
  equippedBackground,
  personalBest,
  initialRival = null,
  leaderboardEntries = [],
  backdropSvgRef = null,
  initialSnapshot = null,
  sessionIdRef = null,
  challengeStage = null,
  onOpenSettings,
  onAutoPause,
  onResumeAutoPause,
  onReplay,
  onGoHome,
  onGameOver,
  onStageWin,
  resultOverlay,
}) {
  const [hud, setHud] = useState({
    score: 0,
    combo: 0,
    movesSinceLastClear: 0,
    maxCombo: 0,
    linesCleared: 0,
    tetrises: 0,
    level: challengeStage?.startLevel || 1,
  });

  // Live Rival HUD state (used in Endless mode; resets cleanly on each runId)
  const [activeRival, setActiveRival] = useState(initialRival);
  const [overtakeBanner, setOvertakeBanner] = useState(null);
  const overtakenScoresRef = useRef(new Set());
  const overtakeTimerRef = useRef(null);

  useEffect(() => {
    setHud({
      score: 0,
      combo: 0,
      movesSinceLastClear: 0,
      maxCombo: 0,
      linesCleared: 0,
      tetrises: 0,
      level: challengeStage?.startLevel || 1,
    });
    setOvertakeBanner(null);
    overtakenScoresRef.current = new Set();
    if (overtakeTimerRef.current) {
      clearTimeout(overtakeTimerRef.current);
      overtakeTimerRef.current = null;
    }
  }, [runId, mode, challengeStage?.stageNumber]);

  // Hydrate initial rival when /api/game/start resolves mid-match
  useEffect(() => {
    if (!initialRival || challengeStage) {
      setActiveRival(null);
      return;
    }
    const key = `${initialRival.username}:${initialRival.weeklyScore}`;
    if (!overtakenScoresRef.current.has(key)) {
      setActiveRival(initialRival);
    }
  }, [initialRival, runId, challengeStage]);

  // Detect Live Rival overtake in real time for logged-in players (Endless mode only)
  useEffect(() => {
    if (isGuest || challengeStage || !activeRival || overtakeBanner) return;
    if (hud.score > activeRival.weeklyScore) {
      const rivalKey = `${activeRival.username}:${activeRival.weeklyScore}`;
      if (overtakenScoresRef.current.has(rivalKey)) return;
      overtakenScoresRef.current.add(rivalKey);

      const beaten = activeRival;
      soundEngine.playRivalOvertake();
      setOvertakeBanner(beaten);

      if (overtakeTimerRef.current) clearTimeout(overtakeTimerRef.current);
      overtakeTimerRef.current = setTimeout(() => {
        setOvertakeBanner(null);
        const nextTarget = findNextHigherRival(
          leaderboardEntries,
          currentUser?.id,
          Math.max(hud.score, beaten.weeklyScore)
        );
        setActiveRival(nextTarget);
      }, 2500);
    }
  }, [
    hud.score,
    activeRival,
    overtakeBanner,
    isGuest,
    challengeStage,
    leaderboardEntries,
    currentUser?.id,
  ]);

  useEffect(
    () => () => {
      if (overtakeTimerRef.current) clearTimeout(overtakeTimerRef.current);
    },
    []
  );

  const theme = getBackgroundById(equippedBackground);
  const displayedBest = Math.max(personalBest || 0, hud.score);
  const remainingPips = Math.max(0, GRACE_WINDOW - (hud.movesSinceLastClear || 0));
  const isComboDanger = hud.combo >= 1 && (hud.movesSinceLastClear || 0) === GRACE_WINDOW - 1;

  const handleHudUpdate = useCallback((nextHud) => {
    setHud((prev) => ({ ...prev, ...nextHud }));
  }, []);

  // Compute compact 1-line Live Rival HUD telemetry (Endless mode only; zero Guest register messaging)
  let rivalText = '';
  let rivalPct = 0;
  let rivalTone = 'cyan';

  if (!challengeStage) {
    if (isGuest) {
      if (personalBest > 0) {
        if (hud.score > personalBest) {
          rivalText = 'Đã vượt kỷ lục cá nhân!';
          rivalPct = 100;
          rivalTone = 'emerald';
        } else {
          const gap = personalBest - hud.score + 1;
          rivalText = `Còn ${gap.toLocaleString()}đ phá kỷ lục`;
          rivalPct = Math.min(100, Math.round((hud.score / Math.max(1, personalBest + 1)) * 100));
          rivalTone = 'amber';
        }
      } else {
        rivalText = 'Mục tiêu: Thiết lập kỷ lục đầu tiên';
        rivalPct = Math.min(100, Math.round((hud.score / 1000) * 100));
        rivalTone = 'cyan';
      }
    } else if (overtakeBanner) {
      rivalText = `Đã vượt ${overtakeBanner.username} (#${overtakeBanner.rank})!`;
      rivalPct = 100;
      rivalTone = 'emerald';
    } else if (activeRival) {
      const gap = Math.max(1, activeRival.weeklyScore - hud.score + 1);
      rivalText = `Còn ${gap.toLocaleString()}đ vượt ${activeRival.username} (#${activeRival.rank})`;
      rivalPct = Math.min(
        100,
        Math.round((hud.score / Math.max(1, activeRival.weeklyScore + 1)) * 100)
      );
      rivalTone = 'cyan';
    } else if (personalBest > 0 && hud.score <= personalBest) {
      const gap = personalBest - hud.score + 1;
      rivalText = `Đang giữ TOP 1 Tuần · Còn ${gap.toLocaleString()}đ phá kỷ lục`;
      rivalPct = Math.min(100, Math.round((hud.score / Math.max(1, personalBest + 1)) * 100));
      rivalTone = 'amber';
    } else {
      rivalText = 'Đang giữ TOP 1 Tuần';
      rivalPct = 100;
      rivalTone = 'amber';
    }
  }

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden relative animate-screen-in">
      {/* Multi-Layer Illustrated Scenery Backdrop + Configurable Contrast Shield */}
      <GameBackdrop
        bgId={theme.id}
        isPreview={false}
        backdropDim={settings?.backdropDim ?? 0.35}
        backdropBlur={Boolean(settings?.backdropBlur)}
        svgRef={backdropSvgRef}
      />
      <div className="hud-cockpit-overlay" />

      {/* Thanh điểm trên cùng — bảo vệ an toàn khỏi đồng hồ, tai thỏ, camera đục lỗ & pin */}
      <header className="w-full max-w-2xl mx-auto safe-pt safe-px pb-1 shrink-0 z-10 space-y-1">
        <div className="hud-drop">
          <div className="hud-panel px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playButtonClick();
                onOpenSettings();
              }}
              className="btn-arcade btn-arcade-slate w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer"
              title="Tạm dừng & Cài đặt"
              aria-label="Tạm dừng & Cài đặt"
            >
              <PauseBarsIcon className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 sm:gap-5">
              <div className="text-center">
                <div className="text-[10px] font-semibold text-cyan-300/80">Điểm</div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="font-mono font-extrabold text-xl sm:text-2xl text-white leading-tight tabular-nums">
                    {hud.score.toLocaleString()}
                  </span>
                  {/* Active Pulsing Streak Pill + 3 Grace Window Energy Pips */}
                  {mode === 'dragMode' && hud.combo >= 1 && (
                    <div className="inline-flex flex-col items-center gap-0.5">
                      <span
                        key={hud.combo}
                        className={`inline-flex items-center px-2 py-0.5 border font-mono font-black text-xs sm:text-sm leading-none tabular-nums ${
                          isComboDanger
                            ? 'bg-rose-500/35 border-rose-300 text-rose-100 shadow-[0_0_14px_rgba(244,63,94,0.75)] animate-pulse'
                            : `animate-pulse ${getStreakPillStyle(hud.combo)}`
                        }`}
                      >
                        x{hud.combo}
                      </span>
                      <div
                        className="flex items-center gap-1"
                        title={`Còn ${remainingPips}/3 lượt giữ chuỗi`}
                      >
                        {[0, 1, 2].map((pipIdx) => {
                          const lit = pipIdx < remainingPips;
                          return (
                            <span
                              key={pipIdx}
                              className={`w-1.5 h-1.5 rounded-full transition-all ${
                                lit
                                  ? isComboDanger
                                    ? 'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.95)] animate-ping'
                                    : 'bg-amber-300 shadow-[0_0_5px_rgba(251,191,36,0.85)]'
                                  : 'bg-slate-700/80'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-7 w-[1px] bg-cyan-400/20" />

              {challengeStage ? (
                <div className="text-center">
                  <div className="text-[10px] font-semibold text-amber-300/85">Thử Thách</div>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className="font-mono font-black text-sm sm:text-base text-white leading-tight tabular-nums">
                      Màn {challengeStage.stageNumber}/50
                    </span>
                    {challengeStage.isBoss && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 bg-amber-400 text-slate-950 leading-none">
                        <Crown className="w-3 h-3" />
                        BOSS
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-[10px] font-semibold text-amber-300/85">Kỷ lục</div>
                  <div className="font-mono font-bold text-base sm:text-lg text-amber-300 leading-tight tabular-nums">
                    {displayedBest.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {mode === 'dragMode' ? (
              <div
                className={`hud-panel-sm px-2.5 py-1 border text-center shrink-0 transition-colors ${
                  isComboDanger
                    ? 'border-rose-400/85 bg-rose-950/35 animate-pulse'
                    : hud.combo >= 8
                      ? 'border-fuchsia-400/80'
                      : hud.combo >= 4
                        ? 'border-rose-400/75'
                        : hud.combo >= 1
                          ? 'border-amber-400/55'
                          : 'border-white/15'
                }`}
              >
                <div className="text-[10px] text-slate-400 leading-none">Chuỗi</div>
                <div
                  className={`font-mono font-extrabold text-sm leading-tight tabular-nums mt-0.5 ${
                    isComboDanger
                      ? 'text-rose-300'
                      : hud.combo >= 8
                        ? 'text-fuchsia-300'
                        : hud.combo >= 4
                          ? 'text-rose-300'
                          : hud.combo >= 1
                            ? 'text-amber-300'
                            : 'text-slate-400'
                  }`}
                >
                  {hud.combo >= 1 ? `x${hud.combo}` : '—'}
                </div>
                {hud.combo >= 1 && (
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    {[0, 1, 2].map((pipIdx) => (
                      <span
                        key={pipIdx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          pipIdx < remainingPips
                            ? isComboDanger
                              ? 'bg-rose-400'
                              : 'bg-cyan-300'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="hud-panel-sm px-2.5 py-1 border border-purple-400/35 text-center">
                  <div className="text-[10px] text-purple-300 leading-none">Cấp</div>
                  <div className="font-mono font-extrabold text-sm text-white leading-tight tabular-nums mt-0.5">
                    {hud.level}
                  </div>
                </div>
                <div className="hud-panel-sm px-2.5 py-1 border border-cyan-400/35 text-center">
                  <div className="text-[10px] text-cyan-300 leading-none">Hàng</div>
                  <div className="font-mono font-extrabold text-sm text-white leading-tight tabular-nums mt-0.5">
                    {hud.linesCleared}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Challenge Objective HUD (NO TIMER) OR Live Rival HUD (Endless) */}
        {challengeStage ? (
          <div
            className={`px-3 py-1.5 border backdrop-blur-sm space-y-1 ${
              challengeStage.isBoss
                ? 'bg-amber-950/55 border-amber-400/65 text-amber-100'
                : 'bg-[#070d1e]/80 border-cyan-400/35 text-cyan-100'
            }`}
          >
            <div
              className={`grid gap-2 ${
                challengeStage.objectives.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {challengeStage.objectives.map((obj, idx) => {
                const cur = getObjectiveProgress(obj, hud);
                const pct = Math.min(100, Math.round((cur / Math.max(1, obj.target)) * 100));
                const done = cur >= obj.target;
                return (
                  <div key={idx} className="min-w-0">
                    <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold leading-none">
                      <span className="inline-flex items-center gap-1 min-w-0 truncate">
                        {done ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Target className="w-3 h-3 text-[#00f3ff] shrink-0" />
                        )}
                        <span className={`truncate ${done ? 'text-emerald-300' : ''}`}>
                          {obj.label}
                        </span>
                      </span>
                      <span className="font-mono text-[10px] tabular-nums shrink-0 text-white">
                        {Math.min(cur, obj.target).toLocaleString()}/{obj.target.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full bg-slate-900/90 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          done
                            ? 'bg-emerald-400'
                            : challengeStage.isBoss
                              ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                              : 'bg-gradient-to-r from-[#00f3ff] to-purple-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            className={`px-3 py-1 border backdrop-blur-sm transition-colors ${
              rivalTone === 'emerald'
                ? 'bg-emerald-950/65 border-emerald-400/70 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.45)]'
                : rivalTone === 'amber'
                  ? 'bg-amber-950/45 border-amber-400/45 text-amber-200'
                  : 'bg-[#070d1e]/75 border-cyan-400/30 text-cyan-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold leading-none">
              <div className="flex items-center gap-1.5 min-w-0">
                {rivalTone === 'emerald' ? (
                  <Flame className="w-3.5 h-3.5 text-emerald-300 shrink-0 animate-bounce" />
                ) : rivalTone === 'amber' ? (
                  <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                ) : (
                  <Target className="w-3.5 h-3.5 text-[#00f3ff] shrink-0" />
                )}
                <span className="truncate tabular-nums">{rivalText}</span>
              </div>
              {!isGuest && activeRival && !overtakeBanner && (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-300 tabular-nums shrink-0">
                  <Trophy className="w-3 h-3 text-amber-300" />
                  {activeRival.weeklyScore.toLocaleString()}
                </span>
              )}
            </div>
            <div className="mt-1 h-1 w-full bg-slate-900/90 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  rivalTone === 'emerald'
                    ? 'bg-gradient-to-r from-emerald-400 to-amber-300'
                    : rivalTone === 'amber'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                      : 'bg-gradient-to-r from-[#00f3ff] to-purple-400'
                }`}
                style={{ width: `${rivalPct}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative z-10">
        {mode === 'dragMode' ? (
          <StrategistEngine
            key={`drag_${runId}_${challengeStage?.stageNumber || 'endless'}`}
            isPaused={isPaused}
            settings={settings}
            theme={theme}
            initialSnapshot={challengeStage ? null : initialSnapshot}
            sessionIdRef={sessionIdRef}
            challengeStage={challengeStage}
            onHudUpdate={handleHudUpdate}
            onGameOver={onGameOver}
            onStageWin={onStageWin}
          />
        ) : (
          <VelocityEngine
            key={`drop_${runId}_${challengeStage?.stageNumber || 'endless'}`}
            isPaused={isPaused}
            settings={settings}
            theme={theme}
            challengeStage={challengeStage}
            onHudUpdate={handleHudUpdate}
            onGameOver={onGameOver}
            onStageWin={onStageWin}
            onAutoPause={onAutoPause}
            resumeSignal={resumeSignal}
          />
        )}
      </main>

      {/* Auto-Pause Overlay for 10×20 (triggers 3 -> 2 -> 1 Canvas countdown on Resume) */}
      {autoPaused && !resultOverlay && (
        <div className="fixed inset-0 z-30 flex items-center justify-center safe-screen bg-[#040711]/78 backdrop-blur-md">
          <div className="hud-drop w-full max-w-xs animate-modal-in">
            <div className="hud-panel p-5 text-center space-y-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Tự động bảo vệ ván chơi
                </div>
                <h2 className="text-2xl font-black text-white mt-1">TẠM DỪNG</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Nhấn Tiếp tục để đếm ngược 3 · 2 · 1 trước khi khối rơi tiếp.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playButtonClick();
                  onResumeAutoPause?.();
                }}
                className="btn-arcade btn-arcade-cyan w-full py-3.5 text-base font-black inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Tiếp tục
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onReplay?.();
                  }}
                  className="btn-arcade btn-arcade-slate py-2.5 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ReplayArcIcon className="w-3.5 h-3.5" />
                  Chơi lại
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onGoHome?.();
                  }}
                  className="btn-arcade btn-arcade-slate py-2.5 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <HomeHexIcon className="w-3.5 h-3.5" />
                  Trang chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {resultOverlay}
    </div>
  );
}

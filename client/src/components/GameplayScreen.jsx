import { useCallback, useState } from 'react';
import StrategistEngine from '../engines/StrategistEngine';
import VelocityEngine from '../engines/VelocityEngine';
import { getBackgroundById } from '../data/backgrounds';
import { soundEngine } from '../utils/sound';
import GameBackdrop from './GameBackdrop';
import { PauseBarsIcon } from './icons/NexusIcons';

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

export default function GameplayScreen({
  mode,
  runId,
  isPaused,
  settings,
  equippedBackground,
  personalBest,
  onOpenSettings,
  onGameOver,
  resultOverlay,
}) {
  const [hud, setHud] = useState({
    score: 0,
    combo: 0,
    maxCombo: 0,
    linesCleared: 0,
    level: 1,
  });

  const theme = getBackgroundById(equippedBackground);
  const displayedBest = Math.max(personalBest || 0, hud.score);

  const handleHudUpdate = useCallback((nextHud) => {
    setHud((prev) => ({ ...prev, ...nextHud }));
  }, []);

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden relative animate-screen-in">
      {/* Multi-Layer Illustrated Scenery Backdrop + Readability Vignette */}
      <GameBackdrop bgId={theme.id} isPreview={false} />
      <div className="hud-cockpit-overlay" />

      {/* Thanh điểm trên cùng */}
      <header className="w-full max-w-2xl mx-auto px-3 pt-2.5 pb-1.5 shrink-0 z-10">
        <div className="hud-drop">
          <div className="hud-panel px-3 py-2 flex items-center justify-between gap-2">
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
                  {/* Active Pulsing Streak Pill right next to live score when comboStreak >= 1 */}
                  {mode === 'dragMode' && hud.combo >= 1 && (
                    <span
                      key={hud.combo}
                      className={`inline-flex items-center px-2 py-0.5 border font-mono font-black text-xs sm:text-sm leading-none tabular-nums animate-pulse ${getStreakPillStyle(
                        hud.combo
                      )}`}
                    >
                      x{hud.combo}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-7 w-[1px] bg-cyan-400/20" />

              <div className="text-center">
                <div className="text-[10px] font-semibold text-amber-300/85">Kỷ lục</div>
                <div className="font-mono font-bold text-base sm:text-lg text-amber-300 leading-tight tabular-nums">
                  {displayedBest.toLocaleString()}
                </div>
              </div>
            </div>

            {mode === 'dragMode' ? (
              <div
                className={`hud-panel-sm px-3 py-1.5 border text-right shrink-0 transition-colors ${
                  hud.combo >= 8
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
                    hud.combo >= 8
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
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative z-10">
        {mode === 'dragMode' ? (
          <StrategistEngine
            key={`drag_${runId}`}
            isPaused={isPaused}
            settings={settings}
            theme={theme}
            onHudUpdate={handleHudUpdate}
            onGameOver={onGameOver}
          />
        ) : (
          <VelocityEngine
            key={`drop_${runId}`}
            isPaused={isPaused}
            settings={settings}
            theme={theme}
            onHudUpdate={handleHudUpdate}
            onGameOver={onGameOver}
          />
        )}
      </main>

      {resultOverlay}
    </div>
  );
}

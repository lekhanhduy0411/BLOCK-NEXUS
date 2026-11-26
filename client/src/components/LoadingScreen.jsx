import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { NexusLogoMark } from './icons/NexusIcons';

const TOTAL_CELLS = 20;

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Đang tải giao diện...');

  useEffect(() => {
    let active = true;
    let finished = false;
    let current = 0;

    const finishIfReady = () => {
      if (!active || finished) return;
      finished = true;
      setProgress(100);
      setStatusText('Sẵn sàng!');
      setTimeout(() => {
        if (active) onComplete();
      }, 300);
    };

    const interval = setInterval(() => {
      current = Math.min(92, current + (current < 55 ? 7 : current < 80 ? 4 : 1.5));
      if (active) setProgress(Math.round(current));
    }, 60);

    async function bootSequence() {
      try {
        if (document.fonts?.ready) {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, 1400)),
          ]);
        }
      } catch {
        // Continue gracefully
      }

      if (!active) return;
      setStatusText('Đang kết nối máy chủ...');

      try {
        await Promise.race([
          api.healthCheck(),
          new Promise((resolve) => setTimeout(resolve, 1800)),
        ]);
      } catch {
        // Cold-start safe fallback
      }

      if (!active) return;
      setStatusText('Đang chuẩn bị bàn chơi...');
      await new Promise((resolve) => setTimeout(resolve, 320));

      clearInterval(interval);
      finishIfReady();
    }

    bootSequence();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [onComplete]);

  const activeCells = Math.round((progress / 100) * TOTAL_CELLS);

  return (
    <div className="min-h-dvh w-full bg-[#060a16] flex flex-col items-center justify-center safe-screen relative overflow-hidden">
      <div className="hud-cockpit-overlay" />

      <div className="hud-drop w-full max-w-md relative z-10 animate-screen-in">
        <div className="hud-panel px-6 py-8 sm:px-8 sm:py-9">
          <div className="flex flex-col items-center text-center">
            <NexusLogoMark className="w-24 h-24 mb-5 drop-shadow-[0_0_24px_rgba(0,243,255,0.35)]" />

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              BLOCK <span className="text-[#00f3ff]">NEXUS</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
              Trò chơi xếp khối chiến thuật & tốc độ
            </p>
          </div>

          {/* 20-Cell Segmented LED Loader */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-xs mb-2.5 gap-2">
              <span className="text-slate-300 font-medium truncate">{statusText}</span>
              <span className="font-mono font-bold text-[#00f3ff] tabular-nums shrink-0">
                {progress}%
              </span>
            </div>

            <div
              className="grid grid-cols-20 gap-1 p-1.5 bg-[#050812] border border-cyan-400/25"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {Array.from({ length: TOTAL_CELLS }, (_, idx) => {
                const isLit = idx < activeCells;
                const litClass =
                  idx < 10
                    ? 'led-cell-cyan'
                    : idx < 16
                      ? 'led-cell-purple'
                      : 'led-cell-amber';
                return <div key={idx} className={`h-4 sm:h-5 led-cell ${isLit ? litClass : ''}`} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

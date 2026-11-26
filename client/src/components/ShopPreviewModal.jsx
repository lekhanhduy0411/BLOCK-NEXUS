import { useEffect, useRef, useState } from 'react';
import { Check, Eye, X } from 'lucide-react';
import { TIER_LABELS } from '../data/backgrounds';
import {
  drawGhostBlock,
  drawRoundedRect,
  drawStyledBlock,
} from '../engines/blockRenderer';
import { soundEngine } from '../utils/sound';
import GameBackdrop from './GameBackdrop';
import { NexusCoinIcon } from './icons/NexusIcons';

const MOCK_8X8_BLOCKS = [
  [1, 1, '#00f3ff'],
  [1, 2, '#00f3ff'],
  [2, 1, '#00f3ff'],
  [2, 2, '#00f3ff'],
  [4, 0, '#bc13fe'],
  [4, 1, '#bc13fe'],
  [4, 2, '#bc13fe'],
  [5, 1, '#bc13fe'],
  [5, 4, '#f59e0b'],
  [5, 5, '#f59e0b'],
  [5, 6, '#f59e0b'],
  [6, 4, '#10b981'],
  [6, 5, '#10b981'],
  [7, 3, '#ff2e93'],
  [7, 4, '#ff2e93'],
  [7, 5, '#ff2e93'],
  [7, 6, '#ff2e93'],
];

const MOCK_8X8_GHOST = [
  [3, 4],
  [3, 5],
  [4, 4],
  [4, 5],
];

const MOCK_10X20_BLOCKS = [
  [19, 0, '#00f3ff'],
  [19, 1, '#00f3ff'],
  [19, 2, '#00f3ff'],
  [19, 3, '#00f3ff'],
  [19, 5, '#f59e0b'],
  [19, 6, '#f59e0b'],
  [19, 7, '#bc13fe'],
  [19, 8, '#bc13fe'],
  [19, 9, '#bc13fe'],
  [18, 0, '#10b981'],
  [18, 1, '#10b981'],
  [18, 5, '#f59e0b'],
  [18, 6, '#f59e0b'],
  [18, 8, '#bc13fe'],
  [17, 1, '#10b981'],
  [17, 2, '#10b981'],
  [17, 7, '#ff2e93'],
  [17, 8, '#ff2e93'],
  [16, 6, '#ff2e93'],
  [16, 7, '#ff2e93'],
];

const MOCK_10X20_ACTIVE = [
  [6, 3],
  [6, 4],
  [6, 5],
  [7, 4],
];

const MOCK_10X20_GHOST = [
  [17, 3],
  [17, 4],
  [17, 5],
  [18, 4],
];

export default function ShopPreviewModal({
  item,
  isOwned,
  isEquipped,
  canAfford,
  isGuest,
  isBusy,
  blockSkin = 'CYBER_NEON',
  initialDim = 0.35,
  initialBlur = false,
  onBuy,
  onEquip,
  onClose,
}) {
  const [sampleMode, setSampleMode] = useState('8x8'); // '8x8' | '10x20'
  const [previewDim, setPreviewDim] = useState(initialDim);
  const [previewBlur, setPreviewBlur] = useState(initialBlur);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const cols = sampleMode === '8x8' ? 8 : 10;
    const rows = sampleMode === '8x8' ? 8 : 20;
    const cellSize = sampleMode === '8x8' ? 28 : 16;
    const width = cols * cellSize;
    const height = rows * cellSize;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Board chassis
    drawRoundedRect(ctx, 0.5, 0.5, width - 1, height - 1, 3);
    ctx.fillStyle = item.boardBg || 'rgba(7, 11, 24, 0.82)';
    ctx.fill();

    // Grid lines
    ctx.strokeStyle = item.gridLine || 'rgba(0, 243, 255, 0.14)';
    ctx.lineWidth = 1;
    for (let c = 1; c < cols; c += 1) {
      ctx.beginPath();
      ctx.moveTo(c * cellSize + 0.5, 0);
      ctx.lineTo(c * cellSize + 0.5, height);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r += 1) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellSize + 0.5);
      ctx.lineTo(width, r * cellSize + 0.5);
      ctx.stroke();
    }

    if (sampleMode === '8x8') {
      MOCK_8X8_BLOCKS.forEach(([r, c, color]) => {
        drawStyledBlock(ctx, c * cellSize, r * cellSize, cellSize, color, blockSkin, 1);
      });
      MOCK_8X8_GHOST.forEach(([r, c]) => {
        drawGhostBlock(ctx, c * cellSize, r * cellSize, cellSize, '#38bdf8', 0.2, 0.65);
      });
    } else {
      MOCK_10X20_BLOCKS.forEach(([r, c, color]) => {
        drawStyledBlock(ctx, c * cellSize, r * cellSize, cellSize, color, blockSkin, 1);
      });
      MOCK_10X20_GHOST.forEach(([r, c]) => {
        drawGhostBlock(ctx, c * cellSize, r * cellSize, cellSize, '#bc13fe', 0.19, 0.62);
      });
      MOCK_10X20_ACTIVE.forEach(([r, c]) => {
        drawStyledBlock(ctx, c * cellSize, r * cellSize, cellSize, '#bc13fe', blockSkin, 1);
      });
    }

    drawRoundedRect(ctx, 0.5, 0.5, width - 1, height - 1, 3);
    ctx.strokeStyle = item.boardBorder || 'rgba(0, 243, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [sampleMode, blockSkin, item]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2.5 sm:p-4 bg-[#03050d]/90 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="hud-drop w-full max-w-2xl max-h-[92dvh] flex flex-col animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hud-panel overflow-hidden flex flex-col max-h-[92dvh]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-cyan-400/20 flex items-center justify-between gap-2 shrink-0 bg-[#070c1b]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 hud-panel-sm border border-cyan-400/45 flex items-center justify-center text-[#00f3ff] shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {item.name}
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-white/10 border border-white/20 text-cyan-200 shrink-0">
                    {TIER_LABELS[item.tier]}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{item.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playButtonClick();
                onClose();
              }}
              className="btn-arcade btn-arcade-slate w-9 h-9 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Đóng xem thử"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Live Backdrop + Mock Board Canvas Stage */}
          <div className="relative flex-1 min-h-[300px] sm:min-h-[360px] flex flex-col items-center justify-center p-4 overflow-hidden">
            <GameBackdrop
              bgId={item.id}
              isPreview={true}
              forceOverlay={true}
              backdropDim={previewDim}
              backdropBlur={previewBlur}
            />

            {/* Mode Switcher Floating Pill */}
            <div className="relative z-10 mb-3 flex items-center gap-1.5 bg-[#070b18]/85 p-1 border border-white/15 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setSampleMode('8x8');
                }}
                className={`px-3 py-1 text-xs font-extrabold cursor-pointer transition-colors ${
                  sampleMode === '8x8'
                    ? 'bg-[#00f3ff] text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Mẫu 8×8
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setSampleMode('10x20');
                }}
                className={`px-3 py-1 text-xs font-extrabold cursor-pointer transition-colors ${
                  sampleMode === '10x20'
                    ? 'bg-[#bc13fe] text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Mẫu 10×20
              </button>
            </div>

            {/* Real Canvas Mock Board */}
            <div className="relative z-10 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="shadow-[0_12px_36px_rgba(0,0,0,0.65)] block"
              />
            </div>
          </div>

          {/* Footer Controls: Dim slider + Blur toggle + Buy/Equip */}
          <div className="px-4 py-3.5 border-t border-cyan-400/20 bg-[#070c1b] space-y-3 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Thử độ tối nền</span>
                  <span className="font-mono font-black text-[#00f3ff] tabular-nums">
                    {Math.round(previewDim * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={75}
                  step={5}
                  value={Math.round(previewDim * 100)}
                  onChange={(e) => setPreviewDim(Number(e.target.value) / 100)}
                  aria-label="Thử độ tối nền"
                  className="mt-1 w-full accent-[#00f3ff] cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setPreviewBlur((b) => !b);
                }}
                className={`px-3 py-1.5 text-xs font-extrabold border cursor-pointer shrink-0 ${
                  previewBlur
                    ? 'bg-emerald-500/20 border-emerald-400/65 text-emerald-200'
                    : 'bg-white/5 border-white/15 text-slate-300'
                }`}
              >
                Làm mờ: {previewBlur ? 'Bật' : 'Tắt'}
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  onClose();
                }}
                className="btn-arcade btn-arcade-slate px-4 py-2.5 text-xs font-extrabold cursor-pointer shrink-0"
              >
                Đóng
              </button>

              {isEquipped ? (
                <div className="flex-1 py-2.5 text-center text-xs font-extrabold bg-cyan-500/15 border border-[#00f3ff]/50 text-[#00f3ff] inline-flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  Đang trang bị
                </div>
              ) : isOwned ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onEquip(item)}
                  className="btn-arcade btn-arcade-cyan flex-1 py-2.5 text-xs font-extrabold cursor-pointer"
                >
                  {isBusy ? 'Đang áp dụng...' : 'Trang bị ngay'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBusy || (!isGuest && !canAfford)}
                  onClick={() => onBuy(item)}
                  className={`btn-arcade flex-1 py-2.5 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                    isGuest
                      ? 'btn-arcade-slate text-slate-200'
                      : canAfford
                        ? 'btn-arcade-amber'
                        : 'btn-arcade-slate text-slate-500'
                  }`}
                >
                  {isBusy ? (
                    'Đang mua...'
                  ) : (
                    <>
                      <NexusCoinIcon className="w-4 h-4 shrink-0" />
                      <span className="tabular-nums">
                        {isGuest
                          ? `Đăng nhập để mua · ${item.price.toLocaleString()} Xu`
                          : `Mua ngay · ${item.price.toLocaleString()} Xu`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { AlertCircle, Check, Download, Loader2 } from 'lucide-react';
import { soundEngine } from '../utils/sound';
import { exportAchievementCard } from '../utils/shareCard';
import {
  HomeHexIcon,
  NexusCoinIcon,
  ReplayArcIcon,
  ShieldHexIcon,
  TrophyHexIcon,
} from './icons/NexusIcons';

export default function ResultScreen({
  mode,
  result,
  isGuest,
  playerName,
  equippedBackground,
  backdropSvgRef,
  syncState,
  onPlayAgain,
  onGoHome,
  onOpenLeaderboard,
  onRetrySync,
}) {
  const [savingCard, setSavingCard] = useState(false);
  const [shareNote, setShareNote] = useState('');

  if (!result) return null;

  const handleSaveCard = async () => {
    if (savingCard) return;
    soundEngine.playButtonClick();
    setSavingCard(true);
    setShareNote('');
    try {
      const outcome = await exportAchievementCard({
        mode,
        score: result.score || 0,
        maxCombo: result.maxCombo || 0,
        linesCleared: result.linesCleared || 0,
        level: result.level || 1,
        isNewRecord: Boolean(result.isNewRecord),
        weeklyRank: !isGuest ? syncState?.weeklyRank : null,
        playerName,
        equippedBackground,
        backdropSvgEl: backdropSvgRef?.current || null,
      });
      if (outcome.method === 'download') {
        setShareNote('Đã tải ảnh thành tích PNG!');
      } else if (outcome.method === 'share') {
        setShareNote('Đã chia sẻ ảnh thành tích!');
      }
    } catch {
      soundEngine.playInvalid();
      setShareNote('Không thể xuất ảnh lúc này.');
    } finally {
      setSavingCard(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#050812]/80 backdrop-blur-md">
      <div className="hud-drop w-full max-w-md animate-modal-in">
        <div className="hud-panel p-5 sm:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-white/8 border border-white/15 text-slate-300">
              {mode === 'dragMode' ? 'Chiến Thuật 8×8' : 'Tốc Độ 10×20'}
            </span>
            {result.isNewRecord && (
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-amber-400 text-slate-950">
                Kỷ lục mới
              </span>
            )}
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight">KẾT THÚC</h2>

          <div className="hud-panel-sm mt-4 py-4 px-5 border border-cyan-400/30">
            <div className="text-xs text-slate-400">Điểm chung cuộc</div>
            <div className="font-mono font-extrabold text-4xl sm:text-5xl text-[#00f3ff] tabular-nums mt-1">
              {(result.score || 0).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3.5">
            {mode === 'dragMode' ? (
              <>
                <div className="hud-panel-sm p-3">
                  <div className="text-xs text-slate-400">Chuỗi tối đa</div>
                  <div className="font-mono font-extrabold text-xl text-amber-300 tabular-nums mt-1">
                    x{result.maxCombo || 0}
                  </div>
                </div>
                <div className="hud-panel-sm p-3">
                  <div className="text-xs text-slate-400">Số hàng đã xóa</div>
                  <div className="font-mono font-extrabold text-xl text-cyan-300 tabular-nums mt-1">
                    {result.linesCleared || 0}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="hud-panel-sm p-3">
                  <div className="text-xs text-slate-400">Số hàng đã xóa</div>
                  <div className="font-mono font-extrabold text-xl text-cyan-300 tabular-nums mt-1">
                    {result.linesCleared || 0}
                  </div>
                </div>
                <div className="hud-panel-sm p-3">
                  <div className="text-xs text-slate-400">Cấp độ đạt được</div>
                  <div className="font-mono font-extrabold text-xl text-purple-300 tabular-nums mt-1">
                    Cấp {result.level || 1}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Trạng thái đồng bộ & thưởng Xu (không làm phiền Khách bằng lời mời đăng ký) */}
          <div className="mt-3.5 space-y-2">
            {isGuest ? (
              <div className="hud-panel-sm px-4 py-2.5 border border-white/12 text-xs text-slate-300 font-medium">
                Kỷ lục cá nhân đã được lưu trên thiết bị này.
              </div>
            ) : syncState.status === 'syncing' ? (
              <div className="hud-panel-sm px-4 py-3 border border-cyan-400/30 flex items-center justify-center gap-2 text-xs text-cyan-200 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-[#00f3ff]" />
                Đang đồng bộ điểm & tính thưởng Xu...
              </div>
            ) : syncState.status === 'synced' ? (
              <>
                <div className="hud-panel-sm px-4 py-2.5 border border-amber-400/45 bg-amber-500/10 flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-extrabold text-amber-300 tabular-nums">
                    <NexusCoinIcon className="w-4 h-4 shrink-0" />+
                    {(syncState.matchCoinsAwarded ?? 0).toLocaleString()} Xu
                  </span>
                  <span className="font-mono text-amber-100/90 tabular-nums">
                    Hôm nay: {syncState.dailyCoinsEarned ?? 0}/{syncState.dailyCoinCap || 200} Xu
                  </span>
                </div>

                <div className="hud-panel-sm px-4 py-2.5 border border-emerald-400/40 flex items-center justify-between gap-2 text-xs text-emerald-200">
                  <div className="flex items-center gap-2 font-medium">
                    <ShieldHexIcon className="w-4 h-4 shrink-0" />
                    <span>
                      Đã lưu BXH · Hạng tuần:{' '}
                      <strong className="font-mono text-emerald-300 tabular-nums">
                        #{syncState.weeklyRank || '—'}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playButtonClick();
                      onOpenLeaderboard();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#00f3ff] hover:underline cursor-pointer shrink-0"
                  >
                    <TrophyHexIcon className="w-4 h-4" />
                    Xem BXH
                  </button>
                </div>
              </>
            ) : syncState.status === 'error' ? (
              <div className="hud-panel-sm px-4 py-3 border border-rose-400/40 flex items-center justify-between gap-2 text-xs text-rose-200">
                <div className="flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{syncState.error || 'Chưa đồng bộ được điểm.'}</span>
                </div>
                <button
                  type="button"
                  onClick={onRetrySync}
                  className="btn-arcade btn-arcade-slate px-3 py-1 text-xs font-bold cursor-pointer shrink-0"
                >
                  Thử lại
                </button>
              </div>
            ) : null}
          </div>

          {/* Nút Lưu ảnh thành tích (Share Card PNG 1080×1350) */}
          <div className="mt-4">
            <button
              type="button"
              disabled={savingCard}
              onClick={handleSaveCard}
              className="btn-arcade btn-arcade-purple w-full py-2.5 font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-65"
            >
              {savingCard ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo ảnh thành tích...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Lưu ảnh thành tích
                </>
              )}
            </button>
            {shareNote && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-200">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                {shareNote}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playButtonClick();
                onGoHome();
              }}
              className="btn-arcade btn-arcade-slate py-3 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <HomeHexIcon className="w-4 h-4" />
              Trang chủ
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playButtonClick();
                onPlayAgain();
              }}
              className="btn-arcade btn-arcade-cyan py-3 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <ReplayArcIcon className="w-4 h-4" />
              Chơi lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw, ShieldAlert, UserPlus } from 'lucide-react';
import { api } from '../utils/api';
import { soundEngine } from '../utils/sound';
import {
  CloseCrossIcon,
  NexusCoinIcon,
  RankMedalIcon,
  TrophyHexIcon,
} from './icons/NexusIcons';

const UTC_PLUS_7_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function computeFallbackNextResetIso() {
  const now = new Date();
  const vnShifted = new Date(now.getTime() + UTC_PLUS_7_MS);
  const daysSinceMonday = (vnShifted.getUTCDay() + 6) % 7;
  const mondayStart = Date.UTC(
    vnShifted.getUTCFullYear(),
    vnShifted.getUTCMonth(),
    vnShifted.getUTCDate() - daysSinceMonday,
    0,
    0,
    0,
    0
  );
  return new Date(mondayStart + 7 * DAY_MS - UTC_PLUS_7_MS).toISOString();
}

function formatCountdown(targetIso) {
  const diff = Math.max(0, new Date(targetIso).getTime() - Date.now());
  const days = Math.floor(diff / DAY_MS);
  const hours = Math.floor((diff % DAY_MS) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${days} ngày ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function LeaderboardModal({
  initialMode = 'dragMode',
  isGuest,
  currentUser,
  onOpenRegister,
  onClose,
}) {
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    entries: [],
    myEntry: null,
    nextResetAt: computeFallbackNextResetIso(),
    totalPlayers: 0,
  });
  const [countdown, setCountdown] = useState(() => formatCountdown(computeFallbackNextResetIso()));

  const fetchBoard = useCallback(async (targetMode) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getLeaderboard(targetMode);
      setData({
        entries: res.entries || [],
        myEntry: res.myEntry || null,
        nextResetAt: res.nextResetAt || computeFallbackNextResetIso(),
        totalPlayers: res.totalPlayers || 0,
      });
    } catch (err) {
      setError(err.message || 'Không thể tải bảng xếp hạng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard(mode);
  }, [mode, fetchBoard]);

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(data.nextResetAt));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [data.nextResetAt]);

  const getRowStyle = (rank, isMe) => {
    if (rank === 1) {
      return 'bg-gradient-to-r from-[#7f1d1d]/95 via-[#c2410c]/90 to-[#d97706]/90 border border-amber-300/80 text-white';
    }
    if (rank === 2) {
      return 'bg-gradient-to-r from-[#d4d4d8]/92 via-[#fef08a]/88 to-[#eab308]/88 border border-yellow-100/85 text-slate-950';
    }
    if (rank === 3) {
      return 'bg-gradient-to-r from-[#7c2d12]/92 via-[#9a3412]/88 to-[#78350f]/92 border border-amber-400/65 text-amber-50';
    }
    return isMe
      ? 'bg-cyan-500/14 border border-[#00f3ff]/55 text-white'
      : 'bg-[#090f20]/85 border border-white/10 text-slate-200 hover:bg-[#0f172a]/90';
  };

  const renderRewardCell = (rank, reward) => {
    if (rank === 1) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-950/60 border border-yellow-300/60 font-mono text-xs font-extrabold text-yellow-200 tabular-nums">
          <NexusCoinIcon className="w-4 h-4" />
          +1,500 Xu
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/20 border border-amber-950/40 font-mono text-xs font-extrabold text-amber-950 tabular-nums">
          <NexusCoinIcon className="w-4 h-4" />
          +800 Xu
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-950/60 border border-sky-300/50 font-mono text-xs font-extrabold text-sky-200 tabular-nums">
          <NexusCoinIcon className="w-4 h-4" />
          +400 Xu
        </div>
      );
    }
    return <span className="text-slate-500 font-mono text-xs">{reward ? `+${reward}` : '—'}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#040711]/82 backdrop-blur-md">
      <div className="hud-drop w-full max-w-2xl h-[88dvh] max-h-[88dvh] flex flex-col min-h-0 animate-modal-in">
        <div className="hud-panel flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Tiêu đề */}
          <div className="px-5 pt-4 pb-3 border-b border-cyan-400/20 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <TrophyHexIcon className="w-10 h-10 shrink-0" />
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    BẢNG XẾP HẠNG TUẦN
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono tabular-nums mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Tổng kết sau:</span>
                    <span className="font-bold text-amber-300">{countdown}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    fetchBoard(mode);
                  }}
                  className="btn-arcade btn-arcade-slate w-9 h-9 flex items-center justify-center text-slate-200 cursor-pointer"
                  title="Làm mới"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00f3ff]' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onClose();
                  }}
                  className="btn-arcade btn-arcade-slate w-9 h-9 flex items-center justify-center text-slate-200 cursor-pointer"
                  aria-label="Đóng"
                >
                  <CloseCrossIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chuyển chế độ */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setMode('dragMode');
                }}
                className={`btn-arcade py-2.5 text-xs sm:text-sm font-extrabold cursor-pointer ${
                  mode === 'dragMode' ? 'btn-arcade-cyan' : 'btn-arcade-slate text-slate-300'
                }`}
              >
                Chiến Thuật 8×8
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setMode('dropMode');
                }}
                className={`btn-arcade py-2.5 text-xs sm:text-sm font-extrabold cursor-pointer ${
                  mode === 'dropMode' ? 'btn-arcade-purple' : 'btn-arcade-slate text-slate-300'
                }`}
              >
                Tốc Độ 10×20
              </button>
            </div>
          </div>

          {/* Tiêu đề 4 cột */}
          <div className="grid grid-cols-12 px-5 py-2.5 text-xs font-bold text-slate-400 bg-[#050914] border-b border-white/10 shrink-0">
            <div className="col-span-3 sm:col-span-2">Hạng</div>
            <div className="col-span-4 sm:col-span-5">Tài khoản</div>
            <div className="col-span-2 sm:col-span-2 text-right">Điểm</div>
            <div className="col-span-3 sm:col-span-3 text-right">Thưởng</div>
          </div>

          {/* Danh sách người chơi */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-3 space-y-2">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#00f3ff]" />
                <span className="text-xs">Đang tải bảng xếp hạng...</span>
              </div>
            ) : error ? (
              <div className="py-12 px-4 text-center flex flex-col items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-rose-400" />
                <p className="text-sm text-rose-200">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchBoard(mode)}
                  className="btn-arcade btn-arcade-slate px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : data.entries.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-sm">
                Chưa có tài khoản nào trên bảng xếp hạng tuần này.
              </div>
            ) : (
              data.entries.map((entry) => {
                const isMe = !isGuest && currentUser && entry.userId === currentUser.id;
                return (
                  <div
                    key={entry.userId}
                    className={`grid grid-cols-12 items-center px-3 py-2 transition-colors ${getRowStyle(
                      entry.rank,
                      isMe
                    )}`}
                    style={{
                      clipPath:
                        'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                    }}
                  >
                    <div className="col-span-3 sm:col-span-2 flex items-center">
                      {entry.rank <= 3 ? (
                        <RankMedalIcon rank={entry.rank} className="w-10 h-10 -my-1" />
                      ) : (
                        <span className="font-mono font-bold text-sm text-slate-400 pl-2 tabular-nums">
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    <div className="col-span-4 sm:col-span-5 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm truncate">{entry.username}</span>
                        {isMe && (
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.5 ${
                              entry.rank === 2
                                ? 'bg-slate-950 text-amber-300'
                                : 'bg-white/20 text-white'
                            }`}
                          >
                            BẠN
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-2 text-right font-mono font-extrabold text-sm tabular-nums">
                      {entry.score.toLocaleString()}
                    </div>

                    <div className="col-span-3 sm:col-span-3 text-right">
                      {renderRewardCell(entry.rank, entry.reward)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Thanh hạng cá nhân cố định dưới cùng */}
          <div className="px-4 sm:px-5 py-3.5 bg-[#050914] border-t border-cyan-400/30 shrink-0">
            {isGuest ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs sm:text-sm text-amber-200">
                  <span className="font-bold text-amber-400">Chế độ Khách:</span> Đăng ký tài khoản để ghi danh BXH và nhận thưởng Xu tuần.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onOpenRegister();
                  }}
                  className="btn-arcade btn-arcade-cyan inline-flex items-center gap-1.5 px-4 py-2 font-extrabold text-xs cursor-pointer shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Đăng ký đua Top
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="hud-panel-sm px-3 py-1.5 border border-cyan-400/45 font-mono text-xs font-extrabold text-[#00f3ff] tabular-nums">
                    Hạng {data.myEntry ? `#${data.myEntry.rank}` : '—'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{currentUser?.username}</div>
                    <div className="text-xs text-slate-400">
                      Tổng người chơi: {data.totalPlayers}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Điểm tuần</div>
                  <div className="font-mono font-extrabold text-lg text-[#00f3ff] tabular-nums">
                    {(
                      data.myEntry?.score ??
                      currentUser?.records?.[mode]?.weeklyScore ??
                      0
                    ).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

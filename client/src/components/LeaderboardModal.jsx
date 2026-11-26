import { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw, ShieldAlert, Swords } from 'lucide-react';
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
  initialMode = 'dragMode', // 'dragMode' | 'dropMode' | 'challenge'
  initialChallengeFilter = 'all',
  isGuest,
  currentUser,
  localChallengeProgress = null,
  onClose,
}) {
  const [mode, setMode] = useState(initialMode);
  const [challengeFilter, setChallengeFilter] = useState(initialChallengeFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    entries: [],
    myEntry: null,
    nextResetAt: computeFallbackNextResetIso(),
    totalPlayers: 0,
    maxStages: 100,
  });
  const [countdown, setCountdown] = useState(() => formatCountdown(computeFallbackNextResetIso()));

  const isChallengeTab = mode === 'challenge';

  const fetchBoard = useCallback(async (targetMode, targetFilter) => {
    setLoading(true);
    setError('');
    setData((prev) => ({
      ...prev,
      entries: [],
      myEntry: null,
      maxStages: targetMode === 'challenge' ? (targetFilter === 'all' ? 100 : 50) : 100,
    }));
    try {
      if (targetMode === 'challenge') {
        const res = await api.getChallengeLeaderboard(targetFilter);
        setData({
          entries: res.entries || [],
          myEntry: res.myEntry || null,
          nextResetAt: computeFallbackNextResetIso(),
          totalPlayers: (res.entries || []).length,
          maxStages: res.maxStages || (targetFilter === 'all' ? 100 : 50),
        });
      } else {
        const res = await api.getLeaderboard(targetMode);
        setData({
          entries: res.entries || [],
          myEntry: res.myEntry || null,
          nextResetAt: res.nextResetAt || computeFallbackNextResetIso(),
          totalPlayers: res.totalPlayers || 0,
          maxStages: 100,
        });
      }
    } catch (err) {
      setError(err.message || 'Không thể tải bảng xếp hạng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard(mode, challengeFilter);
  }, [mode, challengeFilter, fetchBoard]);

  useEffect(() => {
    if (isChallengeTab) return undefined;
    const tick = () => setCountdown(formatCountdown(data.nextResetAt));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [data.nextResetAt, isChallengeTab]);

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

  const localGuestChallengeCleared =
    challengeFilter === '8x8'
      ? localChallengeProgress?.strategistHighest || 0
      : challengeFilter === '10x20'
        ? localChallengeProgress?.velocityHighest || 0
        : localChallengeProgress?.totalCleared || 0;

  const localGuestChallengeScore =
    challengeFilter === '8x8'
      ? localChallengeProgress?.strategistTotalScore || 0
      : challengeFilter === '10x20'
        ? localChallengeProgress?.velocityTotalScore || 0
        : localChallengeProgress?.totalChallengeScore || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center safe-screen bg-[#040711]/82 backdrop-blur-md">
      <div className="hud-drop w-full max-w-2xl h-full max-h-full flex flex-col min-h-0 animate-modal-in">
        <div className="hud-panel flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Tiêu đề */}
          <div className="px-3.5 sm:px-5 pt-3.5 sm:pt-4 pb-3 border-b border-cyan-400/20 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <TrophyHexIcon className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-xl font-extrabold text-white tracking-tight leading-tight">
                    {isChallengeTab ? 'BXH 50 MÀN' : 'BẢNG XẾP HẠNG'}
                  </h2>
                  {isChallengeTab ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold mt-0.5">
                      <Swords className="w-3.5 h-3.5 shrink-0" />
                      <span>Tiến trình dài hạn · Xếp hạng theo số màn & tổng điểm</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono tabular-nums mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Tổng kết sau:</span>
                      <span className="font-bold text-amber-300">{countdown}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    fetchBoard(mode, challengeFilter);
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

            {/* 3 Tab chính: BXH Tuần 8×8 | BXH Tuần 10×20 | Thử Thách 50 Màn */}
            <div className="grid grid-cols-3 gap-2 mt-3.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setMode('dragMode');
                }}
                className={`btn-arcade py-2 px-2 text-[11px] sm:text-xs font-extrabold cursor-pointer truncate ${
                  mode === 'dragMode' ? 'btn-arcade-cyan' : 'btn-arcade-slate text-slate-300'
                }`}
              >
                Tuần 8×8
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setMode('dropMode');
                }}
                className={`btn-arcade py-2 px-2 text-[11px] sm:text-xs font-extrabold cursor-pointer truncate ${
                  mode === 'dropMode' ? 'btn-arcade-purple' : 'btn-arcade-slate text-slate-300'
                }`}
              >
                Tuần 10×20
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setMode('challenge');
                }}
                className={`btn-arcade py-2 px-2 text-[11px] sm:text-xs font-extrabold cursor-pointer truncate ${
                  mode === 'challenge' ? 'btn-arcade-amber' : 'btn-arcade-slate text-slate-300'
                }`}
              >
                Thử Thách 50 Màn
              </button>
            </div>

            {/* 3 Bộ lọc nhánh riêng cho BXH Thử Thách */}
            {isChallengeTab && (
              <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                {[
                  { id: 'all', label: 'Tổng (100 Màn)' },
                  { id: '8x8', label: '8×8 (50 Màn)' },
                  { id: '10x20', label: '10×20 (50 Màn)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playButtonClick();
                      setChallengeFilter(f.id);
                    }}
                    className={`py-1.5 px-2 text-[11px] font-extrabold border transition-colors cursor-pointer ${
                      challengeFilter === f.id
                        ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                        : 'bg-[#090f20] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tiêu đề cột */}
          {isChallengeTab ? (
            <div className="grid grid-cols-12 px-4 sm:px-5 py-2.5 text-xs font-bold text-slate-400 bg-[#050914] border-b border-white/10 shrink-0">
              <div className="col-span-2">Hạng</div>
              <div className="col-span-4 sm:col-span-5">Người chơi</div>
              <div className="col-span-3 sm:col-span-2 text-center">Số màn</div>
              <div className="col-span-3 text-right">Tổng điểm</div>
            </div>
          ) : (
            <div className="grid grid-cols-12 px-5 py-2.5 text-xs font-bold text-slate-400 bg-[#050914] border-b border-white/10 shrink-0">
              <div className="col-span-3 sm:col-span-2">Hạng</div>
              <div className="col-span-4 sm:col-span-5">Tài khoản</div>
              <div className="col-span-2 sm:col-span-2 text-right">Điểm</div>
              <div className="col-span-3 sm:col-span-3 text-right">Thưởng</div>
            </div>
          )}

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
                  onClick={() => fetchBoard(mode, challengeFilter)}
                  className="btn-arcade btn-arcade-slate px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : data.entries.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-sm">
                {isChallengeTab
                  ? 'Chưa có người chơi nào vượt màn thử thách ở hạng mục này.'
                  : 'Chưa có tài khoản nào trên bảng xếp hạng tuần này.'}
              </div>
            ) : isChallengeTab ? (
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
                    <div className="col-span-2 flex items-center">
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

                    <div className="col-span-3 sm:col-span-2 flex justify-center">
                      <span
                        className={`font-mono font-black text-xs sm:text-sm px-2 py-0.5 border tabular-nums whitespace-nowrap ${
                          entry.rank === 2
                            ? 'bg-slate-950 text-amber-300 border-slate-800'
                            : 'bg-cyan-500/20 text-[#00f3ff] border-cyan-400/55'
                        }`}
                      >
                        {entry.clearedCount}/{entry.maxStages}
                      </span>
                    </div>

                    <div className="col-span-3 text-right font-mono font-extrabold text-xs sm:text-sm tabular-nums">
                      {(entry.totalChallengeScore || 0).toLocaleString()}
                    </div>
                  </div>
                );
              })
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

          {/* Thanh hạng cá nhân cố định dưới cùng (KHÔNG nhắc Khách đăng ký) */}
          <div className="px-4 sm:px-5 py-3 bg-[#050914] border-t border-cyan-400/30 shrink-0">
            {isGuest ? (
              <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-slate-300">
                {isChallengeTab ? (
                  <>
                    <span className="font-semibold text-slate-400">Tiến độ máy hiện tại</span>
                    <div className="flex items-center gap-3 font-mono font-black tabular-nums">
                      <span className="text-[#00f3ff]">
                        {localGuestChallengeCleared}/{data.maxStages} Màn
                      </span>
                      <span className="text-amber-300">
                        {localGuestChallengeScore.toLocaleString()}đ
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400">
                    Đang chơi chế độ Khách · Điểm cao được lưu cục bộ trên thiết bị này.
                  </span>
                )}
              </div>
            ) : data.myEntry ? (
              <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-400">Hạng của bạn:</span>
                  <span className="font-mono font-black text-[#00f3ff] tabular-nums">
                    #{data.myEntry.rank}
                  </span>
                  <span className="font-bold text-white truncate">{data.myEntry.username}</span>
                </div>
                {isChallengeTab ? (
                  <div className="flex items-center gap-2.5 font-mono font-black tabular-nums shrink-0">
                    <span className="text-[#00f3ff]">
                      {data.myEntry.clearedCount}/{data.myEntry.maxStages}
                    </span>
                    <span className="text-amber-300">
                      {(data.myEntry.totalChallengeScore || 0).toLocaleString()}đ
                    </span>
                  </div>
                ) : (
                  <span className="font-mono font-black text-amber-300 tabular-nums shrink-0">
                    {(data.myEntry.score || 0).toLocaleString()}đ
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                {isChallengeTab
                  ? 'Hãy hoàn thành Màn 1 để ghi danh lên Bảng Xếp Hạng Thử Thách!'
                  : 'Hoàn thành một ván đấu để có mặt trên Bảng Xếp Hạng tuần này.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

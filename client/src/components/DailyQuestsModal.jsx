import { useEffect, useState } from 'react';
import { Check, ClipboardList, Loader2, Sparkles, X } from 'lucide-react';
import { api } from '../utils/api';
import { soundEngine } from '../utils/sound';
import { NexusCoinIcon } from './icons/NexusIcons';

const MODE_LABELS = {
  '8x8': 'Chiến Thuật 8×8',
  '10x20': 'Tốc Độ 10×20',
  any: 'Tổng hợp',
};

export default function DailyQuestsModal({ currentUser, onUserUpdated, onClose }) {
  const [quests, setQuests] = useState(() => currentUser?.dailyQuests || []);
  const [dailyCoinsEarned, setDailyCoinsEarned] = useState(
    () => currentUser?.dailyCoinsEarned ?? 0
  );
  const [dailyCoinCap, setDailyCoinCap] = useState(200);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .getDailyQuests()
      .then((res) => {
        if (!active) return;
        setQuests(res.dailyQuests || []);
        setDailyCoinsEarned(res.dailyCoinsEarned ?? 0);
        setDailyCoinCap(res.dailyCoinCap ?? 200);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Không thể tải danh sách nhiệm vụ.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleClaim = async (questId) => {
    if (claimingId) return;
    setClaimingId(questId);
    setError('');
    try {
      const res = await api.claimDailyQuest(questId);
      soundEngine.playCoinPurchase();
      setQuests(res.dailyQuests || []);
      if (res.user) {
        onUserUpdated(res.user);
      }
    } catch (err) {
      soundEngine.playInvalid();
      setError(err.message || 'Không thể nhận thưởng lúc này.');
    } finally {
      setClaimingId(null);
    }
  };

  const capPct = Math.min(100, Math.round((dailyCoinsEarned / Math.max(1, dailyCoinCap)) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center safe-screen bg-[#040711]/82 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="hud-drop w-full max-w-lg max-h-full flex flex-col min-h-0 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hud-panel p-4 sm:p-5 flex flex-col max-h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2.5 shrink-0 pb-3 border-b border-cyan-400/20">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 hud-panel-sm border border-cyan-400/50 flex items-center justify-center text-[#00f3ff] shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight leading-tight">
                  NHIỆM VỤ NGÀY
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  Làm mới lúc 00:00 mỗi ngày (giờ VN)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playButtonClick();
                onClose();
              }}
              className="btn-arcade btn-arcade-slate w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Daily Match Coin Cap Bar */}
          <div className="mt-3.5 hud-panel-sm p-3.5 border border-amber-400/35 shrink-0">
            <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
              <span className="font-bold text-slate-200 inline-flex items-center gap-1.5">
                <NexusCoinIcon className="w-4 h-4 shrink-0" />
                Xu thưởng theo ván hôm nay
              </span>
              <span className="font-mono font-black text-amber-300 tabular-nums">
                {dailyCoinsEarned}/{dailyCoinCap} Xu
              </span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-900/90 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300"
                style={{ width: `${capPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Xu từ Nhiệm vụ và Top 3 BXH tuần không tính vào giới hạn {dailyCoinCap} Xu/ngày này.
            </p>
          </div>

          {error && (
            <div className="mt-3 px-3.5 py-2.5 bg-rose-500/15 border border-rose-400/45 text-xs text-rose-200 font-medium shrink-0">
              {error}
            </div>
          )}

          {/* Quest Cards */}
          <div className="mt-3.5 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2.5 pr-0.5">
            {loading && quests.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-[#00f3ff]" />
                <span>Đang tải nhiệm vụ hôm nay...</span>
              </div>
            ) : (
              quests.map((q) => {
                const progress = Math.min(q.target, q.progress || 0);
                const pct = Math.min(100, Math.round((progress / Math.max(1, q.target)) * 100));
                const isComplete = progress >= q.target;
                const canClaim = isComplete && !q.claimed;

                return (
                  <div
                    key={q.id}
                    className={`hud-panel-sm p-3.5 border transition-colors ${
                      canClaim
                        ? 'border-amber-400/70 bg-amber-500/8'
                        : q.claimed
                          ? 'border-emerald-400/35 opacity-80'
                          : 'border-white/12'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 border ${
                              q.mode === '8x8'
                                ? 'bg-cyan-500/15 border-cyan-400/45 text-cyan-200'
                                : q.mode === '10x20'
                                  ? 'bg-purple-500/15 border-purple-400/45 text-purple-200'
                                  : 'bg-slate-700/60 border-slate-500/45 text-slate-200'
                            }`}
                          >
                            {MODE_LABELS[q.mode] || 'Tổng hợp'}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-amber-300 tabular-nums">
                            <NexusCoinIcon className="w-3.5 h-3.5" />+{q.reward} Xu
                          </span>
                        </div>
                        <div className="mt-1.5 text-sm font-bold text-white leading-snug">
                          {q.title}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {q.claimed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-extrabold bg-emerald-500/20 border border-emerald-400/45 text-emerald-300">
                            <Check className="w-3.5 h-3.5" />
                            Đã nhận
                          </span>
                        ) : canClaim ? (
                          <button
                            type="button"
                            disabled={claimingId === q.id}
                            onClick={() => handleClaim(q.id)}
                            className="btn-arcade btn-arcade-amber px-3.5 py-2 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                          >
                            {claimingId === q.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            Nhận Xu
                          </button>
                        ) : (
                          <span className="inline-block font-mono text-xs font-bold text-slate-300 px-2.5 py-1.5 bg-white/5 border border-white/10 tabular-nums">
                            {progress.toLocaleString()}/{q.target.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-900/90 border border-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            q.claimed
                              ? 'bg-emerald-400'
                              : isComplete
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                                : 'bg-gradient-to-r from-[#00f3ff] to-cyan-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-400 tabular-nums w-9 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

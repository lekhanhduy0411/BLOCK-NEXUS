import { useMemo, useState } from 'react';
import { Check, Eye, Lock, UserPlus } from 'lucide-react';
import { BACKGROUND_TIERS, GAME_BACKGROUNDS, TIER_LABELS } from '../data/backgrounds';
import { api } from '../utils/api';
import { soundEngine } from '../utils/sound';
import GameBackdrop from './GameBackdrop';
import ShopPreviewModal from './ShopPreviewModal';
import {
  CloseCrossIcon,
  NexusCoinIcon,
  ShopCoreIcon,
} from './icons/NexusIcons';

const TIER_BADGE_STYLES = {
  STANDARD:
    'bg-slate-900/90 text-slate-100 border-slate-400/55 shadow-[0_0_10px_rgba(148,163,184,0.25)]',
  RARE: 'bg-cyan-950/90 text-cyan-200 border-cyan-400/70 shadow-[0_0_12px_rgba(0,243,255,0.3)]',
  EPIC: 'bg-purple-950/90 text-purple-200 border-purple-400/75 shadow-[0_0_12px_rgba(188,19,254,0.35)]',
  LEGENDARY:
    'bg-amber-950/90 text-amber-200 border-amber-400/80 shadow-[0_0_14px_rgba(245,158,11,0.4)]',
  MYTHIC:
    'bg-fuchsia-950/90 text-white border-fuchsia-300/90 shadow-[0_0_16px_rgba(232,121,249,0.55)]',
};

/** 4-block miniature beveled Neon piece floating in center of each preview */
function MiniNeonBlocksOverlay({ accentColor }) {
  const blocks = [
    { col: 1, row: 0, color: accentColor },
    { col: 0, row: 1, color: '#00f3ff' },
    { col: 1, row: 1, color: accentColor },
    { col: 2, row: 1, color: '#f59e0b' },
  ];

  return (
    <div
      className="pointer-events-none relative w-[66px] h-[44px] drop-shadow-[0_6px_14px_rgba(0,0,0,0.75)]"
      aria-hidden="true"
    >
      {blocks.map((b, idx) => (
        <div
          key={idx}
          className="absolute w-[20px] h-[20px]"
          style={{
            left: `${b.col * 22}px`,
            top: `${b.row * 22}px`,
            background: b.color,
            boxShadow: `0 0 12px ${b.color}99, inset 2px 2px 0 rgba(255,255,255,0.52), inset -2px -2px 0 rgba(0,0,0,0.48)`,
            border: '1px solid rgba(255,255,255,0.6)',
          }}
        >
          <div className="w-2.5 h-2.5 mx-auto mt-[4px] bg-[#070b18]/45 border border-white/35" />
        </div>
      ))}
    </div>
  );
}

export default function ShopModal({
  isGuest,
  currentUser,
  settings,
  onUserUpdated,
  onOpenRegister,
  onClose,
}) {
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  const coins = currentUser?.coins ?? 0;
  const owned = currentUser?.ownedBackgrounds?.length
    ? currentUser.ownedBackgrounds
    : ['BG_DEFAULT'];
  const equipped = currentUser?.equippedBackground || 'BG_DEFAULT';

  const filteredBackgrounds = useMemo(() => {
    if (selectedTier === 'ALL') return GAME_BACKGROUNDS;
    return GAME_BACKGROUNDS.filter((item) => item.tier === selectedTier);
  }, [selectedTier]);

  const tierCounts = useMemo(() => {
    const counts = { ALL: GAME_BACKGROUNDS.length };
    BACKGROUND_TIERS.forEach((tier) => {
      if (tier !== 'ALL') {
        counts[tier] = GAME_BACKGROUNDS.filter((bg) => bg.tier === tier).length;
      }
    });
    return counts;
  }, []);

  const handleBuy = async (item) => {
    if (isGuest) {
      onOpenRegister();
      return;
    }
    setFeedback(null);
    setBusyId(item.id);
    try {
      const res = await api.buyBackground(item.id);
      soundEngine.playCoinPurchase();
      onUserUpdated(res.user);
      setFeedback({
        type: 'success',
        text: `Đã mở khóa và trang bị nền "${item.name}".`,
      });
    } catch (err) {
      soundEngine.playInvalid();
      setFeedback({
        type: 'error',
        text: err.message || 'Không thể hoàn tất giao dịch.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleEquip = async (item) => {
    if (isGuest) return;
    setFeedback(null);
    setBusyId(item.id);
    try {
      const res = await api.equipBackground(item.id);
      soundEngine.playButtonClick();
      onUserUpdated(res.user);
      setFeedback({
        type: 'success',
        text: `Đã trang bị nền "${item.name}".`,
      });
    } catch (err) {
      soundEngine.playInvalid();
      setFeedback({
        type: 'error',
        text: err.message || 'Không thể trang bị nền này.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#040711]/85 backdrop-blur-md">
      <div className="hud-drop w-full max-w-5xl h-[92dvh] max-h-[92dvh] flex flex-col min-h-0 animate-modal-in">
        <div className="hud-panel flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Tiêu đề & số dư */}
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-cyan-400/20 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <ShopCoreIcon className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight truncate">
                    CỬA HÀNG NỀN
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    Đã sở hữu{' '}
                    <span className="font-mono font-bold text-[#00f3ff]">
                      {owned.length}/{GAME_BACKGROUNDS.length}
                    </span>{' '}
                    nền không gian
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                <div className="hud-panel-sm px-3 py-1.5 flex items-center gap-1.5 border border-amber-400/50 bg-[#141008]">
                  <NexusCoinIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="font-mono font-extrabold text-xs sm:text-sm text-amber-200 tabular-nums whitespace-nowrap">
                    {isGuest ? '0 Xu (Khách)' : `${coins.toLocaleString()} Xu`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onClose();
                  }}
                  className="btn-arcade btn-arcade-slate w-9 h-9 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
                  aria-label="Đóng"
                >
                  <CloseCrossIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bộ lọc bậc nền — flex-wrap gọn gàng trên mobile, không bao giờ bị bóp cắt chữ */}
          <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-white/10 bg-[#050914] flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            {BACKGROUND_TIERS.map((tier) => {
              const active = selectedTier === tier;
              const activeStyle =
                tier === 'MYTHIC'
                  ? 'btn-arcade-purple'
                  : tier === 'LEGENDARY'
                    ? 'btn-arcade-amber'
                    : 'btn-arcade-cyan';
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setSelectedTier(tier);
                  }}
                  className={`btn-arcade shrink-0 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-extrabold whitespace-nowrap cursor-pointer inline-flex items-center gap-1 ${
                    active ? activeStyle : 'btn-arcade-slate text-slate-300'
                  }`}
                >
                  <span>{TIER_LABELS[tier]}</span>
                  <span className="font-mono text-[10px] opacity-80 tabular-nums">
                    ({tierCounts[tier]})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cảnh báo khách */}
          {isGuest && (
            <div className="mx-4 sm:mx-5 mt-3 hud-panel-sm border border-amber-400/40 p-3 flex items-center justify-between gap-2.5 flex-wrap shrink-0">
              <div className="flex items-center gap-2 text-xs text-amber-100">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Tài khoản <strong>Khách</strong> không thể tích lũy Xu hoặc mua nền.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  onOpenRegister();
                }}
                className="btn-arcade btn-arcade-cyan inline-flex items-center gap-1.5 px-3 py-1.5 font-extrabold text-xs cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Đăng ký (+200 Xu)
              </button>
            </div>
          )}

          {/* Thông báo giao dịch */}
          {feedback && (
            <div
              className={`mx-4 sm:mx-5 mt-3 px-3.5 py-2.5 text-xs font-semibold border shrink-0 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-400/45 text-rose-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Khung cuộn độc lập (min-h-0 + overflow-y-auto) bọc ngoài Grid để thẻ KHÔNG BAO GIỜ bị bóp dẹt */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {filteredBackgrounds.map((item) => {
                const isOwned = owned.includes(item.id);
                const isEquipped = equipped === item.id;
                const canAfford = coins >= item.price;
                const isBusy = busyId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col overflow-hidden bg-[#070c1a] border transition-colors ${
                      isEquipped
                        ? 'border-[#00f3ff] shadow-[0_0_24px_rgba(0,243,255,0.28)]'
                        : item.tier === 'MYTHIC'
                          ? 'border-fuchsia-400/45 hover:border-fuchsia-300/80'
                          : 'border-white/15 hover:border-cyan-400/45'
                    }`}
                  >
                    {/* Vùng xem trước cảnh nền h-36 (144px) cố định + 4 khối Neon mẫu */}
                    <div
                      onClick={() => {
                        soundEngine.playButtonClick();
                        setPreviewItem(item);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPreviewItem(item);
                        }
                      }}
                      title="Nhấn để xem thử toàn màn hình"
                      className="relative h-36 w-full overflow-hidden shrink-0 border-b border-white/10 cursor-pointer group"
                    >
                      <GameBackdrop bgId={item.id} isPreview={true} />

                      {/* Nhãn góc trên */}
                      <div className="relative z-10 p-2.5 flex items-start justify-between gap-2">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 border backdrop-blur-sm whitespace-nowrap ${
                            TIER_BADGE_STYLES[item.tier] || TIER_BADGE_STYLES.STANDARD
                          }`}
                        >
                          {TIER_LABELS[item.tier]}
                        </span>

                        {isEquipped ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 bg-[#00f3ff] text-slate-950 shadow-[0_0_12px_rgba(0,243,255,0.65)] whitespace-nowrap">
                            <Check className="w-3 h-3" />
                            Đang dùng
                          </span>
                        ) : isOwned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-950/90 border border-emerald-400/65 text-emerald-200 backdrop-blur-sm whitespace-nowrap">
                            <Check className="w-3 h-3" />
                            Đã sở hữu
                          </span>
                        ) : null}
                      </div>

                      {/* 4 khối Neon nổi giữa preview */}
                      <div className="absolute inset-0 z-10 flex items-center justify-center pt-4">
                        <MiniNeonBlocksOverlay accentColor={item.accentColor} />
                      </div>
                    </div>

                    {/* Chân thẻ đầy đủ: Tiêu đề, mô tả và nút Mua / Trang bị */}
                    <div className="p-3.5 sm:p-4 flex flex-col gap-3 bg-[#080d1d] shrink-0">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm sm:text-[15px] text-white leading-snug">
                          {item.name}
                        </h3>
                        <p
                          className="text-xs text-slate-400 mt-1 line-clamp-1"
                          title={item.description}
                        >
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playButtonClick();
                            setPreviewItem(item);
                          }}
                          className="btn-arcade btn-arcade-slate px-3 py-2.5 text-xs font-extrabold inline-flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                          title="Xem thử trên bàn chơi"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-300" />
                          <span>Xem thử</span>
                        </button>

                        {isEquipped ? (
                          <button
                            type="button"
                            disabled
                            className="flex-1 py-2.5 text-xs font-extrabold bg-cyan-500/15 border border-[#00f3ff]/50 text-[#00f3ff]"
                          >
                            Đang trang bị
                          </button>
                        ) : isOwned ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleEquip(item)}
                            className="btn-arcade btn-arcade-cyan flex-1 py-2.5 text-xs font-extrabold cursor-pointer"
                          >
                            {isBusy ? 'Đang áp dụng...' : 'Trang bị'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy || (!isGuest && !canAfford)}
                            onClick={() => handleBuy(item)}
                            className={`btn-arcade flex-1 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
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
                                  {item.price.toLocaleString()} Xu
                                </span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {previewItem && (
        <ShopPreviewModal
          item={previewItem}
          isOwned={owned.includes(previewItem.id)}
          isEquipped={equipped === previewItem.id}
          canAfford={coins >= previewItem.price}
          isGuest={isGuest}
          isBusy={busyId === previewItem.id}
          blockSkin={settings?.blockSkin || 'CYBER_NEON'}
          initialDim={settings?.backdropDim ?? 0.35}
          initialBlur={Boolean(settings?.backdropBlur)}
          onBuy={handleBuy}
          onEquip={handleEquip}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}

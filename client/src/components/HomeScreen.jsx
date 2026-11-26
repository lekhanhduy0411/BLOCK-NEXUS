import { ClipboardList, Crown, LogOut, Swords, UserPlus } from 'lucide-react';
import { getBackgroundById } from '../data/backgrounds';
import { soundEngine } from '../utils/sound';
import GameBackdrop from './GameBackdrop';
import {
  FounderCrownIcon,
  GearHexIcon,
  ModeDragIcon,
  ModeDropIcon,
  NexusCoinIcon,
  NexusLogoMark,
  PlayTriIcon,
  ShopCoreIcon,
  TrophyHexIcon,
} from './icons/NexusIcons';

export default function HomeScreen({
  isGuest,
  currentUser,
  guestSession,
  guestRecords,
  challengeProgress = null,
  savedDragSnapshot = null,
  onStartGame,
  onOpenChallenges,
  onOpenLeaderboard,
  onOpenShop,
  onOpenQuests,
  onOpenAdmin,
  onOpenSettings,
  onOpenRegister,
  onLogout,
  onClaimRewards,
}) {
  const displayName = isGuest
    ? guestSession?.username || 'Khách'
    : currentUser?.username || 'Người chơi';

  const isAdmin = !isGuest && currentUser?.role === 'ADMIN';
  const avatarInitials = displayName.slice(0, 2).toUpperCase();
  const activeTheme = getBackgroundById(
    isGuest ? 'BG_DEFAULT' : currentUser?.equippedBackground || 'BG_DEFAULT'
  );

  const dragStats = isGuest
    ? guestRecords.dragMode
    : currentUser?.records?.dragMode || { allTimeHigh: 0, weeklyScore: 0, maxCombo: 0 };

  const dropStats = isGuest
    ? guestRecords.dropMode
    : currentUser?.records?.dropMode || { allTimeHigh: 0, weeklyScore: 0, maxLines: 0 };

  const unclaimedRewards = !isGuest
    ? (currentUser?.rewards || []).filter((r) => !r.claimed)
    : [];

  const claimableQuestsCount = !isGuest
    ? (currentUser?.dailyQuests || []).filter(
        (q) => !q.claimed && (q.progress || 0) >= (q.target || 1)
      ).length
    : 0;

  return (
    <div className="min-h-dvh w-full flex flex-col justify-center px-4 sm:px-6 py-4 relative overflow-x-hidden animate-screen-in">
      <GameBackdrop bgId={activeTheme.id} isPreview={false} />
      <div className="hud-cockpit-overlay" />

      <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 relative z-10">
        {/* 1. Thanh tài khoản & hành động: 2 hàng cân đối trên di động, 1 hàng trên máy tính */}
        <header className="hud-drop">
          <div className="hud-panel px-3.5 sm:px-5 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Hàng 1 (Di động): Trái = Avatar + Tên/Nền | Phải = Ví Xu sát mép phải */}
            <div className="flex items-center justify-between gap-2.5 w-full md:flex-1 min-w-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 hud-panel-sm flex items-center justify-center border border-cyan-400/50 bg-[#081022]">
                  <span className="font-mono font-black text-sm sm:text-base text-[#00f3ff]">
                    {avatarInitials}
                  </span>
                  <span
                    className={`absolute bottom-1 right-1 w-2 h-2 ${
                      isGuest ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base sm:text-xl font-extrabold text-white truncate">
                      {displayName}
                    </span>

                    {isGuest ? (
                      <span className="text-[11px] font-extrabold px-2 py-0.5 bg-amber-500/20 border border-amber-400/55 text-amber-300 shrink-0">
                        Khách
                      </span>
                    ) : isAdmin ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 bg-amber-400/20 border border-amber-400/75 text-amber-200 shrink-0">
                        <FounderCrownIcon className="w-3.5 h-3.5" />
                        Quản trị
                      </span>
                    ) : null}
                  </div>

                  {isGuest ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.unlock();
                        soundEngine.playButtonClick();
                        onOpenRegister();
                      }}
                      className="mt-0.5 inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#00f3ff] hover:text-cyan-200 transition-colors cursor-pointer truncate max-w-full"
                    >
                      <UserPlus className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Đăng nhập / Tạo tài khoản</span>
                    </button>
                  ) : (
                    <div className="mt-0.5 text-xs sm:text-sm text-slate-300 truncate">
                      Nền: <span className="font-semibold text-white">{activeTheme.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {!isGuest && (
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5 sm:gap-2 border border-amber-400/65 bg-amber-500/15 shadow-[0_0_16px_rgba(245,158,11,0.22)] shrink-0">
                  <NexusCoinIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span className="font-mono font-black text-base sm:text-xl text-amber-300 tabular-nums leading-none whitespace-nowrap">
                    {(currentUser?.coins ?? 0).toLocaleString()} Xu
                  </span>
                </div>
              )}
            </div>

            {/* Hàng 2 (Di động): 1 hàng ngang thẳng tắp 100% chiều rộng (Cửa hàng, Xếp hạng, Admin?, Cài đặt, Đăng xuất) */}
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playButtonClick();
                    onOpenAdmin();
                  }}
                  className="btn-arcade btn-arcade-amber px-3 h-11 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  title="Bảng quản trị"
                >
                  <FounderCrownIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="hidden sm:inline">Quản trị</span>
                </button>
              )}

              {!isGuest && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playButtonClick();
                    onOpenQuests?.();
                  }}
                  className="relative btn-arcade btn-arcade-slate flex-1 md:flex-none px-2.5 sm:px-4 h-11 text-xs sm:text-base font-extrabold inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer"
                  title="Nhiệm vụ hằng ngày"
                >
                  <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300 shrink-0" />
                  <span>Nhiệm vụ</span>
                  {claimableQuestsCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-[#070913] shadow-[0_0_10px_rgba(251,191,36,0.95)] animate-pulse"
                      aria-label={`${claimableQuestsCount} nhiệm vụ đã hoàn thành`}
                    />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playButtonClick();
                  onOpenShop();
                }}
                className="btn-arcade btn-arcade-slate flex-1 md:flex-none px-2.5 sm:px-4 h-11 text-xs sm:text-base font-extrabold inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer"
              >
                <ShopCoreIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>Cửa hàng</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playButtonClick();
                  onOpenLeaderboard('dragMode');
                }}
                className="btn-arcade btn-arcade-slate flex-1 md:flex-none px-2.5 sm:px-4 h-11 text-xs sm:text-base font-extrabold inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer"
              >
                <TrophyHexIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>Xếp hạng</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playButtonClick();
                  onOpenSettings();
                }}
                className="btn-arcade btn-arcade-slate w-11 h-11 shrink-0 flex items-center justify-center cursor-pointer"
                title="Cài đặt"
                aria-label="Cài đặt"
              >
                <GearHexIcon className="w-5 h-5" />
              </button>

              {!isGuest && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onLogout();
                  }}
                  className="btn-arcade btn-arcade-slate w-11 h-11 shrink-0 flex items-center justify-center text-rose-300 cursor-pointer"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Thông báo nhận thưởng Top 3 tuần */}
        {unclaimedRewards.length > 0 && (
          <div className="hud-drop">
            <div className="hud-panel-amber px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TrophyHexIcon className="w-10 h-10 shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm text-amber-300 font-bold">
                    Thưởng Bảng Xếp Hạng tuần {unclaimedRewards[0].weekLabel}
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white">
                    Chúc mừng hạng #{unclaimedRewards[0].rank} — Đã cộng{' '}
                    <span className="font-mono font-black text-amber-300 tabular-nums">
                      +{unclaimedRewards.reduce((sum, r) => sum + r.coinsAwarded, 0).toLocaleString()} Xu
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playCoinPurchase();
                  onClaimRewards();
                }}
                className="btn-arcade btn-arcade-amber px-5 py-2.5 text-sm font-black cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        )}

        {/* 2. Khối tiêu đề tích hợp gọn sát phía trên + Nút nổi bật Chiến Dịch 50 Màn Thử Thách */}
        <section className="flex flex-wrap items-center justify-between gap-3 px-1 mt-0.5">
          <div className="flex items-center gap-3.5">
            <NexusLogoMark className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
                BLOCK <span className="text-[#00f3ff]">NEXUS</span>
              </h1>
              <p className="text-sm text-slate-300 font-medium mt-1">
                Chọn chế độ xếp khối hoặc chinh phục 50 màn thử thách
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playButtonClick();
              onOpenChallenges?.('8x8');
            }}
            className="btn-arcade btn-arcade-amber px-4 sm:px-5 py-3 text-sm sm:text-base font-black inline-flex items-center justify-center gap-2.5 w-full sm:w-auto cursor-pointer shadow-[0_0_24px_rgba(245,158,11,0.28)]"
          >
            <Swords className="w-5 h-5 shrink-0" />
            <span>Thử Thách 50 Màn</span>
            <span className="font-mono text-xs px-2 py-0.5 bg-slate-950/75 text-amber-300 border border-amber-300/40 tabular-nums">
              {challengeProgress?.totalCleared ?? 0}/100
            </span>
            <Crown className="w-4 h-4 shrink-0 hidden sm:inline" />
          </button>
        </section>

        {/* 3. Hai thẻ chọn chế độ ôm gọn nội dung (không khoảng trống thừa) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Chế độ 8×8 */}
          <div className="hud-drop">
            <div
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playButtonClick();
                onStartGame('dragMode');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onStartGame('dragMode');
              }}
              className="group cartridge-card hud-panel p-5 flex flex-col gap-4 cursor-pointer transition-[box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_rgba(0,243,255,0.75),inset_0_1px_0_rgba(255,255,255,0.22)]"
            >
              <div
                className="cartridge-scan-beam"
                style={{
                  background:
                    'linear-gradient(180deg, transparent, rgba(0,243,255,0.16), transparent)',
                }}
              />

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Chiến Thuật 8×8
                    </h2>
                    {savedDragSnapshot && (
                      <span className="text-[11px] font-extrabold px-2 py-0.5 bg-cyan-500/20 border border-[#00f3ff]/65 text-cyan-200 font-mono tabular-nums">
                        Đang dở: {(savedDragSnapshot.score || 0).toLocaleString()}đ
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 mt-1 leading-snug">
                    Kéo thả khối trên lưới 8×8, xóa hàng ngang và dọc liên tiếp để nhân chuỗi điểm không giới hạn.
                  </p>
                </div>
                <ModeDragIcon className="w-14 h-14 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5" />
              </div>

              {/* 3 ô thông số lớn, đậm, rõ nét */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="hud-panel-sm px-3.5 py-3">
                  <div className="text-xs sm:text-sm font-bold text-slate-300">Kỷ lục</div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-white tabular-nums mt-1 leading-none">
                    {(dragStats.allTimeHigh || 0).toLocaleString()}
                  </div>
                </div>
                <div className="hud-panel-sm px-3.5 py-3">
                  <div className="text-xs sm:text-sm font-bold text-slate-300">Điểm tuần</div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-cyan-300 tabular-nums mt-1 leading-none">
                    {isGuest ? '—' : (dragStats.weeklyScore || 0).toLocaleString()}
                  </div>
                </div>
                <div className="hud-panel-sm px-3.5 py-3">
                  <div className="text-xs sm:text-sm font-bold text-slate-300">Chuỗi tối đa</div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-amber-400 tabular-nums mt-1 leading-none">
                    x{dragStats.maxCombo || 0}
                  </div>
                </div>
              </div>

              {/* Nút chơi toàn chiều rộng đặt sát ngay dưới ô thông số */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.unlock();
                  soundEngine.playButtonClick();
                  onStartGame('dragMode');
                }}
                className="btn-arcade btn-arcade-cyan w-full py-3.5 text-base sm:text-lg font-black uppercase tracking-wider inline-flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <PlayTriIcon className="w-4 h-4" />
                Chơi 8×8
              </button>
            </div>
          </div>

          {/* Chế độ 10×20 */}
          <div className="hud-drop">
            <div
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playButtonClick();
                onStartGame('dropMode');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onStartGame('dropMode');
              }}
              className="group cartridge-card hud-panel-purple p-5 flex flex-col gap-4 cursor-pointer transition-[box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_rgba(188,19,254,0.8),inset_0_1px_0_rgba(255,255,255,0.22)]"
            >
              <div
                className="cartridge-scan-beam"
                style={{
                  background:
                    'linear-gradient(180deg, transparent, rgba(188,19,254,0.2), transparent)',
                }}
              />

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    Tốc Độ 10×20
                  </h2>
                  <p className="text-sm text-slate-300 mt-1 leading-snug">
                    Xếp khối rơi cổ điển trên lưới 10×20, di chuyển, xoay khối và thả nhanh đồng bộ trên mọi thiết bị.
                  </p>
                </div>
                <ModeDropIcon className="w-14 h-14 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5" />
              </div>

              {/* 3 ô thông số lớn, đậm, rõ nét */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="hud-panel-sm px-3.5 py-3">
                  <div className="text-xs sm:text-sm font-bold text-slate-300">Kỷ lục</div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-white tabular-nums mt-1 leading-none">
                    {(dropStats.allTimeHigh || 0).toLocaleString()}
                  </div>
                </div>
                <div className="hud-panel-sm px-3.5 py-3">
                  <div className="text-xs sm:text-sm font-bold text-slate-300">Điểm tuần</div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-purple-300 tabular-nums mt-1 leading-none">
                    {isGuest ? '—' : (dropStats.weeklyScore || 0).toLocaleString()}
                  </div>
                </div>
                <div className="hud-panel-sm px-3.5 py-3">
                  <div className="text-xs sm:text-sm font-bold text-slate-300">Hàng tối đa</div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-amber-400 tabular-nums mt-1 leading-none">
                    {(dropStats.maxLines || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Nút chơi toàn chiều rộng đặt sát ngay dưới ô thông số */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.unlock();
                  soundEngine.playButtonClick();
                  onStartGame('dropMode');
                }}
                className="btn-arcade btn-arcade-purple w-full py-3.5 text-base sm:text-lg font-black uppercase tracking-wider inline-flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <PlayTriIcon className="w-4 h-4" />
                Chơi 10×20
              </button>
            </div>
          </div>
        </section>

        {/* 4. Thanh thưởng BXH tuần lớn, rõ ràng */}
        <footer className="hud-drop">
          <div className="hud-panel px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-sm sm:text-base font-bold">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-slate-200">
              <TrophyHexIcon className="w-6 h-6 shrink-0" />
              <span>Thưởng BXH Thứ Hai 00:00 (VN):</span>
              <span className="font-mono font-black text-amber-300 tabular-nums">
                Hạng 1: +1,500 Xu
              </span>
              <span className="text-slate-500 select-none" aria-hidden="true">
                ·
              </span>
              <span className="font-mono font-black text-slate-100 tabular-nums">
                Hạng 2: +800 Xu
              </span>
              <span className="text-slate-500 select-none" aria-hidden="true">
                ·
              </span>
              <span className="font-mono font-black text-orange-300 tabular-nums">
                Hạng 3: +400 Xu
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playButtonClick();
                onOpenLeaderboard('dragMode');
              }}
              className="text-sm sm:text-base font-extrabold text-[#00f3ff] hover:text-cyan-200 cursor-pointer shrink-0"
            >
              Xem bảng xếp hạng →
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

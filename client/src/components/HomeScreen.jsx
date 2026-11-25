import { LogOut, UserPlus } from 'lucide-react';
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
  onStartGame,
  onOpenLeaderboard,
  onOpenShop,
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

  return (
    <div className="min-h-dvh w-full flex flex-col justify-between px-4 sm:px-6 py-4 sm:py-6 relative overflow-x-hidden animate-screen-in">
      <GameBackdrop bgId={activeTheme.id} isPreview={false} />
      <div className="hud-cockpit-overlay" />

      <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 sm:gap-6 relative z-10 flex-1">
        {/* Thanh tài khoản & nút chức năng */}
        <header className="hud-drop">
          <div className="hud-panel px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            {/* Thông tin tài khoản */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-12 h-12 shrink-0 hud-panel-sm flex items-center justify-center border border-cyan-400/45 bg-[#081022]">
                <span className="font-mono font-extrabold text-sm text-[#00f3ff]">
                  {avatarInitials}
                </span>
                <span
                  className={`absolute bottom-1 right-1 w-2 h-2 ${
                    isGuest ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-white truncate max-w-[160px] sm:max-w-[220px]">
                    {displayName}
                  </span>

                  {isGuest ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-500/15 border border-amber-400/45 text-amber-300">
                      Khách
                    </span>
                  ) : isAdmin ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-400/20 border border-amber-400/70 text-amber-200">
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
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#00f3ff] hover:text-cyan-200 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Đăng ký để vào BXH & tích Xu
                  </button>
                ) : (
                  <div className="mt-0.5 text-xs text-slate-400 truncate">
                    Nền: <span className="text-slate-200">{activeTheme.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ví Xu & Nút thao tác */}
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {!isGuest && (
                <div className="hud-panel-sm px-3 py-1.5 flex items-center gap-2 border border-amber-400/40 bg-[#141008]/90">
                  <NexusCoinIcon className="w-5 h-5 shrink-0" />
                  <div className="leading-none">
                    <div className="text-[10px] text-amber-300/80">Số dư</div>
                    <div className="font-mono font-extrabold text-sm text-amber-200 tabular-nums mt-0.5">
                      {(currentUser?.coins ?? 0).toLocaleString()} Xu
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playButtonClick();
                    onOpenAdmin();
                  }}
                  className="btn-arcade btn-arcade-amber px-3 py-2 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <FounderCrownIcon className="w-4 h-4" />
                  <span>Quản trị</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playButtonClick();
                  onOpenShop();
                }}
                className="btn-arcade btn-arcade-slate px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ShopCoreIcon className="w-4 h-4" />
                <span>Cửa hàng</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playButtonClick();
                  onOpenLeaderboard('dragMode');
                }}
                className="btn-arcade btn-arcade-slate px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <TrophyHexIcon className="w-4 h-4" />
                <span>Xếp hạng</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playButtonClick();
                  onOpenSettings();
                }}
                className="btn-arcade btn-arcade-slate w-10 h-9 flex items-center justify-center cursor-pointer"
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
                  className="btn-arcade btn-arcade-slate w-10 h-9 flex items-center justify-center text-rose-300 cursor-pointer"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Thông báo nhận thưởng Top 3 tuần */}
        {unclaimedRewards.length > 0 && (
          <div className="hud-drop">
            <div className="hud-panel-amber px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TrophyHexIcon className="w-9 h-9 shrink-0" />
                <div>
                  <div className="text-xs text-amber-300 font-semibold">
                    Thưởng Bảng Xếp Hạng tuần {unclaimedRewards[0].weekLabel}
                  </div>
                  <div className="text-sm font-bold text-white">
                    Chúc mừng hạng #{unclaimedRewards[0].rank} — Đã cộng{' '}
                    <span className="font-mono font-extrabold text-amber-300 tabular-nums">
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
                className="btn-arcade btn-arcade-amber px-4 py-2 text-xs font-extrabold cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        )}

        {/* Tiêu đề chính gọn gàng */}
        <section className="flex items-center gap-3.5 px-1 pt-1">
          <NexusLogoMark className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
              BLOCK <span className="text-[#00f3ff]">NEXUS</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Chọn chế độ chơi để bắt đầu
            </p>
          </div>
        </section>

        {/* 2 Thẻ chọn chế độ chơi */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 items-stretch">
          {/* Chế độ 8x8 */}
          <div className="hud-drop flex">
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
              className="group cartridge-card hud-panel flex-1 p-5 sm:p-6 flex flex-col justify-between gap-5 cursor-pointer transition-[box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_rgba(0,243,255,0.72),inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
              <div
                className="cartridge-scan-beam"
                style={{
                  background:
                    'linear-gradient(180deg, transparent, rgba(0,243,255,0.16), transparent)',
                }}
              />

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Chiến Thuật 8×8
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300/90 mt-1.5 leading-relaxed">
                      Kéo thả khối trên lưới 8×8, xóa hàng ngang và dọc đồng thời để nhân chuỗi điểm.
                    </p>
                  </div>
                  <ModeDragIcon className="w-16 h-16 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5" />
                </div>

                <div className="grid grid-cols-3 gap-2.5 mt-5">
                  <div className="hud-panel-sm p-3">
                    <div className="text-[11px] text-slate-400">Kỷ lục</div>
                    <div className="font-mono font-extrabold text-base sm:text-lg text-white tabular-nums mt-1">
                      {(dragStats.allTimeHigh || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="hud-panel-sm p-3">
                    <div className="text-[11px] text-slate-400">Điểm tuần</div>
                    <div className="font-mono font-extrabold text-base sm:text-lg text-[#00f3ff] tabular-nums mt-1">
                      {isGuest ? '—' : (dragStats.weeklyScore || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="hud-panel-sm p-3">
                    <div className="text-[11px] text-slate-400">Chuỗi tối đa</div>
                    <div className="font-mono font-extrabold text-base sm:text-lg text-amber-300 tabular-nums mt-1">
                      x{dragStats.maxCombo || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-white/8">
                <span className="btn-arcade btn-arcade-cyan px-5 py-2.5 text-xs sm:text-sm font-extrabold inline-flex items-center gap-2">
                  <PlayTriIcon className="w-3.5 h-3.5" />
                  Chơi 8×8
                </span>
              </div>
            </div>
          </div>

          {/* Chế độ 10x20 */}
          <div className="hud-drop flex">
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
              className="group cartridge-card hud-panel-purple flex-1 p-5 sm:p-6 flex flex-col justify-between gap-5 cursor-pointer transition-[box-shadow] duration-200 hover:shadow-[inset_0_0_0_1px_rgba(188,19,254,0.78),inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
              <div
                className="cartridge-scan-beam"
                style={{
                  background:
                    'linear-gradient(180deg, transparent, rgba(188,19,254,0.2), transparent)',
                }}
              />

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Tốc Độ 10×20
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300/90 mt-1.5 leading-relaxed">
                      Xếp khối rơi cổ điển trên lưới 10×20, di chuyển, xoay khối và thả nhanh đồng bộ giữa điện thoại và máy tính.
                    </p>
                  </div>
                  <ModeDropIcon className="w-16 h-16 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5" />
                </div>

                <div className="grid grid-cols-3 gap-2.5 mt-5">
                  <div className="hud-panel-sm p-3">
                    <div className="text-[11px] text-slate-400">Kỷ lục</div>
                    <div className="font-mono font-extrabold text-base sm:text-lg text-white tabular-nums mt-1">
                      {(dropStats.allTimeHigh || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="hud-panel-sm p-3">
                    <div className="text-[11px] text-slate-400">Điểm tuần</div>
                    <div className="font-mono font-extrabold text-base sm:text-lg text-purple-300 tabular-nums mt-1">
                      {isGuest ? '—' : (dropStats.weeklyScore || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="hud-panel-sm p-3">
                    <div className="text-[11px] text-slate-400">Hàng tối đa</div>
                    <div className="font-mono font-extrabold text-base sm:text-lg text-cyan-300 tabular-nums mt-1">
                      {(dropStats.maxLines || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-white/8">
                <span className="btn-arcade btn-arcade-purple px-5 py-2.5 text-xs sm:text-sm font-extrabold inline-flex items-center gap-2">
                  <PlayTriIcon className="w-3.5 h-3.5" />
                  Chơi 10×20
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Thanh thưởng tuần */}
        <footer className="hud-drop">
          <div className="hud-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-300">
              <TrophyHexIcon className="w-5 h-5 shrink-0" />
              <span>Thưởng BXH Thứ Hai 00:00 (VN):</span>
              <span className="font-mono font-bold text-amber-300 tabular-nums">
                Hạng 1: +1,500 Xu
              </span>
              <span className="text-slate-500 select-none" aria-hidden="true">
                ·
              </span>
              <span className="font-mono font-bold text-slate-100 tabular-nums">
                Hạng 2: +800 Xu
              </span>
              <span className="text-slate-500 select-none" aria-hidden="true">
                ·
              </span>
              <span className="font-mono font-bold text-orange-300 tabular-nums">
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
              className="text-xs font-bold text-[#00f3ff] hover:text-cyan-200 cursor-pointer shrink-0"
            >
              Xem bảng xếp hạng →
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

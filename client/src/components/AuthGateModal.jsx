import { useState } from 'react';
import { AlertTriangle, Lock, LogIn, User, UserPlus } from 'lucide-react';
import { api } from '../utils/api';
import { soundEngine } from '../utils/sound';
import {
  CloseCrossIcon,
  NexusLogoMark,
  ShieldHexIcon,
} from './icons/NexusIcons';

export default function AuthGateModal({
  allowClose = false,
  isUpgradingGuest = false,
  guestRecords = null,
  initialTab = 'register',
  onAuthSuccess,
  onPlayAsGuest,
  onClose,
}) {
  const [tab, setTab] = useState(initialTab);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasGuestScoresToMigrate =
    isUpgradingGuest &&
    guestRecords &&
    ((guestRecords.dragMode?.allTimeHigh || 0) > 0 ||
      (guestRecords.dropMode?.allTimeHigh || 0) > 0);

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setError('');
    soundEngine.unlock();

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      setError('Tên đăng nhập cần tối thiểu 3 ký tự.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần tối thiểu 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      let data;
      if (tab === 'register') {
        data = await api.register({
          username: cleanUsername,
          password,
          guestStats: hasGuestScoresToMigrate ? guestRecords : undefined,
        });
      } else {
        data = await api.login({
          username: cleanUsername,
          password,
        });
      }
      soundEngine.playCoinPurchase();
      onAuthSuccess(data);
    } catch (err) {
      soundEngine.playInvalid();
      setError(err.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center safe-screen bg-[#040711]/84 backdrop-blur-md">
      <div className="hud-drop w-full max-w-md max-h-full overflow-y-auto animate-modal-in">
        <div className="hud-panel p-6 relative">
          {allowClose && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playButtonClick();
                onClose?.();
              }}
              className="btn-arcade btn-arcade-slate w-8 h-8 flex items-center justify-center text-slate-200 cursor-pointer absolute top-4 right-4"
              aria-label="Đóng"
            >
              <CloseCrossIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Tiêu đề */}
          <div className="flex items-center gap-3.5 mb-5 pr-8">
            <NexusLogoMark className="w-12 h-12 shrink-0" />
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {tab === 'register' ? 'Tạo tài khoản mới' : 'Đăng nhập tài khoản'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Đua Top tuần nhận tới{' '}
                <span className="font-mono text-amber-300 font-bold">1,500 Xu</span> và mở khóa 25 nền.
              </p>
            </div>
          </div>

          {/* Chuyển kỷ lục Khách */}
          {hasGuestScoresToMigrate && tab === 'register' && (
            <div className="mb-4 hud-panel-sm border border-emerald-400/40 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-emerald-200">
              <ShieldHexIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Chuyển kỷ lục Khách:</strong> Điểm cao cục bộ (
                <span className="font-mono font-bold tabular-nums">
                  8×8: {(guestRecords.dragMode?.allTimeHigh || 0).toLocaleString()}
                </span>{' '}
                ·{' '}
                <span className="font-mono font-bold tabular-nums">
                  10×20: {(guestRecords.dropMode?.allTimeHigh || 0).toLocaleString()}
                </span>
                ) sẽ được lưu vào tài khoản mới.
              </div>
            </div>
          )}

          {/* Tab Đăng ký / Đăng nhập */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                soundEngine.playButtonClick();
                setTab('register');
                setError('');
              }}
              className={`btn-arcade py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'register' ? 'btn-arcade-cyan' : 'btn-arcade-slate text-slate-300'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Đăng ký (+200 Xu)
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playButtonClick();
                setTab('login');
                setError('');
              }}
              className={`btn-arcade py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'login' ? 'btn-arcade-cyan' : 'btn-arcade-slate text-slate-300'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Đăng nhập
            </button>
          </div>

          {/* Biểu mẫu */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tên đăng nhập (3–20 ký tự)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  autoComplete="username"
                  placeholder="Nhập tên người chơi"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#050914] border border-white/15 focus:border-[#00f3ff] focus:outline-none text-sm text-white placeholder-slate-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu (tối thiểu 6 ký tự)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#050914] border border-white/15 focus:border-[#00f3ff] focus:outline-none text-sm text-white placeholder-slate-500 transition-colors"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/15 border border-rose-500/45 px-3.5 py-2.5 text-xs text-rose-200 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-arcade btn-arcade-cyan w-full py-3 font-extrabold text-sm cursor-pointer"
            >
              {loading
                ? 'Đang xử lý...'
                : tab === 'register'
                  ? 'Tạo tài khoản'
                  : 'Đăng nhập'}
            </button>
          </form>

          {/* Chế độ Khách */}
          {!isUpgradingGuest && onPlayAsGuest && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playButtonClick();
                  onPlayAsGuest();
                }}
                className="btn-arcade btn-arcade-slate w-full py-2.5 text-xs font-extrabold cursor-pointer"
              >
                Chơi với tư cách Khách
              </button>

              <div className="mt-2.5 flex items-start gap-2 bg-amber-500/10 border border-amber-400/30 p-2.5 text-[11px] leading-relaxed text-amber-200/90">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Tài khoản <strong>Khách</strong> chỉ lưu điểm cao trên thiết bị này,{' '}
                  <strong>không thể gửi điểm lên Bảng Xếp Hạng</strong> và{' '}
                  <strong>không nhận thưởng Xu hoặc mua nền trong Cửa hàng</strong>.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

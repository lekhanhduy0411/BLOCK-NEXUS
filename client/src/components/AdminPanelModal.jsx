import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Search, Shield, UserCheck } from 'lucide-react';
import { GAME_BACKGROUNDS } from '../data/backgrounds';
import { api } from '../utils/api';
import { soundEngine } from '../utils/sound';
import {
  CloseCrossIcon,
  FounderCrownIcon,
  NexusCoinIcon,
  ShopCoreIcon,
} from './icons/NexusIcons';

const QUICK_BUFF_PRESETS = [500, 2000, 5000, 10000, 50000];

export default function AdminPanelModal({ currentUser, onUserUpdated, onClose }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id || '');
  const [customAmount, setCustomAmount] = useState('5000');
  const [reason, setReason] = useState('Thưởng Xu từ Quản trị viên');
  const [busyAction, setBusyAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const loadUsers = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const res = await api.getAdminUsers(query);
      setUsers(res.users || []);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Không thể tải danh sách người chơi.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers('');
  }, [loadUsers]);

  const selectedUser =
    users.find((u) => u.id === selectedUserId) ||
    (selectedUserId === currentUser?.id ? currentUser : null);

  const applyLocalUserPatch = (updatedTarget, isSelf) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedTarget.id ? updatedTarget : u)));
    if (isSelf || updatedTarget.id === currentUser?.id) {
      onUserUpdated(updatedTarget);
    }
  };

  const handleBuffCoins = async (amountValue) => {
    const parsed = Math.trunc(Number(amountValue));
    if (!Number.isFinite(parsed) || parsed === 0) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập số Xu khác 0 hợp lệ.' });
      return;
    }
    if (!selectedUserId) {
      setStatusMessage({ type: 'error', text: 'Vui lòng chọn người chơi cần nạp Xu.' });
      return;
    }

    setBusyAction(true);
    setStatusMessage(null);
    try {
      const res = await api.adminBuffCoins({
        targetUserId: selectedUserId,
        amount: parsed,
        reason: reason.trim() || 'Thưởng Xu từ Quản trị viên',
      });
      soundEngine.playCoinPurchase();
      applyLocalUserPatch(res.targetUser, res.isSelf);
      setStatusMessage({
        type: 'success',
        text: `Đã ${res.delta >= 0 ? 'cộng' : 'trừ'} ${res.delta >= 0 ? '+' : ''}${res.delta.toLocaleString()} Xu cho ${res.targetUser.username} (Số dư mới: ${res.targetUser.coins.toLocaleString()} Xu).`,
      });
    } catch (err) {
      soundEngine.playInvalid();
      setStatusMessage({ type: 'error', text: err.message || 'Thao tác thất bại.' });
    } finally {
      setBusyAction(false);
    }
  };

  const handleUnlockAllBg = async () => {
    if (!selectedUserId) return;
    setBusyAction(true);
    setStatusMessage(null);
    try {
      const res = await api.adminUnlockAllBackgrounds(selectedUserId);
      soundEngine.playLevelUp();
      applyLocalUserPatch(res.targetUser, res.isSelf);
      setStatusMessage({
        type: 'success',
        text: `Đã mở khóa đủ ${res.unlockedCount} nền cho ${res.targetUser.username}.`,
      });
    } catch (err) {
      soundEngine.playInvalid();
      setStatusMessage({ type: 'error', text: err.message || 'Không thể mở khóa nền.' });
    } finally {
      setBusyAction(false);
    }
  };

  const handleToggleRole = async (target) => {
    const nextRole = target.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setBusyAction(true);
    setStatusMessage(null);
    try {
      const res = await api.adminSetRole({ targetUserId: target.id, role: nextRole });
      soundEngine.playButtonClick();
      applyLocalUserPatch(res.targetUser, target.id === currentUser?.id);
      setStatusMessage({
        type: 'success',
        text: `Đã cập nhật vai trò của ${res.targetUser.username} thành ${
          res.targetUser.role === 'ADMIN' ? 'Quản trị' : 'Người chơi'
        }.`,
      });
    } catch (err) {
      soundEngine.playInvalid();
      setStatusMessage({ type: 'error', text: err.message || 'Không thể đổi quyền.' });
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center safe-screen bg-[#040711]/84 backdrop-blur-md">
      <div className="hud-drop w-full max-w-4xl h-full max-h-full flex flex-col min-h-0 animate-modal-in">
        <div className="hud-panel-amber flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Tiêu đề */}
          <div className="px-5 py-4 border-b border-amber-400/25 shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FounderCrownIcon className="w-9 h-9 shrink-0" />
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  BẢNG QUẢN TRỊ
                </h2>
                <p className="text-xs text-amber-100/75">
                  Cấp Xu, quản lý quyền và mở khóa 25 giao diện nền
                </p>
              </div>
            </div>

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

          {/* Thông báo */}
          {statusMessage && (
            <div
              className={`mx-5 mt-3 px-3.5 py-2.5 text-xs font-semibold border flex items-center gap-2 shrink-0 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-400/45 text-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Nội dung 2 cột bọc trong scroll container độc lập */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Cột trái: Danh sách người chơi */}
            <div className="lg:col-span-6 flex flex-col gap-3 min-h-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') loadUsers(search);
                    }}
                    placeholder="Tìm tên tài khoản"
                    className="w-full pl-9 pr-3 py-2 bg-[#050914] border border-white/15 focus:border-amber-400 focus:outline-none text-xs sm:text-sm text-white placeholder-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => loadUsers(search)}
                  className="btn-arcade btn-arcade-slate px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Tìm
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
                <span>Tổng tài khoản: {users.length}</span>
                <button
                  type="button"
                  onClick={() => setSelectedUserId(currentUser?.id || '')}
                  className="text-amber-300 font-bold hover:underline cursor-pointer"
                >
                  Chọn bản thân ({currentUser?.username})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-[340px] pr-1">
                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Đang tải danh sách...
                  </div>
                ) : users.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Không tìm thấy tài khoản phù hợp.
                  </div>
                ) : (
                  users.map((u) => {
                    const isSelected = u.id === selectedUserId;
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          soundEngine.playButtonClick();
                          setSelectedUserId(u.id);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setSelectedUserId(u.id);
                        }}
                        className={`hud-panel-sm p-3 border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/18 border-amber-400'
                            : 'border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-white truncate">
                              {u.username}
                            </span>
                            {u.role === 'ADMIN' && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-400 text-slate-950">
                                Quản trị
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-cyan-500/20 border border-cyan-400/45 text-cyan-300">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                            Nền: {u.ownedBackgrounds?.length || 1}/{GAME_BACKGROUNDS.length} · Kỷ lục 8×8:{' '}
                            {(u.records?.dragMode?.allTimeHigh || 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 font-mono font-extrabold text-xs text-amber-200 tabular-nums shrink-0">
                          <NexusCoinIcon className="w-4 h-4" />
                          {(u.coins || 0).toLocaleString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cột phải: Bảng nạp Xu */}
            <div className="lg:col-span-6 hud-panel-sm p-4 border border-amber-400/25 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-amber-500/18 border border-amber-400/45 flex items-center justify-center text-amber-300">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Tài khoản đang chọn</div>
                    <div className="font-extrabold text-base text-white">
                      {selectedUser ? selectedUser.username : '—'}
                    </div>
                  </div>
                </div>

                {selectedUser && (
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Số dư hiện tại</div>
                    <div className="font-mono font-extrabold text-lg text-amber-200 flex items-center justify-end gap-1.5 tabular-nums">
                      <NexusCoinIcon className="w-4 h-4" />
                      {(selectedUser.coins || 0).toLocaleString()} Xu
                    </div>
                  </div>
                )}
              </div>

              {/* Nạp nhanh */}
              <div>
                <div className="text-xs font-bold text-amber-300 mb-2">Cộng Xu nhanh</div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {QUICK_BUFF_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={busyAction || !selectedUser}
                      onClick={() => handleBuffCoins(amt)}
                      className="btn-arcade btn-arcade-amber py-2 font-mono font-extrabold text-xs cursor-pointer"
                    >
                      +{amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nhập số tùy chỉnh */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-300">
                  Số Xu tùy chỉnh (nhập số âm để trừ)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="10000"
                    className="px-3.5 py-2.5 bg-[#050914] border border-white/15 focus:border-amber-400 focus:outline-none font-mono text-sm text-white tabular-nums"
                  />
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ghi chú lý do"
                    className="px-3.5 py-2.5 bg-[#050914] border border-white/15 focus:border-amber-400 focus:outline-none text-xs text-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={busyAction || !selectedUser}
                  onClick={() => handleBuffCoins(customAmount)}
                  className="btn-arcade btn-arcade-amber w-full py-3 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <NexusCoinIcon className="w-4 h-4" />
                  {busyAction ? 'Đang xử lý...' : 'Xác nhận cộng Xu'}
                </button>
              </div>

              {/* Tiện ích bổ sung */}
              {selectedUser && (
                <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-auto">
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleUnlockAllBg}
                    className="btn-arcade btn-arcade-purple py-2.5 px-3 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShopCoreIcon className="w-4 h-4" />
                    Mở khóa đủ 25 nền
                  </button>

                  <button
                    type="button"
                    disabled={busyAction || selectedUser.id === currentUser?.id}
                    onClick={() => handleToggleRole(selectedUser)}
                    className="btn-arcade btn-arcade-slate py-2.5 px-3 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-cyan-300" />
                    {selectedUser.role === 'ADMIN' ? 'Hạ xuống Người chơi' : 'Cấp quyền Quản trị'}
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

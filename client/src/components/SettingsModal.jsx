import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { BLOCK_SKINS } from '../constants/themes';
import { soundEngine } from '../utils/sound';
import { triggerHaptic } from '../utils/haptics';
import {
  BgmSynthIcon,
  CloseCrossIcon,
  GearHexIcon,
  HapticPulseIcon,
  HomeHexIcon,
  ReplayArcIcon,
  SkinPrismIcon,
  SlidersHexIcon,
  SoundWaveIcon,
  SwitchModeIcon,
} from './icons/NexusIcons';

function HudToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        soundEngine.unlock();
        soundEngine.playButtonClick();
        triggerHaptic('tap');
        onChange(!checked);
      }}
      className={`relative w-16 h-8 p-1 border transition-colors cursor-pointer shrink-0 flex items-center ${
        checked
          ? 'bg-emerald-950/90 border-emerald-400/75 justify-end'
          : 'bg-[#090e1c] border-slate-600/60 justify-start'
      }`}
      style={{
        clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
      }}
    >
      <span
        className={`text-[10px] font-extrabold absolute ${
          checked ? 'left-2 text-emerald-300' : 'right-2 text-slate-500'
        }`}
      >
        {checked ? 'Bật' : 'Tắt'}
      </span>
      <span
        className={`w-6 h-5.5 border transition-colors ${
          checked
            ? 'bg-gradient-to-b from-emerald-300 to-emerald-500 border-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
            : 'bg-gradient-to-b from-slate-500 to-slate-700 border-slate-400'
        }`}
      />
    </button>
  );
}

export default function SettingsModal({
  settings,
  currentMode,
  onUpdateSettings,
  onGoHome,
  onReplay,
  onSwitchMode,
  onClose,
}) {
  const [subPanel, setSubPanel] = useState(null); // null | 'more' | 'skin'

  const toggleSetting = (key) => {
    onUpdateSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040711]/82 backdrop-blur-md">
      <div className="hud-drop w-full max-w-sm animate-modal-in">
        <div className="hud-panel overflow-hidden">
          {/* Tiêu đề */}
          <div className="px-5 py-4 border-b border-cyan-400/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {subPanel ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setSubPanel(null);
                  }}
                  className="btn-arcade btn-arcade-slate w-8 h-8 flex items-center justify-center text-cyan-300 cursor-pointer"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <GearHexIcon className="w-6 h-6" />
              )}
              <h2 className="text-base font-extrabold text-white">
                {subPanel === 'more'
                  ? 'Cài đặt thêm'
                  : subPanel === 'skin'
                    ? 'Giao diện khối'
                    : 'Cài đặt'}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playButtonClick();
                onClose();
              }}
              className="btn-arcade btn-arcade-slate w-8 h-8 flex items-center justify-center text-slate-200 cursor-pointer"
              aria-label="Đóng"
            >
              <CloseCrossIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Mục con: Cài đặt thêm */}
          {subPanel === 'more' ? (
            <div className="p-4 space-y-2.5">
              <div className="hud-panel-sm flex items-center justify-between p-3.5">
                <div className="pr-3">
                  <div className="text-sm font-bold text-white">Khung gợi ý</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Hiện bóng định vị điểm rơi & vị trí đặt khối
                  </div>
                </div>
                <HudToggleSwitch
                  checked={settings.ghostPreview}
                  onChange={() => toggleSetting('ghostPreview')}
                  label="Bật/tắt khung gợi ý"
                />
              </div>

              <div className="hud-panel-sm flex items-center justify-between p-3.5">
                <div className="pr-3">
                  <div className="text-sm font-bold text-white">Vệt sáng khối rơi</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Hiệu ứng vệt sáng chuyển động ở chế độ 10×20
                  </div>
                </div>
                <HudToggleSwitch
                  checked={settings.motionTrail}
                  onChange={() => toggleSetting('motionTrail')}
                  label="Bật/tắt vệt sáng khối rơi"
                />
              </div>

              {/* Độ tối nền (0% - 75%) */}
              <div className="hud-panel-sm p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-white">Độ tối nền</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Tăng tương phản giữa khối xếp và khung cảnh nền
                    </div>
                  </div>
                  <span className="font-mono font-black text-sm text-[#00f3ff] tabular-nums shrink-0">
                    {Math.round((settings.backdropDim ?? 0.35) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={75}
                  step={5}
                  value={Math.round((settings.backdropDim ?? 0.35) * 100)}
                  onChange={(e) => {
                    const nextDim = Math.max(0, Math.min(0.75, Number(e.target.value) / 100));
                    onUpdateSettings({ ...settings, backdropDim: nextDim });
                  }}
                  aria-label="Độ tối nền"
                  className="mt-3 w-full accent-[#00f3ff] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>0%</span>
                  <span>35%</span>
                  <span>75%</span>
                </div>
              </div>

              {/* Làm mờ nền */}
              <div className="hud-panel-sm flex items-center justify-between p-3.5">
                <div className="pr-3">
                  <div className="text-sm font-bold text-white">Làm mờ nền</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Phủ lớp mờ nhẹ giúp tập trung hoàn toàn vào bàn chơi
                  </div>
                </div>
                <HudToggleSwitch
                  checked={Boolean(settings.backdropBlur)}
                  onChange={() => toggleSetting('backdropBlur')}
                  label="Bật/tắt làm mờ nền"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setSubPanel(null);
                }}
                className="btn-arcade btn-arcade-cyan w-full mt-2 py-2.5 text-xs font-extrabold cursor-pointer"
              >
                Xong
              </button>
            </div>
          ) : subPanel === 'skin' ? (
            /* Mục con: Chọn giao diện khối */
            <div className="p-4 space-y-2.5">
              {BLOCK_SKINS.map((skin) => {
                const selected = settings.blockSkin === skin.id;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playButtonClick();
                      triggerHaptic('tap');
                      onUpdateSettings({ ...settings, blockSkin: skin.id });
                    }}
                    className={`w-full text-left p-3.5 hud-panel-sm border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      selected
                        ? 'border-[#00f3ff] bg-cyan-500/12'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {skin.name}
                        {selected && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 bg-[#00f3ff] text-slate-950">
                            <Check className="w-3 h-3" />
                            Đang dùng
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{skin.description}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {skin.previewColors.map((col) => (
                        <span
                          key={col}
                          className="w-5 h-5 border border-white/60"
                          style={{
                            backgroundColor: col,
                            opacity: skin.id === 'SPATIAL_GLASS' ? 0.72 : 1,
                          }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setSubPanel(null);
                }}
                className="btn-arcade btn-arcade-cyan w-full mt-1 py-2.5 text-xs font-extrabold cursor-pointer"
              >
                Áp dụng
              </button>
            </div>
          ) : (
            /* Bố cục chuẩn 8 hàng dọc */
            <div className="p-4 space-y-2">
              {/* 1. Âm thanh */}
              <div className="hud-panel-sm flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-3">
                  <SoundWaveIcon className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm text-white">Âm thanh</span>
                </div>
                <HudToggleSwitch
                  checked={settings.sound}
                  onChange={() => toggleSetting('sound')}
                  label="Bật/tắt âm thanh"
                />
              </div>

              {/* 2. Nhạc nền */}
              <div className="hud-panel-sm flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-3">
                  <BgmSynthIcon className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm text-white">Nhạc nền</span>
                </div>
                <HudToggleSwitch
                  checked={settings.bgm}
                  onChange={() => toggleSetting('bgm')}
                  label="Bật/tắt nhạc nền"
                />
              </div>

              {/* 3. Rung */}
              <div className="hud-panel-sm flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-3">
                  <HapticPulseIcon className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm text-white">Rung</span>
                </div>
                <HudToggleSwitch
                  checked={settings.vibration}
                  onChange={() => toggleSetting('vibration')}
                  label="Bật/tắt rung"
                />
              </div>

              {/* 4. Trang chủ */}
              <div className="hud-panel-sm flex items-center justify-between px-3.5 py-2">
                <div className="flex items-center gap-3">
                  <HomeHexIcon className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm text-white">Trang chủ</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onGoHome();
                  }}
                  className="btn-arcade btn-arcade-green w-24 py-1.5 font-extrabold text-xs cursor-pointer"
                >
                  Quay về
                </button>
              </div>

              {/* 5. Chơi lại */}
              <div className="hud-panel-sm flex items-center justify-between px-3.5 py-2">
                <div className="flex items-center gap-3">
                  <ReplayArcIcon className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm text-white">Chơi lại</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onReplay();
                  }}
                  className="btn-arcade btn-arcade-green w-24 py-1.5 font-extrabold text-xs cursor-pointer"
                >
                  Chơi
                </button>
              </div>

              {/* 6. Đổi chế độ */}
              <div className="hud-panel-sm flex items-center justify-between px-3.5 py-2">
                <div className="flex items-center gap-3">
                  <SwitchModeIcon className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-white leading-tight">Đổi chế độ</div>
                    <div className="text-[11px] text-slate-400">
                      {currentMode === 'dragMode' ? 'Sang Tốc Độ 10×20' : 'Sang Chiến Thuật 8×8'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onSwitchMode();
                  }}
                  className="btn-arcade btn-arcade-green w-24 py-1.5 font-extrabold text-xs cursor-pointer"
                >
                  Bắt đầu
                </button>
              </div>

              {/* 7. Cài đặt thêm */}
              <div className="hud-panel-sm flex items-center justify-between px-3.5 py-2">
                <div className="flex items-center gap-3">
                  <SlidersHexIcon className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm text-white">Cài đặt thêm</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setSubPanel('more');
                  }}
                  className="btn-arcade btn-arcade-green w-24 py-1.5 font-extrabold text-xs cursor-pointer"
                >
                  Mở
                </button>
              </div>

              {/* 8. Giao diện khối */}
              <div className="hud-panel-sm flex items-center justify-between px-3.5 py-2">
                <div className="flex items-center gap-3">
                  <SkinPrismIcon className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm text-white">Giao diện khối</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setSubPanel('skin');
                  }}
                  className="btn-arcade btn-arcade-cyan w-24 py-1.5 font-extrabold text-xs cursor-pointer"
                >
                  Chọn
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

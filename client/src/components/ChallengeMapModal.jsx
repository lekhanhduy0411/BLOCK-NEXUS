import { useEffect, useMemo, useState } from 'react';
import { Check, Crown, Flame, Lock, Play, Swords, Target, Trophy, X } from 'lucide-react';
import {
  CHAPTERS,
  getAllChallengeStages,
} from '../utils/challengeStages';
import { soundEngine } from '../utils/sound';
import { NexusCoinIcon } from './icons/NexusIcons';

export default function ChallengeMapModal({
  initialBranch = '8x8',
  progress,
  isGuest = true,
  onSelectStage,
  onOpenLeaderboard,
  onClose,
}) {
  const allStages = useMemo(() => getAllChallengeStages(), []);
  const [branch, setBranch] = useState(initialBranch === '10x20' ? '10x20' : '8x8');

  const getBranchHighest = (targetBranch) =>
    targetBranch === '8x8'
      ? Math.max(0, Math.min(50, progress?.strategistHighest || 0))
      : Math.max(0, Math.min(50, progress?.velocityHighest || 0));

  const getBranchBestScores = (targetBranch) =>
    targetBranch === '8x8'
      ? progress?.strategistBestScores || {}
      : progress?.velocityBestScores || {};

  const initialHighest = getBranchHighest(branch);
  const initialFocusStage = Math.min(50, initialHighest + 1);
  const [chapterNum, setChapterNum] = useState(
    () => Math.floor((initialFocusStage - 1) / 10) + 1
  );
  const [selectedStageNum, setSelectedStageNum] = useState(initialFocusStage);

  // When switching branch, auto-open the chapter containing the current frontier stage
  useEffect(() => {
    const h = getBranchHighest(branch);
    const nextStage = Math.min(50, h + 1);
    setChapterNum(Math.floor((nextStage - 1) / 10) + 1);
    setSelectedStageNum(nextStage);
  }, [branch, progress?.strategistHighest, progress?.velocityHighest]);

  const strategistHighest = getBranchHighest('8x8');
  const velocityHighest = getBranchHighest('10x20');
  const currentHighest = branch === '8x8' ? strategistHighest : velocityHighest;
  const bestScores = getBranchBestScores(branch);

  const branchStages = allStages[branch];
  const activeChapter = CHAPTERS[chapterNum - 1] || CHAPTERS[0];
  const chapterStages = branchStages.slice(activeChapter.startStage - 1, activeChapter.endStage);
  const selectedStage = branchStages[selectedStageNum - 1] || branchStages[0];

  const isSelectedCleared = selectedStage.stageNumber <= currentHighest;
  const isSelectedUnlocked = selectedStage.stageNumber <= currentHighest + 1;
  const selectedBestScore = Number(bestScores[String(selectedStage.stageNumber)] || 0);
  const branchPct = Math.round((currentHighest / 50) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#040711]/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="hud-drop w-full max-w-4xl max-h-[93dvh] flex flex-col min-h-0 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hud-panel flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-cyan-400/20 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 hud-panel-sm border border-amber-400/55 bg-amber-500/12 flex items-center justify-center text-amber-300 shrink-0">
                <Swords className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
                  CHIẾN DỊCH 50 MÀN THỬ THÁCH
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  Tiến trình vĩnh viễn · Không tính giờ · Thưởng tối đa 10.000 Xu
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  onOpenLeaderboard();
                }}
                className="btn-arcade btn-arcade-amber px-3 h-9 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                title="Bảng Xếp Hạng Thử Thách"
              >
                <Trophy className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">BXH Thử Thách</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  onClose();
                }}
                className="btn-arcade btn-arcade-slate w-9 h-9 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2 Branch Tabs + Progress Bar */}
          <div className="px-4 sm:px-5 py-3 bg-[#050914] border-b border-white/10 space-y-2.5 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setBranch('8x8');
                }}
                className={`btn-arcade py-2.5 px-3 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer ${
                  branch === '8x8' ? 'btn-arcade-cyan' : 'btn-arcade-slate text-slate-300'
                }`}
              >
                <span className="truncate">Chiến Thuật 8×8</span>
                <span className="font-mono text-xs px-1.5 py-0.5 bg-black/30 tabular-nums">
                  {strategistHighest}/50
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonClick();
                  setBranch('10x20');
                }}
                className={`btn-arcade py-2.5 px-3 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer ${
                  branch === '10x20' ? 'btn-arcade-purple' : 'btn-arcade-slate text-slate-300'
                }`}
              >
                <span className="truncate">Tốc Độ 10×20</span>
                <span className="font-mono text-xs px-1.5 py-0.5 bg-black/30 tabular-nums">
                  {velocityHighest}/50
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-900 border border-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    branch === '8x8'
                      ? 'bg-gradient-to-r from-[#00f3ff] to-cyan-400'
                      : 'bg-gradient-to-r from-[#bc13fe] to-fuchsia-400'
                  }`}
                  style={{ width: `${branchPct}%` }}
                />
              </div>
              <span className="font-mono text-xs font-bold text-slate-300 tabular-nums shrink-0">
                {currentHighest}/50 ({branchPct}%)
              </span>
            </div>

            {/* 5 Chapter Tabs (C1 -> C5) */}
            <div className="grid grid-cols-5 gap-1.5">
              {CHAPTERS.map((ch) => {
                const active = chapterNum === ch.number;
                const clearedInChapter = Math.max(
                  0,
                  Math.min(10, currentHighest - (ch.startStage - 1))
                );
                return (
                  <button
                    key={ch.number}
                    type="button"
                    onClick={() => {
                      soundEngine.playButtonClick();
                      setChapterNum(ch.number);
                      const firstUnlockedInChapter = Math.min(
                        ch.endStage,
                        Math.max(ch.startStage, Math.min(currentHighest + 1, ch.endStage))
                      );
                      setSelectedStageNum(
                        currentHighest >= ch.startStage - 1 ? firstUnlockedInChapter : ch.startStage
                      );
                    }}
                    className={`py-1.5 px-1 border text-center transition-colors cursor-pointer ${
                      active
                        ? 'bg-cyan-500/20 border-[#00f3ff] text-white'
                        : 'bg-[#090f20] border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-mono font-black text-xs leading-none">
                      C{ch.number}
                    </div>
                    <div className="text-[10px] truncate mt-0.5 hidden sm:block">
                      {ch.name}
                    </div>
                    <div className="font-mono text-[9px] text-cyan-300/85 tabular-nums mt-0.5">
                      {clearedInChapter}/10
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Body: 10-Stage Grid + Selected Stage Details */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs sm:text-sm font-extrabold text-white">
                Chương {activeChapter.number}:{' '}
                <span className="text-[#00f3ff]">{activeChapter.name}</span>{' '}
                <span className="text-slate-400 font-mono text-xs">
                  (Màn {activeChapter.startStage}–{activeChapter.endStage})
                </span>
              </div>
              <div className="text-[11px] text-amber-300/90 font-semibold hidden sm:block">
                Màn {activeChapter.endStage}: Trùm Cuối Chương
              </div>
            </div>

            {/* 10-Stage Tile Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {chapterStages.map((stage) => {
                const cleared = stage.stageNumber <= currentHighest;
                const isFrontier = stage.stageNumber === currentHighest + 1;
                const locked = stage.stageNumber > currentHighest + 1;
                const selected = stage.stageNumber === selectedStageNum;
                const best = Number(bestScores[String(stage.stageNumber)] || 0);

                let cardStyle = 'bg-[#090f20] border-white/12 text-slate-400';
                if (stage.isBoss) {
                  cardStyle = locked
                    ? 'bg-amber-950/20 border-amber-500/35 text-amber-300/60'
                    : cleared
                      ? 'bg-gradient-to-br from-amber-950/65 to-emerald-950/45 border-amber-400/80 text-white shadow-[0_0_16px_rgba(245,158,11,0.28)]'
                      : 'bg-gradient-to-br from-amber-950/80 via-orange-950/70 to-[#140d06] border-amber-400 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.45)]';
                } else if (isFrontier) {
                  cardStyle =
                    'bg-cyan-950/45 border-[#00f3ff] text-white shadow-[0_0_18px_rgba(0,243,255,0.4)] animate-pulse';
                } else if (cleared) {
                  cardStyle =
                    'bg-emerald-950/35 border-emerald-400/50 text-white hover:border-emerald-300';
                } else if (!locked) {
                  cardStyle = 'bg-[#0b1329] border-cyan-400/40 text-white';
                }

                return (
                  <button
                    key={stage.stageNumber}
                    type="button"
                    onClick={() => {
                      soundEngine.playButtonClick();
                      setSelectedStageNum(stage.stageNumber);
                    }}
                    className={`relative p-2.5 border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[82px] ${cardStyle} ${
                      selected ? 'ring-2 ring-white/90 scale-[1.02]' : ''
                    } ${locked ? 'opacity-65' : ''}`}
                  >
                    {/* Top Row: Stage Number + Status Icon */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-black text-base leading-none tabular-nums">
                        {stage.isBoss ? `BOSS ${stage.stageNumber}` : `Màn ${stage.stageNumber}`}
                      </span>
                      {stage.isBoss ? (
                        <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                      ) : cleared ? (
                        <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      ) : locked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      ) : (
                        <Flame className="w-3.5 h-3.5 text-[#00f3ff] shrink-0" />
                      )}
                    </div>

                    {/* Bottom Row: Reward or Cleared Record */}
                    <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1">
                      {cleared ? (
                        <>
                          <span className="text-[10px] font-bold text-emerald-300 truncate">
                            Đã nhận
                          </span>
                          <span className="font-mono text-[10px] font-extrabold text-slate-200 tabular-nums">
                            {best.toLocaleString()}đ
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className={`text-[10px] font-bold ${
                              stage.isBoss ? 'text-amber-300' : 'text-slate-400'
                            }`}
                          >
                            {isFrontier ? 'Mở khóa' : locked ? 'Khóa' : 'Thưởng'}
                          </span>
                          <span
                            className={`font-mono text-[11px] font-black tabular-nums ${
                              stage.isBoss ? 'text-amber-300' : 'text-amber-200'
                            }`}
                          >
                            +{stage.reward} Xu
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Stage Details Box */}
            <div
              className={`hud-panel-sm p-4 border ${
                selectedStage.isBoss
                  ? 'border-amber-400/75 bg-gradient-to-r from-amber-950/40 via-[#0b1226] to-[#080d1d]'
                  : 'border-cyan-400/40 bg-[#080f22]'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold px-2 py-0.5 bg-white/10 border border-white/15 text-slate-200">
                      Chương {selectedStage.chapterNumber} · {selectedStage.chapterName}
                    </span>
                    {selectedStage.isBoss && (
                      <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 bg-amber-400 text-slate-950">
                        <Crown className="w-3.5 h-3.5" />
                        MÀN BOSS
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-400">
                      {branch === '8x8'
                        ? `Khởi đầu: ${selectedStage.presetBlocks} ô chướng ngại`
                        : `Cấp ${selectedStage.startLevel} · ${selectedStage.garbageRows} hàng rác đáy`}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Màn {selectedStage.stageNumber}/50{' '}
                    <span className="text-sm font-semibold text-slate-400">
                      ({branch === '8x8' ? 'Chiến Thuật 8×8' : 'Tốc Độ 10×20'})
                    </span>
                  </h3>
                </div>

                {/* Reward / Status Pill */}
                <div className="shrink-0">
                  {isSelectedCleared ? (
                    <div className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-400/45 text-xs font-bold text-emerald-200 tabular-nums">
                      Đã nhận thưởng · Kỷ lục:{' '}
                      <span className="font-mono font-black text-white">
                        {selectedBestScore.toLocaleString()}đ
                      </span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 bg-amber-500/15 border border-amber-400/60 inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-300 font-mono tabular-nums">
                      <NexusCoinIcon className="w-4 h-4 shrink-0" />
                      +{selectedStage.reward.toLocaleString()} Xu
                      {isGuest && (
                        <span className="text-[10px] font-sans font-semibold text-amber-200/80 ml-1">
                          (lần đầu)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Objectives List */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedStage.objectives.map((obj, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 bg-[#050a17] border border-white/10 flex items-center gap-2 text-xs sm:text-sm font-bold text-cyan-100"
                  >
                    <Target className="w-4 h-4 text-[#00f3ff] shrink-0" />
                    <span>{obj.label}</span>
                  </div>
                ))}
              </div>

              {/* Action CTA */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  disabled={!isSelectedUnlocked}
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playButtonClick();
                    onSelectStage(selectedStage);
                  }}
                  className={`btn-arcade flex-1 min-w-[200px] py-3 text-sm sm:text-base font-black uppercase tracking-wider inline-flex items-center justify-center gap-2 ${
                    !isSelectedUnlocked
                      ? 'btn-arcade-slate opacity-55 cursor-not-allowed'
                      : selectedStage.isBoss
                        ? 'btn-arcade-amber cursor-pointer'
                        : branch === '8x8'
                          ? 'btn-arcade-cyan cursor-pointer'
                          : 'btn-arcade-purple cursor-pointer'
                  }`}
                >
                  {isSelectedUnlocked ? (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      {isSelectedCleared
                        ? `Chơi lại Màn ${selectedStage.stageNumber} (Phá kỷ lục)`
                        : `Chơi Màn ${selectedStage.stageNumber}`}
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Hoàn thành Màn {selectedStage.stageNumber - 1} để mở khóa
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    onOpenLeaderboard();
                  }}
                  className="btn-arcade btn-arcade-slate px-4 py-3 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>BXH Thử Thách</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

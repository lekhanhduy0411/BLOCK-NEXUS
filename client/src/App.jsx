import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, X } from 'lucide-react';
import LoadingScreen from './components/LoadingScreen';
import HomeScreen from './components/HomeScreen';
import GameplayScreen from './components/GameplayScreen';
import ResultScreen from './components/ResultScreen';
import AuthGateModal from './components/AuthGateModal';
import LeaderboardModal from './components/LeaderboardModal';
import ShopModal from './components/ShopModal';
import DailyQuestsModal from './components/DailyQuestsModal';
import ChallengeMapModal from './components/ChallengeMapModal';
import ChallengeResultModal from './components/ChallengeResultModal';
import AdminPanelModal from './components/AdminPanelModal';
import SettingsModal from './components/SettingsModal';
import { api } from './utils/api';
import { getChallengeStage } from './utils/challengeStages';
import { soundEngine } from './utils/sound';
import { setVibrationEnabled } from './utils/haptics';
import {
  clearGuestRecords,
  clearGuestSession,
  clearStrategistSnapshot,
  createGuestSession,
  getAuthToken,
  getCachedUser,
  getGuestRecords,
  getGuestSession,
  loadLocalChallengeProgress,
  loadSettings,
  loadStrategistSnapshot,
  normalizeChallengeProgress,
  recordLocalChallengeCompletion,
  saveGuestScore,
  saveLocalChallengeProgress,
  saveSettings,
  setAuthToken,
  setCachedUser,
} from './utils/storage';

// Centralized Application State Machine: LOADING -> HOME -> PLAYING -> RESULT
export default function App() {
  const [screen, setScreen] = useState('LOADING');
  const [activeMode, setActiveMode] = useState('dragMode'); // 'dragMode' | 'dropMode'
  const [runId, setRunId] = useState(1);

  // Auth & Profile State
  const [currentUser, setCurrentUser] = useState(() => getCachedUser());
  const [guestSession, setGuestSession] = useState(() => getGuestSession());
  const [guestRecords, setGuestRecords] = useState(() => getGuestRecords());

  // Persistent Universal Settings
  const [settings, setSettings] = useState(() => loadSettings());

  // 8×8 Saved Snapshot State
  const [savedDragSnapshot, setSavedDragSnapshot] = useState(() => loadStrategistSnapshot());
  const [activeDragSnapshot, setActiveDragSnapshot] = useState(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // 10×20 Auto-Pause & 3-2-1 Countdown State
  const [autoPaused, setAutoPaused] = useState(false);
  const [resumeSignal, setResumeSignal] = useState(0);

  // 50-Stage Campaign Challenge State
  const [challengeProgress, setChallengeProgress] = useState(() =>
    normalizeChallengeProgress(getCachedUser()?.challenge || loadLocalChallengeProgress())
  );
  const [showChallengeMap, setShowChallengeMap] = useState(false);
  const [challengeMapBranch, setChallengeMapBranch] = useState('8x8');
  const [activeChallengeStage, setActiveChallengeStage] = useState(null);
  const [challengeOutcome, setChallengeOutcome] = useState(null);

  // Modals State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState({
    allowClose: false,
    isUpgradingGuest: false,
    initialTab: 'register',
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState('dragMode');
  const [leaderboardChallengeFilter, setLeaderboardChallengeFilter] = useState('all');
  const [showShop, setShowShop] = useState(false);
  const [showDailyQuests, setShowDailyQuests] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Active Match Session (Anti-Cheat), Live Rival HUD & Share Card SVG Ref
  const activeSessionRef = useRef({ promise: null, sessionId: null, mode: null });
  const currentSessionIdRef = useRef(null);
  const backdropSvgRef = useRef(null);
  const [liveRival, setLiveRival] = useState(null);
  const [rivalLeaderboard, setRivalLeaderboard] = useState([]);

  // Result & Score Sync State (Endless mode)
  const [lastResult, setLastResult] = useState(null);
  const [syncState, setSyncState] = useState({
    status: 'idle',
    weeklyRank: null,
    matchCoinsAwarded: 0,
    dailyCoinsEarned: 0,
    dailyCoinCap: 200,
    error: '',
  });

  const isGuest = !currentUser;

  // Fire-and-forget Render wake-up ping immediately on app mount
  useEffect(() => {
    api.wakeUpServer();
  }, []);

  // Refresh saved 8×8 snapshot whenever returning to HOME
  useEffect(() => {
    if (screen === 'HOME') {
      setSavedDragSnapshot(loadStrategistSnapshot());
    }
  }, [screen]);

  // Apply Audio & Vibration Settings whenever updated
  useEffect(() => {
    soundEngine.setSfxEnabled(settings.sound);
    soundEngine.setBgmEnabled(settings.bgm);
    setVibrationEnabled(settings.vibration);
    saveSettings(settings);
  }, [settings]);

  // Unlock Web Audio on first user pointer/key gesture
  useEffect(() => {
    const unlockAudio = () => soundEngine.unlock();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Silently sync Daily Quests & 50-Stage Campaign Progress when logged-in player is on HOME
  useEffect(() => {
    if (screen !== 'HOME' || isGuest) return;
    let active = true;

    api
      .getDailyQuests()
      .then((res) => {
        if (!active) return;
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            dailyDateKey: res.dailyDateKey,
            dailyCoinsEarned: res.dailyCoinsEarned ?? 0,
            dailyQuests: res.dailyQuests || [],
          };
          setCachedUser(next);
          return next;
        });
      })
      .catch(() => {});

    api
      .getChallengeStages()
      .then((res) => {
        if (!active || !res?.progress) return;
        const normalized = normalizeChallengeProgress(res.progress);
        setChallengeProgress(normalized);
        saveLocalChallengeProgress(normalized);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [screen, isGuest]);

  // Optimistic Startup: never block user waiting for Render cold start; never nag Guests with popups
  const handleLoadingComplete = useCallback(async () => {
    const token = getAuthToken();
    const cached = getCachedUser();
    const existingGuest = getGuestSession();

    if (token) {
      if (cached) {
        setCurrentUser(cached);
        if (cached.challenge) {
          setChallengeProgress(normalizeChallengeProgress(cached.challenge));
        }
        setScreen('HOME');
        api
          .getMe()
          .then((res) => {
            setCurrentUser(res.user);
            setCachedUser(res.user);
            if (res.user?.challenge) {
              const norm = normalizeChallengeProgress(res.user.challenge);
              setChallengeProgress(norm);
              saveLocalChallengeProgress(norm);
            }
          })
          .catch((err) => {
            if (err.status === 401) {
              setAuthToken(null);
              setCachedUser(null);
              setCurrentUser(null);
              const fallbackGuest = existingGuest || createGuestSession();
              setGuestSession(fallbackGuest);
              setGuestRecords(getGuestRecords());
              setChallengeProgress(loadLocalChallengeProgress());
            }
          });
        return;
      }

      try {
        const res = await api.getMe();
        setCurrentUser(res.user);
        setCachedUser(res.user);
        if (res.user?.challenge) {
          const norm = normalizeChallengeProgress(res.user.challenge);
          setChallengeProgress(norm);
          saveLocalChallengeProgress(norm);
        }
        setScreen('HOME');
        return;
      } catch (err) {
        if (err.status === 401) {
          setAuthToken(null);
          setCachedUser(null);
          setCurrentUser(null);
        }
      }
    }

    const guest = existingGuest || createGuestSession();
    setGuestSession(guest);
    setGuestRecords(getGuestRecords());
    setChallengeProgress(loadLocalChallengeProgress());
    setScreen('HOME');
  }, []);

  const handleAuthSuccess = useCallback((authPayload) => {
    setAuthToken(authPayload.token);
    setCurrentUser(authPayload.user);
    setCachedUser(authPayload.user);
    if (authPayload.user?.challenge) {
      const norm = normalizeChallengeProgress(authPayload.user.challenge);
      setChallengeProgress(norm);
      saveLocalChallengeProgress(norm);
    }
    clearGuestSession();
    clearGuestRecords();
    setGuestSession(null);
    setGuestRecords(getGuestRecords());
    setShowAuthModal(false);
  }, []);

  const handlePlayAsGuest = useCallback(() => {
    const created = createGuestSession();
    setGuestSession(created);
    setGuestRecords(getGuestRecords());
    setCurrentUser(null);
    setAuthToken(null);
    setCachedUser(null);
    setChallengeProgress(loadLocalChallengeProgress());
    setShowAuthModal(false);
  }, []);

  const handleOpenRegisterFromGuest = useCallback(() => {
    setShowLeaderboard(false);
    setShowShop(false);
    setAuthModalConfig({
      allowClose: true,
      isUpgradingGuest: Boolean(guestSession),
      initialTab: 'register',
    });
    setShowAuthModal(true);
  }, [guestSession]);

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setCachedUser(null);
    setCurrentUser(null);
    const created = createGuestSession();
    setGuestSession(created);
    setGuestRecords(getGuestRecords());
    setChallengeProgress(loadLocalChallengeProgress());
    setActiveChallengeStage(null);
    setAutoPaused(false);
    setScreen('HOME');
  }, []);

  const handleUserUpdated = useCallback((updatedUser) => {
    setCurrentUser(updatedUser);
    setCachedUser(updatedUser);
    if (updatedUser?.challenge) {
      const norm = normalizeChallengeProgress(updatedUser.challenge);
      setChallengeProgress(norm);
      saveLocalChallengeProgress(norm);
    }
  }, []);

  const handleClaimRewards = useCallback(async () => {
    try {
      const res = await api.claimRewards();
      handleUserUpdated(res.user);
    } catch {
      // Ignore network hiccup
    }
  }, [handleUserUpdated]);

  const beginMatchSession = useCallback(
    (mode, resumedSessionId = null) => {
      setLiveRival(null);
      setRivalLeaderboard([]);
      if (isGuest) {
        activeSessionRef.current = { promise: null, sessionId: null, mode };
        currentSessionIdRef.current = null;
        return;
      }

      if (resumedSessionId) {
        const resolved = Promise.resolve(resumedSessionId);
        activeSessionRef.current = {
          promise: resolved,
          sessionId: resumedSessionId,
          mode,
        };
        currentSessionIdRef.current = resumedSessionId;
        api
          .getLeaderboard(mode)
          .then((res) => {
            if (activeSessionRef.current.promise === resolved && Array.isArray(res?.entries)) {
              setRivalLeaderboard(res.entries);
            }
          })
          .catch(() => {});
        return;
      }

      currentSessionIdRef.current = null;
      const sessionPromise = api
        .startGame(mode)
        .then((res) => {
          if (activeSessionRef.current.promise === sessionPromise) {
            activeSessionRef.current.sessionId = res.sessionId;
            currentSessionIdRef.current = res.sessionId;
            setLiveRival(res.nextRival || null);
          }
          return res.sessionId;
        })
        .catch(() => null);

      activeSessionRef.current = {
        promise: sessionPromise,
        sessionId: null,
        mode,
      };

      api
        .getLeaderboard(mode)
        .then((res) => {
          if (activeSessionRef.current.promise === sessionPromise && Array.isArray(res?.entries)) {
            setRivalLeaderboard(res.entries);
          }
        })
        .catch(() => {});
    },
    [isGuest]
  );

  const launchEndlessGame = useCallback(
    (mode, snapshotToResume = null) => {
      setActiveChallengeStage(null);
      setChallengeOutcome(null);
      setActiveMode(mode);
      setActiveDragSnapshot(mode === 'dragMode' ? snapshotToResume : null);
      setLastResult(null);
      setAutoPaused(false);
      setSyncState({
        status: 'idle',
        weeklyRank: null,
        matchCoinsAwarded: 0,
        dailyCoinsEarned: currentUser?.dailyCoinsEarned ?? 0,
        dailyCoinCap: 200,
        error: '',
      });
      setShowSettings(false);
      setShowResumePrompt(false);
      setRunId((id) => id + 1);
      setScreen('PLAYING');
      beginMatchSession(mode, snapshotToResume?.sessionId || null);
    },
    [beginMatchSession, currentUser?.dailyCoinsEarned]
  );

  const handleStartGame = useCallback(
    (mode) => {
      if (mode === 'dragMode') {
        const snap = loadStrategistSnapshot();
        if (snap) {
          setSavedDragSnapshot(snap);
          setShowResumePrompt(true);
          return;
        }
      }
      launchEndlessGame(mode, null);
    },
    [launchEndlessGame]
  );

  const handleLaunchChallengeStage = useCallback((stage) => {
    if (!stage) return;
    setShowChallengeMap(false);
    setShowSettings(false);
    setShowResumePrompt(false);
    setLastResult(null);
    setChallengeOutcome(null);
    setActiveDragSnapshot(null);
    setAutoPaused(false);
    setActiveChallengeStage(stage);
    setActiveMode(stage.mode === '8x8' ? 'dragMode' : 'dropMode');
    setRunId((id) => id + 1);
    setScreen('PLAYING');
  }, []);

  const submitScoreToBackend = useCallback(
    async (mode, stats) => {
      setSyncState((prev) => ({ ...prev, status: 'syncing', error: '' }));
      try {
        let sessionId = activeSessionRef.current.sessionId;
        if (!sessionId && activeSessionRef.current.promise) {
          sessionId = await activeSessionRef.current.promise;
        }
        if (!sessionId) {
          throw new Error(
            'Không khởi tạo được phiên thi đấu với máy chủ. Vui lòng thử lại ở ván sau.'
          );
        }

        const res = await api.submitScore({
          mode,
          score: stats.score,
          maxCombo: stats.maxCombo || 0,
          linesCleared: stats.linesCleared || 0,
          level: stats.level || 1,
          sessionId,
        });
        handleUserUpdated(res.user);
        setSyncState({
          status: 'synced',
          weeklyRank: res.weeklyRank,
          matchCoinsAwarded: res.matchCoinsAwarded ?? 0,
          dailyCoinsEarned: res.dailyCoinsEarned ?? 0,
          dailyCoinCap: res.dailyCoinCap ?? 200,
          error: '',
        });
      } catch (err) {
        setSyncState((prev) => ({
          ...prev,
          status: 'error',
          error: err.message || 'Không thể đồng bộ điểm lúc này.',
        }));
      }
    },
    [handleUserUpdated]
  );

  const handleStageWin = useCallback(
    async (stats) => {
      if (!activeChallengeStage) return;
      const stage = activeChallengeStage;
      setAutoPaused(false);

      if (isGuest) {
        const localRes = recordLocalChallengeCompletion({
          mode: stage.mode,
          stageNumber: stage.stageNumber,
          score: stats.score || 0,
        });
        setChallengeProgress(localRes.challenge);
        setChallengeOutcome({
          won: true,
          stats,
          newlyCleared: localRes.newlyCleared,
          coinsAwarded: 0,
          improvedStageScore: localRes.improvedStageScore,
          syncing: false,
          error: '',
        });
        setScreen('RESULT');
        return;
      }

      // Logged-in user: show victory immediately while syncing reward + leaderboard with server
      setChallengeOutcome({
        won: true,
        stats,
        newlyCleared: false,
        coinsAwarded: 0,
        improvedStageScore: false,
        syncing: true,
        error: '',
      });
      setScreen('RESULT');

      try {
        const res = await api.completeChallengeStage({
          mode: stage.mode,
          stageNumber: stage.stageNumber,
          stats: {
            score: stats.score || 0,
            linesCleared: stats.linesCleared || 0,
            maxCombo: stats.maxCombo || 0,
            tetrises: stats.tetrises || 0,
          },
        });
        if (res.user) {
          handleUserUpdated(res.user);
        } else if (res.challenge) {
          const norm = normalizeChallengeProgress(res.challenge);
          setChallengeProgress(norm);
          saveLocalChallengeProgress(norm);
        }
        setChallengeOutcome({
          won: true,
          stats,
          newlyCleared: Boolean(res.newlyCleared),
          coinsAwarded: res.coinsAwarded ?? 0,
          improvedStageScore: Boolean(res.improvedStageScore),
          syncing: false,
          error: '',
        });
      } catch (err) {
        const localFallback = recordLocalChallengeCompletion({
          mode: stage.mode,
          stageNumber: stage.stageNumber,
          score: stats.score || 0,
        });
        setChallengeProgress(localFallback.challenge);
        setChallengeOutcome({
          won: true,
          stats,
          newlyCleared: localFallback.newlyCleared,
          coinsAwarded: 0,
          improvedStageScore: localFallback.improvedStageScore,
          syncing: false,
          error: err.message || 'Không thể đồng bộ chiến thắng lên máy chủ lúc này.',
        });
      }
    },
    [activeChallengeStage, isGuest, handleUserUpdated]
  );

  const handleGameOver = useCallback(
    (stats) => {
      setAutoPaused(false);

      // Campaign Challenge Loss
      if (activeChallengeStage) {
        setChallengeOutcome({
          won: false,
          stats,
          newlyCleared: false,
          coinsAwarded: 0,
          improvedStageScore: false,
          syncing: false,
          error: '',
        });
        setScreen('RESULT');
        return;
      }

      // Endless Game Over
      if (activeMode === 'dragMode') {
        clearStrategistSnapshot();
        setSavedDragSnapshot(null);
      }

      if (isGuest) {
        const { records, isNewRecord } = saveGuestScore(activeMode, stats);
        setGuestRecords(records);
        setLastResult({ ...stats, isNewRecord });
        setSyncState({
          status: 'idle',
          weeklyRank: null,
          matchCoinsAwarded: 0,
          dailyCoinsEarned: 0,
          dailyCoinCap: 200,
          error: '',
        });
        setScreen('RESULT');
      } else {
        const prevBest = currentUser?.records?.[activeMode]?.allTimeHigh || 0;
        const isNewRecord = stats.score > prevBest;
        setLastResult({ ...stats, isNewRecord });
        setScreen('RESULT');
        submitScoreToBackend(activeMode, stats);
      }
    },
    [activeChallengeStage, activeMode, currentUser, isGuest, submitScoreToBackend]
  );

  // Settings & Pause modal actions
  const handleSettingsGoHome = useCallback(() => {
    setShowSettings(false);
    setAutoPaused(false);
    setLastResult(null);
    setChallengeOutcome(null);
    setActiveChallengeStage(null);
    setActiveDragSnapshot(null);
    setScreen('HOME');
  }, []);

  const handleSettingsReplay = useCallback(() => {
    if (activeChallengeStage) {
      handleLaunchChallengeStage(activeChallengeStage);
      return;
    }
    if (activeMode === 'dragMode') {
      clearStrategistSnapshot();
      setSavedDragSnapshot(null);
    }
    launchEndlessGame(activeMode, null);
  }, [activeChallengeStage, activeMode, handleLaunchChallengeStage, launchEndlessGame]);

  const handleSettingsSwitchMode = useCallback(() => {
    const nextMode = activeMode === 'dragMode' ? 'dropMode' : 'dragMode';
    setShowSettings(false);
    setAutoPaused(false);
    setActiveChallengeStage(null);
    setChallengeOutcome(null);
    launchEndlessGame(nextMode, null);
  }, [activeMode, launchEndlessGame]);

  const handleAutoPause = useCallback(() => {
    if (activeMode === 'dropMode' && screen === 'PLAYING') {
      setAutoPaused(true);
    }
  }, [activeMode, screen]);

  const handleResumeAutoPause = useCallback(() => {
    setAutoPaused(false);
    setResumeSignal((n) => n + 1);
  }, []);

  const currentPersonalBest = isGuest
    ? guestRecords[activeMode]?.allTimeHigh || 0
    : currentUser?.records?.[activeMode]?.allTimeHigh || 0;

  const equippedBackground = isGuest
    ? 'BG_DEFAULT'
    : currentUser?.equippedBackground || 'BG_DEFAULT';

  const isGamePaused =
    screen !== 'PLAYING' ||
    autoPaused ||
    showSettings ||
    showAuthModal ||
    showLeaderboard ||
    showShop ||
    showDailyQuests ||
    showChallengeMap ||
    showAdminPanel;

  const playerDisplayName = isGuest
    ? guestSession?.username || 'Khách'
    : currentUser?.username || 'Người chơi';

  return (
    <div className="min-h-dvh w-full bg-[#070913] text-slate-100">
      {screen === 'LOADING' && <LoadingScreen onComplete={handleLoadingComplete} />}

      {screen === 'HOME' && (
        <HomeScreen
          isGuest={isGuest}
          currentUser={currentUser}
          guestSession={guestSession}
          guestRecords={guestRecords}
          challengeProgress={challengeProgress}
          savedDragSnapshot={savedDragSnapshot}
          onStartGame={handleStartGame}
          onOpenChallenges={(branch = '8x8') => {
            setChallengeMapBranch(branch);
            setShowChallengeMap(true);
          }}
          onOpenLeaderboard={(m = 'dragMode') => {
            setLeaderboardMode(m);
            setLeaderboardChallengeFilter('all');
            setShowLeaderboard(true);
          }}
          onOpenShop={() => setShowShop(true)}
          onOpenQuests={() => setShowDailyQuests(true)}
          onOpenAdmin={() => setShowAdminPanel(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenRegister={handleOpenRegisterFromGuest}
          onLogout={handleLogout}
          onClaimRewards={handleClaimRewards}
        />
      )}

      {(screen === 'PLAYING' || screen === 'RESULT') && (
        <GameplayScreen
          mode={activeMode}
          runId={runId}
          isPaused={isGamePaused}
          autoPaused={autoPaused}
          resumeSignal={resumeSignal}
          isGuest={isGuest}
          currentUser={currentUser}
          settings={settings}
          equippedBackground={equippedBackground}
          personalBest={currentPersonalBest}
          initialRival={liveRival}
          leaderboardEntries={rivalLeaderboard}
          backdropSvgRef={backdropSvgRef}
          initialSnapshot={activeDragSnapshot}
          sessionIdRef={currentSessionIdRef}
          challengeStage={activeChallengeStage}
          onOpenSettings={() => setShowSettings(true)}
          onAutoPause={handleAutoPause}
          onResumeAutoPause={handleResumeAutoPause}
          onReplay={handleSettingsReplay}
          onGoHome={handleSettingsGoHome}
          onGameOver={handleGameOver}
          onStageWin={handleStageWin}
          resultOverlay={
            screen === 'RESULT' ? (
              activeChallengeStage ? (
                <ChallengeResultModal
                  stage={activeChallengeStage}
                  outcome={challengeOutcome}
                  isGuest={isGuest}
                  onPlayNext={() => {
                    const nextStage = getChallengeStage(
                      activeChallengeStage.mode,
                      activeChallengeStage.stageNumber + 1
                    );
                    if (nextStage) handleLaunchChallengeStage(nextStage);
                  }}
                  onRetry={() => handleLaunchChallengeStage(activeChallengeStage)}
                  onOpenMap={() => {
                    setChallengeMapBranch(activeChallengeStage.mode);
                    setActiveChallengeStage(null);
                    setChallengeOutcome(null);
                    setScreen('HOME');
                    setShowChallengeMap(true);
                  }}
                />
              ) : (
                <ResultScreen
                  mode={activeMode}
                  result={lastResult}
                  isGuest={isGuest}
                  playerName={playerDisplayName}
                  equippedBackground={equippedBackground}
                  backdropSvgRef={backdropSvgRef}
                  syncState={syncState}
                  onPlayAgain={handleSettingsReplay}
                  onGoHome={handleSettingsGoHome}
                  onOpenLeaderboard={() => {
                    setLeaderboardMode(activeMode);
                    setShowLeaderboard(true);
                  }}
                  onRetrySync={() =>
                    lastResult && submitScoreToBackend(activeMode, lastResult)
                  }
                />
              )
            ) : null
          }
        />
      )}

      {/* 8×8 Endless Saved Match Resume Prompt */}
      {showResumePrompt && savedDragSnapshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040711]/82 backdrop-blur-md"
          onClick={() => setShowResumePrompt(false)}
        >
          <div
            className="hud-drop w-full max-w-sm animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hud-panel p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    Chiến Thuật 8×8
                  </div>
                  <h2 className="text-lg font-black text-white mt-0.5">
                    Phát hiện ván đang chơi dở
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setShowResumePrompt(false);
                  }}
                  className="btn-arcade btn-arcade-slate w-8 h-8 flex items-center justify-center cursor-pointer"
                  aria-label="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="hud-panel-sm p-3.5 border border-cyan-400/35 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Điểm đang lưu</span>
                <span className="font-mono font-black text-2xl text-[#00f3ff] tabular-nums">
                  {(savedDragSnapshot.score || 0).toLocaleString()}
                </span>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playButtonClick();
                    launchEndlessGame('dragMode', savedDragSnapshot);
                  }}
                  className="btn-arcade btn-arcade-cyan w-full py-3 font-black text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    Tiếp tục ván cũ ({(savedDragSnapshot.score || 0).toLocaleString()}đ)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playButtonClick();
                    clearStrategistSnapshot();
                    setSavedDragSnapshot(null);
                    launchEndlessGame('dragMode', null);
                  }}
                  className="btn-arcade btn-arcade-slate w-full py-2.5 font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Chơi ván mới</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 50-Stage Campaign Selector Modal */}
      {showChallengeMap && (
        <ChallengeMapModal
          initialBranch={challengeMapBranch}
          progress={challengeProgress}
          isGuest={isGuest}
          onSelectStage={handleLaunchChallengeStage}
          onOpenLeaderboard={() => {
            setShowChallengeMap(false);
            setLeaderboardMode('challenge');
            setLeaderboardChallengeFilter('all');
            setShowLeaderboard(true);
          }}
          onClose={() => setShowChallengeMap(false)}
        />
      )}

      {/* Account Auth Modal (user-initiated only) */}
      {showAuthModal && (
        <AuthGateModal
          allowClose={authModalConfig.allowClose}
          isUpgradingGuest={authModalConfig.isUpgradingGuest}
          initialTab={authModalConfig.initialTab}
          guestRecords={guestRecords}
          onAuthSuccess={handleAuthSuccess}
          onPlayAsGuest={!authModalConfig.isUpgradingGuest ? handlePlayAsGuest : undefined}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Weekly & 50-Stage Campaign Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal
          initialMode={leaderboardMode}
          initialChallengeFilter={leaderboardChallengeFilter}
          isGuest={isGuest}
          currentUser={currentUser}
          localChallengeProgress={challengeProgress}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* Background Shop Modal */}
      {showShop && (
        <ShopModal
          isGuest={isGuest}
          currentUser={currentUser}
          settings={settings}
          onUpdateSettings={setSettings}
          onUserUpdated={handleUserUpdated}
          onOpenRegister={handleOpenRegisterFromGuest}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* Daily Quests Modal (logged-in accounts only) */}
      {showDailyQuests && !isGuest && (
        <DailyQuestsModal
          currentUser={currentUser}
          onUserUpdated={handleUserUpdated}
          onClose={() => setShowDailyQuests(false)}
        />
      )}

      {/* Founder Admin Coin Buff Console (ADMIN role only) */}
      {showAdminPanel && !isGuest && currentUser?.role === 'ADMIN' && (
        <AdminPanelModal
          currentUser={currentUser}
          onUserUpdated={handleUserUpdated}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {/* Universal 8-Row Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          currentMode={activeMode}
          onUpdateSettings={setSettings}
          onGoHome={handleSettingsGoHome}
          onReplay={handleSettingsReplay}
          onSwitchMode={handleSettingsSwitchMode}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

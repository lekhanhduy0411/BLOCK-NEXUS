import { useEffect, useRef } from 'react';
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import {
  drawGhostBlock,
  drawMiniPiecePreview,
  drawRoundedRect,
  drawStyledBlock,
  hexToRgba,
} from './blockRenderer';
import { soundEngine } from '../utils/sound';
import { triggerHaptic } from '../utils/haptics';
import { createSeededRng } from '../utils/seededRng';
import { checkObjectivesCompleted } from '../utils/challengeStages';

const COLS = 10;
const ROWS = 20;

// Pro DAS / ARR & Lock Delay Timing Constants (ms)
const DAS_MS = 160;
const ARR_MS = 32;
const BUTTON_HOLD_DELAY_MS = 200; // Initial delay before on-screen button auto-repeats (prevents 2-cell single tap)
const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 12; // Move-Reset Lock Delay cap (resets only when piece drops below lowestYReached)
const HARD_DROP_STREAK_SEC = 0.06; // 60ms high-speed motion blur streak
const MAX_BANK_TILT_RAD = (4 * Math.PI) / 180; // ±4deg banking tilt

const TETROMINOES = {
  I: {
    color: '#00f3ff',
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    preview: [[1, 1, 1, 1]],
  },
  O: {
    color: '#f59e0b',
    matrix: [
      [1, 1],
      [1, 1],
    ],
    preview: [
      [1, 1],
      [1, 1],
    ],
  },
  T: {
    color: '#bc13fe',
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    preview: [
      [0, 1, 0],
      [1, 1, 1],
    ],
  },
  S: {
    color: '#10b981',
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    preview: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  Z: {
    color: '#ff2e93',
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    preview: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
  J: {
    color: '#38bdf8',
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    preview: [
      [1, 0, 0],
      [1, 1, 1],
    ],
  },
  L: {
    color: '#fb923c',
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    preview: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
};

const PIECE_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Official SRS Wall Kick Offset Tables
const JLSTZ_KICKS = {
  '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

const I_KICKS = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function createGarbageBoard(garbageRows, rng) {
  const board = createEmptyBoard();
  const count = Math.max(0, Math.min(12, Math.floor(garbageRows || 0)));
  const garbagePalette = ['#475569', '#64748b', '#3b4c68'];
  let prevPrimaryHole = -1;

  for (let i = 0; i < count; i += 1) {
    const rowIdx = ROWS - 1 - i;
    let hole1 = Math.floor(rng() * COLS);
    if (hole1 === prevPrimaryHole) {
      hole1 = (hole1 + 1 + Math.floor(rng() * (COLS - 2))) % COLS;
    }
    prevPrimaryHole = hole1;

    const extraHole = rng() < 0.45 ? (hole1 + 2 + Math.floor(rng() * (COLS - 3))) % COLS : -1;

    for (let c = 0; c < COLS; c += 1) {
      if (c === hole1 || c === extraHole) continue;
      board[rowIdx][c] = garbagePalette[(rowIdx + c) % garbagePalette.length];
    }
  }
  return board;
}

function shuffleBag(rng = Math.random) {
  const bag = [...PIECE_KEYS];
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function rotateMatrixCW(mat) {
  const n = mat.length;
  const out = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      out[c][n - 1 - r] = mat[r][c];
    }
  }
  return out;
}

function rotateMatrixCCW(mat) {
  const n = mat.length;
  const out = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      out[n - 1 - c][r] = mat[r][c];
    }
  }
  return out;
}

function getDropIntervalMs(level) {
  return Math.max(70, Math.round(820 * Math.pow(0.84, level - 1)));
}

function getMatrixPivot(matrix) {
  let minR = matrix.length;
  let maxR = -1;
  let minC = matrix[0].length;
  let maxC = -1;
  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = 0; c < matrix[r].length; c += 1) {
      if (matrix[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  return {
    cx: (minC + maxC + 1) / 2,
    cy: (minR + maxR + 1) / 2,
  };
}

export default function VelocityEngine({
  isPaused,
  settings,
  theme,
  challengeStage = null,
  onHudUpdate,
  onGameOver,
  onStageWin,
  onAutoPause,
  resumeSignal = 0,
}) {
  const boardContainerRef = useRef(null);
  const canvasRef = useRef(null);
  const nextCanvasRefs = useRef([null, null, null]);
  const actionsRef = useRef(null);
  const holdTimeoutRef = useRef(null);
  const repeatIntervalRef = useRef(null);
  const countdownRef = useRef({ active: false, remaining: 0, lastStep: 0 });
  const prevResumeSignalRef = useRef(resumeSignal);

  const settingsRef = useRef(settings);
  const themeRef = useRef(theme);
  const pausedRef = useRef(isPaused);
  const hudCallbackRef = useRef(onHudUpdate);
  const gameOverCallbackRef = useRef(onGameOver);
  const stageWinCallbackRef = useRef(onStageWin);
  const autoPauseCallbackRef = useRef(onAutoPause);

  useEffect(() => {
    settingsRef.current = settings;
    actionsRef.current?.redrawPreviews?.();
  }, [settings]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    hudCallbackRef.current = onHudUpdate;
    gameOverCallbackRef.current = onGameOver;
    stageWinCallbackRef.current = onStageWin;
    autoPauseCallbackRef.current = onAutoPause;
  }, [onHudUpdate, onGameOver, onStageWin, onAutoPause]);

  // Trigger 3 -> 2 -> 1 countdown on Canvas whenever player clicks Resume after Auto-Pause
  useEffect(() => {
    if (resumeSignal > prevResumeSignalRef.current) {
      prevResumeSignalRef.current = resumeSignal;
      countdownRef.current = {
        active: true,
        remaining: 2.4, // 3 beats × 0.8s each (3 -> 2 -> 1)
        lastStep: 4,
      };
    }
  }, [resumeSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = boardContainerRef.current;
    if (!canvas || !container) return undefined;

    const ctx = canvas.getContext('2d');
    const isChallenge = Boolean(challengeStage);
    const stageRng = isChallenge ? createSeededRng(challengeStage.seed) : null;
    const bagRng = stageRng || Math.random;
    const initialBoard =
      isChallenge && (challengeStage.garbageRows || 0) > 0
        ? createGarbageBoard(challengeStage.garbageRows, stageRng)
        : createEmptyBoard();
    const initialLevel = isChallenge ? Math.max(1, challengeStage.startLevel || 1) : 1;

    const state = {
      board: initialBoard,
      bag: [...shuffleBag(bagRng), ...shuffleBag(bagRng)],
      // Active piece separates Logical Grid State (gridX, gridY, rotation)
      // from Visual Interpolated State (visualX, visualY, visualRotOffset, bankTilt)
      active: null,
      score: 0,
      lines: 0,
      tetrises: 0,
      level: initialLevel,
      startLevel: initialLevel,
      combo: -1,
      b2b: false,
      dropTimer: 0,
      lockTimer: 0,
      lockResets: 0,
      isGameOver: false,
      gameOverDelay: 0,
      isStageCleared: false,
      stageWinDelay: 0,
      // Visual FX
      particles: [],
      hardDropStreaks: [], // { matrix, color, gridX, startY, endY, elapsed, duration }
      lineFlashRows: [], // { row, alpha }
      floatingTexts: [],
      // Subtle 3px vertical canvas bounce & multi-clear shake
      bounceOffsetY: 0,
      bounceVelocityY: 0,
      shakeTime: 0,
      shakeMagnitude: 0,
      // Custom DAS / ARR Keyboard Controller (ignores OS repeat)
      keys: {
        left: false,
        right: false,
        down: false,
      },
      dasDir: 0,
      dasTimer: 0,
      arrTimer: 0,
      layout: {
        width: 260,
        height: 520,
        cellSize: 26,
        dpr: 1,
      },
    };

    const syncHud = () => {
      hudCallbackRef.current?.({
        score: state.score,
        level: state.level,
        linesCleared: state.lines,
        tetrises: state.tetrises,
        combo: Math.max(0, state.combo),
      });
    };

    const redrawPreviews = () => {
      const skin = settingsRef.current.blockSkin || 'CYBER_NEON';
      for (let i = 0; i < 3; i += 1) {
        const nextType = state.bag[i];
        const nextCanvas = nextCanvasRefs.current[i];
        if (nextCanvas && nextType) {
          const def = TETROMINOES[nextType];
          drawMiniPiecePreview(nextCanvas, def.preview, def.color, skin);
        }
      }
    };

    const collides = (matrix, gx, gy) => {
      for (let r = 0; r < matrix.length; r += 1) {
        for (let c = 0; c < matrix[r].length; c += 1) {
          if (!matrix[r][c]) continue;
          const bx = gx + c;
          const by = gy + r;
          if (bx < 0 || bx >= COLS || by >= ROWS) return true;
          if (by >= 0 && state.board[by][bx] !== null) return true;
        }
      }
      return false;
    };

    const getGhostY = (piece) => {
      let gy = piece.gridY;
      while (!collides(piece.matrix, piece.gridX, gy + 1)) {
        gy += 1;
      }
      return gy;
    };

    const spawnParticles = (cx, cy, color, count = 8) => {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 55 + Math.random() * 175;
        state.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 45,
          size: 2.5 + Math.random() * 4,
          color,
          life: 0.35 + Math.random() * 0.3,
          maxLife: 0.65,
        });
      }
    };

    const addFloatingText = (x, y, text, color = '#00f3ff', size = 20) => {
      state.floatingTexts.push({
        x,
        y,
        text,
        color,
        size,
        life: 0.9,
        maxLife: 0.9,
      });
    };

    const isInputBlocked = () =>
      pausedRef.current ||
      state.isGameOver ||
      state.isStageCleared ||
      countdownRef.current.active;

    const spawnNextPiece = (forcedType = null) => {
      if (state.bag.length < 7) {
        state.bag.push(...shuffleBag(bagRng));
      }
      const type = forcedType || state.bag.shift();
      const def = TETROMINOES[type];
      const matrix = def.matrix.map((row) => [...row]);
      const startX = Math.floor((COLS - matrix[0].length) / 2);
      const startY = type === 'I' ? -1 : 0;

      const candidate = {
        type,
        color: def.color,
        matrix,
        // Logical Grid Coordinates
        gridX: startX,
        gridY: startY,
        lowestYReached: startY,
        rotation: 0,
        // Visual Interpolated Coordinates
        visualX: startX,
        visualY: startY,
        visualRotOffset: 0,
        bankTilt: 0,
      };

      if (collides(candidate.matrix, candidate.gridX, candidate.gridY)) {
        state.active = candidate;
        state.isGameOver = true;
        state.gameOverDelay = 0.65;
        soundEngine.playGameOver();
        triggerHaptic('gameOver');
        addFloatingText(
          state.layout.width / 2,
          state.layout.height * 0.45,
          'CHẠM ĐỈNH',
          '#ff2e93',
          24
        );
      } else {
        state.active = candidate;
        state.dropTimer = 0;
        state.lockTimer = 0;
        state.lockResets = 0;
      }
      redrawPreviews();
    };

    const trackLowestY = (piece) => {
      if (piece && piece.gridY > piece.lowestYReached) {
        piece.lowestYReached = piece.gridY;
        state.lockResets = 0;
      }
    };

    const moveHorizontal = (dir) => {
      if (!state.active || isInputBlocked()) return false;
      if (!collides(state.active.matrix, state.active.gridX + dir, state.active.gridY)) {
        state.active.gridX += dir;
        soundEngine.playMove();
        if (
          collides(state.active.matrix, state.active.gridX, state.active.gridY + 1) &&
          state.lockResets < MAX_LOCK_RESETS
        ) {
          state.lockTimer = 0;
          state.lockResets += 1;
        }
        return true;
      }
      return false;
    };

    const rotatePiece = (dir) => {
      if (!state.active || isInputBlocked()) return false;
      if (state.active.type === 'O') return true;

      const fromRot = state.active.rotation;
      const toRot = (fromRot + (dir > 0 ? 1 : 3)) % 4;
      const rotated =
        dir > 0 ? rotateMatrixCW(state.active.matrix) : rotateMatrixCCW(state.active.matrix);
      const kickKey = `${fromRot}>${toRot}`;
      const kicks = state.active.type === 'I' ? I_KICKS[kickKey] : JLSTZ_KICKS[kickKey];

      for (const [dx, dy] of kicks) {
        if (!collides(rotated, state.active.gridX + dx, state.active.gridY + dy)) {
          state.active.matrix = rotated;
          state.active.gridX += dx;
          state.active.gridY += dy;
          state.active.rotation = toRot;
          trackLowestY(state.active);
          // Smooth 90° visual rotation spring: start offset by -90° (or +90°) and decay to 0
          state.active.visualRotOffset += dir > 0 ? -Math.PI / 2 : Math.PI / 2;
          // Keep visualRotOffset clamped so rapid double-rotations stay crisp
          state.active.visualRotOffset = Math.max(
            -Math.PI,
            Math.min(Math.PI, state.active.visualRotOffset)
          );

          soundEngine.playRotate();
          triggerHaptic('rotate');

          if (
            collides(state.active.matrix, state.active.gridX, state.active.gridY + 1) &&
            state.lockResets < MAX_LOCK_RESETS
          ) {
            state.lockTimer = 0;
            state.lockResets += 1;
          }
          return true;
        }
      }
      return false;
    };

    const lockActivePiece = () => {
      if (!state.active) return;
      const { matrix, gridX, gridY, color } = state.active;
      const { cellSize } = state.layout;

      let outOfTop = false;
      for (let r = 0; r < matrix.length; r += 1) {
        for (let c = 0; c < matrix[r].length; c += 1) {
          if (!matrix[r][c]) continue;
          const by = gridY + r;
          const bx = gridX + c;
          if (by < 0) {
            outOfTop = true;
          } else if (by < ROWS && bx >= 0 && bx < COLS) {
            state.board[by][bx] = color;
          }
        }
      }

      if (outOfTop) {
        state.isGameOver = true;
        state.gameOverDelay = 0.5;
        soundEngine.playGameOver();
        triggerHaptic('gameOver');
        return;
      }

      // Check completed lines
      const fullRows = [];
      for (let r = 0; r < ROWS; r += 1) {
        if (state.board[r].every((cell) => cell !== null)) {
          fullRows.push(r);
        }
      }

      if (fullRows.length > 0) {
        state.combo += 1;
        const cleared = fullRows.length;
        const prevLevel = state.level;
        state.lines += cleared;
        state.level = Math.max(state.startLevel, state.startLevel + Math.floor(state.lines / 10));

        const baseTable = { 1: 100, 2: 300, 3: 500, 4: 800 };
        let pts = (baseTable[cleared] || 800) * state.level;
        const isTetris = cleared === 4;
        if (isTetris) {
          state.tetrises += 1;
        }
        if (isTetris && state.b2b) {
          pts = Math.round(pts * 1.5);
        }
        state.b2b = isTetris;

        if (state.combo > 0) {
          pts += 50 * state.combo * state.level;
        }
        state.score += pts;

        fullRows.forEach((rowIdx) => {
          state.lineFlashRows.push({ row: rowIdx, alpha: 1 });
          for (let c = 0; c < COLS; c += 1) {
            const cColor = state.board[rowIdx][c] || '#00f3ff';
            spawnParticles(
              (c + 0.5) * cellSize,
              (rowIdx + 0.5) * cellSize,
              cColor,
              isTetris ? 6 : 3
            );
          }
        });

        const remaining = state.board.filter((_, idx) => !fullRows.includes(idx));
        while (remaining.length < ROWS) {
          remaining.unshift(Array(COLS).fill(null));
        }
        state.board = remaining;

        const labelMap = { 1: 'XÓA 1', 2: 'XÓA ĐÔI', 3: 'XÓA BA', 4: 'TỨ QUÝ!' };
        addFloatingText(
          state.layout.width / 2,
          Math.max(48, fullRows[0] * cellSize),
          `${labelMap[cleared] || 'XÓA HÀNG'} +${pts}`,
          isTetris ? '#f59e0b' : '#00f3ff',
          isTetris ? 23 : 18
        );

        if (state.level > prevLevel) {
          soundEngine.playLevelUp();
          addFloatingText(
            state.layout.width / 2,
            state.layout.height * 0.34,
            `LÊN CẤP ${state.level}`,
            '#bc13fe',
            22
          );
        } else {
          soundEngine.playLineClear(state.combo + 1, cleared);
        }

        triggerHaptic(cleared >= 2 ? 'multiClear' : 'clear');
        if (cleared >= 2) {
          state.shakeTime = 0.2;
          state.shakeMagnitude = cleared >= 4 ? 6 : 3;
        }
      } else {
        state.combo = -1;
        soundEngine.playPlace();
        triggerHaptic('place');
      }

      syncHud();

      // Campaign Challenge immediate victory check (no timer)
      if (isChallenge && !state.isStageCleared) {
        const currentStats = {
          score: state.score,
          linesCleared: state.lines,
          level: state.level,
          tetrises: state.tetrises,
          maxCombo: Math.max(0, state.combo),
        };
        if (checkObjectivesCompleted(challengeStage, currentStats)) {
          state.active = null;
          state.isStageCleared = true;
          state.stageWinDelay = 0.35;
          if (challengeStage.isBoss) {
            soundEngine.playBossVictory();
          } else {
            soundEngine.playStageVictory();
          }
          triggerHaptic('multiClear');
          addFloatingText(
            state.layout.width / 2,
            state.layout.height * 0.42,
            challengeStage.isBoss ? 'HẠ BOSS!' : 'VƯỢT MÀN!',
            '#fbbf24',
            26
          );
          return;
        }
      }

      spawnNextPiece();
    };

    const softDropStep = (awardPoints = true) => {
      if (!state.active || isInputBlocked()) return false;
      if (!collides(state.active.matrix, state.active.gridX, state.active.gridY + 1)) {
        state.active.gridY += 1;
        trackLowestY(state.active);
        if (awardPoints) {
          state.score += 1;
          syncHud();
        }
        return true;
      }
      return false;
    };

    const hardDrop = () => {
      if (!state.active || isInputBlocked()) return;
      const startVisualY = state.active.visualY;
      const targetY = getGhostY(state.active);
      const distance = Math.max(0, targetY - state.active.gridY);

      // 60ms high-speed motion blur streak into the landing spot
      if (settingsRef.current.motionTrail && distance > 0) {
        state.hardDropStreaks.push({
          matrix: state.active.matrix.map((row) => [...row]),
          color: state.active.color,
          gridX: state.active.gridX,
          startY: startVisualY,
          endY: targetY,
          elapsed: 0,
          duration: HARD_DROP_STREAK_SEC,
        });
      }

      state.active.gridY = targetY;
      state.active.visualY = targetY;
      state.score += distance * 2;

      // Impact sparks along landing edge
      const { cellSize } = state.layout;
      for (let r = 0; r < state.active.matrix.length; r += 1) {
        for (let c = 0; c < state.active.matrix[r].length; c += 1) {
          if (state.active.matrix[r][c]) {
            spawnParticles(
              (state.active.gridX + c + 0.5) * cellSize,
              (targetY + r + 0.9) * cellSize,
              state.active.color,
              3
            );
          }
        }
      }

      // Subtle 3px vertical canvas bounce
      state.bounceOffsetY = 3;
      state.bounceVelocityY = 0;

      soundEngine.playHardDrop();
      triggerHaptic('hardDrop');
      lockActivePiece();
    };

    actionsRef.current = {
      moveLeft: () => {
        soundEngine.unlock();
        moveHorizontal(-1);
      },
      moveRight: () => {
        soundEngine.unlock();
        moveHorizontal(1);
      },
      softDrop: () => {
        soundEngine.unlock();
        state.dropTimer = 0;
        softDropStep(true);
      },
      hardDrop: () => {
        soundEngine.unlock();
        hardDrop();
      },
      rotateCW: () => {
        soundEngine.unlock();
        rotatePiece(1);
      },
      redrawPreviews,
    };

    // Unified Classic Controls (identical 5 actions on PC & Mobile: ← → ↓ ↑ Space)
    const handleKeyDown = (evt) => {
      if (isInputBlocked()) return;
      const code = evt.code;
      const handled = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'];
      if (!handled.includes(code)) return;

      evt.preventDefault();
      if (evt.repeat) return; // Completely ignore OS repeat delay
      soundEngine.unlock();

      if (code === 'ArrowLeft') {
        state.keys.left = true;
        state.dasDir = -1;
        state.dasTimer = 0;
        state.arrTimer = 0;
        moveHorizontal(-1);
      } else if (code === 'ArrowRight') {
        state.keys.right = true;
        state.dasDir = 1;
        state.dasTimer = 0;
        state.arrTimer = 0;
        moveHorizontal(1);
      } else if (code === 'ArrowDown') {
        state.keys.down = true;
        state.dropTimer = 0;
        softDropStep(true);
      } else if (code === 'ArrowUp') {
        rotatePiece(1);
      } else if (code === 'Space') {
        hardDrop();
      }
    };

    const handleKeyUp = (evt) => {
      if (evt.code === 'ArrowLeft') {
        state.keys.left = false;
        state.dasDir = state.keys.right ? 1 : 0;
        state.dasTimer = 0;
        state.arrTimer = 0;
      } else if (evt.code === 'ArrowRight') {
        state.keys.right = false;
        state.dasDir = state.keys.left ? -1 : 0;
        state.dasTimer = 0;
        state.arrTimer = 0;
      } else if (evt.code === 'ArrowDown') {
        state.keys.down = false;
      }
    };

    const triggerAutoPauseIfActive = () => {
      state.keys.left = false;
      state.keys.right = false;
      state.keys.down = false;
      state.dasDir = 0;
      state.dasTimer = 0;
      state.arrTimer = 0;
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      if (repeatIntervalRef.current) {
        clearInterval(repeatIntervalRef.current);
        repeatIntervalRef.current = null;
      }
      if (!pausedRef.current && !state.isGameOver && !state.isStageCleared) {
        countdownRef.current.active = false;
        autoPauseCallbackRef.current?.();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerAutoPauseIfActive();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', triggerAutoPauseIfActive);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const computeLayout = () => {
      const rect = container.getBoundingClientRect();
      const availW = Math.max(180, rect.width - 8);
      const availH = Math.max(320, rect.height - 8);
      const cellSize = Math.max(14, Math.floor(Math.min(availW / COLS, availH / ROWS)));
      const width = cellSize * COLS;
      const height = cellSize * ROWS;
      const dpr = window.devicePixelRatio || 1;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      state.layout = { width, height, cellSize, dpr };
      redrawPreviews();
    };

    computeLayout();
    const resizeObserver = new ResizeObserver(computeLayout);
    resizeObserver.observe(container);

    spawnNextPiece();
    syncHud();

    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now) => {
      rafId = requestAnimationFrame(loop);

      // Frame-rate independent delta-time (clamped at 0.05s for 60Hz/120Hz/144Hz parity)
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      const dtMs = dt * 1000;
      lastTime = now;

      const currentSettings = settingsRef.current;
      const currentTheme = themeRef.current;
      const skin = currentSettings.blockSkin || 'CYBER_NEON';
      const { width, height, cellSize, dpr } = state.layout;

      let activeIsGrounded = false;
      let currentDropInterval = getDropIntervalMs(state.level);

      // Update 3 -> 2 -> 1 resume countdown before unfreezing gravity
      if (!pausedRef.current && countdownRef.current.active) {
        const cd = countdownRef.current;
        const stepBefore = Math.ceil(cd.remaining / 0.8);
        if (stepBefore >= 1 && stepBefore < cd.lastStep) {
          cd.lastStep = stepBefore;
          soundEngine.playCountdownBeep(stepBefore);
        }
        cd.remaining -= dt;
        const stepAfter = Math.ceil(cd.remaining / 0.8);
        if (stepAfter >= 1 && stepAfter < cd.lastStep) {
          cd.lastStep = stepAfter;
          soundEngine.playCountdownBeep(stepAfter);
        }
        if (cd.remaining <= 0) {
          cd.active = false;
          cd.remaining = 0;
          soundEngine.playCountdownBeep(0);
        }
      }

      if (!pausedRef.current && !countdownRef.current.active) {
        if (state.shakeTime > 0) {
          state.shakeTime = Math.max(0, state.shakeTime - dt);
        }

        // Smoothly damp 3px vertical canvas bounce back to 0
        if (Math.abs(state.bounceOffsetY) > 0.02 || Math.abs(state.bounceVelocityY) > 0.02) {
          const springK = 260;
          const damping = 22;
          const accel = -springK * state.bounceOffsetY - damping * state.bounceVelocityY;
          state.bounceVelocityY += accel * dt;
          state.bounceOffsetY += state.bounceVelocityY * dt;
        } else {
          state.bounceOffsetY = 0;
          state.bounceVelocityY = 0;
        }

        // Pro DAS (130ms) / ARR (28ms) horizontal auto-shift
        if (!state.isGameOver && state.dasDir !== 0) {
          state.dasTimer += dtMs;
          if (state.dasTimer >= DAS_MS) {
            state.arrTimer += dtMs;
            while (state.arrTimer >= ARR_MS) {
              state.arrTimer -= ARR_MS;
              if (!moveHorizontal(state.dasDir)) break;
            }
          }
        }

        // Logical Gravity & 500ms Floor Lock-Delay
        if (!state.isGameOver && state.active) {
          const baseInterval = getDropIntervalMs(state.level);
          currentDropInterval = state.keys.down
            ? Math.min(42, baseInterval / 9)
            : baseInterval;

          activeIsGrounded = collides(
            state.active.matrix,
            state.active.gridX,
            state.active.gridY + 1
          );

          if (!activeIsGrounded) {
            state.lockTimer = 0;
            state.dropTimer += dtMs;
            while (state.dropTimer >= currentDropInterval) {
              state.dropTimer -= currentDropInterval;
              if (!softDropStep(state.keys.down)) {
                state.dropTimer = 0;
                break;
              }
              if (
                collides(
                  state.active.matrix,
                  state.active.gridX,
                  state.active.gridY + 1
                )
              ) {
                state.dropTimer = 0;
                activeIsGrounded = true;
                break;
              }
            }
          } else {
            state.dropTimer = 0;
            state.lockTimer += dtMs;
            if (state.lockTimer >= LOCK_DELAY_MS) {
              lockActivePiece();
            }
          }
        }

        // Visual Interpolation Update (Sub-Pixel Vertical Fall + Horizontal Lerp + Banking Tilt + 90° Rotation Spring)
        if (state.active) {
          const piece = state.active;
          const groundedNow = collides(piece.matrix, piece.gridX, piece.gridY + 1);
          activeIsGrounded = groundedNow;

          // 1. Horizontal Lerp (dt * 28) + ±4deg Banking Tilt from horizontal velocity
          const prevVisualX = piece.visualX;
          piece.visualX += (piece.gridX - piece.visualX) * Math.min(1, dt * 28);
          if (Math.abs(piece.gridX - piece.visualX) < 0.002) {
            piece.visualX = piece.gridX;
          }

          const horizVel = dt > 0.0001 ? (piece.visualX - prevVisualX) / dt : 0;
          const targetBankTilt = Math.max(
            -MAX_BANK_TILT_RAD,
            Math.min(MAX_BANK_TILT_RAD, (horizVel / 18) * MAX_BANK_TILT_RAD)
          );
          piece.bankTilt += (targetBankTilt - piece.bankTilt) * Math.min(1, dt * 24);
          if (Math.abs(piece.bankTilt) < 0.0004 && Math.abs(targetBankTilt) < 0.0004) {
            piece.bankTilt = 0;
          }

          // 2. Continuous Sub-Pixel Vertical Fall
          const subRowProgress = groundedNow
            ? 0
            : Math.min(1, state.dropTimer / Math.max(1, currentDropInterval));
          const targetVisualY = piece.gridY + subRowProgress;

          if (groundedNow) {
            // Smoothly settle onto floor cell without popping
            piece.visualY += (piece.gridY - piece.visualY) * Math.min(1, dt * 34);
            if (Math.abs(piece.gridY - piece.visualY) < 0.004) {
              piece.visualY = piece.gridY;
            }
          } else {
            // Direct continuous sub-pixel tracking (and smooth catch-up after wall-kick dy)
            if (Math.abs(targetVisualY - piece.visualY) > 1.25) {
              piece.visualY += (targetVisualY - piece.visualY) * Math.min(1, dt * 32);
            } else {
              piece.visualY = targetVisualY;
            }
          }

          // 3. Smooth 90° Visual Rotation Interpolation
          if (Math.abs(piece.visualRotOffset) > 0.003) {
            piece.visualRotOffset *= Math.exp(-dt * 28);
          } else {
            piece.visualRotOffset = 0;
          }
        }

        // Update 60ms Hard Drop Motion Blur Streaks
        for (let i = state.hardDropStreaks.length - 1; i >= 0; i -= 1) {
          state.hardDropStreaks[i].elapsed += dt;
          if (state.hardDropStreaks[i].elapsed >= state.hardDropStreaks[i].duration * 2.4) {
            state.hardDropStreaks.splice(i, 1);
          }
        }

        // Line clear flash decay
        for (let i = state.lineFlashRows.length - 1; i >= 0; i -= 1) {
          state.lineFlashRows[i].alpha -= dt * 4.5;
          if (state.lineFlashRows[i].alpha <= 0) state.lineFlashRows.splice(i, 1);
        }

        // Particles
        for (let i = state.particles.length - 1; i >= 0; i -= 1) {
          const p = state.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 460 * dt;
          p.life -= dt;
          if (p.life <= 0) state.particles.splice(i, 1);
        }

        // Floating texts
        for (let i = state.floatingTexts.length - 1; i >= 0; i -= 1) {
          const ft = state.floatingTexts[i];
          ft.y -= 42 * dt;
          ft.life -= dt;
          if (ft.life <= 0) state.floatingTexts.splice(i, 1);
        }

        // Campaign Challenge Stage Win delay trigger
        if (state.isStageCleared && state.stageWinDelay > 0) {
          state.stageWinDelay -= dt;
          if (state.stageWinDelay <= 0) {
            stageWinCallbackRef.current?.({
              score: state.score,
              linesCleared: state.lines,
              level: state.level,
              tetrises: state.tetrises,
              maxCombo: Math.max(0, state.combo),
            });
          }
        }

        // Game Over delay trigger
        if (state.isGameOver && state.gameOverDelay > 0) {
          state.gameOverDelay -= dt;
          if (state.gameOverDelay <= 0) {
            gameOverCallbackRef.current?.({
              score: state.score,
              linesCleared: state.lines,
              level: state.level,
              tetrises: state.tetrises,
              maxCombo: Math.max(0, state.combo),
            });
          }
        }
      }

      // ================= RENDER FRAME =================
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      // Apply subtle 3px vertical canvas bounce + optional multi-clear shake
      let offsetX = 0;
      let offsetY = state.bounceOffsetY;
      if (state.shakeTime > 0) {
        const mag = (state.shakeTime / 0.2) * state.shakeMagnitude;
        offsetX += (Math.random() - 0.5) * mag * 1.4;
        offsetY += (Math.random() - 0.35) * mag * 1.4;
      }
      ctx.translate(offsetX, offsetY);

      // Board backdrop
      ctx.fillStyle = currentTheme.boardBg;
      ctx.fillRect(0, 0, width, height);

      // Subtle 10x20 grid lines
      ctx.strokeStyle = currentTheme.gridLine;
      ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c += 1) {
        ctx.beginPath();
        ctx.moveTo(c * cellSize + 0.5, 0);
        ctx.lineTo(c * cellSize + 0.5, height);
        ctx.stroke();
      }
      for (let r = 1; r < ROWS; r += 1) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellSize + 0.5);
        ctx.lineTo(width, r * cellSize + 0.5);
        ctx.stroke();
      }

      // 60ms High-Speed Hard Drop Motion Blur Streaks
      if (currentSettings.motionTrail) {
        state.hardDropStreaks.forEach((st) => {
          const streakProgress = Math.min(1, st.elapsed / st.duration);
          const fadeOut =
            st.elapsed <= st.duration
              ? 1
              : Math.max(0, 1 - (st.elapsed - st.duration) / (st.duration * 1.4));

          const curHeadY = st.startY + (st.endY - st.startY) * streakProgress;

          for (let c = 0; c < st.matrix[0].length; c += 1) {
            let topRow = -1;
            let bottomRow = -1;
            for (let r = 0; r < st.matrix.length; r += 1) {
              if (st.matrix[r][c]) {
                if (topRow === -1) topRow = r;
                bottomRow = r;
              }
            }
            if (topRow !== -1) {
              const colX = (st.gridX + c) * cellSize + 2;
              const yTop = Math.max(0, (st.startY + topRow) * cellSize);
              const yBot = (curHeadY + bottomRow + 1) * cellSize;
              const h = Math.max(cellSize, yBot - yTop);

              const grad = ctx.createLinearGradient(colX, yTop, colX, yBot);
              grad.addColorStop(0, hexToRgba(st.color, 0));
              grad.addColorStop(0.45, hexToRgba(st.color, 0.28 * fadeOut));
              grad.addColorStop(0.85, hexToRgba(st.color, 0.65 * fadeOut));
              grad.addColorStop(1, `rgba(255, 255, 255, ${0.8 * fadeOut})`);

              ctx.fillStyle = grad;
              ctx.fillRect(colX, yTop, cellSize - 4, h);
            }
          }

          // Motion-blur ghosted piece slices sweeping downward during first 60ms
          if (st.elapsed <= st.duration) {
            for (let slice = 0; slice < 3; slice += 1) {
              const t = Math.max(0, streakProgress - slice * 0.14);
              const sliceY = st.startY + (st.endY - st.startY) * t;
              const sliceAlpha = (0.42 - slice * 0.12) * fadeOut;
              for (let r = 0; r < st.matrix.length; r += 1) {
                for (let c = 0; c < st.matrix[r].length; c += 1) {
                  if (st.matrix[r][c] && sliceY + r >= 0) {
                    drawStyledBlock(
                      ctx,
                      (st.gridX + c) * cellSize,
                      (sliceY + r) * cellSize,
                      cellSize,
                      st.color,
                      skin,
                      sliceAlpha
                    );
                  }
                }
              }
            }
          }
        });
      }

      // Locked board blocks
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          const color = state.board[r][c];
          if (color) {
            drawStyledBlock(ctx, c * cellSize, r * cellSize, cellSize, color, skin, 1);
          }
        }
      }

      // Active Piece + Continuous Motion Trail + Ghost Piece + Lock Delay Pulse
      if (state.active) {
        const piece = state.active;
        const { matrix, color, visualX, visualY, visualRotOffset, bankTilt } = piece;

        // 1. Vertical Luminous Motion Trail fading upward behind gliding piece
        if (currentSettings.motionTrail && !state.isGameOver && !activeIsGrounded) {
          const trailCells = state.keys.down ? 4.2 : 2.6;
          for (let c = 0; c < matrix[0].length; c += 1) {
            let highestRow = -1;
            for (let r = 0; r < matrix.length; r += 1) {
              if (matrix[r][c]) {
                highestRow = r;
                break;
              }
            }
            if (highestRow !== -1) {
              const bx = (visualX + c) * cellSize + 3;
              const bottomY = (visualY + highestRow + 0.3) * cellSize;
              const trailHeight = trailCells * cellSize;
              const topY = bottomY - trailHeight;

              const trailGrad = ctx.createLinearGradient(bx, topY, bx, bottomY);
              trailGrad.addColorStop(0, hexToRgba(color, 0));
              trailGrad.addColorStop(0.6, hexToRgba(color, state.keys.down ? 0.24 : 0.12));
              trailGrad.addColorStop(1, hexToRgba(color, state.keys.down ? 0.5 : 0.32));

              ctx.fillStyle = trailGrad;
              ctx.fillRect(bx, topY, cellSize - 6, trailHeight);
            }
          }
        }

        // 2. Ghost Piece Outline at exact logical hard-drop landing position
        if (currentSettings.ghostPreview && !state.isGameOver) {
          const ghostY = getGhostY(piece);
          if (ghostY > piece.gridY) {
            for (let r = 0; r < matrix.length; r += 1) {
              for (let c = 0; c < matrix[r].length; c += 1) {
                if (matrix[r][c] && ghostY + r >= 0) {
                  drawGhostBlock(
                    ctx,
                    (piece.gridX + c) * cellSize,
                    (ghostY + r) * cellSize,
                    cellSize,
                    color,
                    0.19,
                    0.62
                  );
                }
              }
            }
          }
        }

        // 3. Active Piece rendered with Sub-Pixel (visualX, visualY), ±4deg Banking Tilt & 90° Rotation Lerp
        const pivot = getMatrixPivot(matrix);
        const pivotPxX = (visualX + pivot.cx) * cellSize;
        const pivotPxY = (visualY + pivot.cy) * cellSize;
        const lockProgress = activeIsGrounded
          ? Math.min(1, state.lockTimer / LOCK_DELAY_MS)
          : 0;
        const lockExhausted = state.lockResets >= MAX_LOCK_RESETS;
        const lockPulse =
          lockProgress > 0
            ? (0.5 + 0.5 * Math.sin(now * (lockExhausted ? 0.042 : 0.028))) *
              (0.28 + lockProgress * 0.54)
            : 0;

        ctx.save();
        ctx.translate(pivotPxX, pivotPxY);
        ctx.rotate(visualRotOffset + bankTilt);

        for (let r = 0; r < matrix.length; r += 1) {
          for (let c = 0; c < matrix[r].length; c += 1) {
            if (!matrix[r][c]) continue;
            if (visualY + r < -0.95) continue;
            const localX = (c - pivot.cx) * cellSize;
            const localY = (r - pivot.cy) * cellSize;

            drawStyledBlock(ctx, localX, localY, cellSize, color, skin, 1);

            // Floor Lock-Delay visual pulse feedback
            if (lockPulse > 0) {
              ctx.save();
              ctx.fillStyle = `rgba(255, 255, 255, ${lockPulse * 0.65})`;
              ctx.fillRect(localX + 2, localY + 2, cellSize - 4, cellSize - 4);
              ctx.strokeStyle = lockExhausted
                ? `rgba(255, 42, 95, ${Math.min(1, lockProgress + 0.35)})`
                : `rgba(251, 191, 36, ${Math.min(1, lockProgress + 0.25)})`;
              ctx.lineWidth = lockExhausted ? 2 : 1.6;
              ctx.strokeRect(localX + 1.5, localY + 1.5, cellSize - 3, cellSize - 3);
              ctx.restore();
            }
          }
        }
        ctx.restore();

        // Subtle Lock-Delay Fuse Bar right under the grounded piece
        if (lockProgress > 0.04 && !state.isGameOver) {
          let maxRow = 0;
          let minCol = COLS;
          let maxCol = 0;
          for (let r = 0; r < matrix.length; r += 1) {
            for (let c = 0; c < matrix[r].length; c += 1) {
              if (matrix[r][c]) {
                if (r > maxRow) maxRow = r;
                if (c < minCol) minCol = c;
                if (c > maxCol) maxCol = c;
              }
            }
          }
          const barX = (visualX + minCol) * cellSize + 2;
          const barW = (maxCol - minCol + 1) * cellSize - 4;
          const barY = (piece.gridY + maxRow + 1) * cellSize - 3;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(barX, barY, barW, 3);
          ctx.fillStyle = lockExhausted
            ? '#ff2a5f'
            : lockProgress > 0.7
              ? '#f59e0b'
              : '#00f3ff';
          ctx.fillRect(barX, barY, barW * (1 - lockProgress), 3);
        }
      }

      // Line clear flash overlays
      state.lineFlashRows.forEach((fl) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, fl.alpha);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 16;
        ctx.fillRect(0, fl.row * cellSize, width, cellSize);
        ctx.restore();
      });

      // Particles
      state.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
      });

      // Floating texts
      state.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, ft.life / (ft.maxLife * 0.55)));
        ctx.font = `800 ${ft.size}px "Outfit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();

      // Glowing outer board frame
      drawRoundedRect(ctx, 0.5, 0.5, width - 1, height - 1, 2);
      ctx.strokeStyle = currentTheme.boardBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3 -> 2 -> 1 Resume Countdown Overlay directly on Canvas
      if (!pausedRef.current && countdownRef.current.active) {
        const cd = countdownRef.current;
        const step = Math.max(1, Math.min(3, Math.ceil(cd.remaining / 0.8)));
        const beatRemain = cd.remaining - (step - 1) * 0.8;
        const beatProgress = Math.max(0, Math.min(1, 1 - beatRemain / 0.8));
        const eased = 1 - Math.pow(1 - beatProgress, 3);
        const scale = 1.5 - 0.58 * eased;
        const alpha = beatProgress < 0.78 ? 1 : Math.max(0, (1 - beatProgress) / 0.22);

        ctx.save();
        ctx.fillStyle = 'rgba(4, 7, 18, 0.48)';
        ctx.fillRect(0, 0, width, height);

        ctx.translate(width / 2, height / 2);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.round(cellSize * 4.2)}px "JetBrains Mono", "Outfit", sans-serif`;
        ctx.shadowColor = step === 1 ? '#fbbf24' : '#00f3ff';
        ctx.shadowBlur = 28;
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#04101f';
        ctx.strokeText(String(step), 0, 0);
        ctx.fillStyle = step === 1 ? '#fbbf24' : '#00f3ff';
        ctx.fillText(String(step), 0, 0);
        ctx.restore();
      }
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', triggerAutoPauseIfActive);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
      if (repeatIntervalRef.current) {
        clearInterval(repeatIntervalRef.current);
      }
    };
  }, []);

  const stopHoldRepeat = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  };

  const startHoldRepeat = (fn, repeatMs = 55, initialDelayMs = BUTTON_HOLD_DELAY_MS) => (evt) => {
    evt.preventDefault();
    if (evt.button !== undefined && evt.button !== 0) return;
    stopHoldRepeat();
    fn();
    // Wait initialDelayMs (DAS) before starting continuous repeat so a single tap moves exactly 1 cell
    holdTimeoutRef.current = setTimeout(() => {
      holdTimeoutRef.current = null;
      repeatIntervalRef.current = setInterval(fn, repeatMs);
    }, initialDelayMs);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-between w-full max-w-2xl mx-auto px-2 pb-2 gap-2 overflow-hidden select-none">
      {/* Main Arena Row: 10x20 CANVAS | NEXT (Classic Unified Layout for Mobile & PC) */}
      <div className="flex flex-1 w-full items-stretch justify-center gap-2.5 sm:gap-3.5 min-h-0">
        {/* Center: 10x20 Canvas */}
        <div
          ref={boardContainerRef}
          className="flex flex-1 items-center justify-center min-h-0 max-w-[360px]"
        >
          <canvas
            ref={canvasRef}
            className="shadow-[0_0_28px_rgba(0,243,255,0.16)] touch-none block"
          />
        </div>

        {/* Right Sidebar: NEXT Queue */}
        <div className="flex flex-col items-center gap-2 w-[72px] sm:w-[92px] shrink-0 pt-1">
          <div className="hud-panel-sm p-1.5 sm:p-2 w-full flex flex-col items-center gap-1.5 border border-purple-400/35">
            <span className="text-[10px] font-bold text-purple-300">Tiếp theo</span>
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`w-full flex items-center justify-center ${
                  idx === 0 ? 'bg-white/5 border border-white/12 py-1' : 'opacity-80 py-0.5'
                }`}
              >
                <canvas
                  ref={(el) => {
                    nextCanvasRefs.current[idx] = el;
                  }}
                  className="w-[54px] h-[38px] sm:w-[68px] sm:h-[46px]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unified 5-Button Classic Arcade Controls (Identical on Mobile & PC) */}
      <div className="w-full max-w-md grid grid-cols-5 gap-2 pt-0.5 shrink-0">
        <button
          type="button"
          onPointerDown={startHoldRepeat(() => actionsRef.current?.moveLeft(), 55)}
          onPointerUp={stopHoldRepeat}
          onPointerLeave={stopHoldRepeat}
          onPointerCancel={stopHoldRepeat}
          onLostPointerCapture={stopHoldRepeat}
          className="btn-arcade btn-arcade-slate py-3 sm:py-2.5 flex items-center justify-center text-cyan-200 cursor-pointer"
          aria-label="Sang trái"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onPointerDown={startHoldRepeat(() => actionsRef.current?.softDrop(), 45, 160)}
          onPointerUp={stopHoldRepeat}
          onPointerLeave={stopHoldRepeat}
          onPointerCancel={stopHoldRepeat}
          onLostPointerCapture={stopHoldRepeat}
          className="btn-arcade btn-arcade-slate py-3 sm:py-2.5 flex items-center justify-center text-cyan-200 cursor-pointer"
          aria-label="Rơi nhanh"
        >
          <ArrowDown className="w-5 h-5" />
        </button>

        <button
          type="button"
          onPointerDown={startHoldRepeat(() => actionsRef.current?.moveRight(), 55)}
          onPointerUp={stopHoldRepeat}
          onPointerLeave={stopHoldRepeat}
          onPointerCancel={stopHoldRepeat}
          onLostPointerCapture={stopHoldRepeat}
          className="btn-arcade btn-arcade-slate py-3 sm:py-2.5 flex items-center justify-center text-cyan-200 cursor-pointer"
          aria-label="Sang phải"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            actionsRef.current?.rotateCW();
          }}
          className="btn-arcade btn-arcade-purple py-3 sm:py-2.5 flex items-center justify-center cursor-pointer"
          aria-label="Xoay khối"
        >
          <RotateCw className="w-5 h-5" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            actionsRef.current?.hardDrop();
          }}
          className="btn-arcade btn-arcade-amber py-3 sm:py-2.5 flex items-center justify-center cursor-pointer"
          aria-label="Thả ngay"
        >
          <ArrowDownToLine className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

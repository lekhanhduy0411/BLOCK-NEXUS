import { useEffect, useRef } from 'react';
import { drawGhostBlock, drawRoundedRect, drawStyledBlock, hexToRgba } from './blockRenderer';
import { soundEngine } from '../utils/sound';
import { triggerHaptic } from '../utils/haptics';

const GRID_SIZE = 8;

// Motion & Feel Constants (Frame-Rate Independent)
const TRAY_SCALE = 0.65;
const SCALE_UP_DURATION = 0.1; // 100ms smooth scale-up from 0.65x -> 1.0x
const MAGNETIC_SNAP_DURATION = 0.08; // 80ms magnetic glide into target cells
const CASCADE_STAGGER_SEC = 0.025; // 25ms cell-by-cell sequential flash wave
const IMPACT_PULSE_DURATION = 0.16; // Placement impact pulse

const NEON_COLORS = [
  '#00f3ff', // Neon Cyan
  '#bc13fe', // Electric Purple
  '#f59e0b', // Amber Gold
  '#10b981', // Emerald Neon
  '#ff2e93', // Cyber Pink
  '#38bdf8', // Sky Laser
  '#fb7185', // Coral Pulse
];

const POLYOMINO_SHAPES = [
  // Single & Lines
  { cells: [[1]], weight: 4 },
  { cells: [[1, 1]], weight: 6 },
  { cells: [[1], [1]], weight: 6 },
  { cells: [[1, 1, 1]], weight: 7 },
  { cells: [[1], [1], [1]], weight: 7 },
  { cells: [[1, 1, 1, 1]], weight: 5 },
  { cells: [[1], [1], [1], [1]], weight: 5 },
  { cells: [[1, 1, 1, 1, 1]], weight: 3 },
  { cells: [[1], [1], [1], [1], [1]], weight: 3 },
  // Squares & Rectangles
  { cells: [[1, 1], [1, 1]], weight: 8 },
  { cells: [[1, 1, 1], [1, 1, 1]], weight: 3 },
  { cells: [[1, 1], [1, 1], [1, 1]], weight: 3 },
  { cells: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], weight: 2 },
  // Small L-corners (2x2)
  { cells: [[1, 0], [1, 1]], weight: 5 },
  { cells: [[0, 1], [1, 1]], weight: 5 },
  { cells: [[1, 1], [1, 0]], weight: 5 },
  { cells: [[1, 1], [0, 1]], weight: 5 },
  // Big L-shapes (3x3)
  { cells: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], weight: 3 },
  { cells: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], weight: 3 },
  { cells: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], weight: 3 },
  { cells: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], weight: 3 },
  // T & Z shapes
  { cells: [[1, 1, 1], [0, 1, 0]], weight: 5 },
  { cells: [[0, 1, 0], [1, 1, 1]], weight: 5 },
  { cells: [[1, 0], [1, 1], [1, 0]], weight: 4 },
  { cells: [[0, 1], [1, 1], [0, 1]], weight: 4 },
  { cells: [[1, 1, 0], [0, 1, 1]], weight: 4 },
  { cells: [[0, 1, 1], [1, 1, 0]], weight: 4 },
];

const SMALL_SHAPES = POLYOMINO_SHAPES.filter((s) => {
  const count = s.cells.flat().reduce((a, b) => a + b, 0);
  return count <= 3;
});

function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

/** Spring pop-in scale curve: 0.4 -> 1.3 -> 1.0 over first 34% of 950ms popup lifetime */
function computeSpringPopupScale(progress) {
  if (progress < 0.18) {
    const t = easeOutCubic(progress / 0.18);
    return 0.4 + (1.3 - 0.4) * t;
  }
  if (progress < 0.34) {
    const t = easeOutCubic((progress - 0.18) / 0.16);
    return 1.3 - (1.3 - 1.0) * t;
  }
  return 1.0;
}

function drawFourPointStar(ctx, x, y, outerR, innerR, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = rot + (i * Math.PI) / 4;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function pickWeightedShape(pool) {
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * totalWeight;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item.cells;
  }
  return pool[0].cells;
}

function generateTray(grid) {
  let filled = 0;
  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      if (grid[r][c]) filled += 1;
    }
  }
  const boardCrowded = filled / (GRID_SIZE * GRID_SIZE) > 0.58;

  return Array.from({ length: 3 }, (_, idx) => {
    const pool = boardCrowded && idx === 0 ? SMALL_SHAPES : POLYOMINO_SHAPES;
    const matrix = pickWeightedShape(pool);
    const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
    return {
      id: `${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      matrix,
      color,
      spawnAnim: 0,
    };
  });
}

function canPlacePiece(grid, matrix, startRow, startCol) {
  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = 0; c < matrix[r].length; c += 1) {
      if (!matrix[r][c]) continue;
      const nr = startRow + r;
      const nc = startCol + c;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
      if (grid[nr][nc] !== null) return false;
    }
  }
  return true;
}

function hasAnyValidMove(grid, tray) {
  for (const piece of tray) {
    if (!piece) continue;
    for (let r = 0; r <= GRID_SIZE - piece.matrix.length; r += 1) {
      for (let c = 0; c <= GRID_SIZE - piece.matrix[0].length; c += 1) {
        if (canPlacePiece(grid, piece.matrix, r, c)) {
          return true;
        }
      }
    }
  }
  return false;
}

function findPotentialClears(grid, matrix, startRow, startCol) {
  const fullRows = new Set();
  const fullCols = new Set();

  const tempCell = (r, c) => {
    if (grid[r][c] !== null) return true;
    const pr = r - startRow;
    const pc = c - startCol;
    if (
      pr >= 0 &&
      pr < matrix.length &&
      pc >= 0 &&
      pc < matrix[0].length &&
      matrix[pr][pc]
    ) {
      return true;
    }
    return false;
  };

  for (let r = 0; r < GRID_SIZE; r += 1) {
    let full = true;
    for (let c = 0; c < GRID_SIZE; c += 1) {
      if (!tempCell(r, c)) {
        full = false;
        break;
      }
    }
    if (full) fullRows.add(r);
  }

  for (let c = 0; c < GRID_SIZE; c += 1) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r += 1) {
      if (!tempCell(r, c)) {
        full = false;
        break;
      }
    }
    if (full) fullCols.add(c);
  }

  return { fullRows, fullCols };
}

export default function StrategistEngine({
  isPaused,
  settings,
  theme,
  onHudUpdate,
  onGameOver,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const settingsRef = useRef(settings);
  const themeRef = useRef(theme);
  const pausedRef = useRef(isPaused);
  const hudCallbackRef = useRef(onHudUpdate);
  const gameOverCallbackRef = useRef(onGameOver);

  useEffect(() => {
    settingsRef.current = settings;
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
  }, [onHudUpdate, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const ctx = canvas.getContext('2d');
    const initialGrid = createEmptyGrid();

    const state = {
      grid: initialGrid,
      tray: generateTray(initialGrid),
      score: 0,
      comboStreak: 0, // Unlimited consecutive clear multiplier (x1, x2, ... x8, ... xN)
      maxCombo: 0,
      linesCleared: 0,
      piecesPlaced: 0,
      // Active Spring-Tracked Drag State
      dragging: null,
      // 80ms Magnetic Snap Glides in flight
      magneticSnaps: [],
      // Placement Impact Pulse cells
      impactPulses: [],
      // Sequential 25ms Staggered Line Clear Cascade Waves
      cascadeCells: [],
      // Expanding radial shockwave rings (x4–x7 single, x8+ double)
      shockwaves: [],
      // Rich spring-animated combo multiplier popups (x{comboStreak} + +{earnedPoints})
      comboPopups: [],
      particles: [],
      floatingTexts: [],
      shakeTime: 0,
      shakeDuration: 0.22,
      shakeMagnitude: 0,
      isGameOver: false,
      gameOverDelay: 0,
      layout: {
        width: 360,
        height: 520,
        boardX: 16,
        boardY: 14,
        boardSize: 328,
        cellSize: 41,
        trayY: 360,
        trayHeight: 132,
        slotWidth: 110,
        dpr: 1,
      },
    };

    const syncHud = () => {
      hudCallbackRef.current?.({
        score: state.score,
        combo: state.comboStreak,
        maxCombo: state.maxCombo,
        linesCleared: state.linesCleared,
      });
    };
    syncHud();

    const computeLayout = () => {
      const rect = container.getBoundingClientRect();
      const maxW = Math.min(rect.width || 380, 440);
      const maxH = Math.min(rect.height || 580, 650);

      const trayRatio = 0.34;
      const paddingX = 12;
      const paddingTop = 10;
      const gapBetween = 16;

      const boardFromW = maxW - paddingX * 2;
      const boardFromH = (maxH - paddingTop - gapBetween - 12) / (1 + trayRatio);
      const boardSize = Math.max(
        232,
        Math.floor(Math.min(boardFromW, boardFromH) / GRID_SIZE) * GRID_SIZE
      );
      const cellSize = boardSize / GRID_SIZE;
      const trayHeight = Math.max(106, Math.round(boardSize * 0.33));

      const totalW = Math.max(boardSize + paddingX * 2, Math.min(maxW, boardSize + 36));
      const totalH = paddingTop + boardSize + gapBetween + trayHeight + 10;
      const boardX = Math.floor((totalW - boardSize) / 2);
      const boardY = paddingTop;
      const trayY = boardY + boardSize + gapBetween;
      const slotWidth = boardSize / 3;

      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${totalW}px`;
      canvas.style.height = `${totalH}px`;
      canvas.width = Math.floor(totalW * dpr);
      canvas.height = Math.floor(totalH * dpr);

      state.layout = {
        width: totalW,
        height: totalH,
        boardX,
        boardY,
        boardSize,
        cellSize,
        trayY,
        trayHeight,
        slotWidth,
        dpr,
      };
    };

    computeLayout();
    const resizeObserver = new ResizeObserver(computeLayout);
    resizeObserver.observe(container);

    const spawnParticles = (cx, cy, color, count = 10, { starMode = false } = {}) => {
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.65;
        const speed = (starMode ? 110 : 80) + Math.random() * (starMode ? 240 : 195);
        state.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (starMode ? 55 : 35),
          size: starMode ? 4.5 + Math.random() * 5 : 3 + Math.random() * 4.5,
          color: starMode
            ? `hsl(${Math.floor(Math.random() * 360)}, 100%, 68%)`
            : color,
          shape: starMode && i % 2 === 0 ? 'star' : 'square',
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 8,
          life: (starMode ? 0.52 : 0.42) + Math.random() * 0.34,
          maxLife: starMode ? 0.86 : 0.74,
        });
      }
    };

    const spawnShockwave = (x, y, maxRadius, color, lineWidth = 3.5, delay = 0) => {
      state.shockwaves.push({
        x,
        y,
        maxRadius,
        color,
        lineWidth,
        delay,
        elapsed: 0,
        duration: 0.52,
      });
    };

    const addFloatingText = (x, y, text, color = '#00f3ff', size = 22) => {
      state.floatingTexts.push({
        x,
        y,
        text,
        color,
        size,
        life: 0.95,
        maxLife: 0.95,
      });
    };

    const getCanvasCoords = (evt) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
      };
    };

    const updateDragHover = (drag) => {
      const { boardX, boardY, cellSize } = state.layout;
      const { matrix } = drag.piece;
      const rows = matrix.length;
      const cols = matrix[0].length;

      // Use logical pointer target for immediate snap accuracy while visuals spring smoothly
      const liftOffset = drag.isTouch ? cellSize * 2.25 : cellSize * 0.32;
      const targetCenterX = drag.targetX;
      const targetCenterY = drag.targetY - liftOffset;

      const topLeftX = targetCenterX - (cols * cellSize) / 2;
      const topLeftY = targetCenterY - (rows * cellSize) / 2;

      const hoverCol = Math.round((topLeftX - boardX) / cellSize);
      const hoverRow = Math.round((topLeftY - boardY) / cellSize);

      drag.hoverRow = hoverRow;
      drag.hoverCol = hoverCol;
      drag.valid = canPlacePiece(state.grid, matrix, hoverRow, hoverCol);
    };

    const checkGameOverCondition = () => {
      if (state.magneticSnaps.length > 0) return;
      if (!hasAnyValidMove(state.grid, state.tray)) {
        state.isGameOver = true;
        state.gameOverDelay = 0.75;
        soundEngine.playGameOver();
        triggerHaptic('gameOver');
        addFloatingText(
          state.layout.boardX + state.layout.boardSize / 2,
          state.layout.boardY + state.layout.boardSize / 2,
          'HẾT NƯỚC ĐI',
          '#ff2e93',
          24
        );
      }
    };

    const finalizeSnapPlacement = (snap) => {
      const { piece, toRow, toCol } = snap;
      const { matrix, color } = piece;
      const { boardX, boardY, cellSize } = state.layout;

      let placedCells = 0;
      for (let r = 0; r < matrix.length; r += 1) {
        for (let c = 0; c < matrix[r].length; c += 1) {
          if (matrix[r][c]) {
            state.grid[toRow + r][toCol + c] = color;
            state.impactPulses.push({
              r: toRow + r,
              c: toCol + c,
              color,
              elapsed: 0,
              duration: IMPACT_PULSE_DURATION,
            });
            placedCells += 1;
          }
        }
      }

      state.piecesPlaced += 1;

      // Detect simultaneous full rows and full columns
      const fullRows = [];
      const fullCols = [];

      for (let r = 0; r < GRID_SIZE; r += 1) {
        if (state.grid[r].every((cell) => cell !== null)) {
          fullRows.push(r);
        }
      }
      for (let c = 0; c < GRID_SIZE; c += 1) {
        let allFilled = true;
        for (let r = 0; r < GRID_SIZE; r += 1) {
          if (state.grid[r][c] === null) {
            allFilled = false;
            break;
          }
        }
        if (allFilled) fullCols.push(c);
      }

      const clearedCount = fullRows.length + fullCols.length;
      let earnedPoints = placedCells * 10;

      if (clearedCount > 0) {
        // Unlimited consecutive clear streak (x1, x2, ... x8, ... xN)
        state.comboStreak += 1;
        const streak = state.comboStreak;
        state.maxCombo = Math.max(state.maxCombo, streak);
        state.linesCleared += clearedCount;

        // Exact dynamic multiplier formula: (placedCells * 10) + (clearedLinesOrCols * 100 * comboStreak)
        earnedPoints = placedCells * 10 + clearedCount * 100 * streak;

        // Build sequential cell-by-cell cascade map (25ms stagger across columns/rows)
        const cascadeMap = new Map();
        const isOverdrive = streak >= 8;
        const particleCountPerCell = streak >= 8 ? 11 : streak >= 4 ? 9 : streak >= 2 ? 8 : 6;

        fullRows.forEach((r) => {
          for (let c = 0; c < GRID_SIZE; c += 1) {
            const key = `${r},${c}`;
            const delay = c * CASCADE_STAGGER_SEC;
            if (!cascadeMap.has(key) || delay < cascadeMap.get(key).delay) {
              cascadeMap.set(key, {
                r,
                c,
                color: state.grid[r][c] || '#00f3ff',
                delay,
                elapsed: 0,
                triggered: false,
                flashDuration: 0.22,
                particleCount: particleCountPerCell,
                starMode: isOverdrive,
              });
            }
          }
        });
        fullCols.forEach((c) => {
          for (let r = 0; r < GRID_SIZE; r += 1) {
            const key = `${r},${c}`;
            const delay = r * CASCADE_STAGGER_SEC;
            if (!cascadeMap.has(key) || delay < cascadeMap.get(key).delay) {
              cascadeMap.set(key, {
                r,
                c,
                color: state.grid[r][c] || '#00f3ff',
                delay,
                elapsed: 0,
                triggered: false,
                flashDuration: 0.22,
                particleCount: particleCountPerCell,
                starMode: isOverdrive,
              });
            }
          }
        });

        // Compute geometric center of cleared row(s)/column(s) for floating popup & shockwaves
        let sumX = 0;
        let sumY = 0;
        cascadeMap.forEach((entry) => {
          sumX += boardX + (entry.c + 0.5) * cellSize;
          sumY += boardY + (entry.r + 0.5) * cellSize;
          state.cascadeCells.push(entry);
          state.grid[entry.r][entry.c] = null;
        });

        const clearCenterX = Math.max(
          boardX + 68,
          Math.min(boardX + state.layout.boardSize - 68, sumX / Math.max(1, cascadeMap.size))
        );
        const clearCenterY = Math.max(
          boardY + 58,
          Math.min(boardY + state.layout.boardSize - 42, sumY / Math.max(1, cascadeMap.size))
        );

        // Perfect Full Board Clear Bonus
        const boardEmpty = state.grid.every((row) => row.every((cell) => cell === null));
        if (boardEmpty) {
          earnedPoints += 1000;
          addFloatingText(
            boardX + state.layout.boardSize / 2,
            boardY + state.layout.boardSize * 0.24,
            'XÓA SẠCH BẢNG +1,000',
            '#f59e0b',
            20
          );
        }

        // Audio pitch escalation (1 semitone per comboStreak step)
        soundEngine.playLineClear(streak, clearedCount);
        triggerHaptic(streak >= 3 || clearedCount >= 2 ? 'multiClear' : 'clear');

        // Tiered visual impact FX (Unlimited Scaling)
        if (streak === 2) {
          // x2 Electric Purple burst particles at center
          spawnParticles(clearCenterX, clearCenterY, '#bc13fe', 16);
        } else if (streak === 3) {
          // x3 Amber Gold + 3px micro board shake
          state.shakeTime = 0.2;
          state.shakeDuration = 0.2;
          state.shakeMagnitude = 3;
          spawnParticles(clearCenterX, clearCenterY, '#f59e0b', 20);
        } else if (streak >= 4 && streak <= 7) {
          // x4–x7 Blazing Crimson-Gold + expanding radial shockwave + 5px board shake
          state.shakeTime = 0.24;
          state.shakeDuration = 0.24;
          state.shakeMagnitude = 5;
          spawnShockwave(clearCenterX, clearCenterY, state.layout.boardSize * 0.58, '#ff2a5f', 4);
          spawnParticles(clearCenterX, clearCenterY, '#fbbf24', 24);
        } else if (streak >= 8) {
          // x8+ Overdrive: double shockwave rings + dense star-spark explosion + board shake
          state.shakeTime = 0.28;
          state.shakeDuration = 0.28;
          state.shakeMagnitude = 6;
          spawnShockwave(clearCenterX, clearCenterY, state.layout.boardSize * 0.72, '#00f3ff', 4.5, 0);
          spawnShockwave(clearCenterX, clearCenterY, state.layout.boardSize * 0.56, '#fbbf24', 3.5, 0.09);
          spawnParticles(clearCenterX, clearCenterY, '#ffffff', 32, { starMode: true });
        }

        // Spawn animated floating multiplier badge rising 50px over 950ms
        state.comboPopups.push({
          x: clearCenterX,
          startY: clearCenterY,
          streak,
          points: earnedPoints,
          elapsed: 0,
          duration: 0.95,
          overdriveScale: streak >= 8 ? Math.min(1.6, 1 + streak * 0.04) : 1,
        });
      } else {
        // 0 rows/columns cleared -> reset consecutive streak
        state.comboStreak = 0;
        soundEngine.playPlace();
        triggerHaptic('place');
      }

      state.score += earnedPoints;
      syncHud();

      // Refill tray when all 3 slots are placed
      if (state.tray.every((slot) => slot === null) && state.magneticSnaps.length === 0) {
        state.tray = generateTray(state.grid);
      }

      checkGameOverCondition();
    };

    const flushPendingSnaps = () => {
      while (state.magneticSnaps.length > 0) {
        const snap = state.magneticSnaps.shift();
        finalizeSnapPlacement(snap);
      }
    };

    // Unified Pointer Events with setPointerCapture
    const handlePointerDown = (evt) => {
      if (pausedRef.current || state.isGameOver) return;
      soundEngine.unlock();

      // Flush any in-flight 80ms snap so rapid players never wait
      if (state.magneticSnaps.length > 0) {
        flushPendingSnaps();
        if (state.isGameOver) return;
      }

      const { x, y } = getCanvasCoords(evt);
      const { boardX, trayY, trayHeight, slotWidth } = state.layout;

      if (y < trayY - 12 || y > trayY + trayHeight + 16) return;

      const slotIndex = Math.floor((x - boardX) / slotWidth);
      if (slotIndex < 0 || slotIndex > 2) return;

      const piece = state.tray[slotIndex];
      if (!piece) return;

      try {
        canvas.setPointerCapture(evt.pointerId);
      } catch {
        // Ignore capture failure on synthetic pointers
      }

      const slotCenterX = boardX + slotWidth * (slotIndex + 0.5);
      const slotCenterY = trayY + trayHeight / 2;

      const drag = {
        slotIndex,
        piece,
        pointerId: evt.pointerId,
        targetX: x,
        targetY: y,
        // Start visual center right at the tray slot so spring smoothly glides to pointer!
        visualX: slotCenterX,
        visualY: slotCenterY,
        isTouch: evt.pointerType === 'touch',
        scaleElapsed: 0,
        hoverRow: -1,
        hoverCol: -1,
        valid: false,
      };
      updateDragHover(drag);
      state.dragging = drag;
      soundEngine.playPickup();
      triggerHaptic('tap');
    };

    const handlePointerMove = (evt) => {
      if (!state.dragging || evt.pointerId !== state.dragging.pointerId) return;
      if (pausedRef.current || state.isGameOver) {
        state.dragging = null;
        return;
      }
      const { x, y } = getCanvasCoords(evt);
      state.dragging.targetX = x;
      state.dragging.targetY = y;
      updateDragHover(state.dragging);
    };

    const handlePointerUp = (evt) => {
      if (!state.dragging || evt.pointerId !== state.dragging.pointerId) return;
      const drag = state.dragging;
      state.dragging = null;

      try {
        if (canvas.hasPointerCapture?.(evt.pointerId)) {
          canvas.releasePointerCapture(evt.pointerId);
        }
      } catch {
        // Ignore release error
      }

      if (pausedRef.current || state.isGameOver) return;

      if (drag.valid) {
        // Remove piece from tray immediately & launch crisp 80ms Magnetic Snap glide
        state.tray[drag.slotIndex] = null;
        state.magneticSnaps.push({
          piece: drag.piece,
          fromCenterX: drag.visualX,
          fromCenterY: drag.visualY,
          toRow: drag.hoverRow,
          toCol: drag.hoverCol,
          elapsed: 0,
          duration: MAGNETIC_SNAP_DURATION,
        });
      } else {
        soundEngine.playInvalid();
        triggerHaptic('invalid');
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    let rafId = 0;
    let lastTime = performance.now();

    const renderFrame = (now) => {
      rafId = requestAnimationFrame(renderFrame);

      // Frame-rate independent delta-time (clamped at 0.05s for 60Hz/120Hz/144Hz parity)
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const {
        width,
        height,
        boardX,
        boardY,
        boardSize,
        cellSize,
        trayY,
        trayHeight,
        slotWidth,
        dpr,
      } = state.layout;
      const currentSettings = settingsRef.current;
      const currentTheme = themeRef.current;
      const skin = currentSettings.blockSkin || 'CYBER_NEON';

      if (!pausedRef.current) {
        if (state.shakeTime > 0) {
          state.shakeTime = Math.max(0, state.shakeTime - dt);
        }

        // Tray pop-in animation
        state.tray.forEach((piece) => {
          if (piece && piece.spawnAnim < 1) {
            piece.spawnAnim = Math.min(1, piece.spawnAnim + dt * 5.6);
          }
        });

        // Spring-damped dragged piece tracking (lerpFactor = min(1, dt * 32)) + 100ms scale-up
        if (state.dragging) {
          const drag = state.dragging;
          const liftOffset = drag.isTouch ? cellSize * 2.25 : cellSize * 0.32;
          const desiredCenterX = drag.targetX;
          const desiredCenterY = drag.targetY - liftOffset;
          const lerpFactor = Math.min(1, dt * 32);

          drag.visualX += (desiredCenterX - drag.visualX) * lerpFactor;
          drag.visualY += (desiredCenterY - drag.visualY) * lerpFactor;
          drag.scaleElapsed = Math.min(SCALE_UP_DURATION, drag.scaleElapsed + dt);
        }

        // Update 80ms Magnetic Snaps
        for (let i = state.magneticSnaps.length - 1; i >= 0; i -= 1) {
          const snap = state.magneticSnaps[i];
          snap.elapsed += dt;
          if (snap.elapsed >= snap.duration) {
            state.magneticSnaps.splice(i, 1);
            finalizeSnapPlacement(snap);
          }
        }

        // Update Placement Impact Pulses
        for (let i = state.impactPulses.length - 1; i >= 0; i -= 1) {
          state.impactPulses[i].elapsed += dt;
          if (state.impactPulses[i].elapsed >= state.impactPulses[i].duration) {
            state.impactPulses.splice(i, 1);
          }
        }

        // Update Sequential 25ms Staggered Line Clear Cascade Wave
        for (let i = state.cascadeCells.length - 1; i >= 0; i -= 1) {
          const cell = state.cascadeCells[i];
          cell.elapsed += dt;
          if (!cell.triggered && cell.elapsed >= cell.delay) {
            cell.triggered = true;
            spawnParticles(
              boardX + (cell.c + 0.5) * cellSize,
              boardY + (cell.r + 0.5) * cellSize,
              cell.color,
              cell.particleCount || 7,
              { starMode: Boolean(cell.starMode) }
            );
          }
          if (cell.elapsed >= cell.delay + cell.flashDuration) {
            state.cascadeCells.splice(i, 1);
          }
        }

        // Update Expanding Radial Shockwave Rings
        for (let i = state.shockwaves.length - 1; i >= 0; i -= 1) {
          const sw = state.shockwaves[i];
          sw.elapsed += dt;
          if (sw.elapsed >= sw.delay + sw.duration) {
            state.shockwaves.splice(i, 1);
          }
        }

        // Update Floating Multiplier Popups (950ms lifetime)
        for (let i = state.comboPopups.length - 1; i >= 0; i -= 1) {
          const cp = state.comboPopups[i];
          cp.elapsed += dt;
          if (cp.elapsed >= cp.duration) {
            state.comboPopups.splice(i, 1);
          }
        }

        // Update Particles
        for (let i = state.particles.length - 1; i >= 0; i -= 1) {
          const p = state.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 430 * dt;
          if (p.vRot) p.rot += p.vRot * dt;
          p.life -= dt;
          if (p.life <= 0) state.particles.splice(i, 1);
        }

        // Update Floating Popups
        for (let i = state.floatingTexts.length - 1; i >= 0; i -= 1) {
          const ft = state.floatingTexts[i];
          ft.y -= 44 * dt;
          ft.life -= dt;
          if (ft.life <= 0) state.floatingTexts.splice(i, 1);
        }

        if (state.isGameOver && state.gameOverDelay > 0) {
          state.gameOverDelay -= dt;
          if (state.gameOverDelay <= 0) {
            gameOverCallbackRef.current?.({
              score: state.score,
              maxCombo: state.maxCombo,
              linesCleared: state.linesCleared,
              piecesPlaced: state.piecesPlaced,
            });
          }
        }
      }

      // ================= RENDER FRAME =================
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      if (state.shakeTime > 0) {
        const intensity = (state.shakeTime / Math.max(0.01, state.shakeDuration)) * state.shakeMagnitude;
        ctx.translate(
          (Math.random() - 0.5) * intensity * 2,
          (Math.random() - 0.5) * intensity * 2
        );
      }

      // 1. Draw 8x8 Board Chassis
      drawRoundedRect(ctx, boardX - 5, boardY - 5, boardSize + 10, boardSize + 10, 4);
      ctx.fillStyle = currentTheme.boardBg;
      ctx.fill();
      ctx.strokeStyle = currentTheme.boardBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Grid cells background
      for (let r = 0; r < GRID_SIZE; r += 1) {
        for (let c = 0; c < GRID_SIZE; c += 1) {
          const cx = boardX + c * cellSize;
          const cy = boardY + r * cellSize;
          ctx.fillStyle =
            (r + c) % 2 === 0 ? 'rgba(255, 255, 255, 0.025)' : 'rgba(255, 255, 255, 0.012)';
          ctx.fillRect(cx + 1.5, cy + 1.5, cellSize - 3, cellSize - 3);
          ctx.strokeStyle = currentTheme.gridLine;
          ctx.lineWidth = 1;
          ctx.strokeRect(cx + 1.5, cy + 1.5, cellSize - 3, cellSize - 3);
        }
      }

      // Potential clear row/column preview highlight while hovering a valid move
      let potentialClears = null;
      if (state.dragging && state.dragging.valid && currentSettings.ghostPreview) {
        potentialClears = findPotentialClears(
          state.grid,
          state.dragging.piece.matrix,
          state.dragging.hoverRow,
          state.dragging.hoverCol
        );

        potentialClears.fullRows.forEach((r) => {
          ctx.fillStyle = hexToRgba(state.dragging.piece.color, 0.16);
          ctx.fillRect(boardX, boardY + r * cellSize, boardSize, cellSize);
        });
        potentialClears.fullCols.forEach((c) => {
          ctx.fillStyle = hexToRgba(state.dragging.piece.color, 0.16);
          ctx.fillRect(boardX + c * cellSize, boardY, cellSize, boardSize);
        });
      }

      // 2. Draw Placed Blocks (with subtle placement impact pulse)
      const pulseLookup = new Map();
      state.impactPulses.forEach((ip) => {
        pulseLookup.set(`${ip.r},${ip.c}`, ip);
      });

      for (let r = 0; r < GRID_SIZE; r += 1) {
        for (let c = 0; c < GRID_SIZE; c += 1) {
          const color = state.grid[r][c];
          if (!color) continue;
          const willClear =
            potentialClears &&
            (potentialClears.fullRows.has(r) || potentialClears.fullCols.has(c));
          const cx = boardX + c * cellSize;
          const cy = boardY + r * cellSize;
          const pulse = pulseLookup.get(`${r},${c}`);

          if (pulse) {
            const t = Math.min(1, pulse.elapsed / pulse.duration);
            const bounceScale = 1 + Math.sin(t * Math.PI) * 0.09;
            const scaledSize = cellSize * bounceScale;
            const offset = (cellSize - scaledSize) / 2;
            drawStyledBlock(ctx, cx + offset, cy + offset, scaledSize, color, skin, 1);
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${(1 - t) * 0.36})`;
            ctx.fillRect(cx + offset + 2, cy + offset + 2, scaledSize - 4, scaledSize - 4);
            ctx.restore();
          } else {
            drawStyledBlock(
              ctx,
              cx,
              cy,
              cellSize,
              willClear ? '#ffffff' : color,
              skin,
              willClear ? 0.92 : 1
            );
          }
        }
      }

      // 3. Draw Sequential 25ms Staggered Line Clear Cascade Wave
      state.cascadeCells.forEach((cell) => {
        const cx = boardX + cell.c * cellSize;
        const cy = boardY + cell.r * cellSize;

        if (!cell.triggered) {
          // Still awaiting its 25ms wave turn — show luminous pre-clear block
          drawStyledBlock(ctx, cx, cy, cellSize, cell.color, skin, 0.96);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4);
        } else {
          // Sequential flash wave pop & fade
          const t = Math.min(1, (cell.elapsed - cell.delay) / cell.flashDuration);
          const scale = 1 + Math.sin(t * Math.PI * 0.5) * 0.14 - t * 0.35;
          const size = Math.max(4, cellSize * scale);
          const offset = (cellSize - size) / 2;
          const alpha = Math.max(0, 1 - t);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.shadowColor = cell.color;
          ctx.shadowBlur = 16;
          ctx.fillStyle = t < 0.45 ? '#ffffff' : cell.color;
          ctx.fillRect(cx + offset + 1, cy + offset + 1, size - 2, size - 2);
          ctx.restore();
        }
      });

      // 4. Draw Ghost Preview on valid hover
      if (state.dragging && state.dragging.valid && currentSettings.ghostPreview) {
        const { matrix, color } = state.dragging.piece;
        for (let r = 0; r < matrix.length; r += 1) {
          for (let c = 0; c < matrix[r].length; c += 1) {
            if (matrix[r][c]) {
              drawGhostBlock(
                ctx,
                boardX + (state.dragging.hoverCol + c) * cellSize,
                boardY + (state.dragging.hoverRow + r) * cellSize,
                cellSize,
                color,
                0.22
              );
            }
          }
        }
      }

      // 5. Draw 80ms Magnetic Snap Gliding Pieces
      state.magneticSnaps.forEach((snap) => {
        const { matrix, color } = snap.piece;
        const rows = matrix.length;
        const cols = matrix[0].length;
        const targetCenterX = boardX + (snap.toCol + cols / 2) * cellSize;
        const targetCenterY = boardY + (snap.toRow + rows / 2) * cellSize;

        const eased = easeOutCubic(snap.elapsed / snap.duration);
        const curCenterX = snap.fromCenterX + (targetCenterX - snap.fromCenterX) * eased;
        const curCenterY = snap.fromCenterY + (targetCenterY - snap.fromCenterY) * eased;

        const topLeftX = curCenterX - (cols * cellSize) / 2;
        const topLeftY = curCenterY - (rows * cellSize) / 2;

        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 1) {
            if (matrix[r][c]) {
              drawStyledBlock(
                ctx,
                topLeftX + c * cellSize,
                topLeftY + r * cellSize,
                cellSize,
                color,
                skin,
                1
              );
            }
          }
        }
      });

      // 6. Draw Bottom 3-Slot Tray
      drawRoundedRect(ctx, boardX - 5, trayY, boardSize + 10, trayHeight, 4);
      ctx.fillStyle = 'rgba(8, 13, 27, 0.82)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      state.tray.forEach((piece, slotIndex) => {
        if (!piece) return;
        if (state.dragging && state.dragging.slotIndex === slotIndex) return;

        const slotCenterX = boardX + slotWidth * (slotIndex + 0.5);
        const slotCenterY = trayY + trayHeight / 2;

        const rows = piece.matrix.length;
        const cols = piece.matrix[0].length;
        const maxPieceDim = Math.max(rows, cols);
        const trayCell = Math.min(
          cellSize * TRAY_SCALE,
          (slotWidth - 18) / Math.max(cols, 2.6),
          (trayHeight - 20) / Math.max(rows, 2.6)
        );
        const scale = 0.55 + 0.45 * easeOutCubic(piece.spawnAnim);
        const effectiveCell = trayCell * scale * (maxPieceDim >= 5 ? 0.88 : 1);

        const startX = slotCenterX - (cols * effectiveCell) / 2;
        const startY = slotCenterY - (rows * effectiveCell) / 2;

        let canFitNow = false;
        for (let r = 0; r <= GRID_SIZE - rows && !canFitNow; r += 1) {
          for (let c = 0; c <= GRID_SIZE - cols && !canFitNow; c += 1) {
            if (canPlacePiece(state.grid, piece.matrix, r, c)) canFitNow = true;
          }
        }

        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 1) {
            if (piece.matrix[r][c]) {
              drawStyledBlock(
                ctx,
                startX + c * effectiveCell,
                startY + r * effectiveCell,
                effectiveCell,
                piece.color,
                skin,
                canFitNow ? 1 : 0.34
              );
            }
          }
        }
      });

      // 7. Draw Spring-Tracked Dragged Piece (Smooth 100ms scale 0.65x -> 1.0x)
      if (state.dragging) {
        const drag = state.dragging;
        const { matrix, color } = drag.piece;
        const rows = matrix.length;
        const cols = matrix[0].length;

        const scaleProgress = easeOutCubic(drag.scaleElapsed / SCALE_UP_DURATION);
        const currentScale = TRAY_SCALE + (1 - TRAY_SCALE) * scaleProgress;
        const drawCell = cellSize * currentScale;

        const baseX = drag.visualX - (cols * drawCell) / 2;
        const baseY = drag.visualY - (rows * drawCell) / 2;

        ctx.save();
        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 1) {
            if (matrix[r][c]) {
              drawStyledBlock(
                ctx,
                baseX + c * drawCell,
                baseY + r * drawCell,
                drawCell,
                color,
                skin,
                0.98
              );
            }
          }
        }
        ctx.restore();
      }

      // 8. Expanding Radial Shockwave Rings (x4–x7 single, x8+ double)
      state.shockwaves.forEach((sw) => {
        if (sw.elapsed < sw.delay) return;
        const t = Math.min(1, (sw.elapsed - sw.delay) / sw.duration);
        const eased = easeOutCubic(t);
        const radius = 12 + (sw.maxRadius - 12) * eased;
        const alpha = Math.max(0, (1 - t) * 0.9);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = Math.max(1, sw.lineWidth * (1 - t * 0.65));
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.restore();
      });

      // 9. Particles (squares + 4-point star-sparks for x8+ Overdrive)
      state.particles.forEach((p) => {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.shape === 'star' ? 12 : 8;
        if (p.shape === 'star') {
          drawFourPointStar(ctx, p.x, p.y, p.size * 1.15, p.size * 0.35, p.rot || 0);
        } else {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.restore();
      });

      // 10. Unlimited Multiplier Popups (x{comboStreak} + +{earnedPoints}, 50px rise over 950ms)
      state.comboPopups.forEach((cp) => {
        const p = Math.min(1, cp.elapsed / cp.duration);
        const riseY = cp.startY - 50 * easeOutCubic(p);
        const springScale = computeSpringPopupScale(p) * cp.overdriveScale;
        const alpha = p < 0.65 ? 1 : Math.max(0, 1 - (p - 0.65) / 0.35);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cp.x, riseY);
        ctx.scale(springScale, springScale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const multText = `x${cp.streak}`;
        const ptsText = `+${cp.points.toLocaleString()}`;
        const multFontSize = cp.streak >= 8 ? 34 : cp.streak >= 4 ? 30 : cp.streak >= 2 ? 27 : 24;

        ctx.font = `900 ${multFontSize}px "JetBrains Mono", "Outfit", sans-serif`;

        // Tiered Dynamic Fill & Glow
        let glowColor = '#00f3ff';
        let fillStyle = '#00f3ff';
        let strokeColor = '#04121f';

        if (cp.streak === 1) {
          glowColor = '#00f3ff';
          fillStyle = '#67f8ff';
        } else if (cp.streak === 2) {
          glowColor = '#bc13fe';
          fillStyle = '#e879f9';
        } else if (cp.streak === 3) {
          glowColor = '#f59e0b';
          fillStyle = '#fde047';
        } else if (cp.streak >= 4 && cp.streak <= 7) {
          glowColor = '#ff2a5f';
          const grad = ctx.createLinearGradient(-44, -18, 44, 18);
          grad.addColorStop(0, '#ff2a5f');
          grad.addColorStop(0.55, '#fb923c');
          grad.addColorStop(1, '#fbbf24');
          fillStyle = grad;
        } else {
          // x8+ Overdrive: animated iridescent rainbow / hyper-nova color-cycling gradient
          const hue = (now * 0.38) % 360;
          glowColor = `hsl(${hue}, 100%, 62%)`;
          const rainbow = ctx.createLinearGradient(-56, -20, 56, 20);
          rainbow.addColorStop(0, `hsl(${hue}, 100%, 68%)`);
          rainbow.addColorStop(0.33, `hsl(${(hue + 95) % 360}, 100%, 68%)`);
          rainbow.addColorStop(0.66, `hsl(${(hue + 195) % 360}, 100%, 68%)`);
          rainbow.addColorStop(1, `hsl(${(hue + 290) % 360}, 100%, 72%)`);
          fillStyle = rainbow;
        }

        // Crisp dark outline + vivid neon glow for high readability
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(multText, 0, -9);

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = cp.streak >= 8 ? 22 : cp.streak >= 4 ? 18 : 14;
        ctx.fillStyle = fillStyle;
        ctx.fillText(multText, 0, -9);

        // Earned points sub-label (+{earnedPoints})
        ctx.shadowBlur = 10;
        ctx.font = `800 15px "JetBrains Mono", "Outfit", sans-serif`;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(4, 7, 18, 0.9)';
        ctx.strokeText(ptsText, 0, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ptsText, 0, 16);

        ctx.restore();
      });

      // 11. General Floating Notices (Perfect Clear / Game Over)
      state.floatingTexts.forEach((ft) => {
        const alpha = Math.min(1, ft.life / (ft.maxLife * 0.55));
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
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
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 w-full items-center justify-center select-none overflow-hidden px-2"
    >
      <canvas
        ref={canvasRef}
        className="touch-none cursor-grab active:cursor-grabbing block"
      />
    </div>
  );
}

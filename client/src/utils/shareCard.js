import { getBackgroundById } from '../data/backgrounds';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

function drawChamferedRect(ctx, x, y, w, h, cut = 22) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

function drawNexusLogo(ctx, x, y, size) {
  const gap = Math.round(size * 0.12);
  const tile = (size - gap) / 2;
  const tiles = [
    { cx: x, cy: y, color: '#00f3ff', hollow: false },
    { cx: x + tile + gap, cy: y, color: '#bc13fe', hollow: false },
    { cx: x, cy: y + tile + gap, color: '#f59e0b', hollow: false },
    { cx: x + tile + gap, cy: y + tile + gap, color: '#00f3ff', hollow: true },
  ];

  tiles.forEach((t) => {
    ctx.save();
    if (t.hollow) {
      ctx.fillStyle = 'rgba(0, 243, 255, 0.2)';
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3;
      ctx.fillRect(t.cx, t.cy, tile, tile);
      ctx.strokeRect(t.cx + 1.5, t.cy + 1.5, tile - 3, tile - 3);
    } else {
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = t.color;
      ctx.fillRect(t.cx, t.cy, tile, tile);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(t.cx, t.cy, tile, 5);
      ctx.fillStyle = 'rgba(7, 10, 24, 0.35)';
      ctx.fillRect(t.cx + 7, t.cy + 7, tile - 14, tile - 14);
    }
    ctx.restore();
  });
}

function drawFallbackBackdrop(ctx, accentColor = '#00f3ff') {
  const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bgGrad.addColorStop(0, '#070913');
  bgGrad.addColorStop(0.5, '#0d1530');
  bgGrad.addColorStop(1, '#050814');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow1 = ctx.createRadialGradient(220, 260, 20, 220, 260, 520);
  glow1.addColorStop(0, `${accentColor}44`);
  glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow2 = ctx.createRadialGradient(880, 1080, 20, 880, 1080, 520);
  glow2.addColorStop(0, 'rgba(188, 19, 254, 0.28)');
  glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Subtle decorative stars
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < 65; i += 1) {
    const sx = (i * 197 + 43) % CARD_WIDTH;
    const sy = (i * 313 + 71) % CARD_HEIGHT;
    const r = (i % 3) + 1;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

async function drawSvgBackdrop(ctx, svgElement) {
  if (!svgElement) return false;
  let objectUrl = null;
  try {
    const clone = svgElement.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(CARD_WIDTH));
    clone.setAttribute('height', String(CARD_HEIGHT));
    clone.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    if (!clone.getAttribute('viewBox')) {
      clone.setAttribute('viewBox', '0 0 800 500');
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    objectUrl = URL.createObjectURL(blob);

    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });

    ctx.drawImage(img, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    return true;
  } catch {
    return false;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function formatDateVN(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export async function generateShareCardBlob({
  mode,
  score = 0,
  maxCombo = 0,
  linesCleared = 0,
  level = 1,
  isNewRecord = false,
  weeklyRank = null,
  playerName = 'Người chơi',
  equippedBackground = 'BG_DEFAULT',
  backdropSvgEl = null,
}) {
  if (document?.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback fonts if font loading throws
    }
  }

  const theme = getBackgroundById(equippedBackground);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  // 1. Backdrop (Real GameBackdrop SVG or fallback cosmic gradient)
  drawFallbackBackdrop(ctx, theme.accentColor || '#00f3ff');
  await drawSvgBackdrop(ctx, backdropSvgEl);

  // Readability dark veil + subtle technical grid
  const veil = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  veil.addColorStop(0, 'rgba(5, 8, 20, 0.56)');
  veil.addColorStop(0.5, 'rgba(5, 8, 20, 0.64)');
  veil.addColorStop(1, 'rgba(5, 8, 20, 0.78)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.strokeStyle = 'rgba(0, 243, 255, 0.06)';
  ctx.lineWidth = 1;
  for (let x = 60; x < CARD_WIDTH; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CARD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 60; y < CARD_HEIGHT; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CARD_WIDTH, y);
    ctx.stroke();
  }

  // 2. Main Chamfered HUD Card Frame
  const padX = 76;
  const padY = 86;
  const cardW = CARD_WIDTH - padX * 2;
  const cardH = CARD_HEIGHT - padY * 2;

  ctx.save();
  drawChamferedRect(ctx, padX, padY, cardW, cardH, 34);
  ctx.fillStyle = 'rgba(8, 13, 28, 0.86)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = mode === 'dragMode' ? 'rgba(0, 243, 255, 0.65)' : 'rgba(188, 19, 254, 0.7)';
  ctx.stroke();
  ctx.restore();

  // Top Header: Logo + BLOCK NEXUS + Mode Pill
  drawNexusLogo(ctx, padX + 54, padY + 56, 74);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 46px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BLOCK', padX + 150, padY + 80);
  const blockWordW = ctx.measureText('BLOCK ').width;
  ctx.fillStyle = '#00f3ff';
  ctx.fillText('NEXUS', padX + 150 + blockWordW, padY + 80);

  ctx.font = '600 22px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('THÀNH TÍCH THI ĐẤU', padX + 150, padY + 122);

  // Mode Badge
  const modeLabel = mode === 'dragMode' ? 'CHIẾN THUẬT 8×8' : 'TỐC ĐỘ 10×20';
  const modeAccent = mode === 'dragMode' ? '#00f3ff' : '#bc13fe';
  ctx.save();
  drawChamferedRect(ctx, padX + 54, padY + 186, 360, 56, 12);
  ctx.fillStyle = mode === 'dragMode' ? 'rgba(0, 243, 255, 0.16)' : 'rgba(188, 19, 254, 0.2)';
  ctx.fill();
  ctx.strokeStyle = modeAccent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = '800 24px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(modeLabel, padX + 54 + 180, padY + 215);
  ctx.restore();

  if (isNewRecord) {
    ctx.save();
    drawChamferedRect(ctx, padX + cardW - 294, padY + 186, 240, 56, 12);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.font = '900 24px "Outfit", system-ui, sans-serif';
    ctx.fillStyle = '#070913';
    ctx.textAlign = 'center';
    ctx.fillText('KỶ LỤC MỚI', padX + cardW - 174, padY + 215);
    ctx.restore();
  }

  // 3. Hero Score Panel
  const scoreBoxX = padX + 54;
  const scoreBoxY = padY + 286;
  const scoreBoxW = cardW - 108;
  const scoreBoxH = 290;

  ctx.save();
  drawChamferedRect(ctx, scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 24);
  ctx.fillStyle = 'rgba(5, 9, 21, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '700 28px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('ĐIỂM CHUNG CUỘC', CARD_WIDTH / 2, scoreBoxY + 68);

  const scoreStr = Math.max(0, Math.floor(score)).toLocaleString('vi-VN');
  const scoreFontSize = scoreStr.length >= 9 ? 96 : scoreStr.length >= 7 ? 112 : 128;
  ctx.font = `900 ${scoreFontSize}px "JetBrains Mono", monospace`;
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#00f3ff';
  ctx.fillText(scoreStr, CARD_WIDTH / 2, scoreBoxY + 182);
  ctx.restore();

  // 4. Stats Tiles Grid
  const stats =
    mode === 'dragMode'
      ? [
          { label: 'CHUỖI TỐI ĐA', value: `x${maxCombo || 0}`, color: '#fbbf24' },
          { label: 'SỐ HÀNG ĐÃ XÓA', value: String(linesCleared || 0), color: '#38bdf8' },
        ]
      : [
          { label: 'SỐ HÀNG ĐÃ XÓA', value: String(linesCleared || 0), color: '#38bdf8' },
          { label: 'CẤP ĐỘ ĐẠT ĐƯỢC', value: `Cấp ${level || 1}`, color: '#d8b4fe' },
        ];

  if (weeklyRank && Number.isFinite(Number(weeklyRank))) {
    stats.push({ label: 'HẠNG TUẦN', value: `#${weeklyRank}`, color: '#34d399' });
  }

  const statGap = 24;
  const statCount = stats.length;
  const statW = (scoreBoxW - statGap * (statCount - 1)) / statCount;
  const statY = scoreBoxY + scoreBoxH + 38;
  const statH = 180;

  stats.forEach((st, idx) => {
    const sx = scoreBoxX + idx * (statW + statGap);
    ctx.save();
    drawChamferedRect(ctx, sx, statY, statW, statH, 16);
    ctx.fillStyle = 'rgba(13, 21, 42, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '700 22px "Outfit", system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(st.label, sx + statW / 2, statY + 56);

    ctx.font = `900 ${statCount === 3 ? 48 : 56}px "JetBrains Mono", monospace`;
    ctx.fillStyle = st.color;
    ctx.fillText(st.value, sx + statW / 2, statY + 124);
    ctx.restore();
  });

  // 5. Player & Backdrop Metadata Panel
  const metaY = statY + statH + 40;
  const metaH = 156;
  ctx.save();
  drawChamferedRect(ctx, scoreBoxX, metaY, scoreBoxW, metaH, 16);
  ctx.fillStyle = 'rgba(10, 16, 33, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '600 22px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('NGƯỜI CHƠI', scoreBoxX + 36, metaY + 50);

  ctx.font = '800 36px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  const safeName = String(playerName || 'Người chơi').slice(0, 22);
  ctx.fillText(safeName, scoreBoxX + 36, metaY + 104);

  ctx.textAlign = 'right';
  ctx.font = '600 22px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('KHUNG CẢNH NỀN', scoreBoxX + scoreBoxW - 36, metaY + 50);

  ctx.font = '700 28px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = theme.accentColor || '#00f3ff';
  ctx.fillText(theme.name || 'Không Gian Sâu Thẳm', scoreBoxX + scoreBoxW - 36, metaY + 104);
  ctx.restore();

  // 6. Footer Date & Domain
  const footerY = padY + cardH - 54;
  ctx.textAlign = 'left';
  ctx.font = '600 24px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(formatDateVN(), scoreBoxX, footerY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  const host = typeof window !== 'undefined' && window.location?.host
    ? window.location.host
    : 'block-nexus';
  ctx.fillText(host, scoreBoxX + scoreBoxW, footerY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Không thể xuất ảnh thành tích.'));
    }, 'image/png');
  });
}

export async function exportAchievementCard(params) {
  const blob = await generateShareCardBlob(params);
  const modeSlug = params.mode === 'dragMode' ? '8x8' : '10x20';
  const safeScore = Math.max(0, Math.floor(params.score || 0));
  const filename = `block-nexus-${modeSlug}-${safeScore}.png`;

  try {
    if (typeof File !== 'undefined' && navigator?.share && navigator?.canShare) {
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'BLOCK NEXUS — Thành tích thi đấu',
          text: `Mình vừa đạt ${safeScore.toLocaleString('vi-VN')} điểm trong BLOCK NEXUS (${modeSlug})!`,
        });
        return { method: 'share', filename };
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { method: 'cancelled', filename };
    }
    // Fall through to direct download
  }

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  return { method: 'download', filename };
}

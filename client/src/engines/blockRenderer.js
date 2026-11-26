/**
 * Handcrafted 4-Layer Beveled Crystal/Neon HTML5 Canvas Block Renderer
 * Layer 1: Base directional gradient fill
 * Layer 2: Top-left specular bevel miter triangles (light-catching crystal facets)
 * Layer 3: Bottom-right shadow bevel miter triangles (physical 3D depth)
 * Layer 4: Subtle luminous inner core glow + precision catch-light rim
 */

export function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function hexToRgba(hex, alpha = 1) {
  const clean = hex.replace('#', '');
  const num = parseInt(
    clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean,
    16
  );
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function drawStyledBlock(ctx, x, y, size, color, skin = 'CYBER_NEON', alpha = 1) {
  const pad = Math.max(1.2, size * 0.055);
  const bx = x + pad;
  const by = y + pad;
  const bs = Math.max(3, size - pad * 2);
  const bevel = Math.max(2.2, bs * 0.18);

  ctx.save();
  ctx.globalAlpha = alpha;

  if (skin === 'CLASSIC_GLOSSY') {
    // Layer 1: Rich saturated base fill
    const baseGrad = ctx.createLinearGradient(bx, by, bx + bs, by + bs);
    baseGrad.addColorStop(0, hexToRgba(color, 1));
    baseGrad.addColorStop(1, hexToRgba(color, 0.78));
    ctx.fillStyle = baseGrad;
    ctx.fillRect(bx, by, bs, bs);

    // Layer 2: Top-Left Specular Bevel Triangles
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bs, by);
    ctx.lineTo(bx + bs - bevel, by + bevel);
    ctx.lineTo(bx + bevel, by + bevel);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.56)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bevel, by + bevel);
    ctx.lineTo(bx + bevel, by + bs - bevel);
    ctx.lineTo(bx, by + bs);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    // Layer 3: Bottom-Right Shadow Bevel Triangles
    ctx.beginPath();
    ctx.moveTo(bx + bs, by + bs);
    ctx.lineTo(bx, by + bs);
    ctx.lineTo(bx + bevel, by + bs - bevel);
    ctx.lineTo(bx + bs - bevel, by + bs - bevel);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(bx + bs, by + bs);
    ctx.lineTo(bx + bs, by);
    ctx.lineTo(bx + bs - bevel, by + bevel);
    ctx.lineTo(bx + bs - bevel, by + bs - bevel);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // Layer 4: Inner Core Gloss + Highlight Pip
    const coreGrad = ctx.createRadialGradient(
      bx + bs * 0.42,
      by + bs * 0.38,
      bs * 0.04,
      bx + bs * 0.5,
      by + bs * 0.5,
      bs * 0.44
    );
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(bx + bevel, by + bevel, bs - bevel * 2, bs - bevel * 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 0.85;
    ctx.strokeRect(bx + 0.5, by + 0.5, bs - 1, bs - 1);
  } else if (skin === 'SPATIAL_GLASS') {
    // Layer 1: Translucent Crystal Base Fill
    const baseGrad = ctx.createLinearGradient(bx, by, bx + bs, by + bs);
    baseGrad.addColorStop(0, hexToRgba(color, 0.48));
    baseGrad.addColorStop(0.5, hexToRgba(color, 0.24));
    baseGrad.addColorStop(1, hexToRgba(color, 0.54));
    ctx.fillStyle = baseGrad;
    ctx.fillRect(bx, by, bs, bs);

    // Layer 2: Top-Left Crystalline Specular Bevel
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bs, by);
    ctx.lineTo(bx + bs - bevel, by + bevel);
    ctx.lineTo(bx + bevel, by + bevel);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.46)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bevel, by + bevel);
    ctx.lineTo(bx + bevel, by + bs - bevel);
    ctx.lineTo(bx, by + bs);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.fill();

    // Layer 3: Bottom-Right Refraction Shadow Bevel
    ctx.beginPath();
    ctx.moveTo(bx + bs, by + bs);
    ctx.lineTo(bx, by + bs);
    ctx.lineTo(bx + bevel, by + bs - bevel);
    ctx.lineTo(bx + bs - bevel, by + bs - bevel);
    ctx.closePath();
    ctx.fillStyle = 'rgba(4, 10, 24, 0.46)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(bx + bs, by + bs);
    ctx.lineTo(bx + bs, by);
    ctx.lineTo(bx + bs - bevel, by + bevel);
    ctx.lineTo(bx + bs - bevel, by + bs - bevel);
    ctx.closePath();
    ctx.fillStyle = 'rgba(4, 10, 24, 0.28)';
    ctx.fill();

    // Layer 4: Inner Prism Core Glow & Specular Rim
    const coreGrad = ctx.createRadialGradient(
      bx + bs * 0.5,
      by + bs * 0.5,
      bs * 0.05,
      bx + bs * 0.5,
      by + bs * 0.5,
      bs * 0.4
    );
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    coreGrad.addColorStop(0.55, hexToRgba(color, 0.35));
    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(bx + bevel, by + bevel, bs - bevel * 2, bs - bevel * 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bs - 1, bs - 1);
  } else {
    // CYBER_NEON: 4-Layer Handcrafted Beveled Crystal/Neon Block
    // Layer 1: Base Fill with subtle outer energy aura
    ctx.shadowColor = hexToRgba(color, 0.6);
    ctx.shadowBlur = Math.max(5, size * 0.22);
    const baseGrad = ctx.createLinearGradient(bx, by, bx + bs, by + bs);
    baseGrad.addColorStop(0, hexToRgba(color, 0.96));
    baseGrad.addColorStop(0.55, hexToRgba(color, 0.72));
    baseGrad.addColorStop(1, hexToRgba(color, 0.9));
    ctx.fillStyle = baseGrad;
    ctx.fillRect(bx, by, bs, bs);
    ctx.shadowBlur = 0;

    // Layer 2: Top-Left Specular Bevel Triangles
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bs, by);
    ctx.lineTo(bx + bs - bevel, by + bevel);
    ctx.lineTo(bx + bevel, by + bevel);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bevel, by + bevel);
    ctx.lineTo(bx + bevel, by + bs - bevel);
    ctx.lineTo(bx, by + bs);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
    ctx.fill();

    // Layer 3: Bottom-Right Shadow Bevel Triangles
    ctx.beginPath();
    ctx.moveTo(bx + bs, by + bs);
    ctx.lineTo(bx, by + bs);
    ctx.lineTo(bx + bevel, by + bs - bevel);
    ctx.lineTo(bx + bs - bevel, by + bs - bevel);
    ctx.closePath();
    ctx.fillStyle = 'rgba(4, 7, 18, 0.56)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(bx + bs, by + bs);
    ctx.lineTo(bx + bs, by);
    ctx.lineTo(bx + bs - bevel, by + bevel);
    ctx.lineTo(bx + bs - bevel, by + bs - bevel);
    ctx.closePath();
    ctx.fillStyle = 'rgba(4, 7, 18, 0.36)';
    ctx.fill();

    // Layer 4: Recessed Cyber Facet + Subtle Luminous Inner Core Glow
    const innerSize = bs - bevel * 2;
    if (innerSize > 2) {
      ctx.fillStyle = 'rgba(7, 10, 24, 0.44)';
      ctx.fillRect(bx + bevel, by + bevel, innerSize, innerSize);

      const coreGrad = ctx.createRadialGradient(
        bx + bs * 0.48,
        by + bs * 0.48,
        innerSize * 0.06,
        bx + bs * 0.5,
        by + bs * 0.5,
        innerSize * 0.68
      );
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
      coreGrad.addColorStop(0.38, hexToRgba(color, 0.55));
      coreGrad.addColorStop(1, hexToRgba(color, 0.05));
      ctx.fillStyle = coreGrad;
      ctx.fillRect(bx + bevel, by + bevel, innerSize, innerSize);

      // Crisp inner miter border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(bx + bevel + 0.4, by + bevel + 0.4, innerSize - 0.8, innerSize - 0.8);
    }

    // Outer razor catch-light edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bs - 1, bs - 1);
  }

  ctx.restore();
}

export function drawGhostBlock(
  ctx,
  x,
  y,
  size,
  color = '#00f3ff',
  fillAlpha = 0.19,
  borderAlpha = 0.62
) {
  const pad = Math.max(1.8, size * 0.075);
  const bx = x + pad;
  const by = y + pad;
  const bs = Math.max(2, size - pad * 2);
  const corner = Math.max(3, bs * 0.22);

  ctx.save();
  ctx.fillStyle = hexToRgba(color, fillAlpha);
  ctx.fillRect(bx, by, bs, bs);

  ctx.strokeStyle = hexToRgba(color, borderAlpha);
  ctx.lineWidth = 1.25;
  ctx.strokeRect(bx + 0.5, by + 0.5, bs - 1, bs - 1);

  // Tactical corner target brackets
  ctx.shadowColor = color;
  ctx.shadowBlur = 7;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(bx, by + corner);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + corner, by);
  // Top-right
  ctx.moveTo(bx + bs - corner, by);
  ctx.lineTo(bx + bs, by);
  ctx.lineTo(bx + bs, by + corner);
  // Bottom-right
  ctx.moveTo(bx + bs, by + bs - corner);
  ctx.lineTo(bx + bs, by + bs);
  ctx.lineTo(bx + bs - corner, by + bs);
  // Bottom-left
  ctx.moveTo(bx + corner, by + bs);
  ctx.lineTo(bx, by + bs);
  ctx.lineTo(bx, by + bs - corner);
  ctx.stroke();

  ctx.restore();
}

export function drawMiniPiecePreview(canvas, matrix, color, skin) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 72;
  const cssH = canvas.clientHeight || 56;
  if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  if (!matrix || !matrix.length) return;

  const rows = matrix.length;
  const cols = matrix[0].length;
  const cell = Math.min((cssW - 10) / cols, (cssH - 10) / rows, 18);
  const offsetX = (cssW - cols * cell) / 2;
  const offsetY = (cssH - rows * cell) / 2;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (matrix[r][c]) {
        drawStyledBlock(ctx, offsetX + c * cell, offsetY + r * cell, cell, color, skin, 1);
      }
    }
  }
}

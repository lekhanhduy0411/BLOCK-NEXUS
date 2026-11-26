import { useId } from 'react';
import { getBackgroundById } from '../data/backgrounds';
import { renderScenePartA } from './backdrops/scenesA';
import { renderScenePartB } from './backdrops/scenesB';

/**
 * Reusable 3-Layer Illustrated Game Backdrop
 * - Layer 1: Deep atmospheric multi-stop CSS lighting
 * - Layer 2: Bespoke multi-layered SVG scenery unique to each of the 25 backgrounds
 * - Layer 3: Configurable readability dim (0–75%) + optional blur so blocks stay 100% crisp
 */
export default function GameBackdrop({
  bgId = 'BG_DEFAULT',
  isPreview = false,
  forceOverlay = false,
  backdropDim = 0.35,
  backdropBlur = false,
  svgRef = null,
  className = '',
}) {
  const uid = useId().replace(/:/g, '');
  const theme = getBackgroundById(bgId);
  const artwork = renderScenePartA(theme.id, uid) || renderScenePartB(theme.id, uid);
  const clampedDim = Math.max(0, Math.min(0.75, Number.isFinite(Number(backdropDim)) ? Number(backdropDim) : 0.35));
  const showOverlay = !isPreview || forceOverlay;

  return (
    <div
      className={`pointer-events-none overflow-hidden select-none ${
        isPreview ? 'absolute inset-0' : 'fixed inset-0 z-0'
      } ${theme.styleClass} ${className}`}
      aria-hidden="true"
    >
      {/* Layer 2: Bespoke Illustrated SVG Scenery */}
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
      >
        {artwork}
      </svg>

      {/* Layer 3: Configurable Readability Shield (Dim 0–75% + Optional 4px Blur) */}
      {showOverlay && (
        <>
          <div
            className="absolute inset-0 transition-[background-color,backdrop-filter] duration-150"
            style={{
              backgroundColor: `rgba(6, 10, 22, ${clampedDim})`,
              backdropFilter: backdropBlur ? 'blur(4px)' : 'none',
              WebkitBackdropFilter: backdropBlur ? 'blur(4px)' : 'none',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(4, 7, 17, 0.24) 0%, rgba(4, 7, 17, 0.08) 55%, rgba(4, 7, 17, 0.42) 100%)',
            }}
          />
        </>
      )}
    </div>
  );
}

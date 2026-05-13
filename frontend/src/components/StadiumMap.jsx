import { useRef, useEffect, useCallback } from 'react';

/* ── helpers ─────────────────────────────────────────────────────────────── */
function getContrastColor(hex) {
  // Calculates brightness to perfectly contrast text (Black for light stands, White for dark stands)
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? 'rgba(20, 10, 10, 0.9)' : '#ffffff';
}

function darken(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgb(${Math.max(0, (n >> 16) - amt)},${Math.max(0, ((n >> 8) & 0xff) - amt)},${Math.max(0, (n & 0xff) - amt)})`;
}

function draw(canvas, stands, selectedId, hoveredId) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;
  ctx.clearRect(0, 0, W, H);

  // Background circle
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.95, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill();

  const HOVER_COLOR = '#c8ff00';

  // ── 1. DRAW STANDS ──
  stands.forEach(s => {
    const isSelected = s.id === selectedId;
    const isHovered = s.id === hoveredId;
    const active = isSelected || isHovered;
    
    const sa = (s.start - 90) * Math.PI / 180;
    const ea = (s.end - 90) * Math.PI / 180;
    const gap = 0.015; 

    const outerR = s.outer * R;
    const innerR = s.inner * R;

    // ── GLOW (BLUR RADIUS) ──
    if (active) {
      ctx.save();
      ctx.shadowBlur = 20;
      // Soft glow color for selection, neon glow for hover
      ctx.shadowColor = isHovered ? HOVER_COLOR : 'rgba(230, 51, 41, 0.4)';
    }

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, sa + gap, ea - gap);
    ctx.arc(cx, cy, innerR, ea - gap, sa + gap, true);
    ctx.closePath();

    let baseColor = s.color;
    if (isHovered) baseColor = HOVER_COLOR;
    else if (isSelected) baseColor = darken(s.color, 20);

    const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    grad.addColorStop(0, isHovered ? '#e4ff66' : s.color); 
    grad.addColorStop(1, baseColor);

    ctx.fillStyle = grad;
    ctx.fill();

    if (active) ctx.restore(); // Restore *before* drawing the stroke to keep it clean

    // ── BORDERS (CLEAN WHITE) ──
    // ✅ The border stroke is now ALWAYS white for all stands
    ctx.strokeStyle = '#ffffff'; 
    // It just gets thicker when selected/hovered to pop against the glow
    ctx.lineWidth = active ? 2.5 : 1; 
    ctx.stroke();

    // ── TEXT LABELS ──
    const midAngle = ((s.start + s.end) / 2 - 90) * Math.PI / 180;
    const labelRadius = ((s.inner + s.outer) / 2) * R;
    
    ctx.save();
    ctx.translate(cx + Math.cos(midAngle) * labelRadius, cy + Math.sin(midAngle) * labelRadius);
    ctx.rotate(midAngle + Math.PI / 2);
    
    const span = s.end - s.start;
    const fontSize = Math.max(7, Math.min(span < 25 ? R * 0.018 : R * 0.024, 11));
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${active ? '800' : '700'} ${fontSize}px Syne, sans-serif`;
    
    ctx.fillStyle = getContrastColor(baseColor);

    let txt = s.name.toUpperCase();
    if (span < 22) txt = txt.replace('UPPER', 'UPR').replace('LOWER', 'LWR');
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  });

  // ── 2. DRAW PITCH & FIELD ──
  // The Outfield Grass
  const grass = ctx.createRadialGradient(cx, cy, R * 0.02, cx, cy, R * 0.21);
  grass.addColorStop(0, '#59b867'); 
  grass.addColorStop(1, '#2d6438');
  ctx.beginPath(); 
  ctx.arc(cx, cy, R * 0.21, 0, Math.PI * 2);
  ctx.fillStyle = grass; 
  ctx.fill();
  ctx.strokeStyle = '#3d6a2a'; 
  ctx.lineWidth = 2; 
  ctx.stroke();

  // 30-yard circle (Dashed)
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.13, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; 
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]); 
  ctx.stroke(); 
  ctx.setLineDash([]); 

  // The Main Pitch (Rectangle)
  const pw = R * 0.018, ph = R * 0.08;
  ctx.fillStyle = '#d4b878';
  ctx.fillRect(cx - pw, cy - ph, pw * 2, ph * 2);
  ctx.strokeStyle = 'rgba(200,160,80,0.6)'; 
  ctx.lineWidth = 0.5;
  ctx.strokeRect(cx - pw, cy - ph, pw * 2, ph * 2);

  // The Creases
  [cy - ph * 0.55, cy + ph * 0.55].forEach(y => {
    ctx.beginPath();
    ctx.moveTo(cx - pw * 1.6, y); 
    ctx.lineTo(cx + pw * 1.6, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; 
    ctx.lineWidth = 0.8; 
    ctx.stroke();
  });
}

// ... hitTest function remains unchanged ...
function hitTest(canvas, stands, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const W = canvas.width, H = canvas.height;
  const x = (clientX - rect.left) * (W / rect.width) - W / 2;
  const y = (clientY - rect.top) * (H / rect.height) - H / 2;
  const R = Math.min(W, H) / 2;
  const dist = Math.sqrt(x * x + y * y) / R;
  let ang = Math.atan2(y, x) * 180 / Math.PI + 90;
  if (ang < 0) ang += 360;
  return stands.find(s => {
    if (dist < s.inner || dist > s.outer) return false;
    const ss = ((s.start % 360) + 360) % 360;
    const se = ((s.end % 360) + 360) % 360;
    return ss < se ? ang >= ss && ang <= se : ang >= ss || ang <= se;
  }) || null;
}

export default function StadiumMap({ stadiumData, selectedId, hoveredId, onHover, onSelect }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const stands = stadiumData?.stands ?? [];

  const syncAndDraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !wrapperRef.current) return;
    canvas.width = wrapperRef.current.offsetWidth;
    canvas.height = wrapperRef.current.offsetWidth;
    draw(canvas, stands, selectedId, hoveredId);
  }, [stands, selectedId, hoveredId]);

  useEffect(() => {
    const ro = new ResizeObserver(syncAndDraw);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    syncAndDraw();
    return () => ro.disconnect();
  }, [syncAndDraw]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', paddingBottom: '100%', position: 'relative', overflow: 'visible' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={e => onHover(hitTest(canvasRef.current, stands, e.clientX, e.clientY)?.id ?? null)}
        onMouseLeave={() => onHover(null)}
        onClick={e => {
          const s = hitTest(canvasRef.current, stands, e.clientX, e.clientY);
          if (s) onSelect(s);
        }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', cursor: hoveredId ? 'pointer' : 'default' }}
      />
    </div>
  );
}
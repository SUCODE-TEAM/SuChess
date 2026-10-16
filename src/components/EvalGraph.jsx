import React, { useState, useRef } from 'react';

const CLASSIFICATION_COLORS = {
  brilliant: '#26c2a3', // Cyan
  great: '#3ea3db',     // Blue
  best: '#81b64c',      // Green
  excellent: '#81b64c', // Light Green
  good: '#97af7a',      // Soft Olive
  book: '#c38c4c',      // Brown / Gold
  inaccuracy: '#f7c631',// Yellow
  mistake: '#e67e22',   // Orange
  missed_win: '#db4141',// Rose Red
  blunder: '#fa412d',   // Red
};

export const EvalGraph = ({
  moves = [],
  selectedIndex = 0,
  onSelectMove = () => {},
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const containerRef = useRef(null);

  if (!moves || moves.length === 0) {
    return <div className="eval-graph-empty">Belum ada data evaluasi.</div>;
  }

  const svgWidth = 1000;
  const svgHeight = 140;
  const padX = 30;
  const midY = svgHeight / 2;
  const maxAmp = (svgHeight / 2) - 15; // 55px max amplitude

  // Convert cp advantage to Y coordinate
  const getY = (whiteAdv) => {
    const clamped = Math.max(-1500, Math.min(1500, whiteAdv || 0));
    const winProb = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
    const normalized = (winProb - 50) / 50; // -1 to +1
    return midY - (normalized * maxAmp);
  };

  const totalPoints = moves.length;
  const stepX = (svgWidth - 2 * padX) / Math.max(1, totalPoints - 1);

  // Generate points array
  const points = moves.map((m, idx) => {
    const x = padX + idx * stepX;
    const y = getY(m.whiteAdvantage);
    return { x, y, move: m, idx };
  });

  // Build SVG path string for the line
  const lineD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    return `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Build Area above midY (White advantage)
  const areaWhiteD = `M ${points[0].x} ${midY} ` +
    points.map(pt => `L ${pt.x} ${Math.min(midY, pt.y)}`).join(' ') +
    ` L ${points[points.length - 1].x} ${midY} Z`;

  // Build Area below midY (Black advantage)
  const areaBlackD = `M ${points[0].x} ${midY} ` +
    points.map(pt => `L ${pt.x} ${Math.max(midY, pt.y)}`).join(' ') +
    ` L ${points[points.length - 1].x} ${midY} Z`;

  const activePoint = points[selectedIndex] || points[0];
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const displayedPoint = hoveredPoint || activePoint;

  return (
    <div className="eval-graph-card" ref={containerRef}>
      <div className="graph-header">
        <span className="graph-title">Grafik Evaluasi Permainan (Engine Eval)</span>
        {displayedPoint && (
          <div className="graph-cursor-info">
            <span className="cursor-move">
              Langkah {Math.floor(displayedPoint.idx / 2) + 1}
              {displayedPoint.move.color === 'w' ? '.' : '...'} {displayedPoint.move.san}
            </span>
            <span
              className="cursor-badge"
              style={{ backgroundColor: CLASSIFICATION_COLORS[displayedPoint.move.classification] || '#81b64c' }}
            >
              {displayedPoint.move.classification.toUpperCase()}
            </span>
            <span className="cursor-eval">
              Eval:{' '}
              <strong>
                {displayedPoint.move.whiteAdvantage > 0
                  ? `+${(displayedPoint.move.whiteAdvantage / 100).toFixed(2)}`
                  : (displayedPoint.move.whiteAdvantage / 100).toFixed(2)}
              </strong>
            </span>
          </div>
        )}
      </div>

      <div className="svg-graph-container">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="eval-svg-chart"
          preserveAspectRatio="none"
        >
          <defs>
            {/* White advantage gradient */}
            <linearGradient id="whiteAdvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
            </linearGradient>

            {/* Black advantage gradient */}
            <linearGradient id="blackAdvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#111111" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* Background Grid */}
          <line
            x1={padX}
            y1={midY}
            x2={svgWidth - padX}
            y2={midY}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <text x={padX - 8} y={midY + 4} fill="rgba(255, 255, 255, 0.4)" fontSize="11" textAnchor="end">
            0.0
          </text>
          <text x={padX - 8} y={20} fill="rgba(255, 255, 255, 0.4)" fontSize="11" textAnchor="end">
            +5
          </text>
          <text x={padX - 8} y={svgHeight - 12} fill="rgba(255, 255, 255, 0.4)" fontSize="11" textAnchor="end">
            -5
          </text>

          {/* Area fills */}
          <path d={areaWhiteD} fill="url(#whiteAdvGrad)" />
          <path d={areaBlackD} fill="url(#blackAdvGrad)" />

          {/* Main Curve Line */}
          <path
            d={lineD}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Move Vertical Line */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={10}
              x2={activePoint.x}
              y2={svgHeight - 10}
              stroke="#ffd700"
              strokeWidth="2"
              strokeDasharray="3 3"
              opacity="0.9"
            />
          )}

          {/* Interactive dots for critical moves (blunder, mistake, inaccuracy, brilliant, great) */}
          {points.map((pt) => {
            const cls = pt.move.classification;
            const isCritical = ['blunder', 'mistake', 'missed_win', 'inaccuracy', 'brilliant', 'great'].includes(cls);
            const isSelected = pt.idx === selectedIndex;
            const radius = isSelected ? 6.5 : isCritical ? 4.5 : 2.5;
            const color = CLASSIFICATION_COLORS[cls] || '#ffffff';

            return (
              <circle
                key={pt.idx}
                cx={pt.x}
                cy={pt.y}
                r={radius}
                fill={color}
                stroke="#121212"
                strokeWidth={isSelected ? 2 : 1}
                className="graph-point-dot"
                onMouseEnter={() => setHoveredIndex(pt.idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectMove(pt.idx)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

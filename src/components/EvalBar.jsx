import React from 'react';

/**
 * Vertical Evaluation Bar matching Chess.com
 * Shows real-time win advantage ratio between White and Black
 */
export const EvalBar = ({ whiteAdvantage = 0, isFlipped = false }) => {
  // Use win probability sigmoid so high advantage gracefully approaches 100% without overflowing
  // Win Prob formula: P = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
  const clampedCp = Math.max(-1500, Math.min(1500, whiteAdvantage));
  const winProb = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampedCp)) - 1);
  const whitePercent = Math.max(4, Math.min(96, winProb));

  // Numerical display (e.g. +2.4 or -1.8)
  const formatScore = () => {
    if (Math.abs(clampedCp) >= 9000) {
      return clampedCp > 0 ? '+M' : '-M';
    }
    const val = clampedCp / 100;
    if (Math.abs(val) < 0.1) return '0.0';
    return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
  };

  const isWhiteWinning = clampedCp >= 0;

  return (
    <div className="eval-bar-wrapper">
      <div className={`eval-bar-inner ${isFlipped ? 'bar-flipped' : ''}`}>
        {/* Black side (top default) */}
        <div
          className="eval-side black-side"
          style={{ height: `${100 - whitePercent}%` }}
        >
          {!isWhiteWinning && (
            <span className="eval-score-text text-black-side">{formatScore()}</span>
          )}
        </div>

        {/* White side (bottom default) */}
        <div
          className="eval-side white-side"
          style={{ height: `${whitePercent}%` }}
        >
          {isWhiteWinning && (
            <span className="eval-score-text text-white-side">{formatScore()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

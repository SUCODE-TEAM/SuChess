import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, X, ShieldX, BarChart2, Sparkles } from 'lucide-react';

export const GameOverModal = ({
  isOpen,
  winner, // 'w' | 'b' | 'draw'
  reason, // 'checkmate' | 'stalemate' | 'resignation' | 'timeout'
  moveCount,
  onNewGame,
  onClose,
  onOpenReview,
}) => {
  if (!isOpen) return null;

  useEffect(() => {
    if (winner === 'w' || winner === 'b') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#d4af37', '#ffd700', '#ffffff', '#b58532'],
      });
    }
  }, [winner]);

  const getTitle = () => {
    if (winner === 'draw') return 'Permainan Remis (Seri)';
    if (winner === 'w') return 'Kemenangan Sisi Putih!';
    return 'Kemenangan Sisi Hitam!';
  };

  const getSubtitle = () => {
    if (reason === 'checkmate') return 'Skakmat! Raja tidak dapat meloloskan diri.';
    if (reason === 'stalemate') return 'Paten (Stalemate)! Tidak ada langkah legal yang tersisa.';
    if (reason === 'resignation') return 'Lawan telah menyerah.';
    if (reason === 'timeout') return 'Waktu telah habis!';
    return 'Permainan berakhir.';
  };

  return (
    <div className="modal-backdrop">
      <div className="gameover-card">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="gameover-icon-wrap">
          {winner === 'draw' ? (
            <ShieldX size={48} className="text-muted" />
          ) : (
            <Trophy size={48} className="gold-text pulse" />
          )}
        </div>

        <h2 className="gameover-title">{getTitle()}</h2>
        <p className="gameover-subtitle">{getSubtitle()}</p>

        <div className="gameover-stats">
          <div className="stat-pill">
            <span className="stat-label">Total Langkah</span>
            <span className="stat-val">{moveCount}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Hasil</span>
            <span className="stat-val">
              {winner === 'draw' ? '½ - ½' : winner === 'w' ? '1 - 0' : '0 - 1'}
            </span>
          </div>
        </div>

        <div className="gameover-actions">
          {onOpenReview && (
            <button
              className="btn-royal-secondary btn-lg"
              onClick={() => {
                onClose();
                onOpenReview();
              }}
            >
              <BarChart2 size={18} className="gold-text" />
              <span>Analisis Game (Stockfish)</span>
            </button>
          )}
          <button className="btn-royal btn-lg" onClick={onNewGame}>
            <RefreshCw size={18} />
            <span>Permainan Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { User, Bot, Clock } from 'lucide-react';

const PIECE_SYMBOLS = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
};

export const PlayerCard = ({
  color,
  name,
  rating,
  isAI,
  isActiveTurn,
  timeLeft,
  capturedList,
  scoreDiff,
}) => {
  const isWhite = color === 'w';

  // Format time (mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`player-card ${isActiveTurn ? 'active-turn' : ''} ${isWhite ? 'card-white' : 'card-black'}`}>
      <div className="player-header">
        <div className="player-avatar-wrap">
          <div className={`avatar-frame ${isWhite ? 'frame-white' : 'frame-black'}`}>
            {isAI ? <Bot size={20} /> : <User size={20} />}
          </div>
        </div>

        <div className="player-identity">
          <div className="player-name-row">
            <span className="player-name">{name}</span>
            <span className="player-rating">{rating}</span>
          </div>
          <span className="player-role">{isWhite ? 'Ksatria Putih (Altar)' : 'Pangeran Kegelapan'}</span>
        </div>

        {/* Digital Clock */}
        <div className={`player-clock ${isActiveTurn ? 'clock-active' : ''}`}>
          <Clock size={14} className="clock-icon" />
          <span className="clock-digits">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Captured Pieces & Material Differential */}
      <div className="captured-tray">
        <div className="captured-pieces-list">
          {capturedList.map((piece, idx) => (
            <span key={idx} className="captured-icon" title={piece.type}>
              {PIECE_SYMBOLS[piece.type] || piece.type}
            </span>
          ))}
        </div>
        {scoreDiff > 0 && <span className="score-differential">+{scoreDiff}</span>}
      </div>
    </div>
  );
};

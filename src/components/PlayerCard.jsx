import React from 'react';
import { User, Bot } from 'lucide-react';

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
  capturedList,
  scoreDiff,
}) => {
  const isWhite = color === 'w';

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

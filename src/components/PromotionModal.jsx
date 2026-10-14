import React from 'react';
import { Crown, Shield, Sparkles } from 'lucide-react';

export const PromotionModal = ({ isOpen, color, onSelectPiece }) => {
  if (!isOpen) return null;

  const pieces = [
    { type: 'q', name: 'Ratu', symbol: '♛', desc: 'Serbaguna & Paling Kuat' },
    { type: 'r', name: 'Benteng', symbol: '♜', desc: 'Kekuatan Garis Lurus' },
    { type: 'b', name: 'Gajah', symbol: '♝', desc: 'Penguasa Diagonal' },
    { type: 'n', name: 'Kuda', symbol: '♞', desc: 'Lompatan Taktis' },
  ];

  return (
    <div className="modal-backdrop">
      <div className="promotion-card">
        <div className="promotion-header">
          <Sparkles className="gold-text pulse" size={24} />
          <h2 className="promotion-title">Promosi Pion</h2>
          <p className="promotion-subtitle">
            Pion Anda telah mencapai ujung altar! Pilih bidak untuk diangkat:
          </p>
        </div>

        <div className="promotion-options">
          {pieces.map((p) => (
            <button
              key={p.type}
              className="promotion-option-btn"
              onClick={() => onSelectPiece(p.type)}
            >
              <span className="promotion-symbol">{p.symbol}</span>
              <span className="promotion-piece-name">{p.name}</span>
              <span className="promotion-piece-desc">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

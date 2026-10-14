import React from 'react';
import { X, Bot, Shield, Zap, Sparkles, Check, ExternalLink } from 'lucide-react';
import { ELO_PRESETS } from '../engine/StockfishService';

export const StockfishEloModal = ({
  isOpen,
  onClose,
  currentElo,
  onSelectElo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="elo-modal-card">
        <div className="elo-modal-header">
          <div className="elo-header-title">
            <div className="elo-icon-box">
              <Bot size={22} className="gold-text" />
            </div>
            <div>
              <h3 className="elo-title">Stockfish 19 Chess Engine</h3>
              <p className="elo-subtitle">
                Engine resmi dari{' '}
                <a
                  href="https://stockfishchess.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="stockfish-link"
                >
                  stockfishchess.org <ExternalLink size={12} style={{ display: 'inline' }} />
                </a>{' '}
                • WASM + NNUE Neural Net
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Current ELO Banner */}
        <div className="current-elo-banner">
          <div>
            <span className="banner-sub">Tingkat Kekuatan Bot:</span>
            <div className="banner-engine-tag">Engine: Official Stockfish 19 (UCI Protocol)</div>
          </div>
          <span className="banner-elo gold-text">{currentElo} ELO</span>
        </div>

        {/* ELO Slider */}
        <div className="elo-slider-wrap">
          <div className="slider-label-row">
            <span>250 (Pemula)</span>
            <span>1600 (Klub)</span>
            <span>3200 (Grandmaster)</span>
          </div>
          <input
            type="range"
            min="250"
            max="3200"
            step="50"
            value={currentElo}
            onChange={(e) => onSelectElo(parseInt(e.target.value, 10))}
            className="royal-range-slider"
          />
        </div>

        {/* Preset Cards Grid */}
        <div className="elo-presets-grid">
          {ELO_PRESETS.map((p) => {
            const isSelected = Math.abs(currentElo - p.elo) < 100;
            return (
              <div
                key={p.elo}
                className={`elo-preset-card ${isSelected ? 'selected-preset' : ''}`}
                onClick={() => onSelectElo(p.elo)}
              >
                <div className="preset-card-top">
                  <span className="preset-name">{p.name}</span>
                  <span className="preset-elo-tag">{p.elo} ELO</span>
                </div>
                <p className="preset-desc">{p.desc}</p>
                {isSelected && (
                  <div className="preset-active-check">
                    <Check size={14} /> Terpilih
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="modal-actions-right">
          <button className="btn-royal" onClick={onClose}>
            <span>Terapkan & Main</span>
          </button>
        </div>
      </div>
    </div>
  );
};

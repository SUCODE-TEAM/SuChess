import React from 'react';
import {
  RotateCcw,
  RefreshCw,
  Sliders,
  Volume2,
  VolumeX,
  Swords,
  Bot,
  User,
  Users,
  Sparkles,
  ShieldAlert,
  BarChart2,
  Award,
} from 'lucide-react';

export const TopBar = ({
  gameEngine,
  gameMode,
  setGameMode,
  stockfishElo,
  onOpenEloModal,
  graphicQuality,
  setGraphicQuality,
  isMuted,
  onToggleMute,
  onNewGame,
  onUndo,
  onFlipBoard,
  onOpenMultiplayer,
  onOpenReview,
  multiplayerState,
}) => {
  const isWhiteTurn = gameEngine.turn() === 'w';
  const isCheck = gameEngine.isCheck();
  const isGameOver = gameEngine.isGameOver();

  return (
    <header className="topbar-container">
      {/* Brand & Logo */}
      <div className="brand-badge">
        <div className="brand-crest">
          <Sparkles size={20} className="gold-text" />
        </div>
        <div className="brand-text">
          <span className="brand-name">
            <span className="gold-text">Su</span>Chesse
          </span>
          <span className="brand-tag">Ray-Tracing 3D</span>
        </div>
      </div>

      {/* Turn & Status Indicator */}
      <div className="status-indicator-badge">
        <div className={`status-dot ${isWhiteTurn ? 'dot-white' : 'dot-black'}`} />
        <span className="status-text">
          {isGameOver
            ? 'Permainan Selesai'
            : isCheck
            ? `SKAK! Giliran ${isWhiteTurn ? 'Putih' : 'Hitam'}`
            : `Giliran ${isWhiteTurn ? 'Putih' : 'Hitam'}`}
        </span>
        {isCheck && <ShieldAlert size={16} className="text-red pulse" />}
      </div>

      {/* Mode & Quick Controls */}
      <div className="topbar-actions">
        {/* Game Mode Selector */}
        <div className="control-group">
          <button
            className={`mode-btn ${gameMode === 'pvp' ? 'active' : ''}`}
            onClick={() => setGameMode('pvp')}
            title="2 Pemain (Lokal)"
          >
            <User size={15} />
            <span className="btn-label">Lokal</span>
          </button>
          <button
            className={`mode-btn ${gameMode === 'ai' ? 'active' : ''}`}
            onClick={() => setGameMode('ai')}
            title="Lawan Official Stockfish 19 Engine (stockfishchess.org)"
          >
            <Bot size={15} />
            <span className="btn-label">Stockfish</span>
          </button>
          <button
            className={`mode-btn ${gameMode === 'multiplayer' ? 'active' : ''}`}
            onClick={onOpenMultiplayer}
            title="Mabar Beda Device (HP / Tablet / Laptop)"
          >
            <Users size={15} className="gold-text" />
            <span className="btn-label">
              {multiplayerState.isConnected ? `Room ${multiplayerState.roomCode}` : 'Mabar'}
            </span>
          </button>

          {gameMode === 'ai' && (
            <button
              className="mode-btn elo-trigger-btn"
              onClick={onOpenEloModal}
              title="Atur Kekuatan ELO Stockfish"
            >
              <Award size={14} className="gold-text" />
              <span className="btn-label font-bold gold-text">{stockfishElo} ELO</span>
            </button>
          )}
        </div>

        {/* Game Review Button */}
        <div className="control-group">
          <button
            className="mode-btn review-trigger-btn"
            onClick={onOpenReview}
            title="Analisis Pertandingan dengan Stockfish 19"
          >
            <BarChart2 size={15} className="gold-text" />
            <span className="btn-label">Analisis</span>
          </button>
        </div>

        {/* Graphics Quality Preset */}
        <div className="control-group">
          <button
            className={`mode-btn ${graphicQuality === 'ultra' ? 'active' : ''}`}
            onClick={() => {
              const next =
                graphicQuality === 'ultra'
                  ? 'high'
                  : graphicQuality === 'high'
                  ? 'medium'
                  : 'ultra';
              setGraphicQuality(next);
            }}
            title={`Grafik: ${graphicQuality.toUpperCase()} (Klik untuk ganti)`}
          >
            <Sliders size={15} />
            <span className="btn-label">
              {graphicQuality === 'ultra' ? 'RTX Ultra' : graphicQuality.toUpperCase()}
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="control-group">
          <button className="icon-btn" onClick={onUndo} title="Batalkan Langkah (Undo)">
            <RotateCcw size={17} />
          </button>
          <button className="icon-btn" onClick={onFlipBoard} title="Putar Sudut Pandang">
            <RefreshCw size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={onToggleMute}
            title={isMuted ? 'Buka Suara' : 'Bisukan Suara'}
          >
            {isMuted ? (
              <VolumeX size={17} className="text-muted" />
            ) : (
              <Volume2 size={17} className="gold-text" />
            )}
          </button>
          <button className="btn-royal" onClick={onNewGame} title="Permainan Baru">
            <Swords size={16} />
            <span>Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
};

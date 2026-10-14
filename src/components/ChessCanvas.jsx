import React, { useEffect, useRef, useState } from 'react';
import { ThreeSceneManager } from '../engine/ThreeSceneManager';
import { Sparkles } from 'lucide-react';

export const ChessCanvas = ({
  gameEngine,
  selectedSquare,
  onSquareClick,
  graphicQuality,
  sceneManagerRef,
  isFlipped,
}) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Menginisialisasi Dunia 3D...');

  // Always update manager's onSquareClick to the latest function reference!
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.onSquareClick = onSquareClick;
    }
  }, [onSquareClick]);

  useEffect(() => {
    if (!containerRef.current) return;

    const manager = new ThreeSceneManager(containerRef.current, {
      onSquareClick,
      onProgress: (msg) => setLoadingText(msg),
      graphicQuality,
    });

    sceneManagerRef.current = manager;

    (async () => {
      await manager.loadPieceModels();
      manager.syncBoard(gameEngine.board());
      setLoading(false);
    })();

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // Update graphic quality
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setGraphicQuality(graphicQuality);
    }
  }, [graphicQuality]);

  // Sync board pieces when game state changes
  useEffect(() => {
    if (sceneManagerRef.current && !loading) {
      sceneManagerRef.current.syncBoard(gameEngine.board());
    }
  }, [gameEngine.fen(), loading]);

  // Update highlights
  useEffect(() => {
    if (!sceneManagerRef.current || loading) return;

    sceneManagerRef.current.clearHighlights();

    // Check highlight
    if (gameEngine.isCheck()) {
      const turn = gameEngine.turn();
      const board = gameEngine.board();
      const files = 'abcdefgh';
      const ranks = '12345678';
      let kingSquare = null;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === turn) {
            kingSquare = files[c] + ranks[7 - r];
            break;
          }
        }
      }
      if (kingSquare) {
        sceneManagerRef.current.highlightCheck(kingSquare);
      }
    }

    // Selected piece & legal moves (Luminous White RTX Glow)
    if (selectedSquare) {
      sceneManagerRef.current.highlightSelectedSquare(selectedSquare);
      const legalMoves = gameEngine.getLegalMoves(selectedSquare);
      sceneManagerRef.current.highlightLegalMoves(legalMoves);
    }
  }, [selectedSquare, gameEngine.fen(), loading]);

  return (
    <div className="canvas-wrapper">
      <div ref={containerRef} className="three-canvas" />

      {/* Loading Overlay */}
      {loading && (
        <div className="canvas-loader">
          <div className="loader-card">
            <div className="loader-crest">
              <Sparkles className="crest-icon pulse" size={36} />
            </div>
            <h2 className="loader-title">SuChesse</h2>
            <p className="loader-subtitle">Katedral Gotik & Ray-Tracing WebGL</p>
            <div className="loader-bar-bg">
              <div className="loader-bar-fill" />
            </div>
            <p className="loader-text">{loadingText}</p>
          </div>
        </div>
      )}
    </div>
  );
};

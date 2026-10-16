import React from 'react';
import { ChessPiece } from './ChessPiece';
import { Chess } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// Color mapping for Chess.com move classifications
const CLASSIFICATION_COLORS = {
  brilliant: '#26c2a3', // Cyan
  great: '#3ea3db',     // Blue
  best: '#81b64c',      // Green
  excellent: '#81b64c', // Light Green
  good: '#97af7a',      // Soft Olive
  book: '#c38c4c',      // Saddle Brown / Gold
  inaccuracy: '#f7c631',// Yellow
  mistake: '#e67e22',   // Orange
  miss: '#fa412d',      // Bright Red
  missed_win: '#fa412d',// Red
  blunder: '#fa412d',   // Bright Red
};

const CLASSIFICATION_ICONS = {
  brilliant: '!!',
  great: '!',
  best: '★',
  excellent: '✓',
  good: '✓',
  book: '📖',
  inaccuracy: '?!',
  mistake: '?',
  miss: '❌',
  missed_win: '❌',
  blunder: '??',
};

export const ReviewChessBoard = ({
  fen,
  playedMove,
  bestMove,
  showBestMove = true,
  isFlipped = false,
  boardTheme = 'chesscom', // 'chesscom' | 'dark'
}) => {
  // Parse position and checkmate status from FEN
  const { board, isCheckmate, checkmatedSquare } = React.useMemo(() => {
    try {
      const chess = new Chess(fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const b = chess.board();
      const mate = chess.isCheckmate();
      let mateSq = null;
      if (mate) {
        const turn = chess.turn(); // color of the checkmated player
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.type === 'k' && p.color === turn) {
              mateSq = FILES[c] + RANKS[r];
              break;
            }
          }
          if (mateSq) break;
        }
      }
      return { board: b, isCheckmate: mate, checkmatedSquare: mateSq };
    } catch (e) {
      return { board: [], isCheckmate: false, checkmatedSquare: null };
    }
  }, [fen]);

  // Coordinate helper: converts 'e4' to { x, y } in 0..800 coordinate space
  const squareToCoord = (square) => {
    if (!square || square.length < 2) return null;
    const file = square[0].toLowerCase();
    const rank = square[1];

    let fileIdx = FILES.indexOf(file);
    let rankIdx = RANKS.indexOf(rank);

    if (fileIdx === -1 || rankIdx === -1) return null;

    if (isFlipped) {
      fileIdx = 7 - fileIdx;
      rankIdx = 7 - rankIdx;
    }

    return {
      x: fileIdx * 100 + 50,
      y: rankIdx * 100 + 50,
      col: fileIdx,
      row: rankIdx,
    };
  };

  // Render SVG Arrow between two squares
  const renderArrow = (fromSq, toSq, color, width = 16, opacity = 0.88, isDashed = false) => {
    const start = squareToCoord(fromSq);
    const end = squareToCoord(toSq);
    if (!start || !end) return null;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) return null;

    const angle = Math.atan2(dy, dx);

    // Padding from piece center so piece is visible
    const padStart = 24;
    const padEnd = 32;

    const x1 = start.x + Math.cos(angle) * padStart;
    const y1 = start.y + Math.sin(angle) * padStart;
    const x2 = end.x - Math.cos(angle) * padEnd;
    const y2 = end.y - Math.sin(angle) * padEnd;

    // Arrowhead geometry
    const headLen = 30;
    const headAngle = Math.PI / 6; // 30 degrees
    const headX1 = x2 - headLen * Math.cos(angle - headAngle);
    const headY1 = y2 - headLen * Math.sin(angle - headAngle);
    const headX2 = x2 - headLen * Math.cos(angle + headAngle);
    const headY2 = y2 - headLen * Math.sin(angle + headAngle);

    return (
      <g key={`${fromSq}-${toSq}-${color}`} style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))' }}>
        {/* Shaft */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={isDashed ? '12 8' : 'none'}
          opacity={opacity}
        />
        {/* Arrowhead */}
        <polygon
          points={`${end.x - Math.cos(angle) * 12},${end.y - Math.sin(angle) * 12} ${headX1},${headY1} ${headX2},${headY2}`}
          fill={color}
          opacity={opacity}
        />
      </g>
    );
  };

  // Determine which arrows to draw (Matching Chess.com exact Game Review)
  const arrowsToDraw = [];
  const isBest = playedMove && bestMove && playedMove.from === bestMove.from && playedMove.to === bestMove.to;

  if (isBest || playedMove?.classification === 'book' || playedMove?.classification === 'best') {
    // 1. If played move was best or book, draw the green move arrow
    if (playedMove?.from && playedMove?.to) {
      arrowsToDraw.push({
        from: playedMove.from,
        to: playedMove.to,
        color: '#81b64c',
        width: 16,
        opacity: 0.95,
        isDashed: false,
      });
    }
  } else {
    // 2. Played move was NOT best (blunder, miss, mistake, inaccuracy)
    // Draw Best Move Arrow (green) showing what player SHOULD have played
    if (showBestMove && bestMove && bestMove.from && bestMove.to) {
      arrowsToDraw.push({
        from: bestMove.from,
        to: bestMove.to,
        color: '#81b64c',
        width: 16,
        opacity: 0.95,
        isDashed: false,
      });
    }

    // 3. Draw Threat Arrow (red) if opponent piece has a dangerous attack resulting from this error (e.g. uncaptured bishop attacking f7)
    if (playedMove?.threatFrom && playedMove?.threatTo) {
      arrowsToDraw.push({
        from: playedMove.threatFrom,
        to: playedMove.threatTo,
        color: '#fa412d',
        width: 15,
        opacity: 0.9,
        isDashed: false,
      });
    }
  }

  // Coordinates of badge on destination square
  const badgeCoord = playedMove && playedMove.to ? squareToCoord(playedMove.to) : null;
  const badgeCls = playedMove?.classification;

  // Board colors (Chess.com Classic Green vs Dark Luxury)
  const isDarkTheme = boardTheme === 'dark';
  const lightColor = isDarkTheme ? '#403d39' : '#ebecd0';
  const darkColor = isDarkTheme ? '#252422' : '#779556';

  const displayFiles = isFlipped ? [...FILES].reverse() : FILES;
  const displayRanks = isFlipped ? [...RANKS].reverse() : RANKS;

  return (
    <div className="review-board-outer">
      <div className="review-board-container">
        {/* 8x8 Board Grid */}
        <div className="board-grid">
          {displayRanks.map((rank, rIdx) => (
            <div key={rank} className="board-row">
              {displayFiles.map((file, fIdx) => {
                const squareName = file + rank;
                const isLight = (rIdx + fIdx) % 2 === 0;
                const isPlayedFrom = playedMove && playedMove.from === squareName;
                const isPlayedTo = playedMove && playedMove.to === squareName;
                const isBestTarget = showBestMove && bestMove && bestMove.to === squareName;

                // Square piece
                const actualRow = isFlipped ? 7 - RANKS.indexOf(rank) : RANKS.indexOf(rank);
                const actualCol = isFlipped ? 7 - FILES.indexOf(file) : FILES.indexOf(file);
                const piece = board?.[actualRow]?.[actualCol];

                let bg = isLight ? lightColor : darkColor;

                // Highlight squares
                if (isPlayedFrom || isPlayedTo) {
                  const cls = playedMove?.classification;
                  if (cls === 'blunder' || cls === 'miss' || cls === 'missed_win') {
                    bg = isLight ? '#eb7d7d' : '#ba4343';
                  } else if (cls === 'mistake') {
                    bg = isLight ? '#f9ab6d' : '#c96f24';
                  } else if (cls === 'inaccuracy') {
                    bg = isLight ? '#fde293' : '#c29724';
                  } else {
                    bg = isLight ? '#f7ec59cc' : '#bbcb2bcc';
                  }
                }

                return (
                  <div
                    key={squareName}
                    className={`board-cell ${isLight ? 'cell-light' : 'cell-dark'}`}
                    style={{ backgroundColor: bg }}
                    data-square={squareName}
                  >
                    {/* Rank label on first column */}
                    {fIdx === 0 && (
                      <span className={`coord-label rank-label ${isLight ? 'coord-dark' : 'coord-light'}`}>
                        {rank}
                      </span>
                    )}

                    {/* File label on last row */}
                    {rIdx === 7 && (
                      <span className={`coord-label file-label ${isLight ? 'coord-dark' : 'coord-light'}`}>
                        {file}
                      </span>
                    )}

                    {/* Best Move ring hint on square if different from played */}
                    {isBestTarget && !isPlayedTo && (
                      <div className="best-move-target-ring" />
                    )}

                    {/* Chess Piece */}
                    {piece && (
                      <div className="piece-wrapper">
                        <ChessPiece type={piece.type} color={piece.color} size="82%" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* SVG Overlay: Arrows */}
        <svg
          className="board-svg-overlay"
          viewBox="0 0 800 800"
          preserveAspectRatio="none"
          pointerEvents="none"
        >
          {arrowsToDraw.map((arrow) =>
            renderArrow(arrow.from, arrow.to, arrow.color, arrow.width, arrow.opacity, arrow.isDashed)
          )}
        </svg>

        {/* Move Classification Badge right on target square */}
        {badgeCoord && badgeCls && (
          <div
            className={`square-classification-badge badge-${badgeCls}`}
            style={{
              left: `${(badgeCoord.col * 12.5) + 12.5}%`,
              top: `${badgeCoord.row * 12.5}%`,
              backgroundColor: CLASSIFICATION_COLORS[badgeCls] || '#81b64c',
            }}
            title={`${badgeCls.toUpperCase()}: ${CLASSIFICATION_ICONS[badgeCls]}`}
          >
            <span>{CLASSIFICATION_ICONS[badgeCls]}</span>
          </div>
        )}

        {/* Chess.com style Checkmate badge on mated king */}
        {isCheckmate && checkmatedSquare && (() => {
          const mateCoord = squareToCoord(checkmatedSquare);
          if (!mateCoord) return null;
          return (
            <div
              className="square-classification-badge square-checkmate-badge"
              style={{
                left: `${(mateCoord.col * 12.5) + 12.5}%`,
                top: `${mateCoord.row * 12.5}%`,
                backgroundColor: '#b32222',
                borderColor: '#ffffff',
              }}
              title="Skakmat (Raja Mati)"
            >
              <span style={{ fontSize: '13px' }}>#</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

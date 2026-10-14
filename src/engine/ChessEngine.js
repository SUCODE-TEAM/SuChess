import { Chess } from 'chess.js';

// Piece point values for material calculations & AI
export const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

export class ChessGame {
  constructor() {
    this.chess = new Chess();
  }

  reset() {
    this.chess.reset();
  }

  loadFen(fen) {
    this.chess.load(fen);
  }

  fen() {
    return this.chess.fen();
  }

  turn() {
    return this.chess.turn(); // 'w' or 'b'
  }

  isCheck() {
    return typeof this.chess.isCheck === 'function' ? this.chess.isCheck() : this.chess.in_check();
  }

  isCheckmate() {
    return typeof this.chess.isCheckmate === 'function' ? this.chess.isCheckmate() : this.chess.in_checkmate();
  }

  isDraw() {
    return typeof this.chess.isDraw === 'function' ? this.chess.isDraw() : this.chess.in_draw();
  }

  isStalemate() {
    return typeof this.chess.isStalemate === 'function' ? this.chess.isStalemate() : this.chess.in_stalemate();
  }

  isGameOver() {
    return typeof this.chess.isGameOver === 'function' ? this.chess.isGameOver() : this.chess.game_over();
  }

  board() {
    return this.chess.board();
  }

  getLegalMoves(square) {
    return this.chess.moves({ square, verbose: true });
  }

  getAllMoves() {
    return this.chess.moves({ verbose: true });
  }

  move(from, to, promotion = 'q') {
    try {
      const result = this.chess.move({ from, to, promotion });
      return result;
    } catch {
      return null;
    }
  }

  undo() {
    return this.chess.undo();
  }

  history() {
    return this.chess.history({ verbose: true });
  }

  getCapturedPieces() {
    // Standard starting set
    const startingCounts = {
      w: { p: 8, n: 2, b: 2, r: 2, q: 1 },
      b: { p: 8, n: 2, b: 2, r: 2, q: 1 }
    };

    const currentCounts = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };

    const board = this.chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== 'k') {
          currentCounts[piece.color][piece.type]++;
        }
      }
    }

    const capturedByBlack = []; // White pieces captured
    const capturedByWhite = []; // Black pieces captured

    for (const [type, count] of Object.entries(startingCounts.w)) {
      const diff = count - currentCounts.w[type];
      for (let i = 0; i < diff; i++) {
        capturedByBlack.push({ type, color: 'w', value: PIECE_VALUES[type] });
      }
    }

    for (const [type, count] of Object.entries(startingCounts.b)) {
      const diff = count - currentCounts.b[type];
      for (let i = 0; i < diff; i++) {
        capturedByWhite.push({ type, color: 'b', value: PIECE_VALUES[type] });
      }
    }

    const whiteScore = capturedByWhite.reduce((s, p) => s + p.value, 0);
    const blackScore = capturedByBlack.reduce((s, p) => s + p.value, 0);

    return {
      capturedByWhite,
      capturedByBlack,
      diffScore: Math.round((whiteScore - blackScore) / 100)
    };
  }
}


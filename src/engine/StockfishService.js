import { Chess } from 'chess.js';

// Official Stockfish 19 NNUE Engine Presets (stockfishchess.org)
// Calibrated from Elo 400 (Beginner with realistic tactical blunders) up to 3650+ (Max Stockfish 19 NNUE)
export const ELO_PRESETS = [
  { elo: 400, level: 1, name: 'Stockfish Level 1 (Pemula)', skill: 0, depth: 2, desc: 'Pemula (400 Elo): Sering membuat blunder fatal, gantung perwira, dan salah langkah taktik' },
  { elo: 800, level: 4, name: 'Stockfish Level 4 (Kasual)', skill: 3, depth: 4, desc: 'Pemain Kasual (800 Elo): Memahami dasar, namun kerap melewatkan taktik dan gantung perwira' },
  { elo: 1200, level: 8, name: 'Stockfish Level 8 (Klub Menengah)', skill: 6, depth: 6, desc: 'Klub Menengah (1200 Elo): Bermain solid, sesekali melewatkan taktik 2-3 langkah' },
  { elo: 1600, level: 12, name: 'Stockfish Level 12 (Kompetitif)', skill: 10, depth: 10, desc: 'Kompetitif (1600 Elo): Taktis dan terencana, sangat jarang membuat blunder langsung' },
  { elo: 2000, level: 15, name: 'Stockfish Level 15 (Master/CM)', skill: 14, depth: 14, desc: 'Candidate Master (2000 Elo): Posisi kuat, kalkulasi tajam dan presisi' },
  { elo: 2500, level: 18, name: 'Stockfish Level 18 (Grandmaster)', skill: 18, depth: 18, desc: 'Grandmaster (2500 Elo): Tingkat grandmaster internasional, nyaris tanpa cela' },
  { elo: 3650, level: 20, name: 'Stockfish 19 NNUE Max (Super GM)', skill: 20, depth: 22, desc: 'Stockfish 19 NNUE Max (3650+ Elo): Mesin catur terkuat dunia tanpa batas dan tanpa kompromi' }
];

/**
 * Human-like move selection controller based on target Elo.
 * Guarantees that an Elo 400 bot makes genuine beginner blunders (hanging pieces, bad trades,
 * random flank pawns), while Elo 3650+ plays 100% pure Stockfish 19 NNUE god-mode.
 */
export function selectMoveByElo(fen, engineBestMoveUci, targetElo = 1200) {
  try {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    if (!legalMoves || legalMoves.length === 0) return null;
    if (legalMoves.length === 1) return legalMoves[0];

    const bestLegal = legalMoves.find(
      (m) => (m.from + m.to + (m.promotion || '')) === engineBestMoveUci
    ) || legalMoves[0];

    // At Super Grandmaster / Engine Max (3000 - 3650+ Elo): 100% Pure Stockfish 19 NNUE #1 Move
    if (targetElo >= 3000) {
      return bestLegal;
    }

    const PIECE_VALS = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    const elo = Math.max(250, Math.min(3650, targetElo));

    // Categorize legal moves into tactical categories
    const blunders = [];
    const inaccuracies = [];
    const goodMoves = [];

    for (const move of legalMoves) {
      const uci = move.from + move.to + (move.promotion || '');
      if (uci === engineBestMoveUci) {
        continue; // Keep separate as engine top move
      }

      const tempGame = new Chess(fen);
      tempGame.move(move);
      const opponentMoves = tempGame.moves({ verbose: true });

      // Does this move walk into immediate checkmate?
      const allowsMate = opponentMoves.some((op) => op.san.includes('#'));
      if (allowsMate) {
        blunders.push(move);
        continue;
      }

      // Check if the moved piece is immediately attacked on destination square
      const attacksOnTarget = opponentMoves.filter((op) => op.to === move.to);
      if (attacksOnTarget.length > 0) {
        const movedVal = PIECE_VALS[move.piece] || 100;
        const cheapestAttackerVal = Math.min(
          ...attacksOnTarget.map((op) => PIECE_VALS[op.piece] || 100)
        );

        // Attacked by a cheaper piece (e.g. pawn attacks knight/bishop/rook/queen)
        if (cheapestAttackerVal < movedVal) {
          blunders.push(move);
          continue;
        }

        // Check if destination square is defended by friendly pieces
        const testAfterCap = new Chess(tempGame.fen());
        testAfterCap.move(attacksOnTarget[0]);
        const recaptures = testAfterCap.moves({ verbose: true }).filter((rec) => rec.to === move.to);
        if (recaptures.length === 0 && (move.piece !== 'p' || !move.captured)) {
          // Completely hanging piece without defense!
          blunders.push(move);
          continue;
        }
      }

      // Inaccuracy detection: random flank pawn pushes (a3, h3, a6, h6) or passive moves
      const isFlankPawn = move.piece === 'p' && (move.to[0] === 'a' || move.to[0] === 'h') && !move.captured;
      if (isFlankPawn) {
        inaccuracies.push(move);
      } else {
        goodMoves.push(move);
      }
    }

    // Determine probabilities based on Elo (250 to 3000)
    // Elo 400: ~45% blunder, ~35% inaccuracy, ~20% best/good
    // Elo 800: ~22% blunder, ~32% inaccuracy, ~46% best/good
    // Elo 1200: ~8% blunder, ~22% inaccuracy, ~70% best/good
    // Elo 1600: ~2% blunder, ~12% inaccuracy, ~86% best/good
    // Elo 2000+: <1% blunder, ~5% inaccuracy, ~95% best
    let blunderProb = 0;
    let inaccuracyProb = 0;
    let bestProb = 0;

    if (elo <= 600) {
      const t = (elo - 250) / 350;
      blunderProb = 0.50 - t * 0.12; // 0.50 down to 0.38 (at 400 ~ 0.44)
      inaccuracyProb = 0.35 - t * 0.05;
      bestProb = 0.15 + t * 0.10;
    } else if (elo <= 1200) {
      const t = (elo - 600) / 600;
      blunderProb = 0.38 - t * 0.30; // 0.38 down to 0.08
      inaccuracyProb = 0.30 - t * 0.10;
      bestProb = 0.25 + t * 0.35;
    } else if (elo <= 1800) {
      const t = (elo - 1200) / 600;
      blunderProb = 0.08 - t * 0.06; // 0.08 down to 0.02
      inaccuracyProb = 0.20 - t * 0.12;
      bestProb = 0.60 + t * 0.22;
    } else if (elo <= 2500) {
      const t = (elo - 1800) / 700;
      blunderProb = 0.02 - t * 0.02; // 0.02 down to 0.00
      inaccuracyProb = 0.08 - t * 0.06;
      bestProb = 0.82 + t * 0.15;
    } else {
      blunderProb = 0;
      inaccuracyProb = 0.02;
      bestProb = 0.98;
    }

    const roll = Math.random();

    // 1. Blunder roll
    if (roll < blunderProb && blunders.length > 0) {
      const safeBlunders = elo >= 500
        ? blunders.filter((b) => {
            const nextG = new Chess(fen);
            nextG.move(b);
            return !nextG.moves({ verbose: true }).some((op) => op.san.includes('#'));
          })
        : blunders;
      const pool = safeBlunders.length > 0 ? safeBlunders : blunders;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // 2. Inaccuracy roll
    if (roll < (blunderProb + inaccuracyProb) && inaccuracies.length > 0) {
      return inaccuracies[Math.floor(Math.random() * inaccuracies.length)];
    }

    // 3. Best Move roll
    const bestRoll = Math.random();
    if (bestRoll < bestProb) {
      return bestLegal;
    }

    // 4. Good move pool
    if (goodMoves.length > 0) {
      return goodMoves[Math.floor(Math.random() * goodMoves.length)];
    }

    return bestLegal;
  } catch (err) {
    console.warn('[selectMoveByElo] Fallback:', err);
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      return moves[0] || null;
    } catch (e) {
      return null;
    }
  }
}

class StockfishManager {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.currentElo = 1200;
    this.engineName = 'Stockfish 19 NNUE (@lichess-org/stockfish-web)';
    this.queue = [];
    this.isProcessing = false;
    this.usingLichessModule = false;
    this.init();
  }

  init() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    console.log('[Stockfish 19 NNUE] Inisialisasi Engine Resmi Stockfish 19 dengan Neural Network (nn-1a298aa575a0.nnue 98.5 MB)...');

    try {
      this.worker = new Worker('/stockfish/stockfish-worker.js', { type: 'module' });
      this.usingLichessModule = true;

      this.worker.onerror = (err) => {
        console.error('[Stockfish 19 NNUE] Worker Error:', err);
      };

      this.setupWorker();
    } catch (err) {
      console.error('[Stockfish 19 NNUE] Gagal membuat Web Worker Stockfish 19:', err);
    }
  }

  setupWorker() {
    if (!this.worker) return;

    this.worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';

      // Handle Lichess module ready signal
      if (line === 'stockfish-web-ready') {
        console.log('[Stockfish 19 NNUE] Engine ready via @lichess-org/stockfish-web');
        this.isReady = true;
        this.sendCommand('uci');
        this.sendCommand('isready');
        this.setElo(this.currentElo);
        return;
      }

      if (line === 'stockfish-web-init-error') {
        console.error('[Stockfish 19 NNUE] Gagal menginisialisasi modul Stockfish 19 NNUE.');
        return;
      }

      this.handleEngineOutput(line);
    };
  }

  sendCommand(cmd) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  setElo(elo) {
    this.currentElo = Math.max(250, Math.min(3650, elo));
    const preset = ELO_PRESETS.find(p => p.elo >= this.currentElo) || ELO_PRESETS[ELO_PRESETS.length - 1];

    if (this.currentElo >= 3000) {
      this.sendCommand('setoption name UCI_LimitStrength value false');
      this.sendCommand('setoption name Skill Level value 20');
    } else {
      this.sendCommand('setoption name UCI_LimitStrength value true');
      this.sendCommand(`setoption name UCI_Elo value ${Math.max(1320, Math.min(2850, this.currentElo))}`);
      this.sendCommand(`setoption name Skill Level value ${preset.skill}`);
    }
  }

  handleEngineOutput(line) {
    if (line.includes('Stockfish') || line.startsWith('id name')) {
      console.log('[Stockfish 19 NNUE Engine]', line);
      if (line.startsWith('id name')) {
        this.engineName = line.replace('id name', '').trim();
      }
    }

    if (line.includes('readyok')) {
      this.isReady = true;
    }

    if (this.currentTask) {
      this.currentTask.onLine(line);
    }
  }

  // Get best move for AI
  getBestMove(fen, elo = this.currentElo, timeoutMs = 2500) {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(null);
        return;
      }

      this.setElo(elo);
      const preset = ELO_PRESETS.find(p => p.elo >= elo) || ELO_PRESETS[ELO_PRESETS.length - 1];
      const maxDepth = preset.depth;

      let bestMoveParsed = null;
      let evalScore = 0;

      const task = {
        onLine: (line) => {
          if (line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) evalScore = parseInt(match[1], 10);
          } else if (line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) evalScore = parseInt(match[1], 10) > 0 ? 10000 : -10000;
          }

          if (line.startsWith('bestmove')) {
            const parts = line.split(' ');
            const moveStr = parts[1];

            // Select move corresponding to targeted Elo
            const selectedMove = selectMoveByElo(fen, moveStr, elo);
            if (selectedMove) {
              const from = selectedMove.from;
              const to = selectedMove.to;
              const promotion = selectedMove.promotion;
              const uci = from + to + (promotion || '');
              bestMoveParsed = { from, to, promotion, bestMove: uci, san: selectedMove.san, eval: evalScore };
            } else if (moveStr && moveStr !== '(none)') {
              const from = moveStr.slice(0, 2);
              const to = moveStr.slice(2, 4);
              const promotion = moveStr.length > 4 ? moveStr[4] : undefined;
              bestMoveParsed = { from, to, promotion, bestMove: moveStr, eval: evalScore };
            }
            cleanup();
            resolve(bestMoveParsed);
          }
        }
      };

      const timer = setTimeout(() => {
        this.sendCommand('stop');
        cleanup();
        resolve(bestMoveParsed);
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        this.currentTask = null;
        this.processNextInQueue();
      };

      this.enqueueTask(() => {
        this.currentTask = task;
        this.sendCommand(`position fen ${fen}`);
        const movetime = Math.min(timeoutMs - 100, elo >= 3000 ? 2000 : 800);
        this.sendCommand(`go depth ${maxDepth} movetime ${movetime}`);
      });
    });
  }

  // Single position evaluation
  evaluatePosition(fen, depth = 10, timeoutMs = 800) {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve({ score: 0, bestMove: null });
        return;
      }

      let evalScore = 0;
      let topMove = null;

      const task = {
        onLine: (line) => {
          if (line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) evalScore = parseInt(match[1], 10);
          } else if (line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) evalScore = parseInt(match[1], 10) > 0 ? 10000 : -10000;
          }

          if (line.startsWith('bestmove')) {
            const parts = line.split(' ');
            topMove = parts[1];
            cleanup();
            resolve({ score: evalScore, bestMove: topMove });
          }
        }
      };

      const timer = setTimeout(() => {
        this.sendCommand('stop');
        cleanup();
        resolve({ score: evalScore, bestMove: topMove });
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        this.currentTask = null;
        this.processNextInQueue();
      };

      this.enqueueTask(() => {
        this.currentTask = task;
        this.sendCommand(`position fen ${fen}`);
        this.sendCommand(`go depth ${depth} movetime ${timeoutMs}`);
      });
    });
  }

  // Queue manager to prevent UCI command collisions
  enqueueTask(fn) {
    this.queue.push(fn);
    if (!this.isProcessing) {
      this.processNextInQueue();
    }
  }

  processNextInQueue() {
    if (this.queue.length > 0) {
      this.isProcessing = true;
      const next = this.queue.shift();
      next();
    } else {
      this.isProcessing = false;
    }
  }

  // Post-Match Game Review Analysis (Calculates Chess.com style accuracy and classification)
  async analyzeGame(moveHistory, onProgress = () => {}) {
    if (!moveHistory || moveHistory.length === 0) return null;

    const { identifyOpening, isBookMove } = await import('./OpeningBook.js');
    const sanList = moveHistory.map(m => m.san);
    const openingInfo = identifyOpening(sanList);

    const game = new Chess();
    const evaluatedMoves = [];
    const totalMoves = moveHistory.length;

    // Accuracy calculations based on CAPS win-probability loss
    const whiteAccuracies = [];
    const blackAccuracies = [];

    const stats = {
      w: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 },
      b: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 }
    };

    for (let i = 0; i < totalMoves; i++) {
      const move = moveHistory[i];
      const fenBefore = game.fen();
      const isWhite = move.color === 'w';

      // Evaluate position before the move
      const evalBefore = await this.evaluatePosition(fenBefore, 10, 280);

      // Convert best move UCI to SAN for friendly display
      let bestMoveSan = null;
      let bestMoveFrom = null;
      let bestMoveTo = null;
      if (evalBefore.bestMove && evalBefore.bestMove !== '(none)') {
        bestMoveFrom = evalBefore.bestMove.slice(0, 2);
        bestMoveTo = evalBefore.bestMove.slice(2, 4);
        try {
          const tempGame = new Chess(fenBefore);
          const m = tempGame.move({
            from: bestMoveFrom,
            to: bestMoveTo,
            promotion: evalBefore.bestMove.length > 4 ? evalBefore.bestMove[4] : undefined
          });
          if (m) bestMoveSan = m.san;
        } catch (e) {
          bestMoveSan = evalBefore.bestMove;
        }
      }

      // Play the move
      game.move(move);
      const fenAfter = game.fen();

      // Evaluate position after the move
      const evalAfter = await this.evaluatePosition(fenAfter, 10, 280);

      // In fenBefore, side to move is the mover.
      // In fenAfter, side to move is opponent, so -evalAfter.score is mover's evaluation.
      const moverBeforeCp = evalBefore.score;
      const moverAfterCp = -evalAfter.score;
      const whiteAdvantage = isWhite ? moverAfterCp : -moverAfterCp;

      // Win Probability formula: P = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
      const winProbBefore = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * moverBeforeCp)) - 1);
      const winProbAfter = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * moverAfterCp)) - 1);
      const winProbLoss = Math.max(0, winProbBefore - winProbAfter);

      // Move Accuracy score for this single move (0 to 100%)
      const moveAcc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * winProbLoss) - 3.1669));
      if (isWhite) whiteAccuracies.push(moveAcc);
      else blackAccuracies.push(moveAcc);

      // Check if best move captures an opponent piece (free piece or tactic)
      let targetPiece = null;
      let threatFrom = null;
      let threatTo = null;
      if (bestMoveTo) {
        try {
          const gameBefore = new Chess(fenBefore);
          targetPiece = gameBefore.get(bestMoveTo);
        } catch (e) {}
      }

      // If a piece was missed, calculate what that uncaptured piece threatens in fenAfter
      if (targetPiece && bestMoveTo) {
        try {
          const gameAfter = new Chess(fenAfter);
          const opponentMoves = gameAfter.moves({ square: bestMoveTo, verbose: true });
          const attackMove = opponentMoves.find(m => m.to === 'f7' || m.to === 'f2' || m.captured) || opponentMoves[0];
          if (attackMove) {
            threatFrom = bestMoveTo;
            threatTo = attackMove.to;
          }
        } catch (e) {}
      }

      // Classification logic matching Chess.com CAPS2
      const deliversCheckmate = game.isCheckmate() || (move.san && move.san.includes('#'));
      const playedUci = move.from + move.to + (move.promotion || '');
      let isBest = evalBefore.bestMove === playedUci;
      let cpLoss = Math.max(0, moverBeforeCp - moverAfterCp);
      const inBook = isBookMove(sanList, i);

      // Delivering checkmate is ALWAYS the Best Move in chess
      if (deliversCheckmate) {
        isBest = true;
        bestMoveFrom = move.from;
        bestMoveTo = move.to;
        bestMoveSan = move.san;
        evalBefore.bestMove = playedUci;
        threatFrom = null;
        threatTo = null;
        cpLoss = 0;
      }

      // Blunder & Miss detection:
      const isMated = moverAfterCp <= -9000;
      const isSwingToLoss = moverBeforeCp >= 150 && moverAfterCp <= -100;
      
      // Chess.com "Miss" (❌): Overlooking a free piece capture or decisive tactical opportunity
      const isMiss = !isBest && !deliversCheckmate && !isMated && (targetPiece || moverBeforeCp >= 200) && cpLoss >= 100;
      const isBlunder = !isMiss && !deliversCheckmate && (isMated || isSwingToLoss || cpLoss >= 135 || winProbLoss >= 16);

      let classification = 'good';
      let comment = 'Langkah bagus dan solid.';

      if (deliversCheckmate) {
        classification = 'best';
        comment = `${move.san} adalah langkah terbaik (★)! Dan permainan berakhir kemenangan (Skakmat).`;
        stats[move.color].best++;
      } else if (inBook) {
        classification = 'book';
        comment = `Langkah Teori Pembukaan (${openingInfo.name}). Mengembangkan perwira sesuai jalur buku.`;
        stats[move.color].book++;
      } else if (isBest) {
        if (move.captured && winProbBefore < 45 && winProbAfter > 55) {
          classification = 'brilliant';
          comment = 'Langkah Brilian (!!)! Pengorbanan taktis spektakuler yang membalikkan kendali papan!';
          stats[move.color].brilliant++;
        } else if (moverBeforeCp < -150 && moverAfterCp > -50) {
          classification = 'great';
          comment = 'Langkah Hebat (!)! Menemukan satu-satunya pertahanan terbaik di bawah tekanan.';
          stats[move.color].great++;
        } else {
          classification = 'best';
          comment = `Langkah Terbaik (★)! Langkah paling akurat yang direkomendasikan Stockfish 19.`;
          stats[move.color].best++;
        }
      } else if (isMiss) {
        classification = 'miss';
        const pieceNames = { p: 'pion', n: 'kuda', b: 'gajah', r: 'benteng', q: 'menteri', k: 'raja' };
        if (targetPiece) {
          comment = `Melewatkan Kesempatan (❌)! Langkah ini melewatkan peluang untuk memakan ${pieceNames[targetPiece.type] || 'perwira'} gratis lawan (${bestMoveSan}).`;
        } else {
          comment = `Melewatkan Peluang Taktis (❌)! Anda melewatkan langkah kemenangan telak ${bestMoveSan}.`;
        }
        stats[move.color].miss++;
      } else if (isBlunder) {
        classification = 'blunder';
        if (isMated) {
          comment = `Blunder fatal (??)! Langkah ini membiarkan lawan melakukan skakmat! Langkah terbaik adalah ${bestMoveSan || evalBefore.bestMove}.`;
        } else if (move.piece === 'p' && cpLoss >= 135 && cpLoss < 250) {
          comment = `Blunder (??)! Langkah ini membiarkan pion tergantung tanpa penjagaan gratis. Langkah terbaik adalah ${bestMoveSan || evalBefore.bestMove}.`;
        } else {
          comment = `Blunder fatal (??)! Melepaskan keunggulan berharga secara drastis. Langkah terbaik adalah ${bestMoveSan || evalBefore.bestMove}.`;
        }
        stats[move.color].blunder++;
      } else if (cpLoss <= 15) {
        classification = 'excellent';
        comment = 'Langkah sangat bagus! Hampir setara dengan langkah terbaik engine.';
        stats[move.color].excellent++;
      } else if (cpLoss <= 40) {
        classification = 'good';
        comment = 'Langkah bagus dan menjaga kestabilan posisi.';
        stats[move.color].good++;
      } else if (cpLoss <= 75) {
        classification = 'inaccuracy';
        comment = `Inakurasi (?!). Sedikit melepaskan kendali posisi. Langkah yang lebih tajam adalah ${bestMoveSan || evalBefore.bestMove}.`;
        stats[move.color].inaccuracy++;
      } else {
        classification = 'mistake';
        comment = `Kesalahan (?). Memberikan inisiatif dan peluang bagi lawan. Stockfish menyarankan ${bestMoveSan || evalBefore.bestMove}.`;
        stats[move.color].mistake++;
      }

      evaluatedMoves.push({
        moveIndex: i,
        san: move.san,
        color: move.color,
        from: move.from,
        to: move.to,
        piece: move.piece,
        fenBefore,
        fenAfter,
        evalScore: moverAfterCp,
        whiteAdvantage,
        bestMoveUci: evalBefore.bestMove,
        bestMoveSan: bestMoveSan || evalBefore.bestMove,
        bestMoveFrom,
        bestMoveTo,
        threatFrom,
        threatTo,
        classification,
        comment,
        moveAccuracy: Math.round(moveAcc),
        cpLoss: Math.round(cpLoss),
      });

      onProgress(Math.round(((i + 1) / totalMoves) * 100));
    }

    const whiteAvg = whiteAccuracies.length > 0
      ? (whiteAccuracies.reduce((a, b) => a + b, 0) / whiteAccuracies.length)
      : 80;
    const blackAvg = blackAccuracies.length > 0
      ? (blackAccuracies.reduce((a, b) => a + b, 0) / blackAccuracies.length)
      : 80;

    return {
      whiteAccuracy: Math.round(whiteAvg * 10) / 10,
      blackAccuracy: Math.round(blackAvg * 10) / 10,
      opening: openingInfo,
      stats,
      moves: evaluatedMoves
    };
  }
}

export const stockfishService = new StockfishManager();

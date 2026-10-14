import { Chess } from 'chess.js';

// Official Stockfish 19 Engine Presets (stockfishchess.org)
export const ELO_PRESETS = [
  { elo: 400, level: 1, name: 'Stockfish Level 1', skill: 0, depth: 2, desc: 'Pemula, banyak membuat blunder taktik dasar' },
  { elo: 800, level: 4, name: 'Stockfish Level 4', skill: 3, depth: 4, desc: 'Pemain kasual santai' },
  { elo: 1200, level: 8, name: 'Stockfish Level 8', skill: 6, depth: 6, desc: 'Pemain catur menengah klub' },
  { elo: 1600, level: 12, name: 'Stockfish Level 12', skill: 10, depth: 8, desc: 'Pemain kompetitif berpengalaman' },
  { elo: 2000, level: 15, name: 'Stockfish Level 15', skill: 14, depth: 12, desc: 'Candidate Master (CM), kalkulasi sangat dalam' },
  { elo: 2500, level: 18, name: 'Stockfish Level 18', skill: 18, depth: 16, desc: 'Grandmaster (GM), langkah tajam dan presisi' },
  { elo: 3200, level: 20, name: 'Stockfish Max (Level 20)', skill: 20, depth: 20, desc: 'Kekuatan penuh Stockfish 19 tanpa batas (stockfishchess.org)' }
];

class StockfishManager {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.currentElo = 1200;
    this.engineName = 'Stockfish 19 (stockfishchess.org)';
    this.queue = [];
    this.isProcessing = false;
    this.init();
  }

  init() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    // Load official Stockfish 19 WASM single-thread engine
    const workerScripts = [
      '/stockfish/stockfish-19-lite-single.js',
      '/stockfish.js',
      '/stockfish/stockfish-19-asm.js',
      '/stockfish/stockfish-lite.js',
    ];

    const tryInit = (index) => {
      if (index >= workerScripts.length) {
        console.error('All Stockfish worker scripts failed to initialize.');
        return;
      }

      const scriptPath = workerScripts[index];
      try {
        if (this.worker) {
          try { this.worker.terminate(); } catch (e) {}
        }
        this.worker = new Worker(scriptPath);
        this.worker.onerror = (err) => {
          console.warn(`Stockfish script ${scriptPath} error, trying next:`, err);
          tryInit(index + 1);
        };
        this.setupWorker();
      } catch (err) {
        console.warn(`Failed creating Worker with ${scriptPath}:`, err);
        tryInit(index + 1);
      }
    };

    tryInit(0);
  }

  setupWorker() {
    if (!this.worker) return;

    this.worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
      this.handleEngineOutput(line);
    };

    this.sendCommand('uci');
    this.sendCommand('isready');
    this.setElo(this.currentElo);
  }

  sendCommand(cmd) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  setElo(elo) {
    this.currentElo = Math.max(250, Math.min(3200, elo));
    const preset = ELO_PRESETS.find(p => p.elo >= this.currentElo) || ELO_PRESETS[ELO_PRESETS.length - 1];

    if (this.currentElo >= 3100) {
      this.sendCommand('setoption name UCI_LimitStrength value false');
      this.sendCommand('setoption name Skill Level value 20');
    } else {
      this.sendCommand('setoption name UCI_LimitStrength value true');
      this.sendCommand(`setoption name UCI_Elo value ${Math.max(1320, this.currentElo)}`);
      this.sendCommand(`setoption name Skill Level value ${preset.skill}`);
    }
  }

  handleEngineOutput(line) {
    if (line.includes('Stockfish') || line.startsWith('id name')) {
      console.log('[Official Stockfish 19 Engine]', line);
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
      const preset = ELO_PRESETS.find(p => p.elo >= elo) || ELO_PRESETS[2];
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
            if (moveStr && moveStr !== '(none)') {
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
        this.sendCommand(`go depth ${maxDepth} movetime ${Math.min(timeoutMs - 200, 1500)}`);
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

    const game = new Chess();
    const evaluatedMoves = [];
    const totalMoves = moveHistory.length;

    // Accuracy calculations based on CAPS win-probability loss
    const whiteAccuracies = [];
    const blackAccuracies = [];

    const stats = {
      w: { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
      b: { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
    };

    let prevEval = 20; // Initial opening slight white advantage in cp

    for (let i = 0; i < totalMoves; i++) {
      const move = moveHistory[i];
      const fenBefore = game.fen();
      const isWhite = move.color === 'w';

      // Evaluate position before the move
      const evalBefore = await this.evaluatePosition(fenBefore, 10, 300);

      // Play the move
      game.move(move);
      const fenAfter = game.fen();

      // Evaluate position after the move
      const evalAfter = await this.evaluatePosition(fenAfter, 10, 300);

      // Calculate centipawn evaluation from moving player's perspective
      const beforeCp = isWhite ? evalBefore.score : -evalBefore.score;
      const afterCp = isWhite ? evalAfter.score : -evalAfter.score;

      // Win Probability formula: P = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
      const winProbBefore = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * beforeCp)) - 1);
      const winProbAfter = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * afterCp)) - 1);
      const winProbLoss = Math.max(0, winProbBefore - winProbAfter);

      // Move Accuracy score for this single move (0 to 100%)
      const moveAcc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * winProbLoss) - 3.1669));
      if (isWhite) whiteAccuracies.push(moveAcc);
      else blackAccuracies.push(moveAcc);

      // Classification
      const playedUci = move.from + move.to + (move.promotion || '');
      const isBest = evalBefore.bestMove === playedUci;
      const cpLoss = Math.max(0, beforeCp - afterCp);

      let classification = 'good';
      let comment = 'Langkah bagus dan solid.';

      if (isBest) {
        if (move.captured && winProbBefore < 45 && winProbAfter > 55) {
          classification = 'brilliant';
          comment = 'Langkah Brilian! Pengorbanan taktis membalikkan keadaan!';
          stats[move.color].brilliant++;
        } else if (beforeCp < -150 && afterCp > -50) {
          classification = 'great';
          comment = 'Langkah Hebat! Menemukan satu-satunya pertahanan terbaik.';
          stats[move.color].great++;
        } else {
          classification = 'best';
          comment = 'Langkah Terbaik yang direkomendasikan Stockfish.';
          stats[move.color].best++;
        }
      } else if (cpLoss <= 25) {
        classification = 'good';
        comment = 'Langkah bagus dan menjaga kestabilan posisi.';
        stats[move.color].good++;
      } else if (cpLoss <= 90) {
        classification = 'inaccuracy';
        comment = 'Inakurasi (?!) - Melemahkan inisiatif atau kontrol petak.';
        stats[move.color].inaccuracy++;
      } else if (cpLoss <= 250) {
        classification = 'mistake';
        comment = 'Kesalahan (?) - Kehilangan keunggulan posisi secara signifikan.';
        stats[move.color].mistake++;
      } else {
        classification = 'blunder';
        comment = 'Blunder (??) - Kehilangan perwira berharga atau ancaman skakmat!';
        stats[move.color].blunder++;
      }

      evaluatedMoves.push({
        moveIndex: i,
        san: move.san,
        color: move.color,
        from: move.from,
        to: move.to,
        piece: move.piece,
        fenAfter,
        evalScore: evalAfter.score,
        bestMoveUci: evalBefore.bestMove,
        classification,
        comment,
        moveAccuracy: Math.round(moveAcc),
        whiteAdvantage: evalAfter.score
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
      stats,
      moves: evaluatedMoves
    };
  }
}

export const stockfishService = new StockfishManager();

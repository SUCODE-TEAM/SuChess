/**
 * Stockfish 19 NNUE Web Worker
 * Wraps @lichess-org/stockfish-web sf_19 module in a Worker context.
 * Communicates via postMessage: receives UCI commands, sends UCI output lines.
 */

let engine = null;

async function initEngine() {
  try {
    // Import the sf_19.js module (served from /stockfish/sf_19.js)
    const module = await import('/stockfish/sf_19.js');
    const Sf_19_Web = module.default;

    // Initialize the engine with listen handler passed directly to capture all UCI output
    engine = await Sf_19_Web({
      locateFile: (file) => '/stockfish/' + file,
      listen: (line) => {
        self.postMessage(line);
      },
      onError: (msg) => {
        console.error('[Stockfish Worker Error]', msg);
      },
    });

    // Download and set NNUE file(s)
    for (let idx = 0; idx < 2; idx++) {
      const nnueName = engine.getRecommendedNnue?.(idx);
      if (!nnueName) continue;
      try {
        const resp = await fetch('/stockfish/' + nnueName);
        if (resp.ok) {
          const buf = new Uint8Array(await resp.arrayBuffer());
          engine.setNnueBuffer(buf, idx);
          console.log('[Stockfish] NNUE loaded (index ' + idx + '):', nnueName);
        } else {
          console.warn('[Stockfish] NNUE not found:', nnueName, resp.status);
        }
      } catch (e) {
        console.warn('[Stockfish] Failed to load NNUE:', e);
      }
    }

    // Signal ready to main thread
    self.postMessage('stockfish-web-ready');
  } catch (err) {
    console.error('[Stockfish Worker] Init failed:', err);
    self.postMessage('stockfish-web-init-error');
  }
}

// Handle UCI commands from main thread
self.onmessage = (e) => {
  const cmd = e.data;
  if (engine && engine.uci) {
    engine.uci(cmd);
  }
};

// Start initialization
initEngine();

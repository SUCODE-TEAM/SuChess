import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Sparkles,
  Zap,
  CheckCircle,
  Check,
  BookOpen,
  AlertTriangle,
  AlertOctagon,
  XCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Cpu,
  BookMarked,
  Layers,
  Eye,
  Award,
  Bot,
  FileText,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { Chess } from 'chess.js';
import { stockfishService } from '../engine/StockfishService';
import { ReviewChessBoard } from './ReviewChessBoard';
import { EvalBar } from './EvalBar';
import { EvalGraph } from './EvalGraph';

// Move classification badge styles and labels
const CLASSIFICATION_META = {
  brilliant: { label: 'Brilian', symbol: '!!', color: '#26c2a3', bg: 'rgba(38, 194, 163, 0.15)', desc: 'Pengorbanan taktis spektakuler' },
  great: { label: 'Hebat', symbol: '!', color: '#3ea3db', bg: 'rgba(62, 163, 219, 0.15)', desc: 'Menemukan satu-satunya penyelamatan' },
  best: { label: 'Terbaik', symbol: '★', color: '#81b64c', bg: 'rgba(129, 182, 76, 0.15)', desc: 'Rekomendasi teratas Stockfish 19' },
  excellent: { label: 'Sangat Bagus', symbol: '✓', color: '#81b64c', bg: 'rgba(129, 182, 76, 0.12)', desc: 'Mendekati langkah terbaik' },
  good: { label: 'Bagus', symbol: '✓', color: '#97af7a', bg: 'rgba(151, 175, 122, 0.15)', desc: 'Menjaga posisi tetap stabil' },
  book: { label: 'Langkah Buku', symbol: '📖', color: '#c38c4c', bg: 'rgba(195, 140, 76, 0.18)', desc: 'Teori pembukaan standar' },
  inaccuracy: { label: 'Inakurasi', symbol: '?!', color: '#f7c631', bg: 'rgba(247, 198, 49, 0.15)', desc: 'Melepaskan inisiatif posisi' },
  mistake: { label: 'Kesalahan', symbol: '?', color: '#e67e22', bg: 'rgba(230, 126, 34, 0.15)', desc: 'Menguntungkan posisi lawan' },
  miss: { label: 'Melewatkan Kesempatan', symbol: '❌', color: '#db4141', bg: 'rgba(219, 65, 65, 0.18)', desc: 'Melewatkan peluang memakan perwira gratis lawan' },
  missed_win: { label: 'Melewatkan Menang', symbol: '❌', color: '#db4141', bg: 'rgba(219, 65, 65, 0.18)', desc: 'Melewatkan peluang menang fatal' },
  blunder: { label: 'Blunder', symbol: '??', color: '#fa412d', bg: 'rgba(250, 65, 45, 0.18)', desc: 'Kehilangan perwira atau keunggulan besar' },
};

// Preset Famous Master & Study Games
export const SAMPLE_GAMES = [
  {
    id: 'opera',
    title: 'The Opera Game',
    year: '1858',
    players: 'Paul Morphy vs Duke Karl / Count Isouard',
    movesCount: 33,
    tag: 'Brilian & Legendaris',
    tagColor: '#26c2a3',
    desc: 'Pengorbanan menteri & skakmat dua perwira legendaris di Paris Opera House.',
    pgn: '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#'
  },
  {
    id: 'scholar',
    title: "Scholar's Mate",
    year: 'Taktik Kilat',
    players: 'Serangan Sayap Raja f7',
    movesCount: 7,
    tag: 'Skakmat & Blunder',
    tagColor: '#fa412d',
    desc: 'Contoh skakmat kilat 4 langkah paling populer akibat blunder pertahanan titik f7.',
    pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#'
  },
  {
    id: 'kasparov',
    title: "Kasparov's Immortal",
    year: '1999',
    players: 'Garry Kasparov vs Veselin Topalov',
    movesCount: 87,
    tag: 'Mahakarya Dunia',
    tagColor: '#3ea3db',
    desc: 'Kombinasi pengorbanan benteng 24. Rxd4 yang dinobatkan sebagai salah satu partai terindah abad 20.',
    pgn: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0'
  },
  {
    id: 'evergreen',
    title: 'The Evergreen Game',
    year: '1852',
    players: 'Adolf Anderssen vs Jean Dufresne',
    movesCount: 47,
    tag: 'Romantisme Taktis',
    tagColor: '#d5a452',
    desc: 'Evans Gambit legendaris dengan pengorbanan menteri dan dua benteng beruntun yang abadi.',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7#'
  }
];

// Robust PGN parser with fallback to SAN tokens
export function parsePgnWithDetails(pgnString) {
  if (!pgnString || !pgnString.trim()) {
    throw new Error('Notasi PGN tidak boleh kosong.');
  }

  const cleanPgn = pgnString.trim();
  const chess = new Chess();
  let loaded = false;

  let white = '';
  let black = '';
  let event = '';

  const whiteMatch = cleanPgn.match(/\[White\s+"([^"]+)"\]/i);
  if (whiteMatch) white = whiteMatch[1];
  const blackMatch = cleanPgn.match(/\[Black\s+"([^"]+)"\]/i);
  if (blackMatch) black = blackMatch[1];
  const eventMatch = cleanPgn.match(/\[Event\s+"([^"]+)"\]/i);
  if (eventMatch) event = eventMatch[1];

  try {
    chess.loadPgn(cleanPgn, { strict: false });
    loaded = chess.history().length > 0;
  } catch (err) {
    loaded = false;
  }

  if (!loaded) {
    const sansHeaders = cleanPgn.replace(/\[.*?\]/g, ' ').trim();
    try {
      const chess2 = new Chess();
      chess2.loadPgn(sansHeaders, { strict: false });
      if (chess2.history().length > 0) {
        return {
          moves: chess2.history({ verbose: true }),
          white: white || 'Putih',
          black: black || 'Hitam',
          event: event || 'Analisis PGN'
        };
      }
    } catch (e) {}

    try {
      const chess3 = new Chess();
      const cleanTokens = sansHeaders
        .replace(/\{.*?\}/g, ' ')
        .replace(/\(.*?\)/g, ' ')
        .replace(/1-0|0-1|1\/2-1\/2|\*/g, ' ')
        .replace(/\d+\.+/g, ' ')
        .trim()
        .split(/\s+/);

      for (const tok of cleanTokens) {
        if (!tok) continue;
        const res = chess3.move(tok);
        if (!res) break;
      }

      if (chess3.history().length > 0) {
        return {
          moves: chess3.history({ verbose: true }),
          white: white || 'Putih',
          black: black || 'Hitam',
          event: event || 'Analisis PGN'
        };
      }
    } catch (e) {}

    throw new Error('Format PGN tidak dikenali. Pastikan notasi catur valid (misal: 1. e4 e5 2. Nf3 Nc6...).');
  }

  return {
    moves: chess.history({ verbose: true }),
    white: white || 'Putih',
    black: black || 'Hitam',
    event: event || 'Analisis PGN'
  };
}

export const GameReviewModal = ({
  isOpen,
  onClose,
  moveHistory = [],
  onSelectMovePosition,
}) => {
  const [activeMoves, setActiveMoves] = useState([]);
  const [gameTitle, setGameTitle] = useState('Pertandingan Saat Ini');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBestMoveArrow, setShowBestMoveArrow] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'key' | 'book'
  const [showImportModal, setShowImportModal] = useState(false);
  const [pgnInput, setPgnInput] = useState('');
  const [pgnError, setPgnError] = useState('');
  const autoplayTimerRef = useRef(null);

  // Trigger analysis when modal opens with active board moves
  useEffect(() => {
    if (isOpen) {
      if (moveHistory && moveHistory.length > 0) {
        // If board has new moves or haven't analyzed yet
        if (!analysisResult || activeMoves !== moveHistory) {
          setActiveMoves(moveHistory);
          setGameTitle('Pertandingan Saat Ini');
          runAnalysis(moveHistory, 'Pertandingan Saat Ini');
        }
      } else {
        // If board has no moves and no analysis result yet
        if (!analysisResult) {
          setActiveMoves([]);
        }
      }
    } else {
      setShowImportModal(false);
      setPgnError('');
    }
  }, [isOpen, moveHistory.length]);

  const runAnalysis = async (movesToAnalyze, title = 'Pertandingan Saat Ini') => {
    if (!movesToAnalyze || movesToAnalyze.length === 0) return;
    setIsAnalyzing(true);
    setProgress(0);
    setGameTitle(title);

    try {
      const result = await stockfishService.analyzeGame(movesToAnalyze, (p) => {
        setProgress(p);
      });
      setAnalysisResult(result);
      if (result && result.moves.length > 0) {
        setSelectedMoveIndex(0);
      }
    } catch (err) {
      console.error('Error analyzing match:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadSampleGame = (sample) => {
    try {
      setPgnError('');
      const parsed = parsePgnWithDetails(sample.pgn);
      setActiveMoves(parsed.moves);
      setShowImportModal(false);
      runAnalysis(parsed.moves, `${sample.title} (${sample.year})`);
    } catch (err) {
      setPgnError(err.message);
    }
  };

  const handleAnalyzePgnInput = () => {
    try {
      setPgnError('');
      if (!pgnInput.trim()) {
        setPgnError('Silakan tempelkan teks PGN terlebih dahulu.');
        return;
      }
      const parsed = parsePgnWithDetails(pgnInput);
      setActiveMoves(parsed.moves);
      setShowImportModal(false);
      const title = parsed.white !== 'Putih' || parsed.black !== 'Hitam'
        ? `${parsed.white} vs ${parsed.black}`
        : 'Analisis PGN Kustom';
      runAnalysis(parsed.moves, title);
    } catch (err) {
      setPgnError(err.message);
    }
  };

  // Keyboard navigation (Arrow keys, Space)
  useEffect(() => {
    if (!isOpen || !analysisResult || analysisResult.moves.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedMoveIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedMoveIndex((prev) => Math.min(analysisResult.moves.length - 1, prev + 1));
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setSelectedMoveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setSelectedMoveIndex(analysisResult.moves.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, analysisResult]);

  // Autoplay functionality
  useEffect(() => {
    if (isPlaying && analysisResult && analysisResult.moves.length > 0) {
      autoplayTimerRef.current = setInterval(() => {
        setSelectedMoveIndex((prev) => {
          if (prev >= analysisResult.moves.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1600);
    } else {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    }

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [isPlaying, analysisResult]);

  // Sync with 3D scene if callback provided
  useEffect(() => {
    if (analysisResult && analysisResult.moves[selectedMoveIndex] && onSelectMovePosition) {
      onSelectMovePosition(analysisResult.moves[selectedMoveIndex].fenAfter);
    }
  }, [selectedMoveIndex, analysisResult]);

  if (!isOpen) return null;

  const currentMove = analysisResult?.moves?.[selectedMoveIndex];
  const opening = analysisResult?.opening;

  const handleCopyPgn = () => {
    const movesToUse = activeMoves.length > 0 ? activeMoves : moveHistory;
    const pgn = movesToUse.reduce((acc, m, idx) => {
      if (idx % 2 === 0) {
        return `${acc} ${Math.floor(idx / 2) + 1}. ${m.san}`;
      }
      return `${acc} ${m.san}`;
    }, '').trim();

    navigator.clipboard.writeText(pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter moves for the move list tab
  const filteredMoves = (analysisResult?.moves || []).filter((m) => {
    if (filterMode === 'book') return m.classification === 'book';
    if (filterMode === 'key') {
      return ['blunder', 'miss', 'missed_win', 'mistake', 'inaccuracy', 'brilliant', 'great'].includes(
        m.classification
      );
    }
    return true;
  });

  const hasMovesToDisplay = !isAnalyzing && analysisResult && analysisResult.moves.length > 0;

  return (
    <div className="modal-backdrop review-backdrop">
      <div className="chesscom-review-card">
        {/* Top Header Bar */}
        <div className="chesscom-top-header">
          <div className="header-left-meta">
            <div className="engine-brand-pill">
              <Cpu size={16} className="gold-text" />
              <span className="brand-name">Stockfish 19 NNUE</span>
              <span className="brand-tag">Game Review</span>
            </div>

            {gameTitle && (
              <div className="game-title-pill" title={gameTitle}>
                <Award size={14} className="gold-text" />
                <span className="game-title-text">{gameTitle}</span>
              </div>
            )}

            {opening && (
              <div className="opening-eco-pill" title={opening.desc}>
                <BookOpen size={14} className="eco-icon" />
                <span className="eco-badge">{opening.eco}</span>
                <span className="eco-name">{opening.name}</span>
              </div>
            )}
          </div>

          {/* CAPS Accuracy Pills */}
          {analysisResult && (
            <div className="accuracy-caps-wrap">
              <div className="acc-pill white-pill">
                <span className="pill-dot white-dot" />
                <span className="pill-player">Putih:</span>
                <span className="pill-val">{analysisResult.whiteAccuracy}%</span>
              </div>
              <span className="acc-vs">vs</span>
              <div className="acc-pill black-pill">
                <span className="pill-dot black-dot" />
                <span className="pill-player">Hitam:</span>
                <span className="pill-val">{analysisResult.blackAccuracy}%</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="header-right-actions">
            <button
              className="review-tool-btn pgn-import-highlight-btn"
              onClick={() => {
                setPgnError('');
                setShowImportModal(true);
              }}
              title="Tempel atau Impor PGN Eksternal"
            >
              <FileText size={16} className="gold-text" />
              <span>Impor PGN</span>
            </button>
            <button
              className="review-tool-btn"
              onClick={() => setIsFlipped(!isFlipped)}
              title="Balik Papan (Flip View)"
            >
              <RotateCcw size={16} />
              <span>Balik</span>
            </button>
            <button className="review-tool-btn" onClick={handleCopyPgn} title="Salin PGN">
              {copied ? <Check size={16} className="text-green" /> : <Copy size={16} />}
              <span>{copied ? 'Tersalin' : 'PGN'}</span>
            </button>
            <button className="review-close-icon-btn" onClick={onClose} title="Tutup Review">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isAnalyzing && (
          <div className="review-loading-view">
            <div className="loading-center-box">
              <div className="pulse-icon-ring">
                <Cpu size={40} className="gold-text pulse-cpu" />
              </div>
              <h3 className="gold-text">Stockfish 19 sedang mengevaluasi permainan...</h3>
              <p className="text-muted">
                Menganalisis CAPS2 akurasi pemain, klasifikasi langkah brilian & blunder, teori pembukaan, dan panah taktis.
              </p>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="progress-meta-row">
                <span className="progress-percent">{progress}% selesai</span>
                <span className="progress-sub">Engine: Pure Stockfish 19 NNUE (Lichess WebAssembly)</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty State / Analysis Center (When no moves played yet or user wants to import PGN) */}
        {!isAnalyzing && !hasMovesToDisplay && (
          <div className="review-hub-empty-container">
            <div className="hub-welcome-banner">
              <div className="hub-icon-wrapper">
                <Sparkles size={32} className="gold-text" />
              </div>
              <div className="hub-banner-content">
                <div className="hub-banner-badge">
                  <Cpu size={14} /> Stockfish 19 NNUE Analysis Center
                </div>
                <h2>Pusat Analisis Game & Impor PGN</h2>
                <p>
                  Belum ada langkah yang dimainkan pada papan catur aktif.
                  Anda dapat <strong>menempelkan notasi PGN</strong> dari Chess.com / Lichess,
                  mencoba <strong>pertandingan master legendaris</strong> dengan 1-klik,
                  atau kembali bermain di papan 3D.
                </p>
              </div>
            </div>

            <div className="hub-main-grid">
              {/* Left Column: PGN Paste Box */}
              <div className="hub-card pgn-paste-card">
                <div className="card-head">
                  <div className="card-title-row">
                    <BookMarked size={20} className="gold-text" />
                    <h3>Tempel Notasi PGN Eksternal</h3>
                  </div>
                  <span className="card-subtitle">Mendukung ekspor Chess.com, Lichess, atau notasi SAN standar</span>
                </div>

                <div className="paste-input-area">
                  <textarea
                    className="pgn-textarea"
                    value={pgnInput}
                    onChange={(e) => {
                      setPgnInput(e.target.value);
                      if (pgnError) setPgnError('');
                    }}
                    placeholder={`Tempelkan notasi PGN di sini...\nContoh:\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O...\n\nAtau tempel ekspor PGN lengkap dari Chess.com / Lichess dengan header [Event] [Site]...`}
                    rows={8}
                  />
                  {pgnError && (
                    <div className="pgn-error-banner">
                      <AlertOctagon size={16} />
                      <span>{pgnError}</span>
                    </div>
                  )}
                </div>

                <div className="pgn-actions-row">
                  <button
                    className="btn-hub-analyze"
                    onClick={handleAnalyzePgnInput}
                    disabled={!pgnInput.trim()}
                  >
                    <Zap size={18} />
                    <span>Mulai Analisis dengan Stockfish 19</span>
                  </button>
                  {pgnInput && (
                    <button
                      className="btn-hub-clear"
                      onClick={() => {
                        setPgnInput('');
                        setPgnError('');
                      }}
                    >
                      Bersihkan
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Famous Master Games Presets */}
              <div className="hub-card sample-games-card">
                <div className="card-head">
                  <div className="card-title-row">
                    <Award size={20} className="gold-text" />
                    <h3>Pertandingan Master Legendaris (1-Klik)</h3>
                  </div>
                  <span className="card-subtitle">Pilih permainan di bawah untuk langsung menguji evaluasi mendalam</span>
                </div>

                <div className="sample-games-grid">
                  {SAMPLE_GAMES.map((sample) => (
                    <div
                      key={sample.id}
                      className="sample-game-tile"
                      onClick={() => handleLoadSampleGame(sample)}
                      title={`Klik untuk menganalisis ${sample.title}`}
                    >
                      <div className="tile-top">
                        <span className="sample-title">{sample.title}</span>
                        <span
                          className="sample-tag"
                          style={{
                            backgroundColor: `${sample.tagColor}22`,
                            color: sample.tagColor,
                            borderColor: `${sample.tagColor}55`
                          }}
                        >
                          {sample.tag}
                        </span>
                      </div>
                      <div className="sample-players">{sample.players}</div>
                      <p className="sample-desc">{sample.desc}</p>
                      <div className="tile-foot">
                        <span className="sample-moves">{sample.movesCount} Langkah</span>
                        <span className="sample-action-cta">Analisis Sekarang →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="hub-footer-bar">
              <button className="btn-back-to-play" onClick={onClose}>
                <ArrowLeft size={16} />
                <span>Kembali ke Papan 3D & Mainkan Catur</span>
              </button>
              <span className="hub-engine-status">
                <Cpu size={14} className="gold-text" /> Engine: Stockfish 19 NNUE (Evaluasi Cepat & Akurat)
              </span>
            </div>
          </div>
        )}

        {/* Main Review Studio: Board on Left, Coach & Breakdown on Right */}
        {hasMovesToDisplay && (
          <div className="chesscom-studio-body">
            {/* LEFT: Chess Board, Eval Bar, Graph, and Board Controls */}
            <div className="studio-board-column">
              {/* Board + Eval Bar Row */}
              <div className="board-and-eval-row">
                {/* Vertical Evaluation Bar */}
                <EvalBar
                  whiteAdvantage={currentMove?.whiteAdvantage || 0}
                  isFlipped={isFlipped}
                />

                {/* 2D Interactive Chessboard with SVG Arrows & Badges */}
                <ReviewChessBoard
                  fen={currentMove?.fenAfter || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
                  playedMove={currentMove}
                  bestMove={
                    currentMove && currentMove.bestMoveFrom && currentMove.bestMoveTo
                      ? { from: currentMove.bestMoveFrom, to: currentMove.bestMoveTo }
                      : null
                  }
                  showBestMove={showBestMoveArrow}
                  isFlipped={isFlipped}
                />
              </div>

              {/* Board Quick Toggles */}
              <div className="board-under-controls">
                <label className="toggle-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showBestMoveArrow}
                    onChange={(e) => setShowBestMoveArrow(e.target.checked)}
                  />
                  <span className="toggle-switch-slider" />
                  <span className="toggle-text">
                    Tanda Panah Langkah Terbaik (Best Move <span className="text-green">★</span>)
                  </span>
                </label>
              </div>

              {/* Interactive Evaluation Graph */}
              <div className="graph-section-wrapper">
                <EvalGraph
                  moves={analysisResult.moves}
                  selectedIndex={selectedMoveIndex}
                  onSelectMove={(idx) => setSelectedMoveIndex(idx)}
                />
              </div>
            </div>

            {/* RIGHT: Coach, Move Navigator, Breakdown & Move History */}
            <div className="studio-inspector-column">
              {/* Coach / Move Assessment Card */}
              {currentMove && (
                <div className="coach-speech-card">
                  <div className="coach-header">
                    <div className="coach-avatar">
                      <Bot size={22} className="coach-bot-icon" />
                    </div>
                    <div className="coach-title-area">
                      <div className="coach-classification-badge" style={{
                        backgroundColor: CLASSIFICATION_META[currentMove.classification]?.bg || '#222',
                        color: CLASSIFICATION_META[currentMove.classification]?.color || '#81b64c',
                        borderColor: CLASSIFICATION_META[currentMove.classification]?.color || '#81b64c',
                      }}>
                        <span className="meta-sym">{CLASSIFICATION_META[currentMove.classification]?.symbol}</span>
                        <span className="meta-lbl">{CLASSIFICATION_META[currentMove.classification]?.label}</span>
                      </div>
                      <span className="move-indicator-text">
                        Langkah {Math.floor(currentMove.moveIndex / 2) + 1}
                        {currentMove.color === 'w' ? '.' : '...'} {currentMove.san} ({currentMove.color === 'w' ? 'Putih' : 'Hitam'})
                      </span>
                    </div>
                    <div className="move-accuracy-score">
                      <span className="score-num">{currentMove.moveAccuracy}%</span>
                      <span className="score-lbl">Akurasi</span>
                    </div>
                  </div>

                  <p className="coach-narrative">{currentMove.comment}</p>

                  {/* Best Move Recommendation Box if played move was not best */}
                  {currentMove.bestMoveSan && currentMove.classification !== 'best' && currentMove.classification !== 'book' && (
                    <div className="recommendation-banner">
                      <div className="rec-text-wrap">
                        <span className="rec-sub">Rekomendasi Stockfish:</span>
                        <span className="rec-best-san">{currentMove.bestMoveSan}</span>
                      </div>
                      {currentMove.cpLoss > 0 && (
                        <span className="rec-loss-badge">-{currentMove.cpLoss} cp</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Move Navigator Toolbar */}
              <div className="studio-nav-bar">
                <button
                  className="nav-btn"
                  disabled={selectedMoveIndex === 0}
                  onClick={() => setSelectedMoveIndex(0)}
                  title="Awal Pertandingan (Home)"
                >
                  <ChevronFirst size={18} />
                </button>
                <button
                  className="nav-btn"
                  disabled={selectedMoveIndex === 0}
                  onClick={() => setSelectedMoveIndex((prev) => Math.max(0, prev - 1))}
                  title="Langkah Sebelumnya (Panah Kiri)"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className={`nav-btn btn-play-pause ${isPlaying ? 'active-playing' : ''}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? 'Jeda (Spasi)' : 'Putar Permainan (Spasi)'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  className="nav-btn"
                  disabled={selectedMoveIndex === analysisResult.moves.length - 1}
                  onClick={() =>
                    setSelectedMoveIndex((prev) =>
                      Math.min(analysisResult.moves.length - 1, prev + 1)
                    )
                  }
                  title="Langkah Selanjutnya (Panah Kanan)"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  className="nav-btn"
                  disabled={selectedMoveIndex === analysisResult.moves.length - 1}
                  onClick={() => setSelectedMoveIndex(analysisResult.moves.length - 1)}
                  title="Akhir Pertandingan (End)"
                >
                  <ChevronLast size={18} />
                </button>

                <div className="nav-step-counter">
                  <span className="step-current">{selectedMoveIndex + 1}</span>
                  <span className="step-slash">/</span>
                  <span className="step-total">{analysisResult.moves.length}</span>
                </div>
              </div>

              {/* Classification Stats Breakdown */}
              <div className="breakdown-card">
                <div className="breakdown-head">
                  <span className="b-title">Klasifikasi Langkah</span>
                  <div className="b-players">
                    <span className="p-tag-w">Putih</span>
                    <span className="p-tag-b">Hitam</span>
                  </div>
                </div>

                <div className="breakdown-rows-container">
                  {Object.entries(CLASSIFICATION_META).map(([key, meta]) => {
                    const countW = analysisResult.stats?.w?.[key] || 0;
                    const countB = analysisResult.stats?.b?.[key] || 0;
                    if (countW === 0 && countB === 0) return null;

                    return (
                      <div key={key} className="b-row-item">
                        <div className="b-row-label">
                          <span className="b-sym" style={{ color: meta.color }}>
                            {meta.symbol}
                          </span>
                          <span className="b-name">{meta.label}</span>
                        </div>
                        <div className="b-row-counts">
                          <span className={`b-pill ${countW > 0 ? 'pill-active' : ''}`}>
                            {countW}
                          </span>
                          <span className={`b-pill ${countB > 0 ? 'pill-active' : ''}`}>
                            {countB}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Move History Strip with Filter Tabs */}
              <div className="move-list-section">
                <div className="filter-tabs-row">
                  <button
                    className={`filter-tab ${filterMode === 'all' ? 'tab-active' : ''}`}
                    onClick={() => setFilterMode('all')}
                  >
                    Semua ({analysisResult.moves.length})
                  </button>
                  <button
                    className={`filter-tab ${filterMode === 'key' ? 'tab-active' : ''}`}
                    onClick={() => setFilterMode('key')}
                  >
                    Langkah Kunci
                  </button>
                  <button
                    className={`filter-tab ${filterMode === 'book' ? 'tab-active' : ''}`}
                    onClick={() => setFilterMode('book')}
                  >
                    Langkah Buku
                  </button>
                </div>

                <div className="moves-chip-scrollpane">
                  {filteredMoves.map((m) => {
                    const isSelected = m.moveIndex === selectedMoveIndex;
                    const meta = CLASSIFICATION_META[m.classification] || CLASSIFICATION_META.good;

                    return (
                      <div
                        key={m.moveIndex}
                        className={`move-chip-row ${isSelected ? 'selected-chip-row' : ''}`}
                        onClick={() => setSelectedMoveIndex(m.moveIndex)}
                      >
                        <span className="chip-idx">
                          {Math.floor(m.moveIndex / 2) + 1}
                          {m.color === 'w' ? '.' : '...'}
                        </span>
                        <span className="chip-san-bold">{m.san}</span>

                        <span
                          className="chip-class-badge"
                          style={{ color: meta.color, backgroundColor: meta.bg }}
                        >
                          {meta.symbol} {meta.label}
                        </span>

                        <span className="chip-eval-tag">
                          {m.whiteAdvantage > 0
                            ? `+${(m.whiteAdvantage / 100).toFixed(1)}`
                            : (m.whiteAdvantage / 100).toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Modal for Importing PGN Anytime */}
        {showImportModal && (
          <div className="import-pgn-overlay" onClick={() => setShowImportModal(false)}>
            <div className="import-pgn-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-header">
                <div className="dialog-title-group">
                  <Layers size={20} className="gold-text" />
                  <h3>Impor Permainan Baru (PGN)</h3>
                </div>
                <button
                  className="review-close-icon-btn"
                  onClick={() => setShowImportModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="dialog-body">
                <p className="dialog-subtext">
                  Tempelkan notasi PGN dari Chess.com / Lichess atau pilih dari koleksi permainan master untuk dievaluasi oleh Stockfish 19 NNUE.
                </p>

                <textarea
                  className="pgn-textarea dialog-textarea"
                  value={pgnInput}
                  onChange={(e) => {
                    setPgnInput(e.target.value);
                    if (pgnError) setPgnError('');
                  }}
                  placeholder="Tempelkan PGN di sini... (contoh: 1. e4 e5 2. Nf3 Nc6...)"
                  rows={6}
                />

                {pgnError && (
                  <div className="pgn-error-banner">
                    <AlertOctagon size={16} />
                    <span>{pgnError}</span>
                  </div>
                )}

                <div className="dialog-quick-presets">
                  <span className="presets-label">Atau coba game master legendaris:</span>
                  <div className="presets-row">
                    {SAMPLE_GAMES.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        className="preset-chip-btn"
                        onClick={() => handleLoadSampleGame(sample)}
                      >
                        {sample.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="dialog-footer">
                <button
                  type="button"
                  className="btn-dialog-cancel"
                  onClick={() => setShowImportModal(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn-hub-analyze dialog-submit-btn"
                  onClick={handleAnalyzePgnInput}
                  disabled={!pgnInput.trim()}
                >
                  <Zap size={16} />
                  <span>Mulai Analisis</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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
  Bot
} from 'lucide-react';
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

export const GameReviewModal = ({
  isOpen,
  onClose,
  moveHistory = [],
  onSelectMovePosition,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBestMoveArrow, setShowBestMoveArrow] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'key' | 'book'
  const autoplayTimerRef = useRef(null);

  // Trigger analysis on modal open
  useEffect(() => {
    if (isOpen && !analysisResult && moveHistory.length > 0) {
      startAnalysis();
    }
  }, [isOpen, moveHistory.length]);

  const startAnalysis = async () => {
    if (moveHistory.length === 0) return;
    setIsAnalyzing(true);
    setProgress(0);

    try {
      const result = await stockfishService.analyzeGame(moveHistory, (p) => {
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
    const pgn = moveHistory.reduce((acc, m, idx) => {
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
            <div className="spinner-royal" />
            <h3 className="gold-text">Stockfish 19 sedang mengevaluasi permainan...</h3>
            <p className="text-muted">
              Menganalisis CAPS2, klasifikasi langkah brilian, teori pembukaan, dan panah taktis.
            </p>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-percent">{progress}% selesai</span>
          </div>
        )}

        {/* Empty State */}
        {!isAnalyzing && (!moveHistory || moveHistory.length === 0) && (
          <div className="review-empty-view">
            <AlertTriangle size={48} className="gold-text" />
            <h3>Belum ada langkah dalam pertandingan ini.</h3>
            <p className="text-muted">Mainkan beberapa langkah catur terlebih dahulu sebelum meninjau.</p>
          </div>
        )}

        {/* Main Review Studio: Board on Left, Coach & Breakdown on Right */}
        {!isAnalyzing && analysisResult && (
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
      </div>
    </div>
  );
};

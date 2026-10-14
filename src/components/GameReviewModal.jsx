import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Zap,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  XCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  AlertCircle
} from 'lucide-react';
import { stockfishService } from '../engine/StockfishService';

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

  useEffect(() => {
    if (isOpen && !analysisResult && moveHistory.length > 0) {
      startAnalysis();
    }
  }, [isOpen]);

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
        setSelectedMoveIndex(result.moves.length - 1);
      }
    } catch (err) {
      console.error('Error analyzing match:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  const currentMove = analysisResult?.moves?.[selectedMoveIndex];

  const getClassificationBadge = (cls) => {
    switch (cls) {
      case 'brilliant':
        return (
          <span className="badge-review badge-brilliant">
            <Sparkles size={13} /> Brilian (!!)
          </span>
        );
      case 'great':
        return (
          <span className="badge-review badge-great">
            <Zap size={13} /> Hebat (!)
          </span>
        );
      case 'best':
        return (
          <span className="badge-review badge-best">
            <CheckCircle size={13} /> Terbaik (★)
          </span>
        );
      case 'good':
        return (
          <span className="badge-review badge-good">
            <Check size={13} /> Bagus (✓)
          </span>
        );
      case 'inaccuracy':
        return (
          <span className="badge-review badge-inaccuracy">
            <AlertTriangle size={13} /> Inakurasi (?!)
          </span>
        );
      case 'mistake':
        return (
          <span className="badge-review badge-mistake">
            <AlertOctagon size={13} /> Kesalahan (?)
          </span>
        );
      case 'blunder':
        return (
          <span className="badge-review badge-blunder">
            <XCircle size={13} /> Blunder (??)
          </span>
        );
      default:
        return null;
    }
  };

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

  return (
    <div className="modal-backdrop review-backdrop">
      <div className="review-modal-card">
        {/* Top Header */}
        <div className="review-modal-header">
          <div className="review-header-title">
            <div className="review-icon-box">
              <Cpu size={22} className="gold-text" />
            </div>
            <div>
              <h2 className="review-title">Analisis Pertandingan Stockfish 19</h2>
              <p className="review-subtitle">
                Review akurasi, klasifikasi langkah & rekomendasi engine kelas dunia
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Loading / Progress State */}
        {isAnalyzing && (
          <div className="review-loading-view">
            <div className="spinner-royal" />
            <h3 className="gold-text">Stockfish sedang menganalisis setiap langkah...</h3>
            <p className="text-muted">Mengevaluasi kelemahan taktis, pengorbanan & akurasi CAPS</p>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-percent">{progress}%</span>
          </div>
        )}

        {/* Empty State */}
        {!isAnalyzing && (!moveHistory || moveHistory.length === 0) && (
          <div className="review-empty-view">
            <AlertCircle size={40} className="text-muted" />
            <p>Belum ada langkah yang dimainkan pada pertandingan ini.</p>
          </div>
        )}

        {/* Analysis Results View */}
        {!isAnalyzing && analysisResult && (
          <div className="review-content-layout">
            {/* Left Column: Accuracy & Breakdown */}
            <div className="review-sidebar">
              {/* Accuracy Card */}
              <div className="accuracy-cards-row">
                <div className="accuracy-card white-accuracy">
                  <span className="acc-label">Akurasi Putih</span>
                  <span className="acc-val">{analysisResult.whiteAccuracy}%</span>
                  <div className="acc-bar">
                    <div
                      className="acc-bar-inner white-acc-fill"
                      style={{ width: `${analysisResult.whiteAccuracy}%` }}
                    />
                  </div>
                </div>

                <div className="accuracy-card black-accuracy">
                  <span className="acc-label">Akurasi Hitam</span>
                  <span className="acc-val">{analysisResult.blackAccuracy}%</span>
                  <div className="acc-bar">
                    <div
                      className="acc-bar-inner black-acc-fill"
                      style={{ width: `${analysisResult.blackAccuracy}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Move Breakdown Table */}
              <div className="stats-breakdown-card">
                <h4 className="breakdown-title">Klasifikasi Langkah</h4>
                <div className="breakdown-table">
                  <div className="breakdown-row breakdown-header">
                    <span>Kategori</span>
                    <span className="text-center">Putih</span>
                    <span className="text-center">Hitam</span>
                  </div>

                  <div className="breakdown-row">
                    <span className="badge-text text-brilliant">★ Brilian (!!)</span>
                    <span className="stat-pill-sm">{analysisResult.stats.w.brilliant}</span>
                    <span className="stat-pill-sm">{analysisResult.stats.b.brilliant}</span>
                  </div>

                  <div className="breakdown-row">
                    <span className="badge-text text-best">✓ Terbaik</span>
                    <span className="stat-pill-sm">{analysisResult.stats.w.best}</span>
                    <span className="stat-pill-sm">{analysisResult.stats.b.best}</span>
                  </div>

                  <div className="breakdown-row">
                    <span className="badge-text text-good">✓ Bagus</span>
                    <span className="stat-pill-sm">{analysisResult.stats.w.good}</span>
                    <span className="stat-pill-sm">{analysisResult.stats.b.good}</span>
                  </div>

                  <div className="breakdown-row">
                    <span className="badge-text text-inaccuracy">?! Inakurasi</span>
                    <span className="stat-pill-sm">{analysisResult.stats.w.inaccuracy}</span>
                    <span className="stat-pill-sm">{analysisResult.stats.b.inaccuracy}</span>
                  </div>

                  <div className="breakdown-row">
                    <span className="badge-text text-mistake">? Kesalahan</span>
                    <span className="stat-pill-sm">{analysisResult.stats.w.mistake}</span>
                    <span className="stat-pill-sm">{analysisResult.stats.b.mistake}</span>
                  </div>

                  <div className="breakdown-row">
                    <span className="badge-text text-blunder">?? Blunder</span>
                    <span className="stat-pill-sm text-red font-bold">
                      {analysisResult.stats.w.blunder}
                    </span>
                    <span className="stat-pill-sm text-red font-bold">
                      {analysisResult.stats.b.blunder}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="review-side-actions">
                <button className="btn-secondary btn-sm" onClick={handleCopyPgn}>
                  {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                  <span>{copied ? 'Tersalin!' : 'Salin PGN'}</span>
                </button>
                <button className="btn-secondary btn-sm" onClick={startAnalysis}>
                  <RefreshCw size={14} />
                  <span>Ulangi Analisis</span>
                </button>
              </div>
            </div>

            {/* Right Column: Move Navigator & Stockfish Advice */}
            <div className="review-main-panel">
              {/* Eval Timeline Bar */}
              <div className="eval-timeline-wrap">
                <span className="timeline-label">Evaluasi Permainan:</span>
                <div className="eval-bars-container">
                  {analysisResult.moves.map((m, idx) => {
                    const isSelected = idx === selectedMoveIndex;
                    const clampedAdv = Math.max(-500, Math.min(500, m.whiteAdvantage));
                    const whiteH = Math.max(8, Math.min(92, 50 + (clampedAdv / 500) * 45));

                    return (
                      <div
                        key={idx}
                        className={`eval-bar-col ${isSelected ? 'selected-eval-col' : ''}`}
                        onClick={() => setSelectedMoveIndex(idx)}
                        title={`Langkah ${idx + 1} (${m.san}): ${
                          m.evalScore > 0 ? `+${(m.evalScore / 100).toFixed(1)}` : (m.evalScore / 100).toFixed(1)
                        }`}
                      >
                        <div
                          className="eval-white-fill"
                          style={{ height: `${whiteH}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Move Inspector Card */}
              {currentMove && (
                <div className="current-move-card">
                  <div className="move-card-header">
                    <div className="move-tag-badge">
                      <span className="move-num">
                        {Math.floor(currentMove.moveIndex / 2) + 1}
                        {currentMove.color === 'w' ? '.' : '...'}
                      </span>
                      <span className="move-san">{currentMove.san}</span>
                      <span className="move-player-pill">
                        {currentMove.color === 'w' ? 'Putih' : 'Hitam'}
                      </span>
                    </div>

                    {getClassificationBadge(currentMove.classification)}
                  </div>

                  <div className="move-card-body">
                    <div className="eval-score-row">
                      <span className="eval-pill">
                        Evaluasi:{' '}
                        <strong>
                          {currentMove.evalScore > 0
                            ? `+${(currentMove.evalScore / 100).toFixed(2)}`
                            : (currentMove.evalScore / 100).toFixed(2)}
                        </strong>
                      </span>
                      <span className="acc-badge">
                        Akurasi Langkah: <strong>{currentMove.moveAccuracy}%</strong>
                      </span>
                    </div>

                    <p className="move-comment">{currentMove.comment}</p>

                    {currentMove.bestMoveUci && currentMove.classification !== 'best' && (
                      <div className="engine-recommendation-box">
                        <span className="rec-label">Saran Stockfish:</span>
                        <span className="rec-move">{currentMove.bestMoveUci}</span>
                      </div>
                    )}
                  </div>

                  {/* Navigation controls */}
                  <div className="move-nav-controls">
                    <button
                      className="btn-secondary btn-sm"
                      disabled={selectedMoveIndex === 0}
                      onClick={() => setSelectedMoveIndex((prev) => Math.max(0, prev - 1))}
                    >
                      <ChevronLeft size={16} /> Sebelumnya
                    </button>
                    <span className="move-index-indicator">
                      {selectedMoveIndex + 1} / {analysisResult.moves.length}
                    </span>
                    <button
                      className="btn-secondary btn-sm"
                      disabled={selectedMoveIndex === analysisResult.moves.length - 1}
                      onClick={() =>
                        setSelectedMoveIndex((prev) =>
                          Math.min(analysisResult.moves.length - 1, prev + 1)
                        )
                      }
                    >
                      Selanjutnya <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Move List Strip */}
              <div className="moves-chip-container">
                {analysisResult.moves.map((m, idx) => (
                  <button
                    key={idx}
                    className={`move-chip ${idx === selectedMoveIndex ? 'active-chip' : ''} chip-${m.classification}`}
                    onClick={() => setSelectedMoveIndex(idx)}
                  >
                    <span className="chip-num">
                      {Math.floor(idx / 2) + 1}
                      {m.color === 'w' ? '.' : '..'}
                    </span>
                    <span className="chip-san">{m.san}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

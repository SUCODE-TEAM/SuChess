import React, { useEffect, useRef } from 'react';
import { Scroll, Copy, Check } from 'lucide-react';

export const MoveHistory = ({ history, fen, onResign }) => {
  const scrollRef = useRef(null);
  const [copied, setCopied] = React.useState(false);

  // Group moves into pairs (White & Black)
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1] || null,
    });
  }

  // Auto-scroll to bottom on new move
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  const copyFen = () => {
    navigator.clipboard.writeText(fen);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="move-history-card">
      <div className="history-header">
        <div className="history-title-wrap">
          <Scroll size={16} className="gold-text" />
          <span className="history-title">Riwayat Langkah</span>
        </div>
        <button className="copy-fen-btn" onClick={copyFen} title="Salin Posisi FEN">
          {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
          <span>{copied ? 'Tersalin' : 'FEN'}</span>
        </button>
      </div>

      <div className="history-scroll-pane" ref={scrollRef}>
        {movePairs.length === 0 ? (
          <div className="empty-history">
            <span>Belum ada langkah yang dimainkan. Mulai permainan!</span>
          </div>
        ) : (
          <table className="moves-table">
            <tbody>
              {movePairs.map((pair) => (
                <tr key={pair.number} className="move-row">
                  <td className="move-index">{pair.number}.</td>
                  <td className="move-san move-white">
                    <span className="san-badge">{pair.white.san}</span>
                  </td>
                  <td className="move-san move-black">
                    {pair.black ? <span className="san-badge">{pair.black.san}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="history-footer">
        <button className="btn-resign" onClick={onResign}>
          Menyerah
        </button>
      </div>
    </div>
  );
};

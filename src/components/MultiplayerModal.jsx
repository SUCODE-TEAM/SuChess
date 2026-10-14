import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Users,
  Copy,
  Check,
  QrCode,
  Share2,
  X,
  Sparkles,
  Wifi,
  Smartphone,
  Laptop,
} from 'lucide-react';

export const MultiplayerModal = ({
  isOpen,
  onClose,
  multiplayerState,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
}) => {
  if (!isOpen) return null;

  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const { isConnected, isHost, roomCode, opponentJoined, role, error } = multiplayerState;

  // Build join URL with current hostname / LAN IP
  const shareUrl = roomCode
    ? `${window.location.origin}/?room=${roomCode}`
    : '';

  useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#0e121b',
          light: '#f5d77f',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR error:', err));
    }
  }, [shareUrl]);

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="multiplayer-card">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="mp-header">
          <div className="mp-crest">
            <Users size={26} className="gold-text" />
          </div>
          <h2 className="mp-title">Mabar Beda Device</h2>
          <p className="mp-subtitle">
            Main catur 3D bersama teman di HP, Tablet, Laptop, atau PC secara real-time!
          </p>
        </div>

        {/* If already in a room */}
        {isConnected ? (
          <div className="mp-active-room">
            <div className="room-badge">
              <span className="room-label">Kode Ruangan</span>
              <span className="room-code-display">{roomCode}</span>
            </div>

            <div className="role-indicator">
              <span>Anda bermain sebagai:</span>
              <span className="role-badge">
                {role === 'w' ? '⚪ Ksatria Putih (Host)' : '⚫ Pangeran Hitam (Tamu)'}
              </span>
            </div>

            {/* Waiting or Connected Status */}
            <div className={`status-pill ${opponentJoined ? 'status-connected' : 'status-waiting'}`}>
              <Wifi size={16} className={opponentJoined ? 'text-green' : 'pulse gold-text'} />
              <span>
                {opponentJoined
                  ? 'Lawan Terhubung! Permainan Dimulai.'
                  : 'Menunggu lawan bergabung...'}
              </span>
            </div>

            {/* QR Code and Share for Host */}
            {!opponentJoined && isHost && (
              <div className="share-section">
                <p className="share-hint">Scan QR code pakai kamera HP atau bagikan link:</p>
                {qrDataUrl && (
                  <div className="qr-wrap">
                    <img src={qrDataUrl} alt="QR Code Mabar" className="qr-image" />
                  </div>
                )}
                <div className="link-box">
                  <span className="link-text">{shareUrl}</span>
                  <button className="copy-link-btn" onClick={handleCopy}>
                    {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                    <span>{copied ? 'Tersalin!' : 'Salin'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="mp-actions">
              <button className="btn-resign" onClick={onLeaveRoom}>
                Tinggalkan Ruangan
              </button>
              {opponentJoined && (
                <button className="btn-royal" onClick={onClose}>
                  Kembali ke Papan
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Create or Join Tabs */
          <div className="mp-tabs-content">
            <div className="mp-tabs">
              <button
                className={`mp-tab-btn ${tab === 'create' ? 'active' : ''}`}
                onClick={() => setTab('create')}
              >
                Buat Ruangan
              </button>
              <button
                className={`mp-tab-btn ${tab === 'join' ? 'active' : ''}`}
                onClick={() => setTab('join')}
              >
                Gabung Ruangan
              </button>
            </div>

            {error && <div className="mp-error-badge">{error}</div>}

            {tab === 'create' ? (
              <div className="tab-pane">
                <div className="feature-perks">
                  <div className="perk-item">
                    <Smartphone size={18} className="gold-text" />
                    <span>Cross-platform: Android, iPhone, Windows, Mac</span>
                  </div>
                  <div className="perk-item">
                    <Wifi size={18} className="gold-text" />
                    <span>Otomatis sinkronisasi di Wi-Fi / Hotspot yang sama</span>
                  </div>
                </div>

                <button
                  className="btn-royal btn-lg w-full"
                  onClick={() => onCreateRoom()}
                >
                  <Sparkles size={18} />
                  <span>Buat Ruangan Baru</span>
                </button>
              </div>
            ) : (
              <div className="tab-pane">
                <p className="join-desc">
                  Masukkan 4 digit kode ruangan dari teman Anda:
                </p>
                <div className="input-wrap">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Contoh: SU78"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="room-input"
                  />
                </div>
                <button
                  className="btn-royal btn-lg w-full"
                  disabled={inputCode.trim().length < 4}
                  onClick={() => onJoinRoom(inputCode.trim())}
                >
                  <span>Masuk Permainan</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

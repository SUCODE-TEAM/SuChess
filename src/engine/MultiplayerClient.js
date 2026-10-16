// ============================================================
//  MultiplayerClient for SuChesse (WebRTC P2P via PeerJS)
//  Optimized for serverless hosting (Vercel, Netlify, etc.)
// ============================================================

import Peer from 'peerjs';

// Public STUN servers for robust NAT traversal across WiFi and 4G/5G mobile networks
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },
];

export class MultiplayerClient {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.roomCode = null;
    this.playerRole = null; // 'w' or 'b'
    this.isHost = false;
    this.heartbeatTimer = null;

    // Event callbacks
    this.onRoomCreated = () => {};
    this.onJoinedSuccess = () => {};
    this.onOpponentJoined = () => {};
    this.onRemoteMove = () => {};
    this.onRemoteResign = () => {};
    this.onRemoteRestart = () => {};
    this.onOpponentLeft = () => {};
    this.onError = () => {};
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  getPeerIdForCode(code) {
    return `suchess-p2p-${code.toLowerCase().trim()}`;
  }

  // Create Room as Host
  createRoom(customCode = null, color = 'w') {
    this.disconnect();

    const code = customCode || this.generateRoomCode();
    this.roomCode = code;
    this.playerRole = color;
    this.isHost = true;

    const hostPeerId = this.getPeerIdForCode(code);

    try {
      this.peer = new Peer(hostPeerId, {
        config: {
          iceServers: ICE_SERVERS,
          sdpSemantics: 'unified-plan',
        },
      });

      this.peer.on('open', () => {
        console.log('[Multiplayer Host] Room created with code:', code);
        this.onRoomCreated({ roomCode: code, role: color });
        this.startHeartbeat();
      });

      this.peer.on('connection', (conn) => {
        console.log('[Multiplayer Host] Incoming peer connection...');
        this.conn = conn;

        conn.on('open', () => {
          console.log('[Multiplayer Host] DataChannel opened with guest!');
          this.setupConnectionListeners(conn);

          // Greet guest and assign roles
          const guestRole = color === 'w' ? 'b' : 'w';
          conn.send({
            type: 'WELCOME',
            roomCode: code,
            role: guestRole,
            hostRole: color,
          });

          this.onOpponentJoined({ opponentRole: guestRole });
        });
      });

      this.peer.on('error', (err) => {
        console.error('[Multiplayer Host] Peer error:', err);
        if (err.type === 'unavailable-id') {
          // If code is somehow taken, retry with a fresh code
          console.log('[Multiplayer Host] ID taken, regenerating room code...');
          this.createRoom(null, color);
        } else {
          this.onError('Gagal membuat ruangan: ' + (err.message || err.type));
        }
      });
    } catch (err) {
      console.error('[Multiplayer Host] Initialization error:', err);
      this.onError('Gagal menginisialisasi koneksi P2P: ' + err.message);
    }

    return code;
  }

  // Join Room as Guest
  joinRoom(code) {
    this.disconnect();

    const cleanCode = code.toUpperCase().trim();
    this.roomCode = cleanCode;
    this.playerRole = 'b';
    this.isHost = false;

    const hostPeerId = this.getPeerIdForCode(cleanCode);

    try {
      // Create guest peer with random ID
      this.peer = new Peer(null, {
        config: {
          iceServers: ICE_SERVERS,
          sdpSemantics: 'unified-plan',
        },
      });

      this.peer.on('open', (guestId) => {
        console.log('[Multiplayer Guest] Connected to signaling, guest ID:', guestId);
        console.log('[Multiplayer Guest] Connecting to host:', hostPeerId);

        const conn = this.peer.connect(hostPeerId, {
          reliable: true,
        });

        this.conn = conn;

        conn.on('open', () => {
          console.log('[Multiplayer Guest] Connected to host DataChannel!');
          this.setupConnectionListeners(conn);

          // Send JOIN message to host
          conn.send({
            type: 'JOIN',
            roomCode: cleanCode,
          });

          this.onJoinedSuccess({ roomCode: cleanCode, role: 'b' });
          this.startHeartbeat();
        });

        conn.on('error', (err) => {
          console.error('[Multiplayer Guest] Conn error:', err);
          this.onError('Koneksi ke host terputus.');
        });
      });

      this.peer.on('error', (err) => {
        console.error('[Multiplayer Guest] Peer error:', err);
        if (err.type === 'peer-unavailable') {
          this.onError('Ruangan tidak ditemukan! Pastikan kode ruangan benar dan Host masih menunggu.');
        } else {
          this.onError('Gagal bergabung ke ruangan: ' + (err.message || err.type));
        }
      });
    } catch (err) {
      console.error('[Multiplayer Guest] Initialization error:', err);
      this.onError('Gagal menginisialisasi koneksi tamu: ' + err.message);
    }
  }

  setupConnectionListeners(conn) {
    conn.on('data', (data) => {
      this.handleIncomingData(data);
    });

    conn.on('close', () => {
      console.log('[Multiplayer] Opponent disconnected.');
      this.onOpponentLeft();
    });
  }

  handleIncomingData(data) {
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'MOVE':
      case 'REMOTE_MOVE':
        this.onRemoteMove({ move: data.move, fen: data.fen });
        break;

      case 'RESIGN':
      case 'REMOTE_RESIGN':
        this.onRemoteResign({ color: data.color });
        break;

      case 'RESTART':
      case 'REMOTE_RESTART':
        this.onRemoteRestart();
        break;

      case 'JOIN':
        if (this.isHost) {
          const guestRole = this.playerRole === 'w' ? 'b' : 'w';
          this.onOpponentJoined({ opponentRole: guestRole });
          if (this.conn && this.conn.open) {
            this.conn.send({
              type: 'WELCOME',
              roomCode: this.roomCode,
              role: guestRole,
              hostRole: this.playerRole,
            });
          }
        }
        break;

      case 'WELCOME':
        if (!this.isHost) {
          this.playerRole = data.role || 'b';
          this.onJoinedSuccess({ roomCode: this.roomCode, role: this.playerRole });
        }
        break;

      case 'PING':
        if (this.conn && this.conn.open) {
          this.conn.send({ type: 'PONG' });
        }
        break;

      case 'PONG':
        // Heartbeat ACK
        break;

      default:
        console.log('[Multiplayer] Unhandled message:', data);
        break;
    }
  }

  sendMove(move, fen) {
    if (this.conn && this.conn.open) {
      this.conn.send({
        type: 'MOVE',
        roomCode: this.roomCode,
        move,
        fen,
      });
    }
  }

  sendResign(color) {
    if (this.conn && this.conn.open) {
      this.conn.send({
        type: 'RESIGN',
        roomCode: this.roomCode,
        color: color || this.playerRole,
      });
    }
  }

  sendRestart() {
    if (this.conn && this.conn.open) {
      this.conn.send({
        type: 'RESTART',
        roomCode: this.roomCode,
      });
    }
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.conn && this.conn.open) {
        this.conn.send({ type: 'PING' });
      }
    }, 8000);
  }

  disconnect() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.conn) {
      try {
        this.conn.close();
      } catch (e) {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    this.roomCode = null;
    this.playerRole = null;
    this.isHost = false;
  }
}

export const multiplayer = new MultiplayerClient();

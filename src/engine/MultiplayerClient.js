// ============================================================
//  MultiplayerClient for SuChesse
//  Supports WebSocket Relay (LAN / Hotspot) & PeerJS WebRTC (Internet)
// ============================================================

import Peer from 'peerjs';

export class MultiplayerClient {
  constructor() {
    this.ws = null;
    this.peer = null;
    this.peerConn = null;
    this.roomCode = null;
    this.playerRole = null; // 'w' or 'b'
    this.mode = 'idle'; // 'ws' or 'peer' or 'idle'

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

  // Connect via WebSocket
  createRoom(customCode = null, color = 'w') {
    const code = customCode || this.generateRoomCode();
    this.roomCode = code;
    this.playerRole = color;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-chess`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.mode = 'ws';
        this.ws.send(
          JSON.stringify({
            type: 'CREATE_ROOM',
            roomCode: this.roomCode,
            color: this.playerRole,
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      this.ws.onerror = () => {
        console.warn('WebSocket failed, attempting PeerJS P2P fallback...');
        this.fallbackToPeerHost(code, color);
      };

      this.ws.onclose = () => {
        if (this.mode === 'ws') {
          this.onOpponentLeft();
        }
      };
    } catch {
      this.fallbackToPeerHost(code, color);
    }

    return code;
  }

  joinRoom(code) {
    this.roomCode = code.toUpperCase().trim();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-chess`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.mode = 'ws';
        this.ws.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomCode: this.roomCode,
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      this.ws.onerror = () => {
        console.warn('WebSocket failed, attempting PeerJS P2P join fallback...');
        this.fallbackToPeerJoin(this.roomCode);
      };
    } catch {
      this.fallbackToPeerJoin(this.roomCode);
    }
  }

  handleServerMessage(msg) {
    switch (msg.type) {
      case 'ROOM_CREATED':
        this.onRoomCreated({ roomCode: msg.roomCode, role: msg.role });
        break;
      case 'JOINED_SUCCESS':
        this.playerRole = msg.role;
        this.onJoinedSuccess({ roomCode: msg.roomCode, role: msg.role });
        break;
      case 'OPPONENT_JOINED':
        this.onOpponentJoined({ opponentRole: msg.opponentRole });
        break;
      case 'REMOTE_MOVE':
        this.onRemoteMove({ move: msg.move, fen: msg.fen });
        break;
      case 'REMOTE_RESIGN':
        this.onRemoteResign({ color: msg.color });
        break;
      case 'REMOTE_RESTART':
        this.onRemoteRestart();
        break;
      case 'OPPONENT_LEFT':
        this.onOpponentLeft();
        break;
      case 'ERROR':
        this.onError(msg.message);
        break;
      default:
        break;
    }
  }

  // PeerJS P2P fallback
  fallbackToPeerHost(code, color) {
    this.mode = 'peer';
    const peerId = `suchesse-${code.toLowerCase()}`;
    this.peer = new Peer(peerId);

    this.peer.on('open', () => {
      this.onRoomCreated({ roomCode: code, role: color });
    });

    this.peer.on('connection', (conn) => {
      this.peerConn = conn;
      this.playerRole = color;
      this.onOpponentJoined({ opponentRole: color === 'w' ? 'b' : 'w' });

      conn.on('data', (data) => {
        this.handleServerMessage(data);
      });

      conn.on('close', () => {
        this.onOpponentLeft();
      });
    });

    this.peer.on('error', (err) => {
      this.onError('Gagal membuat koneksi P2P: ' + err.type);
    });
  }

  fallbackToPeerJoin(code) {
    this.mode = 'peer';
    const guestPeer = new Peer();

    guestPeer.on('open', () => {
      const hostId = `suchesse-${code.toLowerCase()}`;
      const conn = guestPeer.connect(hostId);
      this.peerConn = conn;

      conn.on('open', () => {
        this.playerRole = 'b';
        this.onJoinedSuccess({ roomCode: code, role: 'b' });
      });

      conn.on('data', (data) => {
        this.handleServerMessage(data);
      });

      conn.on('close', () => {
        this.onOpponentLeft();
      });
    });

    guestPeer.on('error', (err) => {
      this.onError('Gagal bergabung ke ruangan: ' + err.type);
    });
  }

  sendMove(move, fen) {
    const payload = { type: 'MOVE', roomCode: this.roomCode, move, fen };
    if (this.mode === 'ws' && this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(payload));
    } else if (this.mode === 'peer' && this.peerConn && this.peerConn.open) {
      this.peerConn.send(payload);
    }
  }

  sendResign(color) {
    const payload = { type: 'RESIGN', roomCode: this.roomCode, color };
    if (this.mode === 'ws' && this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(payload));
    } else if (this.mode === 'peer' && this.peerConn && this.peerConn.open) {
      this.peerConn.send(payload);
    }
  }

  sendRestart() {
    const payload = { type: 'RESTART', roomCode: this.roomCode };
    if (this.mode === 'ws' && this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(payload));
    } else if (this.mode === 'peer' && this.peerConn && this.peerConn.open) {
      this.peerConn.send(payload);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.peerConn) {
      this.peerConn.close();
      this.peerConn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.roomCode = null;
    this.playerRole = null;
    this.mode = 'idle';
  }
}

export const multiplayer = new MultiplayerClient();

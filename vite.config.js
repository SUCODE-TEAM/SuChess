import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { WebSocketServer } from 'ws';

function chessMultiplayerRelay() {
  const rooms = new Map();

  return {
    name: 'chess-multiplayer-relay',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });

      server.httpServer.on('upgrade', (req, socket, head) => {
        if (req.url && req.url.startsWith('/ws-chess')) {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
          });
        }
      });

      wss.on('connection', (ws) => {
        let currentRoom = null;
        let role = null; // 'w' or 'b'

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());

            if (msg.type === 'CREATE_ROOM') {
              currentRoom = msg.roomCode;
              role = msg.color || 'w';
              rooms.set(currentRoom, {
                white: role === 'w' ? ws : null,
                black: role === 'b' ? ws : null,
              });
              ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomCode: currentRoom, role }));
            } else if (msg.type === 'JOIN_ROOM') {
              currentRoom = msg.roomCode;
              const room = rooms.get(currentRoom);
              if (!room) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Kode ruangan tidak ditemukan atau sudah ditutup.' }));
                return;
              }
              if (room.white && room.black) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Ruangan sudah penuh dengan 2 pemain!' }));
                return;
              }
              role = room.white ? 'b' : 'w';
              if (role === 'b') room.black = ws;
              else room.white = ws;

              ws.send(JSON.stringify({ type: 'JOINED_SUCCESS', roomCode: currentRoom, role }));
              const opponent = role === 'b' ? room.white : room.black;
              if (opponent && opponent.readyState === 1) {
                opponent.send(JSON.stringify({ type: 'OPPONENT_JOINED', opponentRole: role }));
              }
            } else if (msg.type === 'MOVE') {
              const room = rooms.get(msg.roomCode);
              if (room) {
                const opponent = ws === room.white ? room.black : room.white;
                if (opponent && opponent.readyState === 1) {
                  opponent.send(JSON.stringify({ type: 'REMOTE_MOVE', move: msg.move, fen: msg.fen }));
                }
              }
            } else if (msg.type === 'RESIGN') {
              const room = rooms.get(msg.roomCode);
              if (room) {
                const opponent = ws === room.white ? room.black : room.white;
                if (opponent && opponent.readyState === 1) {
                  opponent.send(JSON.stringify({ type: 'REMOTE_RESIGN', color: msg.color }));
                }
              }
            } else if (msg.type === 'RESTART') {
              const room = rooms.get(msg.roomCode);
              if (room) {
                const opponent = ws === room.white ? room.black : room.white;
                if (opponent && opponent.readyState === 1) {
                  opponent.send(JSON.stringify({ type: 'REMOTE_RESTART' }));
                }
              }
            }
          } catch (e) {
            console.error('WS relay message error:', e);
          }
        });

        ws.on('close', () => {
          if (currentRoom && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);
            const opponent = ws === room.white ? room.black : room.white;
            if (opponent && opponent.readyState === 1) {
              opponent.send(JSON.stringify({ type: 'OPPONENT_LEFT' }));
            }
            rooms.delete(currentRoom);
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), chessMultiplayerRelay()],
  server: {
    port: 3000,
    host: true,
  },
  publicDir: 'public',
});

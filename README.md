# SuChess ♔ 3D Ray-Tracing Chess & Stockfish 19 Engine

> Luxury Gothic 3D Chess experience with real-time RTX mirror reflections, cross-platform multiplayer, and the official Stockfish 19 AI engine. Developed by **SUCODE-TEAM**.

---

## ✨ Features

- **⚡ RTX Ray-Tracing Mirror Board**: Real-time planar reflection shader reflecting chess pieces and ambient cathedral brazier flames.
- **♞ Premium Gothic 3D Pieces**:
  - **White**: Handcrafted Carrara marble & gold trim.
  - **Black**: Deep obsidian with glowing incandescent ruby red runes.
  - Dynamic orientation matching movement and capture directions.
- **🤖 Official Stockfish 19 Engine (`stockfishchess.org`)**:
  - Integrated via WebAssembly (WASM) & NNUE Neural Network in Web Workers for silky smooth 60 FPS gameplay.
  - Adjustable ELO ratings from **250 ELO (Level 1)** up to **3200+ ELO (Level 20 Grandmaster)**.
- **📊 Post-Match Game Review & Analysis**:
  - Win-rate centipawn evaluation graph.
  - CAPS accuracy percentages for White vs Black.
  - Move classifications: *Brilliant (!!)*, *Great (!)*, *Best (★)*, *Good (✓)*, *Inaccuracy (?!)*, *Mistake (?)*, *Blunder (??)*.
  - Engine recommendations and tactical commentary in Indonesian.
  - PGN export to clipboard.
- **🌐 Cross-Platform Multiplayer (Mabar Beda Device)**:
  - Instant room-based peer-to-peer matchmaking across PC, laptops, tablets, and smartphones.
  - QR Code & one-click invite links.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or newer recommended)
- `npm` or `pnpm` / `yarn`

### Installation
```bash
# Clone the repository
git clone https://github.com/SUCODE-TEAM/SuChess.git

# Enter project directory
cd SuChess

# Install dependencies
npm install

# Start local development server
npm run dev
```

Local server will run at `http://localhost:3000`.

### Production Build
```bash
npm run build
npm run preview
```

---

## 🛠️ Built With

- **Framework**: React 18 + Vite
- **3D Graphics Engine**: Three.js + WebGL
- **Chess Logic**: `chess.js`
- **Chess Engine**: [Stockfish 19 WASM + NNUE](https://stockfishchess.org/)
- **Multiplayer**: PeerJS / WebRTC
- **Styling**: Vanilla CSS (Dark Gothic Glassmorphism)

---

## 📄 License

MIT © [SUCODE-TEAM](https://github.com/SUCODE-TEAM)
Stockfish engine is licensed under GPLv3.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChessGame } from './engine/ChessEngine';
import { sounds } from './engine/AudioEffects';
import { multiplayer } from './engine/MultiplayerClient';
import { ChessCanvas } from './components/ChessCanvas';
import { TopBar } from './components/TopBar';
import { PlayerCard } from './components/PlayerCard';
import { MoveHistory } from './components/MoveHistory';
import { CameraControls } from './components/CameraControls';
import { PromotionModal } from './components/PromotionModal';
import { GameOverModal } from './components/GameOverModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { StockfishEloModal } from './components/StockfishEloModal';
import { GameReviewModal } from './components/GameReviewModal';
import { stockfishService } from './engine/StockfishService';
import './App.css';

export default function App() {
  const [engine] = useState(() => new ChessGame());
  const [fen, setFen] = useState(() => engine.fen());
  const [selectedSquare, setSelectedSquare] = useState(null);

  // Use refs to prevent ANY stale closures in Three.js event listeners!
  const selectedSquareRef = useRef(selectedSquare);
  selectedSquareRef.current = selectedSquare;

  // Game Settings & Modes
  const [gameMode, setGameMode] = useState('pvp'); // 'pvp' | 'ai' | 'multiplayer'
  const [playerColor, setPlayerColor] = useState('w'); // 'w' | 'b' (Player side choice)
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [graphicQuality, setGraphicQuality] = useState('ultra');
  const [isMuted, setIsMuted] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Modals
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [gameOverModal, setGameOverModal] = useState({
    isOpen: false,
    winner: null,
    reason: null,
  });

  // Stockfish AI & Game Review Modals
  const [stockfishElo, setStockfishElo] = useState(() => {
    const saved = localStorage.getItem('suchesse_stockfish_elo');
    return saved ? parseInt(saved, 10) : 1200;
  });
  const [isEloModalOpen, setIsEloModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    stockfishService.setElo(stockfishElo);
  }, [stockfishElo]);

  const handleSelectElo = (newElo) => {
    setStockfishElo(newElo);
    localStorage.setItem('suchesse_stockfish_elo', newElo);
    stockfishService.setElo(newElo);
  };

  // Multiplayer State
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [multiplayerState, setMultiplayerState] = useState({
    isConnected: false,
    isHost: false,
    roomCode: null,
    role: null, // 'w' or 'b'
    opponentJoined: false,
    error: null,
  });

  const sceneManagerRef = useRef(null);
  const isAiThinkingRef = useRef(false);

  // Check URL query parameters for ?room=XXXX on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      setIsMultiplayerOpen(true);
      handleJoinRoom(roomFromUrl);
    }
  }, []);

  // Setup Multiplayer Event Listeners
  useEffect(() => {
    multiplayer.onRoomCreated = ({ roomCode, role }) => {
      setMultiplayerState({
        isConnected: true,
        isHost: true,
        roomCode,
        role,
        opponentJoined: false,
        error: null,
      });
      setGameMode('multiplayer');
      setIsFlipped(role === 'b');
    };

    multiplayer.onJoinedSuccess = ({ roomCode, role }) => {
      setMultiplayerState({
        isConnected: true,
        isHost: false,
        roomCode,
        role,
        opponentJoined: true,
        error: null,
      });
      setGameMode('multiplayer');
      setIsFlipped(role === 'b');
      if (sceneManagerRef.current) {
        sceneManagerRef.current.setCameraView(role === 'b' ? 'black' : 'white');
      }
    };

    multiplayer.onOpponentJoined = () => {
      setMultiplayerState((prev) => ({ ...prev, opponentJoined: true }));
      sounds.playVictory();
    };

    multiplayer.onRemoteMove = ({ move }) => {
      if (sceneManagerRef.current) {
        const isCapture = !!engine.chess.get(move.to);
        sceneManagerRef.current.animateMove(move.from, move.to, () => {
          engine.chess.move(move);
          setFen(engine.fen());

          if (isCapture) sounds.playCapture();
          else sounds.playMove();

          checkGameOver();
        });
      } else {
        engine.chess.move(move);
        setFen(engine.fen());
        checkGameOver();
      }
    };

    multiplayer.onRemoteResign = ({ color }) => {
      const winner = color === 'w' ? 'b' : 'w';
      setGameOverModal({ isOpen: true, winner, reason: 'resignation' });
      sounds.playVictory();
    };

    multiplayer.onRemoteRestart = () => {
      engine.reset();
      setFen(engine.fen());
      setSelectedSquare(null);
      setGameOverModal({ isOpen: false, winner: null, reason: null });
      sounds.playVictory();
    };

    multiplayer.onOpponentLeft = () => {
      setMultiplayerState((prev) => ({
        ...prev,
        opponentJoined: false,
        error: 'Lawan terputus dari ruangan.',
      }));
    };

    multiplayer.onError = (message) => {
      setMultiplayerState((prev) => ({ ...prev, error: message }));
    };
  }, [engine]);

  // Check Game Over Conditions
  const checkGameOver = useCallback(() => {
    if (engine.isCheckmate()) {
      sounds.playVictory();
      setGameOverModal({
        isOpen: true,
        winner: engine.turn() === 'w' ? 'b' : 'w',
        reason: 'checkmate',
      });
    } else if (engine.isCheck()) {
      sounds.playCheck();
    } else if (engine.isDraw() || engine.isStalemate()) {
      sounds.playVictory();
      setGameOverModal({
        isOpen: true,
        winner: 'draw',
        reason: 'stalemate',
      });
    }
  }, [engine]);

  // Square Click & Piece Movement Logic
  const handleSquareClick = useCallback(
    (square) => {
      if (engine.isGameOver() || isAiThinkingRef.current) return;

      const currentTurn = engine.turn();

      // In AI mode: user can only move their chosen side (playerColor)
      if (gameMode === 'ai' && currentTurn !== playerColor) return;

      // In Multiplayer mode: you can only control your assigned color
      if (gameMode === 'multiplayer' && multiplayerState.isConnected) {
        if (multiplayerState.role !== currentTurn) return;
      }

      const activeSelected = selectedSquareRef.current;

      // 1. If no square currently selected
      if (!activeSelected) {
        const piece = engine.chess.get(square);
        if (piece && piece.color === currentTurn) {
          setSelectedSquare(square);
          selectedSquareRef.current = square;
          sounds.playSelect();
        }
        return;
      }

      // 2. If clicking same square: deselect
      if (activeSelected === square) {
        setSelectedSquare(null);
        selectedSquareRef.current = null;
        return;
      }

      // 3. If clicking another piece of the same color: switch selection
      const clickedPiece = engine.chess.get(square);
      if (clickedPiece && clickedPiece.color === currentTurn) {
        setSelectedSquare(square);
        selectedSquareRef.current = square;
        sounds.playSelect();
        return;
      }

      // 4. Check if move is legal
      const legalMoves = engine.getLegalMoves(activeSelected);
      const isLegal = legalMoves.some((m) => m.to === square);

      if (!isLegal) {
        setSelectedSquare(null);
        selectedSquareRef.current = null;
        return;
      }

      // 5. Check pawn promotion
      const movingPiece = engine.chess.get(activeSelected);
      const isPawn = movingPiece && movingPiece.type === 'p';
      const isPromoting =
        isPawn &&
        ((movingPiece.color === 'w' && square[1] === '8') ||
          (movingPiece.color === 'b' && square[1] === '1'));

      if (isPromoting) {
        setPendingPromotion({ from: activeSelected, to: square });
        return;
      }

      // 6. Execute move!
      executeMove(activeSelected, square, 'q');
      setSelectedSquare(null);
      selectedSquareRef.current = null;
    },
    [engine, gameMode, multiplayerState, playerColor]
  );

  // Execute Move
  const executeMove = useCallback(
    (from, to, promotion = 'q') => {
      const isCapture = !!engine.chess.get(to);

      if (sceneManagerRef.current) {
        sceneManagerRef.current.animateMove(from, to, () => {
          const moveResult = engine.move(from, to, promotion);
          if (moveResult) {
            setFen(engine.fen());

            if (isCapture) sounds.playCapture();
            else sounds.playMove();

            // Send move if multiplayer
            if (gameMode === 'multiplayer' && multiplayerState.isConnected) {
              multiplayer.sendMove(moveResult, engine.fen());
            }

            checkGameOver();

            // Trigger AI if playing vs AI
            const aiColor = playerColor === 'w' ? 'b' : 'w';
            if (gameMode === 'ai' && engine.turn() === aiColor && !engine.isGameOver()) {
              triggerAiMove();
            }
          }
        });
      } else {
        const moveResult = engine.move(from, to, promotion);
        if (moveResult) {
          setFen(engine.fen());
          if (gameMode === 'multiplayer' && multiplayerState.isConnected) {
            multiplayer.sendMove(moveResult, engine.fen());
          }
          checkGameOver();

          const aiColor = playerColor === 'w' ? 'b' : 'w';
          if (gameMode === 'ai' && engine.turn() === aiColor && !engine.isGameOver()) {
            triggerAiMove();
          }
        }
      }
    },
    [engine, gameMode, multiplayerState, playerColor, checkGameOver]
  );

  // AI Move Bot Execution (Powered exclusively by Stockfish 19 Engine - stockfishchess.org)
  const triggerAiMove = useCallback(async () => {
    if (isAiThinkingRef.current) return;
    isAiThinkingRef.current = true;

    try {
      const currentFen = engine.fen();
      const searchTime = Math.min(2500, Math.max(400, Math.floor(stockfishElo / 2)));
      let chosenMove = await stockfishService.getBestMove(currentFen, stockfishElo, searchTime);

      // If Stockfish worker is still initialising WASM module, retry briefly
      if (!chosenMove) {
        await new Promise((r) => setTimeout(r, 400));
        chosenMove = await stockfishService.getBestMove(currentFen, stockfishElo, searchTime);
      }

      // If worker completely blocked, select legal move
      if (!chosenMove) {
        const legal = engine.chess.moves({ verbose: true });
        if (legal.length > 0) {
          chosenMove = legal[Math.floor(Math.random() * legal.length)];
        }
      }

      if (chosenMove) {
        const isCapture = !!engine.chess.get(chosenMove.to);
        if (sceneManagerRef.current) {
          sceneManagerRef.current.animateMove(chosenMove.from, chosenMove.to, () => {
            engine.chess.move(chosenMove);
            setFen(engine.fen());
            isAiThinkingRef.current = false;

            if (isCapture) sounds.playCapture();
            else sounds.playMove();

            checkGameOver();
          });
        } else {
          engine.chess.move(chosenMove);
          setFen(engine.fen());
          isAiThinkingRef.current = false;

          if (isCapture) sounds.playCapture();
          else sounds.playMove();

          checkGameOver();
        }
      } else {
        isAiThinkingRef.current = false;
      }
    } catch (err) {
      console.error('Stockfish AI move execution error:', err);
      isAiThinkingRef.current = false;
    }
  }, [engine, stockfishElo, checkGameOver]);

  // Promotion choice selected
  const handlePromotionSelect = (pieceType) => {
    if (pendingPromotion) {
      executeMove(pendingPromotion.from, pendingPromotion.to, pieceType);
      setPendingPromotion(null);
      setSelectedSquare(null);
      selectedSquareRef.current = null;
    }
  };

  // Undo Move
  const handleUndo = () => {
    if (gameMode === 'multiplayer') return; // Cannot undo in multiplayer!
    if (gameMode === 'ai') {
      engine.undo();
      engine.undo();
    } else {
      engine.undo();
    }
    setFen(engine.fen());
    setSelectedSquare(null);
    selectedSquareRef.current = null;
    sounds.playMove();
  };

  // Side / Color Selection (Putih / Hitam)
  const handleSelectColor = (newColor) => {
    setPlayerColor(newColor);
    const flipped = newColor === 'b';
    setIsFlipped(flipped);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCameraView(flipped ? 'black' : 'white');
    }

    // Reset game board for fresh start with selected side
    if (gameMode === 'multiplayer' && multiplayerState.isConnected) {
      multiplayer.sendRestart();
    }
    engine.reset();
    setFen(engine.fen());
    setSelectedSquare(null);
    selectedSquareRef.current = null;
    setGameOverModal({ isOpen: false, winner: null, reason: null });
    sounds.playVictory();

    // If Black chosen in AI mode, Stockfish opens as White!
    if (gameMode === 'ai' && newColor === 'b') {
      setTimeout(() => {
        triggerAiMove();
      }, 500);
    }
  };

  // Game Mode Change
  const handleSetGameMode = (mode) => {
    setGameMode(mode);
    if (mode === 'ai' && playerColor === 'b' && engine.turn() === 'w' && engine.history().length === 0) {
      setTimeout(() => {
        triggerAiMove();
      }, 500);
    }
  };

  // New Game / Reset
  const handleNewGame = () => {
    if (gameMode === 'multiplayer' && multiplayerState.isConnected) {
      multiplayer.sendRestart();
    }
    engine.reset();
    setFen(engine.fen());
    setSelectedSquare(null);
    selectedSquareRef.current = null;
    setGameOverModal({ isOpen: false, winner: null, reason: null });
    sounds.playVictory();

    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCameraView(playerColor === 'b' ? 'black' : 'white');
    }

    // If playing as Black against AI, AI moves first as White!
    if (gameMode === 'ai' && playerColor === 'b') {
      setTimeout(() => {
        triggerAiMove();
      }, 500);
    }
  };

  // Resign
  const handleResign = () => {
    const currentTurn = engine.turn();
    const winner = currentTurn === 'w' ? 'b' : 'w';
    if (gameMode === 'multiplayer' && multiplayerState.isConnected) {
      multiplayer.sendResign(multiplayerState.role);
    }
    setGameOverModal({ isOpen: true, winner, reason: 'resignation' });
    sounds.playVictory();
  };

  // Multiplayer Actions
  const handleCreateRoom = () => {
    multiplayer.createRoom();
  };

  const handleJoinRoom = (code) => {
    multiplayer.joinRoom(code);
  };

  const handleLeaveRoom = () => {
    multiplayer.disconnect();
    setMultiplayerState({
      isConnected: false,
      isHost: false,
      roomCode: null,
      role: null,
      opponentJoined: false,
      error: null,
    });
    setGameMode('pvp');
    setIsFlipped(false);
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleFlipBoard = () => {
    const next = !isFlipped;
    setIsFlipped(next);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCameraView(next ? 'black' : 'white');
    }
  };

  const capturedData = engine.getCapturedPieces();

  return (
    <div className="suchesse-app">
      {/* 3D Canvas Ray-Tracing Engine */}
      <ChessCanvas
        gameEngine={engine}
        selectedSquare={selectedSquare}
        onSquareClick={handleSquareClick}
        graphicQuality={graphicQuality}
        sceneManagerRef={sceneManagerRef}
        isFlipped={isFlipped}
      />

      {/* Glassmorphic UI Overlay */}
      <div className="ui-root">
        {/* Top Header */}
        <TopBar
          gameEngine={engine}
          gameMode={gameMode}
          setGameMode={handleSetGameMode}
          playerColor={playerColor}
          onSelectColor={handleSelectColor}
          stockfishElo={stockfishElo}
          onOpenEloModal={() => setIsEloModalOpen(true)}
          onOpenReview={() => setIsReviewModalOpen(true)}
          graphicQuality={graphicQuality}
          setGraphicQuality={setGraphicQuality}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onNewGame={handleNewGame}
          onUndo={handleUndo}
          onFlipBoard={handleFlipBoard}
          onOpenMultiplayer={() => setIsMultiplayerOpen(true)}
          multiplayerState={multiplayerState}
        />

        {/* Floating Side Panels */}
        <div className="panels-container">
          {/* Left Player Panel: Opponent (Top) & Self (Bottom) */}
          <aside className="players-dock">
            {/* Opponent Card (Top) */}
            <PlayerCard
              color={playerColor === 'w' ? 'b' : 'w'}
              name={
                gameMode === 'ai'
                  ? `Stockfish 19 (${stockfishElo} ELO)`
                  : gameMode === 'multiplayer'
                  ? multiplayerState.role === playerColor
                    ? `Lawan (${playerColor === 'w' ? 'Hitam' : 'Putih'})`
                    : `Anda (${playerColor === 'w' ? 'Hitam' : 'Putih'})`
                  : playerColor === 'w'
                  ? 'Pemain Hitam'
                  : 'Pemain Putih'
              }
              rating={gameMode === 'ai' ? `${stockfishElo} ELO` : '1650'}
              isAI={gameMode === 'ai'}
              isActiveTurn={engine.turn() === (playerColor === 'w' ? 'b' : 'w') && !engine.isGameOver()}
              capturedList={playerColor === 'w' ? capturedData.capturedByBlack : capturedData.capturedByWhite}
              scoreDiff={
                playerColor === 'w'
                  ? capturedData.diffScore < 0 ? Math.abs(capturedData.diffScore) : 0
                  : capturedData.diffScore > 0 ? capturedData.diffScore : 0
              }
            />

            <div className="versus-divider">
              <span className="vs-badge">VS</span>
            </div>

            {/* Self Player Card (Bottom) */}
            <PlayerCard
              color={playerColor}
              name={
                gameMode === 'multiplayer'
                  ? multiplayerState.role === playerColor
                    ? `Anda (${playerColor === 'w' ? 'Putih' : 'Hitam'})`
                    : `Lawan (${playerColor === 'w' ? 'Putih' : 'Hitam'})`
                  : gameMode === 'ai'
                  ? `Anda (${playerColor === 'w' ? 'Putih' : 'Hitam'})`
                  : playerColor === 'w'
                  ? 'Pemain Putih'
                  : 'Pemain Hitam'
              }
              rating="1680"
              isAI={false}
              isActiveTurn={engine.turn() === playerColor && !engine.isGameOver()}
              capturedList={playerColor === 'w' ? capturedData.capturedByWhite : capturedData.capturedByBlack}
              scoreDiff={
                playerColor === 'w'
                  ? capturedData.diffScore > 0 ? capturedData.diffScore : 0
                  : capturedData.diffScore < 0 ? Math.abs(capturedData.diffScore) : 0
              }
            />
          </aside>

          {/* Right Move History & Stats Panel */}
          <aside className="history-dock">
            <MoveHistory
              history={engine.history()}
              fen={engine.fen()}
              onResign={handleResign}
            />
          </aside>
        </div>

        {/* Bottom Floating Camera Controls */}
        <CameraControls sceneManagerRef={sceneManagerRef} />

        {/* Multiplayer Modal (Beda Device) */}
        <MultiplayerModal
          isOpen={isMultiplayerOpen}
          onClose={() => setIsMultiplayerOpen(false)}
          multiplayerState={multiplayerState}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
        />

        {/* Promotion Modal */}
        <PromotionModal
          isOpen={!!pendingPromotion}
          color={engine.turn()}
          onSelectPiece={handlePromotionSelect}
        />

        {/* Game Over Modal */}
        <GameOverModal
          isOpen={gameOverModal.isOpen}
          winner={gameOverModal.winner}
          reason={gameOverModal.reason}
          moveCount={engine.history().length}
          onNewGame={handleNewGame}
          onClose={() => setGameOverModal({ ...gameOverModal, isOpen: false })}
          onOpenReview={() => setIsReviewModalOpen(true)}
        />

        {/* Stockfish ELO Selector Modal */}
        <StockfishEloModal
          isOpen={isEloModalOpen}
          onClose={() => setIsEloModalOpen(false)}
          currentElo={stockfishElo}
          onSelectElo={handleSelectElo}
        />

        {/* Post-Match Game Review & Analysis Modal */}
        <GameReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            if (sceneManagerRef.current) {
              sceneManagerRef.current.syncBoard(engine.board());
            }
          }}
          moveHistory={engine.chess.history({ verbose: true })}
          onSelectMovePosition={(fen) => {
            if (sceneManagerRef.current) {
              try {
                const temp = new Chess(fen);
                sceneManagerRef.current.syncBoard(temp.board());
              } catch (e) {}
            }
          }}
        />
      </div>
    </div>
  );
}

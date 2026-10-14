import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================================
//  CONSTANTS
// ============================================================
const BOARD_SIZE = 8;
const SQUARE_SIZE = 1;
const BOARD_OFFSET = (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2;

const PIECE_SYMBOLS = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚'
};

const COLORS = {
    lightSquare: 0xd4a34a,
    darkSquare:  0x2c1b0e,
    highlight:   0x6c8cff,
    selected:    0xffd700,
    moveTarget:  0x4ade80,
    capture:     0xf87171,
    lastMove:    0x9370DB,
    check:       0xff4444,
    boardBorder: 0x1a1008,
    whitePiece:  0xf0ead6,
    blackPiece:  0x1a1a1a,
};

// ============================================================
//  GLOBALS
// ============================================================
let scene, camera, renderer, controls;
let chess;
let raycaster, mouse;
let boardGroup, piecesGroup, highlightGroup, envGroup;
let pieceModels = {};
let boardMeshes = [];
let selectedSquare = null;
let legalMoves = [];
let lastMoveSquares = [];
let isFlipped = false;
let pendingPromotion = null;
let animating = false;

// DOM refs
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const uiOverlay = document.getElementById('ui-overlay');
const turnIndicator = document.getElementById('turn-indicator');
const moveList = document.getElementById('move-list');
const capturedWhite = document.getElementById('captured-white');
const capturedBlack = document.getElementById('captured-black');
const gameInfo = document.getElementById('game-info');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalIcon = document.getElementById('modal-icon');
const promotionOverlay = document.getElementById('promotion-overlay');

// ============================================================
//  INIT
// ============================================================
async function init() {
    // Chess logic
    chess = new Chess();

    // Three.js setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 25;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0, 0);

    // Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Groups
    boardGroup = new THREE.Group();
    piecesGroup = new THREE.Group();
    highlightGroup = new THREE.Group();
    envGroup = new THREE.Group();
    scene.add(boardGroup);
    scene.add(piecesGroup);
    scene.add(highlightGroup);
    scene.add(envGroup);

    // Lighting
    setupLighting();

    // Build board
    createBoard();

    // Load models
    await loadModels();

    // Place pieces
    refreshPieces();

    // Events
    setupEvents();

    // Hide loading
    loadingScreen.classList.add('hidden');
    uiOverlay.classList.add('visible');

    // Start render loop
    animate();
}

// ============================================================
//  LIGHTING
// ============================================================
function setupLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);

    // Hemisphere
    const hemi = new THREE.HemisphereLight(0xffecd2, 0x202040, 0.4);
    scene.add(hemi);

    // Main directional (sun)
    const dirLight = new THREE.DirectionalLight(0xfff0d4, 1.6);
    dirLight.position.set(8, 15, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x6080ff, 0.3);
    fillLight.position.set(-6, 8, -6);
    scene.add(fillLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xffa040, 0.4);
    rimLight.position.set(-4, 5, 8);
    scene.add(rimLight);

    // Point lights for atmosphere
    const warmPoint = new THREE.PointLight(0xffc880, 0.5, 20);
    warmPoint.position.set(4, 6, 4);
    scene.add(warmPoint);

    const coolPoint = new THREE.PointLight(0x4060ff, 0.3, 20);
    coolPoint.position.set(-4, 6, -4);
    scene.add(coolPoint);
}

// ============================================================
//  BOARD
// ============================================================
function createBoard() {
    // Board base
    const baseGeo = new THREE.BoxGeometry(
        BOARD_SIZE * SQUARE_SIZE + 0.6,
        0.3,
        BOARD_SIZE * SQUARE_SIZE + 0.6
    );
    const baseMat = new THREE.MeshStandardMaterial({
        color: COLORS.boardBorder,
        roughness: 0.3,
        metalness: 0.6,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.2;
    base.receiveShadow = true;
    boardGroup.add(base);

    // Gold trim
    const trimGeo = new THREE.BoxGeometry(
        BOARD_SIZE * SQUARE_SIZE + 0.7,
        0.05,
        BOARD_SIZE * SQUARE_SIZE + 0.7
    );
    const trimMat = new THREE.MeshStandardMaterial({
        color: 0xd4a34a,
        roughness: 0.2,
        metalness: 0.8,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.y = -0.04;
    boardGroup.add(trim);

    // Squares
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const isLight = (row + col) % 2 === 0;
            const geo = new THREE.BoxGeometry(SQUARE_SIZE, 0.1, SQUARE_SIZE);
            const mat = new THREE.MeshStandardMaterial({
                color: isLight ? COLORS.lightSquare : COLORS.darkSquare,
                roughness: isLight ? 0.4 : 0.6,
                metalness: isLight ? 0.1 : 0.05,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                col * SQUARE_SIZE - BOARD_OFFSET,
                0,
                row * SQUARE_SIZE - BOARD_OFFSET
            );
            mesh.receiveShadow = true;
            mesh.userData = {
                isSquare: true,
                col: col,
                row: row,
                algebraic: colRowToAlgebraic(col, row),
                originalColor: mat.color.getHex()
            };
            boardGroup.add(mesh);
            boardMeshes.push(mesh);
        }
    }

    // Coordinate labels
    const files = ['a','b','c','d','e','f','g','h'];
    const ranks = ['1','2','3','4','5','6','7','8'];

    for (let i = 0; i < 8; i++) {
        // File labels (bottom)
        addTextLabel(files[i],
            i * SQUARE_SIZE - BOARD_OFFSET,
            0.06,
            BOARD_OFFSET + 0.6
        );
        // Rank labels (left)
        addTextLabel(ranks[7 - i],
            -BOARD_OFFSET - 0.6,
            0.06,
            i * SQUARE_SIZE - BOARD_OFFSET
        );
    }
}

function addTextLabel(text, x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d4a34a';
    ctx.font = 'bold 40px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(0.35, 0.35, 0.35);
    boardGroup.add(sprite);
}

// ============================================================
//  MODEL LOADING
// ============================================================
async function loadModels() {
    const loader = new GLTFLoader();
    const pieces = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
    const total = pieces.length + 1; // +1 for environment
    let loaded = 0;

    const updateProgress = (name) => {
        loaded++;
        const pct = Math.round((loaded / total) * 100);
        loadingBar.style.width = pct + '%';
        loadingText.textContent = `Memuat ${name}... (${pct}%)`;
    };

    // Load each piece type
    for (const piece of pieces) {
        try {
            const gltf = await loader.loadAsync(`asset/${piece}_white.glb`);
            const model = gltf.scene;
            pieceModels[piece] = model;
            updateProgress(piece);
        } catch (e) {
            console.warn(`Could not load ${piece}:`, e);
            updateProgress(piece);
        }
    }

    // Load environment
    try {
        const gltf = await loader.loadAsync('asset/option8_cathedral.glb');
        const env = gltf.scene;
        env.scale.set(0.015, 0.015, 0.015);
        env.position.set(0, -0.35, 0);
        env.traverse(child => {
            if (child.isMesh) {
                child.receiveShadow = true;
                child.castShadow = true;
            }
        });
        envGroup.add(env);
        updateProgress('cathedral');
    } catch (e) {
        console.warn('Could not load environment:', e);
        updateProgress('cathedral');
    }

    loadingBar.style.width = '100%';
    loadingText.textContent = 'Siap!';
    await new Promise(r => setTimeout(r, 500));
}

// ============================================================
//  PIECE CREATION & PLACEMENT
// ============================================================
function createPieceMesh(type, color) {
    const key = type; // p, r, n, b, q, k
    const names = { p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king' };
    const modelName = names[key];

    if (pieceModels[modelName]) {
        const clone = pieceModels[modelName].clone();
        
        // Auto-detect scale by measuring bounding box
        const box = new THREE.Box3().setFromObject(clone);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Target heights for different pieces
        const targetHeights = {
            pawn: 0.65, rook: 0.7, knight: 0.75, bishop: 0.8, queen: 0.9, king: 1.0
        };
        const targetH = targetHeights[modelName] || 0.7;
        const scaleFactor = targetH / maxDim;
        clone.scale.multiplyScalar(scaleFactor);

        // Re-center 
        const box2 = new THREE.Box3().setFromObject(clone);
        const center = new THREE.Vector3();
        box2.getCenter(center);
        clone.position.sub(center);
        clone.position.y = -box2.min.y * (clone.scale.x / (clone.scale.x || 1));

        // Apply color material
        const pieceMat = new THREE.MeshStandardMaterial({
            color: color === 'w' ? COLORS.whitePiece : COLORS.blackPiece,
            roughness: color === 'w' ? 0.3 : 0.5,
            metalness: color === 'w' ? 0.1 : 0.3,
        });

        clone.traverse(child => {
            if (child.isMesh) {
                child.material = pieceMat;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Wrap in a group for positioning
        const wrapper = new THREE.Group();
        wrapper.add(clone);
        wrapper.position.y = 0.05;
        return wrapper;
    }

    // Fallback: simple cylinder with text
    return createFallbackPiece(type, color);
}

function createFallbackPiece(type, color) {
    const heights = { p: 0.4, r: 0.5, n: 0.55, b: 0.6, q: 0.7, k: 0.75 };
    const radii = { p: 0.2, r: 0.25, n: 0.23, b: 0.22, q: 0.26, k: 0.27 };
    const h = heights[type] || 0.5;
    const r = radii[type] || 0.25;

    const geo = new THREE.CylinderGeometry(r * 0.7, r, h, 16);
    const mat = new THREE.MeshStandardMaterial({
        color: color === 'w' ? COLORS.whitePiece : COLORS.blackPiece,
        roughness: 0.3,
        metalness: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.y = h / 2 + 0.05;

    const group = new THREE.Group();
    group.add(mesh);
    return group;
}

function refreshPieces() {
    // Clear current pieces
    while (piecesGroup.children.length > 0) {
        const child = piecesGroup.children[0];
        piecesGroup.remove(child);
        disposeObject(child);
    }

    // Place from chess.js board state
    const board = chess.board();
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const mesh = createPieceMesh(piece.type, piece.color);
                const pos = boardPositionFromRowCol(7 - row, col);
                mesh.position.x = pos.x;
                mesh.position.z = pos.z;
                mesh.userData = {
                    isPiece: true,
                    type: piece.type,
                    color: piece.color,
                    col: col,
                    row: 7 - row,
                    algebraic: colRowToAlgebraic(col, 7 - row),
                };
                
                // Rotate black pieces 180 degrees
                if (piece.color === 'b') {
                    mesh.rotation.y = Math.PI;
                }
                
                piecesGroup.add(mesh);
            }
        }
    }
}

function disposeObject(obj) {
    obj.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
}

// ============================================================
//  COORDINATE HELPERS
// ============================================================
function colRowToAlgebraic(col, row) {
    const files = 'abcdefgh';
    const c = isFlipped ? 7 - col : col;
    const r = isFlipped ? 7 - row : row;
    return files[c] + (r + 1);
}

function algebraicToColRow(alg) {
    const files = 'abcdefgh';
    let col = files.indexOf(alg[0]);
    let row = parseInt(alg[1]) - 1;
    if (isFlipped) {
        col = 7 - col;
        row = 7 - row;
    }
    return { col, row };
}

function boardPositionFromRowCol(row, col) {
    return {
        x: col * SQUARE_SIZE - BOARD_OFFSET,
        z: row * SQUARE_SIZE - BOARD_OFFSET,
    };
}

function getSquareMesh(algebraic) {
    return boardMeshes.find(m => m.userData.algebraic === algebraic);
}

// ============================================================
//  HIGHLIGHTS
// ============================================================
function clearHighlights() {
    while (highlightGroup.children.length) {
        const c = highlightGroup.children[0];
        highlightGroup.remove(c);
        disposeObject(c);
    }
    // Reset board colors
    boardMeshes.forEach(m => {
        m.material.color.setHex(m.userData.originalColor);
        m.material.emissive.setHex(0x000000);
    });
}

function highlightSquare(algebraic, color, emissiveIntensity = 0.15) {
    const mesh = getSquareMesh(algebraic);
    if (mesh) {
        mesh.material.emissive.setHex(color);
        mesh.material.emissiveIntensity = emissiveIntensity;
    }
}

function showMoveIndicator(algebraic, isCapture) {
    const { col, row } = algebraicToColRow(algebraic);
    const pos = boardPositionFromRowCol(row, col);

    if (isCapture) {
        // Ring for capture
        const geo = new THREE.RingGeometry(SQUARE_SIZE * 0.35, SQUARE_SIZE * 0.48, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: COLORS.capture,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(pos.x, 0.07, pos.z);
        mesh.userData = { isHighlight: true, algebraic };
        highlightGroup.add(mesh);
    } else {
        // Dot for move
        const geo = new THREE.CircleGeometry(SQUARE_SIZE * 0.15, 24);
        const mat = new THREE.MeshBasicMaterial({
            color: COLORS.moveTarget,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(pos.x, 0.07, pos.z);
        mesh.userData = { isHighlight: true, algebraic };
        highlightGroup.add(mesh);
    }
}

function showLastMove(from, to) {
    highlightSquare(from, COLORS.lastMove, 0.08);
    highlightSquare(to, COLORS.lastMove, 0.12);
}

// ============================================================
//  GAME LOGIC
// ============================================================
function selectSquare(algebraic) {
    if (animating) return;

    const piece = chess.get(algebraic);

    // If we have a selected piece and clicked on a move target
    if (selectedSquare) {
        const move = legalMoves.find(m => m.to === algebraic);
        if (move) {
            // Check for promotion: pawn reaching last rank
            const isPromotion = move.piece === 'p' &&
                ((move.color === 'w' && algebraic[1] === '8') || (move.color === 'b' && algebraic[1] === '1'));
            if (isPromotion) {
                showPromotionDialog(selectedSquare, algebraic);
                return;
            }
            makeMove(selectedSquare, algebraic);
            return;
        }

        // Clicked on own piece → reselect
        if (piece && piece.color === chess.turn()) {
            clearHighlights();
            showLastMoveHighlight();
            selectedSquare = algebraic;
            highlightSquare(algebraic, COLORS.selected, 0.3);
            legalMoves = chess.moves({ square: algebraic, verbose: true });
            legalMoves.forEach(m => {
                const targetPiece = chess.get(m.to);
                showMoveIndicator(m.to, !!targetPiece || m.flags.includes('e'));
            });
            return;
        }

        // Clicked elsewhere → deselect
        clearHighlights();
        showLastMoveHighlight();
        selectedSquare = null;
        legalMoves = [];
        return;
    }

    // No selection yet → select a piece of current turn
    if (piece && piece.color === chess.turn()) {
        clearHighlights();
        showLastMoveHighlight();
        selectedSquare = algebraic;
        highlightSquare(algebraic, COLORS.selected, 0.3);
        legalMoves = chess.moves({ square: algebraic, verbose: true });
        legalMoves.forEach(m => {
            const targetPiece = chess.get(m.to);
            showMoveIndicator(m.to, !!targetPiece || m.flags.includes('e'));
        });
    }
}

function makeMove(from, to, promotion) {
    const moveObj = { from, to };
    if (promotion) moveObj.promotion = promotion;

    const result = chess.move(moveObj);
    if (!result) return false;

    selectedSquare = null;
    legalMoves = [];
    lastMoveSquares = [from, to];

    // Animate then refresh
    animateMove(from, to, result, () => {
        refreshPieces();
        clearHighlights();
        showLastMoveHighlight();
        updateUI();
        checkGameOver();
    });

    return true;
}

function animateMove(from, to, result, onComplete) {
    animating = true;
    const fromRC = algebraicToColRow(from);
    const toRC = algebraicToColRow(to);
    const fromPos = boardPositionFromRowCol(fromRC.row, fromRC.col);
    const toPos = boardPositionFromRowCol(toRC.row, toRC.col);

    // Find the piece mesh at fromPos
    let pieceMesh = null;
    for (const child of piecesGroup.children) {
        if (child.userData.algebraic === from) {
            pieceMesh = child;
            break;
        }
    }

    if (!pieceMesh) {
        animating = false;
        onComplete();
        return;
    }

    const startPos = { x: pieceMesh.position.x, y: pieceMesh.position.y, z: pieceMesh.position.z };
    const endPos = { x: toPos.x, y: pieceMesh.position.y, z: toPos.z };
    const duration = 300;
    const startTime = performance.now();
    const arcHeight = 0.5;

    function animStep(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        pieceMesh.position.x = startPos.x + (endPos.x - startPos.x) * ease;
        pieceMesh.position.z = startPos.z + (endPos.z - startPos.z) * ease;
        pieceMesh.position.y = startPos.y + Math.sin(ease * Math.PI) * arcHeight;

        if (t < 1) {
            requestAnimationFrame(animStep);
        } else {
            pieceMesh.position.y = startPos.y;
            animating = false;
            onComplete();
        }
    }
    requestAnimationFrame(animStep);
}

function showLastMoveHighlight() {
    if (lastMoveSquares.length === 2) {
        showLastMove(lastMoveSquares[0], lastMoveSquares[1]);
    }
    // Check highlight
    if (chess.in_check()) {
        // Find king position
        const board = chess.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p && p.type === 'k' && p.color === chess.turn()) {
                    const alg = 'abcdefgh'[c] + (8 - r);
                    highlightSquare(alg, COLORS.check, 0.4);
                }
            }
        }
    }
}

// ============================================================
//  PROMOTION
// ============================================================
function showPromotionDialog(from, to) {
    pendingPromotion = { from, to };
    promotionOverlay.classList.remove('hidden');
}

function handlePromotion(pieceType) {
    if (!pendingPromotion) return;
    promotionOverlay.classList.add('hidden');
    makeMove(pendingPromotion.from, pendingPromotion.to, pieceType);
    pendingPromotion = null;
}

// ============================================================
//  UI UPDATE
// ============================================================
function updateUI() {
    // Turn indicator
    const turn = chess.turn();
    turnIndicator.innerHTML = `
        <div class="turn-dot ${turn === 'w' ? 'white-dot' : 'black-dot'}"></div>
        <span>Giliran ${turn === 'w' ? 'Putih' : 'Hitam'}</span>
    `;

    // Game info
    if (chess.in_check()) {
        gameInfo.textContent = '⚠ SKAK!';
        gameInfo.className = 'game-info check';
    } else {
        gameInfo.textContent = '';
        gameInfo.className = 'game-info';
    }

    // Move history
    updateMoveHistory();

    // Captured pieces
    updateCapturedPieces();
}

function updateMoveHistory() {
    const history = chess.history();
    moveList.innerHTML = '';

    for (let i = 0; i < history.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const row = document.createElement('div');
        row.className = 'move-row';

        const num = document.createElement('span');
        num.className = 'move-number';
        num.textContent = moveNum + '.';
        row.appendChild(num);

        const white = document.createElement('span');
        white.className = 'move-white' + (i === history.length - 1 ? ' move-latest' : '');
        white.textContent = history[i];
        row.appendChild(white);

        if (history[i + 1]) {
            const black = document.createElement('span');
            black.className = 'move-black' + (i + 1 === history.length - 1 ? ' move-latest' : '');
            black.textContent = history[i + 1];
            row.appendChild(black);
        }

        moveList.appendChild(row);
    }

    moveList.scrollTop = moveList.scrollHeight;
}

function updateCapturedPieces() {
    // Calculate captured pieces from initial position vs current
    const initial = { w: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 }, b: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 } };
    const current = { w: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 }, b: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 } };

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p) current[p.color][p.type]++;
        }
    }

    // White pieces captured (by black)
    let whiteCapHTML = '';
    let blackCapHTML = '';
    const order = ['q', 'r', 'b', 'n', 'p'];

    for (const type of order) {
        const wCap = initial.w[type] - current.w[type];
        const bCap = initial.b[type] - current.b[type];
        for (let i = 0; i < wCap; i++) whiteCapHTML += `<span>${PIECE_SYMBOLS[type]}</span>`;
        for (let i = 0; i < bCap; i++) blackCapHTML += `<span>${PIECE_SYMBOLS[type]}</span>`;
    }

    capturedWhite.innerHTML = whiteCapHTML || '<span style="opacity:0.3">—</span>';
    capturedBlack.innerHTML = blackCapHTML || '<span style="opacity:0.3">—</span>';
}

// ============================================================
//  GAME OVER
// ============================================================
function checkGameOver() {
    if (chess.game_over()) {
        let title, message, icon;

        if (chess.in_checkmate()) {
            const winner = chess.turn() === 'w' ? 'Hitam' : 'Putih';
            title = 'Skakmat!';
            message = `${winner} menang!`;
            icon = '♚';
        } else if (chess.in_stalemate()) {
            title = 'Stalemate!';
            message = 'Permainan berakhir seri.';
            icon = '½';
        } else if (chess.in_draw()) {
            title = 'Seri!';
            message = 'Permainan berakhir seri.';
            icon = '½';
        } else if (chess.in_threefold_repetition()) {
            title = 'Seri!';
            message = 'Tiga kali pengulangan posisi.';
            icon = '½';
        } else {
            title = 'Permainan Selesai';
            message = '';
            icon = '♚';
        }

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.textContent = icon;
        setTimeout(() => {
            modalOverlay.classList.remove('hidden');
        }, 600);
    }
}

// ============================================================
//  EVENTS
// ============================================================
function setupEvents() {
    // Mouse click on board
    renderer.domElement.addEventListener('click', onBoardClick);
    renderer.domElement.addEventListener('touchend', onBoardTouch);

    // New game
    document.getElementById('btn-new-game').addEventListener('click', newGame);
    document.getElementById('modal-new-game').addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        newGame();
    });
    document.getElementById('modal-close').addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
    });

    // Undo
    document.getElementById('btn-undo').addEventListener('click', undoMove);

    // Flip board
    document.getElementById('btn-flip').addEventListener('click', flipBoard);

    // Camera buttons
    document.getElementById('cam-top').addEventListener('click', () => setCameraView('top'));
    document.getElementById('cam-white').addEventListener('click', () => setCameraView('white'));
    document.getElementById('cam-black').addEventListener('click', () => setCameraView('black'));
    document.getElementById('cam-free').addEventListener('click', () => setCameraView('free'));

    // Promotion
    document.querySelectorAll('.promotion-btn').forEach(btn => {
        btn.addEventListener('click', () => handlePromotion(btn.dataset.piece));
    });

    // Resize
    window.addEventListener('resize', onResize);
}

function onBoardClick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    processClick();
}

function onBoardTouch(e) {
    if (e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    processClick();
}

function processClick() {
    raycaster.setFromCamera(mouse, camera);

    // First check highlight indicators (move targets)
    const highlightHits = raycaster.intersectObjects(highlightGroup.children, true);
    if (highlightHits.length > 0) {
        let obj = highlightHits[0].object;
        while (obj && !obj.userData.algebraic) obj = obj.parent;
        if (obj && obj.userData.algebraic) {
            selectSquare(obj.userData.algebraic);
            return;
        }
    }

    // Then check pieces
    const pieceHits = raycaster.intersectObjects(piecesGroup.children, true);
    if (pieceHits.length > 0) {
        let obj = pieceHits[0].object;
        while (obj.parent && !obj.userData.isPiece) obj = obj.parent;
        if (obj.userData.isPiece) {
            selectSquare(obj.userData.algebraic);
            return;
        }
    }

    // Then check board squares
    const boardHits = raycaster.intersectObjects(boardMeshes, false);
    if (boardHits.length > 0) {
        const sq = boardHits[0].object;
        if (sq.userData.isSquare) {
            selectSquare(sq.userData.algebraic);
            return;
        }
    }

    // Clicked nothing → deselect
    if (selectedSquare) {
        clearHighlights();
        showLastMoveHighlight();
        selectedSquare = null;
        legalMoves = [];
    }
}

function newGame() {
    chess.reset();
    selectedSquare = null;
    legalMoves = [];
    lastMoveSquares = [];
    clearHighlights();
    refreshPieces();
    updateUI();
    gameInfo.textContent = '';
    gameInfo.className = 'game-info';
}

function undoMove() {
    if (animating) return;
    chess.undo();
    selectedSquare = null;
    legalMoves = [];

    // Update last move
    const hist = chess.history({ verbose: true });
    if (hist.length > 0) {
        const last = hist[hist.length - 1];
        lastMoveSquares = [last.from, last.to];
    } else {
        lastMoveSquares = [];
    }

    clearHighlights();
    showLastMoveHighlight();
    refreshPieces();
    updateUI();
}

function flipBoard() {
    isFlipped = !isFlipped;
    // Rebuild coordinate mapping
    boardMeshes.forEach(m => {
        m.userData.algebraic = colRowToAlgebraic(m.userData.col, m.userData.row);
    });
    clearHighlights();
    showLastMoveHighlight();
    refreshPieces();

    // Rotate camera
    const targetAngle = isFlipped ? Math.PI : 0;
    const currentPos = camera.position.clone();
    const radius = Math.sqrt(currentPos.x * currentPos.x + currentPos.z * currentPos.z);
    const currentAngle = Math.atan2(currentPos.z, currentPos.x);

    camera.position.x = radius * Math.cos(currentAngle + Math.PI);
    camera.position.z = radius * Math.sin(currentAngle + Math.PI);
    controls.update();
}

function setCameraView(view) {
    // Update active button
    document.querySelectorAll('.camera-controls .btn').forEach(b => b.classList.remove('active'));
    document.getElementById('cam-' + view).classList.add('active');

    let target = { x: 0, y: 0, z: 0 };
    let pos;

    switch (view) {
        case 'top':
            pos = { x: 0, y: 14, z: 0.01 };
            break;
        case 'white':
            pos = { x: 0, y: 7, z: 10 };
            break;
        case 'black':
            pos = { x: 0, y: 7, z: -10 };
            break;
        case 'free':
        default:
            pos = { x: 8, y: 10, z: 8 };
            break;
    }

    animateCamera(pos, target);
}

function animateCamera(targetPos, targetLookAt) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 800;
    const startTime = performance.now();

    function step(now) {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        camera.position.lerpVectors(startPos, new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z), ease);
        controls.target.lerpVectors(startTarget, new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z), ease);
        controls.update();

        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================
//  RENDER LOOP
// ============================================================
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Gentle piece hover float
    const time = performance.now() * 0.001;
    piecesGroup.children.forEach((child, i) => {
        if (child.userData.isPiece) {
            child.position.y = 0.05 + Math.sin(time * 1.5 + i * 0.5) * 0.005;
        }
    });

    renderer.render(scene, camera);
}

// ============================================================
//  START
// ============================================================
init();

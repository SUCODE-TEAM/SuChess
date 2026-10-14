import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

// RTX Checkerboard Shader: Combines crisp Black & White FIDE tiles with real-time planar mirror reflections
const RTXCheckerboardShader = {
  name: 'RTXCheckerboardShader',
  uniforms: {
    color: { value: new THREE.Color(0xffffff) },
    tDiffuse: { value: null },
    textureMatrix: { value: new THREE.Matrix4() },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vBoardUv;

    #include <common>
    #include <logdepthbuf_pars_vertex>

    void main() {
      vUv = textureMatrix * vec4( position, 1.0 );
      vBoardUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    varying vec4 vUv;
    varying vec2 vBoardUv;

    #include <logdepthbuf_pars_fragment>

    void main() {
      #include <logdepthbuf_fragment>

      vec4 refl = texture2DProj( tDiffuse, vUv );

      // 8x8 Tile calculations
      vec2 gridUv = vBoardUv * 8.0;
      vec2 tileUv = fract( gridUv );
      float col = floor( gridUv.x );
      float row = floor( gridUv.y );

      // FIDE standard: h1 (7,0) is light ("white on right"), a1 (0,0) is dark
      bool isLight = mod( col + row, 2.0 ) > 0.5;

      // Crisp White Carrara Marble vs Deep Obsidian Black
      vec3 lightTile = vec3( 0.96, 0.95, 0.93 );
      vec3 darkTile  = vec3( 0.08, 0.09, 0.12 );

      vec3 baseColor = isLight ? lightTile : darkTile;

      // Subtle luxury tile seam
      float seamW = 0.016;
      float seam = smoothstep( 0.0, seamW, tileUv.x ) *
                   smoothstep( 0.0, seamW, tileUv.y ) *
                   smoothstep( 0.0, seamW, 1.0 - tileUv.x ) *
                   smoothstep( 0.0, seamW, 1.0 - tileUv.y );
      vec3 seamColor = vec3( 0.03, 0.03, 0.04 );
      baseColor = mix( seamColor, baseColor, seam );

      // Live RTX Planar Mirror Reflections of pieces and environment
      vec3 finalColor;
      if ( isLight ) {
        // White tiles: glossy specular marble reflection
        finalColor = baseColor * 0.76 + refl.rgb * 0.34;
      } else {
        // Dark tiles: deep obsidian mirror reflection of pieces & glowing runes
        finalColor = mix( baseColor, refl.rgb, 0.44 );
      }

      gl_FragColor = vec4( finalColor * color, 1.0 );

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

export class ThreeSceneManager {
  constructor(container, options = {}) {
    this.container = container;
    this.onSquareClick = options.onSquareClick || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.graphicQuality = options.graphicQuality || 'ultra';

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.bloomPass = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.pointerDownPos = { x: 0, y: 0 };
    this.pieceTemplates = {};
    this.activePieces = new Map(); // algebraic -> { group, mixer, mesh, type, color, template }
    this.boardSquares = new Map(); // algebraic -> mesh
    this.highlightMeshes = [];
    this.animatingPieces = [];

    this.brazierLights = [];
    this.flameMeshes = [];
    this.emberMeshes = [];
    this.boardReflector = null;
    this.flameTimeUniform = { value: 0 };

    this.clock = new THREE.Clock();
    this.isDisposed = false;

    this.init();
  }

  // ============================================================
  //  INIT
  // ============================================================
  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06070a);
    this.scene.fog = new THREE.FogExp2(0x08090d, 0.012);

    // Camera
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 500);
    this.camera.position.set(0, 10.5, 11.5);

    // Renderer (Slightly softer exposure to prevent blinding glare)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02; // Reduced from 1.25 to make scene gentle on the eyes
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 28;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 0.3, 0);

    // Lighting
    this.setupLighting();

    // Environment & Cathedral
    this.setupEnvironment();

    // Board & Table
    this.buildBoard();

    // Post-Processing Composer (Ray-Tracing Bloom & Glow)
    this.setupPostProcessing(width, height);

    // Event Listeners (Taps & Clicks)
    this.bindEvents();

    // Render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // ============================================================
  //  LIGHTING (Balanced, Non-Blinding Gothic Atmosphere)
  // ============================================================
  setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xdde5ff, 0x141824, 0.5);
    this.scene.add(hemiLight);

    // Warm Cathedral Sunlight streaming through stained glass
    const sunLight = new THREE.DirectionalLight(0xfff3e0, 1.8); // Softer than 2.6
    sunLight.position.set(8, 22, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -7;
    sunLight.shadow.camera.right = 7;
    sunLight.shadow.camera.top = 7;
    sunLight.shadow.camera.bottom = -7;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.radius = 2.5;
    this.scene.add(sunLight);

    const stainedGlassLight = new THREE.DirectionalLight(0x5588ee, 0.85); // Softer than 1.2
    stainedGlassLight.position.set(-8, 16, -12);
    this.scene.add(stainedGlassLight);

    // Warm Altar Braziers (positioned right over the brazier cauldrons at ±9.6)
    const b1 = new THREE.PointLight(0xff7722, 2.5, 18, 1.5);
    b1.position.set(-9.6, 2.2, 0);
    this.scene.add(b1);
    this.brazierLights.push(b1);

    const b2 = new THREE.PointLight(0xff7722, 2.5, 18, 1.5);
    b2.position.set(9.6, 2.2, 0);
    this.scene.add(b2);
    this.brazierLights.push(b2);

    const topSpot = new THREE.SpotLight(0xffeedd, 0.9, 20, Math.PI / 4, 0.3, 1);
    topSpot.position.set(0, 12, 0);
    topSpot.target.position.set(0, 0, 0);
    this.scene.add(topSpot);
    this.scene.add(topSpot.target);
  }

  // ============================================================
  //  POST-PROCESSING (Ray-Tracing Glow without Silau / Blinding)
  // ============================================================
  setupPostProcessing(width, height) {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // UnrealBloomPass: High threshold ensures NO blinding glare (tidak silau!), only pure glowing runes/fire
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.22, // gentle, refined strength - non-blinding!
      0.35, // smooth radius
      0.92  // high threshold: ONLY glowing rune cores bloom, board & room remain completely crisp!
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setGraphicQuality(quality) {
    this.graphicQuality = quality;
    if (quality === 'ultra') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (this.bloomPass) this.bloomPass.enabled = true;
      if (this.boardReflector) this.boardReflector.visible = true;
    } else if (quality === 'high') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      if (this.bloomPass) this.bloomPass.enabled = true;
      if (this.boardReflector) this.boardReflector.visible = true;
    } else {
      this.renderer.shadowMap.enabled = false;
      if (this.bloomPass) this.bloomPass.enabled = false;
      if (this.boardReflector) this.boardReflector.visible = false;
    }
  }

  // ============================================================
  //  ENVIRONMENT & CATHEDRAL
  // ============================================================
  async setupEnvironment() {
    const loader = new GLTFLoader();

    try {
      this.onProgress('Memuat Katedral Gotik...');
      const gltf = await loader.loadAsync('/asset/option8_cathedral.glb');
      const cathedral = gltf.scene;

      cathedral.scale.set(2.4, 2.4, 2.4);
      cathedral.position.set(0, -1.73, -1.56);

      cathedral.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          const mat = child.material;
          if (mat) {
            if (mat.name && mat.name.includes('Gold_Rune')) {
              mat.emissive = new THREE.Color(0xd4af37);
              mat.emissiveIntensity = 1.1; // Gentle glow, not blinding
            } else if (mat.name && mat.name.includes('Rose_Glass')) {
              mat.emissive = new THREE.Color(0x3366cc);
              mat.emissiveIntensity = 1.0;
            } else if (mat.name && mat.name.includes('Lancet_Glass')) {
              mat.emissive = new THREE.Color(0x4477ee);
              mat.emissiveIntensity = 0.9;
            } else if (mat.name && mat.name.includes('Flame')) {
              this.setupFlameMaterial(child, mat);
              this.flameMeshes.push(child);
            } else if (mat.name && mat.name.includes('Ember')) {
              mat.emissive = new THREE.Color(0xff3300);
              mat.emissiveIntensity = 1.2;
              this.emberMeshes.push(child);
            } else if (mat.name && mat.name.includes('Obsidian_Altar')) {
              mat.roughness = 0.12;
              mat.metalness = 0.2;
            }
          }
        }
      });

      this.scene.add(cathedral);
    } catch (err) {
      console.warn('Could not load cathedral model:', err);
    }
  }

  // ============================================================
  //  REALISTIC 3D GLB FLAME ANIMATION (GPU Vertex Shader Displacement)
  // ============================================================
  //  REALISTIC 3D GLB FLAME ANIMATION (Smooth, Fluid Harmonic Displacement)
  // ============================================================
  setupFlameMaterial(mesh, mat) {
    let layerIndex = 1;
    let speed = 1.0;
    let swayScale = 1.0;

    if (mat.name.includes('Core')) {
      layerIndex = 0;
      speed = 1.15;
      swayScale = 0.7;
      mat.emissive = new THREE.Color(0xfff0aa);
      mat.emissiveIntensity = 2.4;
    } else if (mat.name.includes('Mid')) {
      layerIndex = 1;
      speed = 1.0;
      swayScale = 1.0;
      mat.emissive = new THREE.Color(0xff6600);
      mat.emissiveIntensity = 1.9;
    } else {
      // Outer
      layerIndex = 2;
      speed = 0.85;
      swayScale = 1.25;
      mat.emissive = new THREE.Color(0xee2200);
      mat.emissiveIntensity = 1.5;
    }

    mat.customProgramCacheKey = () => 'smooth_flame_v5_' + layerIndex;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uFlameTime = this.flameTimeUniform;
      shader.uniforms.uFlameSpeed = { value: speed };
      shader.uniforms.uSwayScale = { value: swayScale };

      shader.vertexShader = `
        uniform float uFlameTime;
        uniform float uFlameSpeed;
        uniform float uSwayScale;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>

        // Base of flame starts at y = 0.58 and reaches tips up to ~1.88
        float fHeight = clamp((position.y - 0.58) / 1.15, 0.0, 1.0);
        // Smooth exponential ramp: zero movement at base, gradual smooth motion towards tips
        float fPower = pow(fHeight, 1.5);

        float t = uFlameTime * uFlameSpeed;

        // 1. Smooth vertical convective licking (stretches upward organically, low spatial frequency)
        float surge = sin(t * 2.8 - position.y * 1.5) * 0.045 * fPower;
        transformed.y += surge;

        // 2. Smooth wind draft sway in X and Z (additive, preserves mesh triangles)
        float swayX = (sin(t * 2.2 + position.y * 1.2) * 0.032 + sin(t * 3.4 - position.y * 1.8) * 0.014) * uSwayScale * fPower;
        float swayZ = (cos(t * 1.9 + position.y * 1.2) * 0.032 + cos(t * 3.0 - position.y * 1.8) * 0.014) * uSwayScale * fPower;
        transformed.x += swayX;
        transformed.z += swayZ;

        // 3. Smooth volumetric breathing (gentle radial expansion & contraction)
        float bCenterLocalX = position.x < 0.0 ? -3.92 : 3.92;
        float fDx = position.x - bCenterLocalX;
        float fDz = position.z - 0.65;
        float breathe = sin(t * 2.5 - position.y * 1.3) * 0.035 * fPower;
        transformed.x += fDx * breathe;
        transformed.z += fDz * breathe;
        `
      );
    };
  }

  // ============================================================
  //  CHESSBOARD (High-Gloss Carrara White Marble & Obsidian Black)
  // ============================================================
  buildBoard() {
    const boardGroup = new THREE.Group();

    // Dark gothic plinth
    const plinthGeo = new THREE.BoxGeometry(9.2, 0.4, 9.2);
    const plinthMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e0f14,
      roughness: 0.25,
      metalness: 0.35,
      clearcoat: 0.8,
      clearcoatRoughness: 0.08,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.2;
    plinth.receiveShadow = true;
    boardGroup.add(plinth);

    // Inlaid gold filigree rim
    const rimGeo = new THREE.BoxGeometry(9.0, 0.04, 9.0);
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      roughness: 0.15,
      metalness: 0.95,
      clearcoat: 0.5,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = 0.01;
    boardGroup.add(rim);

    // Inner board base (dark grooved underlay)
    const innerBaseGeo = new THREE.BoxGeometry(8.18, 0.05, 8.18);
    const innerBaseMat = new THREE.MeshPhysicalMaterial({
      color: 0x090a0d,
      roughness: 0.2,
      metalness: 0.8,
    });
    const innerBase = new THREE.Mesh(innerBaseGeo, innerBaseMat);
    innerBase.position.y = 0.025;
    boardGroup.add(innerBase);

    // 64 Squares: Polished Pure Ivory White Marble vs Polished Deep Obsidian Black
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const lightSquareMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbf9f5, // Pristine Polished Carrara White Marble
      roughness: 0.04,
      metalness: 0.02,
      clearcoat: 1.0,  // Ultra glossy lacquer
      clearcoatRoughness: 0.01,
      reflectivity: 1.0,
      envMapIntensity: 1.3,
    });

    const darkSquareMat = new THREE.MeshPhysicalMaterial({
      color: 0x12141c, // Deep Glossy Obsidian Black
      roughness: 0.04,
      metalness: 0.05,
      clearcoat: 1.0,  // Ultra glossy mirror sheen
      clearcoatRoughness: 0.01,
      reflectivity: 1.0,
      envMapIntensity: 1.3,
    });

    // Square tiles with fine luxury inlaid grooving (0.985 x 0.06 x 0.985)
    const squareGeo = new THREE.BoxGeometry(0.985, 0.06, 0.985);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        // FIDE standard: h1 is light ("white on right"), a1 is dark
        const isLight = (r + c) % 2 === 1;
        const mesh = new THREE.Mesh(squareGeo, isLight ? lightSquareMat : darkSquareMat);
        const x = (c - 3.5) * 1.0;
        const z = (3.5 - r) * 1.0; // r=0 is rank 1 at z=+3.5, r=7 is rank 8 at z=-3.5
        mesh.position.set(x, 0.05, z);
        mesh.receiveShadow = true;

        const algebraic = files[c] + ranks[r];
        mesh.userData = {
          isSquare: true,
          algebraic,
          file: files[c],
          rank: ranks[r],
          col: c,
          row: r,
          isLight,
        };

        boardGroup.add(mesh);
        this.boardSquares.set(algebraic, mesh);
      }
    }

    // Planar Reflector (RTX Checkerboard: Crisp Black & White + Real-Time Mirror Reflections)
    try {
      this.boardReflector = new Reflector(new THREE.PlaneGeometry(8.0, 8.0), {
        shader: RTXCheckerboardShader,
        clipBias: 0.003,
        textureWidth: 1024,
        textureHeight: 1024,
        color: 0xffffff,
      });
      this.boardReflector.position.y = 0.081;
      this.boardReflector.rotation.x = -Math.PI / 2;
      this.boardReflector.raycast = () => {};
      boardGroup.add(this.boardReflector);
    } catch (e) {
      console.warn('Reflector not initialized:', e);
    }

    // Border Labels
    for (let i = 0; i < 8; i++) {
      this.addBorderLabel(files[i], (i - 3.5) * 1.0, 0.05, 4.3, boardGroup);
      this.addBorderLabel(files[i], (i - 3.5) * 1.0, 0.05, -4.3, boardGroup, Math.PI);
      this.addBorderLabel(ranks[i], -4.3, 0.05, (3.5 - i) * 1.0, boardGroup, Math.PI / 2);
      this.addBorderLabel(ranks[i], 4.3, 0.05, (3.5 - i) * 1.0, boardGroup, -Math.PI / 2);
    }

    this.scene.add(boardGroup);
  }

  addBorderLabel(text, x, y, z, parent, rotY = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 64px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillText(text, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    const planeGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const planeMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const labelMesh = new THREE.Mesh(planeGeo, planeMat);
    labelMesh.position.set(x, y + 0.02, z);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.rotation.z = rotY;
    labelMesh.raycast = () => {};
    parent.add(labelMesh);
  }

  // ============================================================
  //  PIECE MODELS & RIGGED SKINNEDMESH HANDLING
  // ============================================================
  async loadPieceModels() {
    const loader = new GLTFLoader();
    const pieces = [
      { key: 'p', name: 'pawn' },
      { key: 'r', name: 'rook' },
      { key: 'n', name: 'knight' },
      { key: 'b', name: 'bishop' },
      { key: 'q', name: 'queen' },
      { key: 'k', name: 'king' },
    ];

    let loaded = 0;
    for (const p of pieces) {
      this.onProgress(`Memuat Bidak ${p.name}... (${Math.round((loaded / pieces.length) * 100)}%)`);
      try {
        const gltf = await loader.loadAsync(`/asset/${p.name}_white.glb`);
        this.pieceTemplates[p.key] = {
          scene: gltf.scene,
          animations: gltf.animations || [],
        };
      } catch (err) {
        console.error(`Failed to load ${p.name}:`, err);
      }
      loaded++;
    }
    this.onProgress('Bidak catur siap!');
  }

  createPieceInstance(type, color, initialAlg) {
    const template = this.pieceTemplates[type];
    if (!template) return null;

    const clone = SkeletonUtils.clone(template.scene);
    const isWhite = color === 'w';

    // Luxurious Carrara White vs Pure Jet Black Obsidian (Zero body glare, sleek dark finish)
    const marbleMat = new THREE.MeshPhysicalMaterial({
      color: isWhite ? 0xf8f7f2 : 0x0c0d12,
      emissive: 0x000000, // No glare on armor body
      roughness: isWhite ? 0.16 : 0.12,
      metalness: isWhite ? 0.02 : 0.15,
      clearcoat: 1.0, // High-gloss lacquer reflection
      clearcoatRoughness: 0.03,
      reflectivity: 1.0,
      envMapIntensity: 1.25,
    });

    // Royal Gold Trims vs Dark Obsidian Gunmetal Trims
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: isWhite ? 0xdfb15b : 0x181a22,
      emissive: 0x000000,
      roughness: isWhite ? 0.2 : 0.22,
      metalness: 0.92,
      clearcoat: 0.5,
      envMapIntensity: 1.3,
    });

    // Bright Knight Silver Steel vs Dark Blackened Steel
    const steelMat = new THREE.MeshPhysicalMaterial({
      color: isWhite ? 0xd8dde5 : 0x22242c,
      emissive: 0x000000,
      roughness: isWhite ? 0.15 : 0.2,
      metalness: 0.92,
      envMapIntensity: 1.15,
    });

    // Power Runes & Core Gems: Bright Glowing Red for Black ("merahnya bikin menyala")!
    const glowMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xffd269 : 0xff1500,
      emissive: isWhite ? 0xffa010 : 0xff0000, // Blazing incandescent ruby red glow!
      emissiveIntensity: isWhite ? 1.4 : 3.8, // MENYALA! Bright radiant red core!
      roughness: 0.2,
    });

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.algebraic = initialAlg; // Attach algebraic position for raycasting!

        const origName = (child.material && child.material.name) || '';
        if (origName.includes('Marble')) {
          child.material = marbleMat;
        } else if (origName.includes('AntiqueGold') || origName.includes('Trim')) {
          child.material = goldMat;
        } else if (origName.includes('Steel') || origName.includes('Silver')) {
          child.material = steelMat;
        } else if (origName.includes('Glow')) {
          child.material = glowMat;
        } else {
          child.material = marbleMat;
        }
      }
    });

    clone.scale.set(0.9, 0.9, 0.9);

    // Initial facing orientation:
    // White faces north (-Z) towards Black -> Math.PI
    // Black faces south (+Z) towards White -> 0
    clone.rotation.y = isWhite ? Math.PI : 0;

    const mixer = new THREE.AnimationMixer(clone);
    const idleClip = template.animations.find((a) => a.name === 'Idle') || template.animations[0];
    if (idleClip) {
      const action = mixer.clipAction(idleClip);
      action.time = Math.random() * idleClip.duration;
      action.play();
    }

    const group = new THREE.Group();
    group.add(clone);
    group.position.y = 0.08;
    group.userData.algebraic = initialAlg;

    return { group, mixer, type, color, template, clone };
  }

  // ============================================================
  //  SYNCHRONIZE BOARD WITH CHESS.JS STATE
  // ============================================================
  syncBoard(boardState) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const newPositions = new Map();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardState[r][c];
        if (piece) {
          const alg = files[c] + ranks[7 - r];
          newPositions.set(alg, piece);
        }
      }
    }

    // Remove obsolete pieces
    for (const [alg, pieceObj] of this.activePieces.entries()) {
      const target = newPositions.get(alg);
      if (!target || target.type !== pieceObj.type || target.color !== pieceObj.color) {
        this.scene.remove(pieceObj.group);
        this.activePieces.delete(alg);
      }
    }

    // Add or reposition
    for (const [alg, piece] of newPositions.entries()) {
      const existing = this.activePieces.get(alg);
      if (!existing) {
        const pieceObj = this.createPieceInstance(piece.type, piece.color, alg);
        if (pieceObj) {
          const sq = this.boardSquares.get(alg);
          if (sq) {
            pieceObj.group.position.x = sq.position.x;
            pieceObj.group.position.z = sq.position.z;
          }
          this.scene.add(pieceObj.group);
          this.activePieces.set(alg, pieceObj);
        }
      } else {
        existing.group.userData.algebraic = alg;
        existing.group.traverse((c) => {
          if (c.isMesh) c.userData.algebraic = alg;
        });
      }
    }
  }

  // Animate piece movement with arc trajectory & dynamic facing direction
  animateMove(fromAlg, toAlg, onComplete) {
    const pieceObj = this.activePieces.get(fromAlg);
    const toSq = this.boardSquares.get(toAlg);
    if (!pieceObj || !toSq) {
      if (onComplete) onComplete();
      return;
    }

    const victim = this.activePieces.get(toAlg);
    if (victim) {
      this.playVictimShatter(victim);
      this.activePieces.delete(toAlg);
    }

    const moveClip = pieceObj.template.animations.find((a) =>
      victim ? a.name === 'Attack' : a.name === 'Move'
    );
    if (moveClip && pieceObj.mixer) {
      const action = pieceObj.mixer.clipAction(moveClip);
      action.setLoop(THREE.LoopOnce);
      action.reset().play();
    }

    this.activePieces.delete(fromAlg);
    this.activePieces.set(toAlg, pieceObj);

    // Update tags to destination square
    pieceObj.group.userData.algebraic = toAlg;
    pieceObj.group.traverse((c) => {
      if (c.isMesh) c.userData.algebraic = toAlg;
    });

    const startPos = pieceObj.group.position.clone();
    const endPos = new THREE.Vector3(toSq.position.x, 0.08, toSq.position.z);

    // Dynamic rotation to face movement/attack direction (forward, backward, sideways, diagonal)
    const dx = endPos.x - startPos.x;
    const dz = endPos.z - startPos.z;
    const hasMoveDist = Math.hypot(dx, dz) > 0.001;
    const targetRotY = hasMoveDist ? Math.atan2(dx, dz) : pieceObj.clone.rotation.y;
    const startRotY = pieceObj.clone.rotation.y;

    this.animatingPieces.push({
      pieceObj,
      startPos,
      endPos,
      startRotY,
      targetRotY,
      hasRotation: hasMoveDist,
      startTime: performance.now(),
      duration: 340,
      onComplete,
    });
  }

  playVictimShatter(victim) {
    const shatterClip = victim.template.animations.find((a) => a.name === 'Shatter');
    if (shatterClip && victim.mixer) {
      const action = victim.mixer.clipAction(shatterClip);
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.reset().play();
    }
    setTimeout(() => {
      this.scene.remove(victim.group);
    }, 400);
  }

  // ============================================================
  //  HIGHLIGHTS & GLOW (Luminous White RTX Glow)
  // ============================================================
  clearHighlights() {
    for (const mesh of this.highlightMeshes) {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    this.highlightMeshes = [];
  }

  highlightSelectedSquare(algebraic) {
    const sq = this.boardSquares.get(algebraic);
    if (!sq) return;

    // Glowing white-gold halo rune
    const ringGeo = new THREE.RingGeometry(0.36, 0.46, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(sq.position.x, 0.085, sq.position.z);
    ring.raycast = () => {};
    this.scene.add(ring);
    this.highlightMeshes.push(ring);
  }

  highlightLegalMoves(moves) {
    for (const m of moves) {
      const sq = this.boardSquares.get(m.to);
      if (!sq) continue;

      if (m.captured) {
        // High-bloom RTX luminous white bracket for captures
        const capGeo = new THREE.RingGeometry(0.35, 0.45, 32);
        const capMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
        });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.rotation.x = -Math.PI / 2;
        cap.position.set(sq.position.x, 0.085, sq.position.z);
        cap.raycast = () => {};
        this.scene.add(cap);
        this.highlightMeshes.push(cap);

        // Subtle glowing ruby core
        const innerGeo = new THREE.RingGeometry(0.22, 0.27, 32);
        const innerMat = new THREE.MeshBasicMaterial({
          color: 0xff3355,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        inner.rotation.x = -Math.PI / 2;
        inner.position.set(sq.position.x, 0.086, sq.position.z);
        inner.raycast = () => {};
        this.scene.add(inner);
        this.highlightMeshes.push(inner);
      } else {
        // Ethereal RTX glowing white move indicators
        // Outer halo ring (bloom glare)
        const outerGeo = new THREE.RingGeometry(0.20, 0.28, 32);
        const outerMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
        });
        const outer = new THREE.Mesh(outerGeo, outerMat);
        outer.rotation.x = -Math.PI / 2;
        outer.position.set(sq.position.x, 0.085, sq.position.z);
        outer.raycast = () => {};
        this.scene.add(outer);
        this.highlightMeshes.push(outer);

        // Bright white core dot that blooms intensely
        const dotGeo = new THREE.CircleGeometry(0.12, 32);
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(sq.position.x, 0.086, sq.position.z);
        dot.raycast = () => {};
        this.scene.add(dot);
        this.highlightMeshes.push(dot);
      }
    }
  }

  highlightCheck(kingSquare) {
    const sq = this.boardSquares.get(kingSquare);
    if (sq) {
      const geo = new THREE.RingGeometry(0.32, 0.52, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(sq.position.x, 0.086, sq.position.z);
      mesh.raycast = () => {};
      this.scene.add(mesh);
      this.highlightMeshes.push(mesh);
    }
  }

  // ============================================================
  //  CAMERA PRESETS
  // ============================================================
  setCameraView(viewMode) {
    if (!this.camera || !this.controls) return;

    const targets = {
      perspective: { pos: [0, 10.5, 11.5], look: [0, 0.3, 0] },
      white: { pos: [0, 7.8, 9.2], look: [0, 0.3, 0] },
      black: { pos: [0, 7.8, -9.2], look: [0, 0.3, 0] },
      top: { pos: [0, 13.5, 0.01], look: [0, 0, 0] },
    };

    const target = targets[viewMode] || targets.perspective;
    this.animateCameraTo(target.pos, target.look);
  }

  animateCameraTo(destPos, destLook, duration = 600) {
    const startPos = this.camera.position.clone();
    const endPos = new THREE.Vector3(...destPos);
    const startLook = this.controls.target.clone();
    const endLook = new THREE.Vector3(...destLook);
    const startTime = performance.now();

    const update = () => {
      const now = performance.now();
      const progress = Math.min((now - startTime) / duration, 1.0);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startLook, endLook, ease);
      this.controls.update();

      if (progress < 1.0) {
        requestAnimationFrame(update);
      }
    };
    requestAnimationFrame(update);
  }

  // ============================================================
  //  RAYCASTING & USER INTERACTION (CLICKS & TOUCH)
  // ============================================================
  bindEvents() {
    this.handlePointerDown = (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    this.handlePointerUp = (e) => {
      // If pointer moved more than 8px, user dragged/rotated camera -> NOT a click!
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist > 8) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Collect squares AND piece meshes for click detection
      const squares = Array.from(this.boardSquares.values());
      const pieceMeshes = [];
      for (const [alg, pieceObj] of this.activePieces.entries()) {
        pieceObj.group.traverse((child) => {
          if (child.isMesh) {
            child.userData.algebraic = alg;
            pieceMeshes.push(child);
          }
        });
      }

      const targets = [...pieceMeshes, ...squares];
      const intersects = this.raycaster.intersectObjects(targets, true);

      if (intersects.length > 0) {
        for (const hit of intersects) {
          let alg = hit.object.userData.algebraic;
          if (!alg && hit.object.parent && hit.object.parent.userData) {
            alg = hit.object.parent.userData.algebraic;
          }
          if (alg) {
            if (typeof this.onSquareClick === 'function') {
              this.onSquareClick(alg);
            }
            break;
          }
        }
      }
    };

    this.onResize = this.handleResize.bind(this);

    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('resize', this.onResize);
  }

  handleResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  // ============================================================
  //  RENDER LOOP
  // ============================================================
  animate() {
    if (this.isDisposed) return;
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Update live GPU fire vertex animation
    this.flameTimeUniform.value = time;

    // Realistic flickering room illumination from braziers
    for (let i = 0; i < this.brazierLights.length; i++) {
      const light = this.brazierLights[i];
      const phase = i * 2.5;
      light.intensity = 2.4 + Math.sin(time * 12.0 + phase) * 0.45 + Math.sin(time * 23.5 + phase) * 0.2;
      light.position.y = 2.2 + Math.sin(time * 7.5 + phase) * 0.06;
    }

    // Smooth, warm emissive breathing per flame layer
    for (let i = 0; i < this.flameMeshes.length; i++) {
      const mesh = this.flameMeshes[i];
      if (mesh.material) {
        const base = i === 0 ? 2.4 : (i === 1 ? 1.9 : 1.5);
        mesh.material.emissiveIntensity = base + Math.sin(time * 3.5 + i * 1.6) * 0.25;
      }
    }

    for (const pieceObj of this.activePieces.values()) {
      if (pieceObj.mixer) {
        pieceObj.mixer.update(delta);
      }
    }

    const now = performance.now();
    for (let i = this.animatingPieces.length - 1; i >= 0; i--) {
      const anim = this.animatingPieces[i];
      const progress = Math.min((now - anim.startTime) / anim.duration, 1.0);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

      anim.pieceObj.group.position.x = THREE.MathUtils.lerp(anim.startPos.x, anim.endPos.x, ease);
      anim.pieceObj.group.position.z = THREE.MathUtils.lerp(anim.startPos.z, anim.endPos.z, ease);
      anim.pieceObj.group.position.y = 0.08 + Math.sin(progress * Math.PI) * 0.75;

      // Smoothly rotate the piece towards movement/attack direction in flight
      if (anim.hasRotation) {
        let angleDiff = (anim.targetRotY - anim.startRotY) % (Math.PI * 2);
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        anim.pieceObj.clone.rotation.y = anim.startRotY + angleDiff * Math.min(progress * 1.5, 1.0);
      }

      if (progress >= 1.0) {
        anim.pieceObj.group.position.copy(anim.endPos);
        if (anim.hasRotation) {
          anim.pieceObj.clone.rotation.y = anim.targetRotY;
        }
        if (anim.onComplete) anim.onComplete();
        this.animatingPieces.splice(i, 1);
      }
    }

    this.controls.update();

    if (this.composer && this.graphicQuality !== 'medium') {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    this.isDisposed = true;
    window.removeEventListener('resize', this.onResize);
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
      this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}

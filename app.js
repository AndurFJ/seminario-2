/**
 * ============================================================================
 * PITCH DECK 3D INTERACTIVO: VIGILANCIA DE FAUNA Y RIESGOS EN TIEMPO REAL
 * Motor Gráfico: Three.js (r128) · Orquestador de Animación: Anime.js (v3.2.1)
 * Convocatoria: ColombIA Inteligente 2026 · MinCiencias / FONCIENCIAS
 * Entidad: Universidad del Magdalena (Grupo GISTIC)
 * ============================================================================
 */

// Estado global de la aplicación
const AppState = {
  activeSlideIndex: 0,
  totalSlides: 5,
  isTransitioning: false
};

// Variables principales de Three.js
let scene, camera, renderer;
let terrainMesh, terrainWireMat;
let bioPointCloud, bioPointMat, bioPointCoords;
let splitLeftPoints, splitRightPoints;
let pipelineNodesGroup, pulseBeamLine;
let radarRingsGroup;

// LookAt objetivo para la interpolación de cámara
const cameraLookTarget = new THREE.Vector3(0, 0, 0);
const cameraCurrentLook = new THREE.Vector3(0, 0, 0);

// Waypoints cinemáticos por diapositiva
const CAMERA_WAYPOINTS = [
  // Slide 1: Portada (Visión amplia panorámica)
  { pos: { x: 0, y: 18, z: 40 }, look: { x: 0, y: 0, z: 0 }, terrainColor: 0x00ff88, fogColor: 0x06090c },
  // Slide 2: Cuello de botella (Descenso a nivel de suelo, alerta ámbar)
  { pos: { x: -16, y: 5.5, z: 22 }, look: { x: -4, y: 1, z: -5 }, terrainColor: 0xffb300, fogColor: 0x161008 },
  // Slide 3: Pipeline técnico (Perspectiva axonométrica sobre el haz de datos)
  { pos: { x: 16, y: 16, z: 30 }, look: { x: 2, y: 2, z: 0 }, terrainColor: 0x00ff88, fogColor: 0x06090c },
  // Slide 4: Matriz comparativa (Frontal elevada para visión dual arcaico vs inteligente)
  { pos: { x: 0, y: 9, z: 30 }, look: { x: 0, y: -1, z: 0 }, terrainColor: 0x00e5ff, fogColor: 0x06090c },
  // Slide 5: Territorio y equipo (Cenital amplia con anillos de radiofrecuencia radiales)
  { pos: { x: 0, y: 34, z: 26 }, look: { x: 0, y: -4, z: -4 }, terrainColor: 0x00ff88, fogColor: 0x06090c }
];

/**
 * Inicialización del Lienzo WebGL y Escena Three.js
 */
function initWebGL() {
  const container = document.getElementById('canvas-container');

  // 1. Escena y Niebla Exponencial
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x06090c, 0.022);

  // 2. Cámara de Perspectiva Táctica (55°)
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 1000);
  camera.position.set(CAMERA_WAYPOINTS[0].pos.x, CAMERA_WAYPOINTS[0].pos.y, CAMERA_WAYPOINTS[0].pos.z);
  cameraLookTarget.set(CAMERA_WAYPOINTS[0].look.x, CAMERA_WAYPOINTS[0].look.y, CAMERA_WAYPOINTS[0].look.z);
  cameraCurrentLook.copy(cameraLookTarget);
  camera.lookAt(cameraCurrentLook);

  // 3. Renderizador WebGL con Suavizado
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  // 4. Luces Ambientales
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x00e5ff, 0.6);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);

  // 5. Construcción de Objetos en Escena
  createProceduralTerrain();
  createBioacousticParticles();
  createPipeline3DVisualization();
  createSplitComparisonParticles();
  createRadarCoverageRings();

  // 6. Listeners de Ventana
  window.addEventListener('resize', handleResize);

  // 7. Arrancar bucle de animación a 60 FPS
  requestAnimationFrame(renderLoop);
}

/**
 * Terreno Procedural 3D: Gradiente Sierra Nevada de Santa Marta -> Isla de Salamanca
 */
function createProceduralTerrain() {
  const width = 140;
  const depth = 140;
  const segments = 60;

  const geo = new THREE.PlaneGeometry(width, depth, segments, segments);
  const pos = geo.attributes.position;

  // Algoritmo de deformación: picos montañosos escarpados al noreste descendiendo a planicie costera
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    // Gradiente de inclinación continental
    const continentalGradient = (x + y) * 0.08;
    // Olas topográficas de la Sierra Nevada
    const peaks = Math.sin(x * 0.11) * Math.cos(y * 0.11) * 6.5;
    // Detalle de lomas y cañadas
    const ridges = Math.sin(x * 0.045) * Math.cos(y * 0.045) * 8.0;
    // Factor de costa plana
    const elevation = Math.max(-5.0, peaks + ridges + continentalGradient);

    pos.setZ(i, elevation);
  }

  geo.computeVertexNormals();

  terrainWireMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    wireframe: true,
    transparent: true,
    opacity: 0.20
  });

  terrainMesh = new THREE.Mesh(geo, terrainWireMat);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.position.y = -8.5;
  scene.add(terrainMesh);
}

/**
 * Nube de Partículas Bioacústicas / Niebla de Humedad
 */
function createBioacousticParticles() {
  const count = 1100;
  const geo = new THREE.BufferGeometry();
  bioPointCoords = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i += 3) {
    bioPointCoords[i] = (Math.random() - 0.5) * 120;
    bioPointCoords[i + 1] = Math.random() * 32 - 4;
    bioPointCoords[i + 2] = (Math.random() - 0.5) * 120;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(bioPointCoords, 3));

  bioPointMat = new THREE.PointsMaterial({
    color: 0x00e5ff,
    size: 0.28,
    transparent: true,
    opacity: 0.55
  });

  bioPointCloud = new THREE.Points(geo, bioPointMat);
  scene.add(bioPointCloud);
}

/**
 * Slide 3: Visualización 3D del Haz de Datos y Nodos del Pipeline
 */
function createPipeline3DVisualization() {
  pipelineNodesGroup = new THREE.Group();

  const nodePositions = [
    new THREE.Vector3(-14, 2, -2),  // Fase 1: Sensado
    new THREE.Vector3(-5, 4.5, 3),   // Fase 2: TinyML Core
    new THREE.Vector3(5, 5, 0),     // Fase 3: LoRaWAN Sub-GHz
    new THREE.Vector3(15, 3, -3)    // Fase 4: Consola Central
  ];

  const nodeColors = [0x00e5ff, 0x00ff88, 0x00e5ff, 0x00ff88];

  // Crear esferas de nodos interactivos
  nodePositions.forEach((pos, idx) => {
    const sphereGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: nodeColors[idx],
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(pos);
    pipelineNodesGroup.add(sphere);

    // Anillo exterior decorativo
    const ringGeo = new THREE.RingGeometry(0.9, 1.1, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: nodeColors[idx],
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.rotation.x = Math.PI / 3;
    pipelineNodesGroup.add(ring);
  });

  // Haz de luz / Curva que conecta las cuatro fases
  const curve = new THREE.CatmullRomCurve3(nodePositions);
  const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.12, 8, false);
  const tubeMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.75,
    wireframe: true
  });
  pulseBeamLine = new THREE.Mesh(tubeGeo, tubeMat);
  pipelineNodesGroup.add(pulseBeamLine);

  pipelineNodesGroup.visible = false;
  scene.add(pipelineNodesGroup);
}

/**
 * Slide 4: Partículas Divididas (Izquierda Roja/Lenta vs Derecha Cian-Verde/Rápida)
 */
function createSplitComparisonParticles() {
  const halfCount = 350;

  // Lado Izquierdo: Falla Arcaica (Rojo / Ambar lento)
  const leftGeo = new THREE.BufferGeometry();
  const leftPos = new Float32Array(halfCount * 3);
  for (let i = 0; i < halfCount * 3; i += 3) {
    leftPos[i] = -Math.random() * 40 - 2; // X < 0
    leftPos[i + 1] = Math.random() * 20 - 2;
    leftPos[i + 2] = (Math.random() - 0.5) * 50;
  }
  leftGeo.setAttribute('position', new THREE.BufferAttribute(leftPos, 3));
  const leftMat = new THREE.PointsMaterial({
    color: 0xff3b30,
    size: 0.35,
    transparent: true,
    opacity: 0.65
  });
  splitLeftPoints = new THREE.Points(leftGeo, leftMat);
  splitLeftPoints.visible = false;
  scene.add(splitLeftPoints);

  // Lado Derecho: Sistema Inteligente Edge AI (Cian y Esmeralda rápido)
  const rightGeo = new THREE.BufferGeometry();
  const rightPos = new Float32Array(halfCount * 3);
  for (let i = 0; i < halfCount * 3; i += 3) {
    rightPos[i] = Math.random() * 40 + 2; // X > 0
    rightPos[i + 1] = Math.random() * 20 - 2;
    rightPos[i + 2] = (Math.random() - 0.5) * 50;
  }
  rightGeo.setAttribute('position', new THREE.BufferAttribute(rightPos, 3));
  const rightMat = new THREE.PointsMaterial({
    color: 0x00ff88,
    size: 0.35,
    transparent: true,
    opacity: 0.75
  });
  splitRightPoints = new THREE.Points(rightGeo, rightMat);
  splitRightPoints.visible = false;
  scene.add(splitRightPoints);
}

/**
 * Slide 5: Anillos Concéntricos de Cobertura Radioeléctrica LoRaWAN 915 MHz
 */
function createRadarCoverageRings() {
  radarRingsGroup = new THREE.Group();

  const ringRadii = [8, 16, 25, 36, 48];
  ringRadii.forEach((radius, idx) => {
    const ringGeo = new THREE.RingGeometry(radius - 0.18, radius + 0.18, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25 - idx * 0.035
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -6.8;
    radarRingsGroup.add(ringMesh);
  });

  radarRingsGroup.visible = false;
  scene.add(radarRingsGroup);
}

/**
 * Bucle Principal de Renderizado (60 FPS)
 */
function renderLoop(timestamp) {
  requestAnimationFrame(renderLoop);

  const time = timestamp * 0.001;

  // 1. Rotación lenta y majestuosa del terreno
  if (terrainMesh) {
    terrainMesh.rotation.z += 0.00035;
  }

  // 2. Movimiento orgánico de la nube bioacústica
  if (bioPointCloud) {
    bioPointCloud.rotation.y += 0.0005;
    const positions = bioPointCloud.geometry.attributes.position.array;
    for (let i = 1; i < positions.length; i += 3) {
      // Oscilación suave en altura simulando brisa selvática
      positions[i] += Math.sin(time + positions[i - 1] * 0.05) * 0.012;
    }
    bioPointCloud.geometry.attributes.position.needsUpdate = true;
  }

  // 3. Animación de elementos específicos de la diapositiva
  if (pipelineNodesGroup && pipelineNodesGroup.visible) {
    pipelineNodesGroup.rotation.y = Math.sin(time * 0.5) * 0.08;
    if (pulseBeamLine) {
      pulseBeamLine.material.opacity = 0.55 + Math.sin(time * 4) * 0.3;
    }
  }

  if (splitLeftPoints && splitLeftPoints.visible) {
    // Flujo errático lento a la izquierda
    splitLeftPoints.rotation.y += 0.0002;
  }

  if (splitRightPoints && splitRightPoints.visible) {
    // Flujo acelerado a la derecha
    splitRightPoints.rotation.y += 0.0022;
  }

  if (radarRingsGroup && radarRingsGroup.visible) {
    radarRingsGroup.children.forEach((ring, idx) => {
      ring.scale.setScalar(1 + Math.sin(time * 1.5 + idx * 0.8) * 0.04);
    });
  }

  // 4. Actualizar orientación de la cámara
  camera.lookAt(cameraCurrentLook);

  // 5. Renderizar escena
  renderer.render(scene, camera);
}

/**
 * Adaptabilidad a Redimensión de Pantalla
 */
function handleResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Transición Cinemática de Cámara y Ambiente 3D por Diapositiva
 */
function transition3DScene(slideIndex) {
  const wp = CAMERA_WAYPOINTS[slideIndex];

  // 1. Cinemática de Posición de Cámara
  anime({
    targets: camera.position,
    x: wp.pos.x,
    y: wp.pos.y,
    z: wp.pos.z,
    duration: 1600,
    easing: 'easeInOutCubic'
  });

  // 2. Cinemática del Punto Focal (LookAt)
  anime({
    targets: cameraCurrentLook,
    x: wp.look.x,
    y: wp.look.y,
    z: wp.look.z,
    duration: 1600,
    easing: 'easeInOutCubic'
  });

  // 3. Transición de Color del Terreno
  const targetTerrainColor = new THREE.Color(wp.terrainColor);
  anime({
    targets: terrainWireMat.color,
    r: targetTerrainColor.r,
    g: targetTerrainColor.g,
    b: targetTerrainColor.b,
    duration: 1200,
    easing: 'easeInOutQuad'
  });

  // 4. Transición de Niebla
  const targetFogColor = new THREE.Color(wp.fogColor);
  anime({
    targets: scene.fog.color,
    r: targetFogColor.r,
    g: targetFogColor.g,
    b: targetFogColor.b,
    duration: 1200,
    easing: 'easeInOutQuad'
  });

  // 5. Encendido/Apagado de Capas 3D Específicas
  if (pipelineNodesGroup) pipelineNodesGroup.visible = (slideIndex === 2);
  if (splitLeftPoints && splitRightPoints) {
    const isSplit = (slideIndex === 3);
    splitLeftPoints.visible = isSplit;
    splitRightPoints.visible = isSplit;
  }
  if (radarRingsGroup) radarRingsGroup.visible = (slideIndex === 4);

  // Cambio de color de partículas bioacústicas en Slide 2 (Alerta higrotérmica)
  if (bioPointMat) {
    const pColor = (slideIndex === 1) ? new THREE.Color(0xffb300) : new THREE.Color(0x00e5ff);
    anime({
      targets: bioPointMat.color,
      r: pColor.r,
      g: pColor.g,
      b: pColor.b,
      duration: 1000,
      easing: 'easeInOutQuad'
    });
  }
}

/**
 * Activación de Diapositivas HUD e Interfaz
 */
function activateSlide(index) {
  if (index < 0 || index >= AppState.totalSlides) return;
  AppState.activeSlideIndex = index;

  const slides = document.querySelectorAll('.slide-card');
  const dots = document.querySelectorAll('.slide-dot');
  const counterLabel = document.getElementById('slideCounter');

  slides.forEach((card, i) => {
    if (i === index) {
      card.classList.add('active');

      // Animación de entrada fluida de la tarjeta HUD
      const cardGlass = card.querySelector('.card-glass');
      if (cardGlass) {
        anime({
          targets: cardGlass,
          opacity: [0, 1],
          translateY: [24, 0],
          scale: [0.985, 1],
          duration: 650,
          easing: 'easeOutCubic'
        });
      }

      // Si es la diapositiva 2, animar los contadores numéricos
      if (index === 1) {
        animateMetricCounters();
      }
    } else {
      card.classList.remove('active');
    }
  });

  // Actualizar dots de navegación rápida
  dots.forEach((dot, i) => {
    if (i === index) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Actualizar etiqueta del contador
  if (counterLabel) {
    counterLabel.textContent = `SLIDE 0${index + 1} / 0${AppState.totalSlides}`;
  }

  // Sincronizar escena 3D Three.js
  transition3DScene(index);
}

/**
 * Animación fluida de contadores numéricos (Slide 2)
 */
function animateMetricCounters() {
  const counters = document.querySelectorAll('#slide-1 .counter');
  counters.forEach(el => {
    const target = parseFloat(el.getAttribute('data-target'));
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';

    anime({
      targets: { val: 0 },
      val: target,
      round: 1,
      duration: 1600,
      easing: 'easeOutExpo',
      update: function(anim) {
        const current = Math.floor(anim.animatables[0].target.val);
        el.textContent = `${prefix}${current}${suffix}`;
      }
    });
  });
}

/**
 * Configuración de Eventos de Teclado, Clics y Gestos
 */
function setupEventListeners() {
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const dots = document.querySelectorAll('.slide-dot');

  // Botón Siguiente
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (AppState.activeSlideIndex < AppState.totalSlides - 1) {
        activateSlide(AppState.activeSlideIndex + 1);
      }
    });
  }

  // Botón Anterior
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (AppState.activeSlideIndex > 0) {
        activateSlide(AppState.activeSlideIndex - 1);
      }
    });
  }

  // Puntos interactivos
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetIdx = parseInt(dot.getAttribute('data-target-slide'), 10);
      activateSlide(targetIdx);
    });
  });

  // Control por Teclado: Flecha Derecha, Espacio, Flecha Izquierda
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (AppState.activeSlideIndex < AppState.totalSlides - 1) {
        activateSlide(AppState.activeSlideIndex + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (AppState.activeSlideIndex > 0) {
        activateSlide(AppState.activeSlideIndex - 1);
      }
    }
  });

  // Soporte para gestos táctiles (Swipe en móviles y pantallas táctiles)
  let touchStartX = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff < 0 && AppState.activeSlideIndex < AppState.totalSlides - 1) {
        activateSlide(AppState.activeSlideIndex + 1);
      } else if (diff > 0 && AppState.activeSlideIndex > 0) {
        activateSlide(AppState.activeSlideIndex - 1);
      }
    }
  }, { passive: true });
}

// Inicialización automática una vez cargado el DOM
window.addEventListener('DOMContentLoaded', () => {
  initWebGL();
  setupEventListeners();
  activateSlide(0);
});

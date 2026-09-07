(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function supportsWebGL() {
    try {
      var canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }

  var heroVisual = document.getElementById('hero-visual');
  var container = document.getElementById('hero-3d');
  var canvas = document.getElementById('hero-3d-canvas');
  var labelsWrap = document.getElementById('hero-3d-labels');

  if (prefersReducedMotion || !supportsWebGL() || !heroVisual || !container || !canvas) {
    return;
  }

  // Enable 3D mode: CSS hides the static SVG diagram and shows this canvas.
  heroVisual.classList.add('hero-visual--3d');

  var NODES = [
    { key: 'query', label: 'User Query', color: 0x22d3ee, angle: 90, lift: 0.55 },
    { key: 'retrieve', label: 'Retrieval', color: 0x38bdf8, angle: 150, lift: -0.2 },
    { key: 'act', label: 'Agents', color: 0x818cf8, angle: 30, lift: -0.2 },
    { key: 'memory', label: 'Memory', color: 0xa78bfa, angle: 210, lift: -0.45 },
    { key: 'guard', label: 'Guardrails', color: 0xc084fc, angle: 330, lift: -0.45 },
    { key: 'tools', label: 'MCP Tools', color: 0x38bdf8, angle: 270, lift: -0.65 },
  ];

  var RING_RADIUS = 2.5;

  function makeGlowTexture() {
    var size = 128;
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    var ctx = c.getContext('2d');
    var gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    var texture = new THREE.CanvasTexture(c);
    return texture;
  }

  var glowTexture = makeGlowTexture();

  function makeGlowSprite(color, scale) {
    var material = new THREE.SpriteMaterial({
      map: glowTexture,
      color: color,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    var sprite = new THREE.Sprite(material);
    sprite.scale.set(scale, scale, 1);
    return sprite;
  }

  // ---- Scene setup ----
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.3, 7.2);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(0x000000, 0);

  var rig = new THREE.Group();
  scene.add(rig);

  // Planner core
  var coreGroup = new THREE.Group();
  var coreWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 1),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.85 })
  );
  var coreSolid = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 0),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.9 })
  );
  var coreGlow = makeGlowSprite(0x818cf8, 4.2);
  coreGroup.add(coreGlow, coreSolid, coreWire);
  rig.add(coreGroup);

  // Ring group holding orbiting nodes, connections, traveling particles
  var ring = new THREE.Group();
  ring.rotation.x = -0.35;
  rig.add(ring);

  var nodeMeshes = [];
  var travelers = [];

  NODES.forEach(function (node, i) {
    var rad = (node.angle * Math.PI) / 180;
    var pos = new THREE.Vector3(
      Math.cos(rad) * RING_RADIUS,
      node.lift,
      Math.sin(rad) * RING_RADIUS
    );

    // Connection line (core -> node), vertex-colored cyan -> node color
    var lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), pos]);
    var startColor = new THREE.Color(0x38bdf8);
    var endColor = new THREE.Color(node.color);
    lineGeom.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(
        [startColor.r, startColor.g, startColor.b, endColor.r, endColor.g, endColor.b],
        3
      )
    );
    var line = new THREE.Line(
      lineGeom,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 })
    );
    ring.add(line);

    // Node gem
    var gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshBasicMaterial({ color: node.color })
    );
    gem.position.copy(pos);
    var gemGlow = makeGlowSprite(node.color, 1.3);
    gemGlow.position.copy(pos);
    ring.add(gem, gemGlow);
    nodeMeshes.push({ mesh: gem, label: node.label });

    // Traveling particle along the connection
    var traveler = makeGlowSprite(node.color, 0.4);
    ring.add(traveler);
    travelers.push({
      sprite: traveler,
      target: pos,
      speed: 0.28 + i * 0.05,
      offset: i / NODES.length,
    });
  });

  // Ambient starfield
  var starCount = window.innerWidth < 640 ? 90 : 180;
  var starGeom = new THREE.BufferGeometry();
  var starPositions = new Float32Array(starCount * 3);
  for (var s = 0; s < starCount; s++) {
    var r = 8 + Math.random() * 10;
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(Math.random() * 2 - 1);
    starPositions[s * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[s * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[s * 3 + 2] = r * Math.cos(phi);
  }
  starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  var starField = new THREE.Points(
    starGeom,
    new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.035, transparent: true, opacity: 0.55 })
  );
  scene.add(starField);

  // ---- Labels ----
  var labelEls = nodeMeshes.map(function (n) {
    var el = document.createElement('span');
    el.className = 'hero3d-label';
    el.textContent = n.label;
    labelsWrap.appendChild(el);
    return el;
  });

  var projected = new THREE.Vector3();

  function updateLabels(width, height) {
    nodeMeshes.forEach(function (n, i) {
      n.mesh.updateWorldMatrix(true, false);
      projected.setFromMatrixPosition(n.mesh.matrixWorld);
      projected.project(camera);

      var el = labelEls[i];
      if (projected.z > 1) {
        el.classList.remove('is-visible');
        return;
      }
      var x = (projected.x * 0.5 + 0.5) * width;
      var y = (-projected.y * 0.5 + 0.5) * height;
      el.style.transform = 'translate(-50%, calc(-50% - 20px)) translate(' + x + 'px, ' + y + 'px)';
      el.classList.add('is-visible');
    });
  }

  // ---- Interaction: pointer parallax + drag-to-rotate ----
  var pointer = { x: 0, y: 0 };
  var dragging = false;
  var dragStart = { x: 0, y: 0 };
  var dragRotation = { x: 0, y: 0 };
  var dragRotationStart = { x: 0, y: 0 };
  var autoRotationY = 0;
  var currentTilt = { x: 0, y: 0 };

  function onPointerMove(e) {
    var rect = canvas.getBoundingClientRect();
    var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    var ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointer.x = nx;
    pointer.y = ny;

    if (dragging) {
      var dx = e.clientX - dragStart.x;
      var dy = e.clientY - dragStart.y;
      dragRotation.y = dragRotationStart.y + dx * 0.006;
      dragRotation.x = Math.max(-0.6, Math.min(0.6, dragRotationStart.x + dy * 0.006));
    }
  }

  function onPointerDown(e) {
    dragging = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    dragRotationStart.x = dragRotation.x;
    dragRotationStart.y = dragRotation.y;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  }

  function onPointerUp() {
    dragging = false;
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', function () {
    if (!dragging) {
      pointer.x = 0;
      pointer.y = 0;
    }
  });

  // ---- Resize ----
  function resize() {
    var rect = container.getBoundingClientRect();
    var width = rect.width || 1;
    var height = rect.width || 1; // square stage
    var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(container);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();

  // ---- Render loop, gated by visibility ----
  var clock = new THREE.Clock();
  var running = false;
  var rafId = null;

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);

    var dt = Math.min(clock.getDelta(), 0.05);
    var elapsed = clock.elapsedTime;

    autoRotationY += dt * 0.12;
    currentTilt.x += (pointer.y * 0.25 - currentTilt.x) * 0.05;
    currentTilt.y += (pointer.x * 0.35 - currentTilt.y) * 0.05;

    rig.rotation.y = autoRotationY + currentTilt.y + dragRotation.y;
    rig.rotation.x = currentTilt.x + dragRotation.x;

    coreGroup.rotation.y += dt * 0.25;
    coreGroup.rotation.x += dt * 0.12;

    travelers.forEach(function (t) {
      var progress = (elapsed * t.speed + t.offset) % 1;
      t.sprite.position.lerpVectors(new THREE.Vector3(0, 0, 0), t.target, progress);
      t.sprite.material.opacity = Math.sin(progress * Math.PI) * 0.9;
    });

    starField.rotation.y += dt * 0.01;

    renderer.render(scene, camera);

    var rect = container.getBoundingClientRect();
    updateLabels(rect.width, rect.width);
  }

  function start() {
    if (running) return;
    running = true;
    clock.start();
    frame();
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  if ('IntersectionObserver' in window) {
    var visibilityObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            start();
          } else {
            stop();
          }
        });
      },
      { threshold: 0.05 }
    );
    visibilityObserver.observe(container);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });
})();

(function () {
  'use strict';

  // Agent Run — planner-themed playable overlay unique to this portfolio
  var SCALE = 2;
  var PX_W = 14;
  var PX_H = 16;
  var AGENT_W = PX_W * SCALE;
  var AGENT_H = PX_H * SCALE;
  var GRAVITY = 0.24;
  var JUMP_FORCE = -6.8;
  var DOUBLE_JUMP_FORCE = -6.2;
  var DASH_SPEED = 7.2;
  var DASH_FRAMES = 10;
  var MAX_SPEED = 2.05;
  var FRICTION = 0.8;
  var BLOCK_H = 9;
  var SPAWN_INTERVAL = 18;
  var TOKEN_COUNT = 5;
  var FALL_FAIL_DIST = 240;
  var FALL_FAIL_FRAMES = 55;
  var STORAGE_KEY = 'az-agent-run-best';

  var TOKEN_LABELS = [
    'retrieve',
    'plan',
    'tool-call',
    'memory',
    'guardrail',
  ];

  var PLATFORM_SELECTORS = [
    '.section-title',
    '.hero-name',
    '.project-card h3',
    '.experience-card h3',
    '.timeline-item h3',
    '.publication-card h3',
    '.contact-card strong',
  ];

  var toggleFixed = document.getElementById('game-toggle-fixed');
  var toggleBtn = document.getElementById('game-toggle-btn');
  var infoBtn = document.getElementById('game-info-btn');
  var infoPanel = document.getElementById('game-info-panel');
  var canvas = document.getElementById('robot-game-canvas');
  var counter = document.getElementById('cell-counter');
  var counterText = document.getElementById('cell-counter-text');
  var statusEl = document.getElementById('game-status');
  var statusTitle = document.getElementById('game-status-title');
  var statusSub = document.getElementById('game-status-sub');
  var statusBtn = document.getElementById('game-status-btn');
  var statusHint = document.getElementById('game-status-hint');
  var toastEl = document.getElementById('agent-run-toast');

  if (!toggleBtn || !canvas) return;

  var prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  var isMobile = window.matchMedia('(max-width: 800px)').matches;

  if (isMobile || prefersReducedMotion) {
    if (toggleFixed) toggleFixed.hidden = true;
    return;
  }

  var active = false;
  var animId = null;
  var agent = null;
  var blocks = [];
  var tokens = [];
  var trails = [];
  var sparks = [];
  var keys = new Set();
  var jumpLatch = false;
  var dashLatch = false;
  var frame = 0;
  var tokensCollected = 0;
  var gameStatus = 'idle';
  var toastTimer = null;
  var ctx = canvas.getContext('2d');

  function getNavbarBottom() {
    var nav = document.querySelector('.nav');
    return nav ? nav.getBoundingClientRect().bottom : 72;
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('is-visible');
      window.setTimeout(function () {
        toastEl.hidden = true;
      }, 280);
    }, 1600);
  }

  function drawHex(cx, cy, r, fill, stroke) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i - Math.PI / 6;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawAgent(x, y, frameN, facing, dashing, jumping) {
    var bob = !jumping && Math.abs(agent.vx) < 0.2
      ? Math.sin(frameN * 0.08) * 1.2
      : 0;
    var cx = Math.round(x + AGENT_W / 2);
    var cy = Math.round(y + AGENT_H / 2 + bob);
    var spin = frameN * 0.08;

    ctx.save();

    // soft aura
    ctx.globalAlpha = dashing ? 0.4 : 0.2;
    var grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
    grd.addColorStop(0, '#38bdf8');
    grd.addColorStop(0.55, '#818cf8');
    grd.addColorStop(1, 'rgba(192,132,252,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // orbit ring (agentic topology)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    ctx.strokeStyle = 'rgba(56,189,248,0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // satellite nodes on the ring
    for (var i = 0; i < 3; i++) {
      var a = (Math.PI * 2 * i) / 3;
      var sx = Math.cos(a) * 13;
      var sy = Math.sin(a) * 13;
      ctx.fillStyle = i === 0 ? '#38bdf8' : i === 1 ? '#818cf8' : '#c084fc';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // planner core
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.stroke();

    // inner hub
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // routing chevron (faces movement direction)
    ctx.save();
    ctx.translate(cx, cy);
    if (facing < 0) ctx.scale(-1, 1);
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(3.5, 0);
    ctx.lineTo(-2.5, -3.5);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-2.5, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // MCP tool ports (left/right)
    ctx.fillStyle = '#818cf8';
    ctx.fillRect(cx - 12, cy - 1.5, 3, 3);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(cx + 9, cy - 1.5, 3, 3);

    // thruster burst when airborne / dashing
    if (jumping || dashing) {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = dashing ? '#22d3ee' : '#a78bfa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy + 10);
      ctx.quadraticCurveTo(
        cx,
        cy + 16 + (frameN % 5),
        cx + 3,
        cy + 10
      );
      ctx.stroke();
      ctx.fillStyle = dashing ? '#67e8f9' : '#c4b5fd';
      ctx.beginPath();
      ctx.arc(cx, cy + 12 + (frameN % 3), 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawLedger(bx, by, bw, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(bx + 2, by + BLOCK_H, bw - 2, 3);
    ctx.fillStyle = '#152033';
    ctx.fillRect(bx, by, bw, BLOCK_H);
    // circuit edge
    ctx.fillStyle = 'rgba(56,189,248,0.75)';
    ctx.fillRect(bx, by, bw, 2);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(129,140,248,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 4, by + 5);
    ctx.lineTo(bx + bw - 4, by + 5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(56,189,248,0.2)';
    ctx.fillRect(bx + 6, by + 3, 3, 3);
    ctx.fillRect(bx + bw - 12, by + 3, 3, 3);
    ctx.restore();
  }

  function drawPlanToken(ex, ey, scrollY, idx) {
    var sy = ey - scrollY;
    if (sy < -30 || sy > canvas.height + 30) return;

    var t = Date.now() * 0.0025 + idx * 1.7;
    var bob = Math.sin(t) * 3;
    var cx = Math.round(ex + 8);
    var cy = Math.round(sy + bob + 8);
    var pulse = 0.55 + 0.45 * Math.sin(t * 1.4);

    ctx.save();
    ctx.globalAlpha = 0.2 * pulse;
    drawHex(cx, cy, 16, '#818cf8', null);
    ctx.globalAlpha = 0.95;
    drawHex(cx, cy, 9, '#1e1b4b', '#a78bfa');
    drawHex(cx, cy, 4, '#38bdf8', null);

    // orbiting spark
    var ox = cx + Math.cos(t * 2) * 13;
    var oy = cy + Math.sin(t * 2) * 13;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(ox, oy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function spawnSpark(x, y, color) {
    for (var i = 0; i < 6; i++) {
      sparks.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 3.5,
        vy: (Math.random() - 0.5) * 3.5 - 1,
        life: 18 + Math.random() * 10,
        color: color || '#38bdf8',
      });
    }
  }

  function clearZone(docY, avoidZones) {
    var y = docY;
    for (var pass = 0; pass < 8; pass++) {
      var hit = avoidZones.find(function (z) {
        return y - 20 < z.bot && y + BLOCK_H + 4 > z.top;
      });
      if (!hit) break;
      y = hit.bot + 10;
    }
    return y;
  }

  function generateTokenLayout(nb, vw, avoidZones, pageHeight) {
    var cLeft = Math.max(0, (vw - 1000) / 2);
    var cRight = Math.min(vw - 40, cLeft + 1000);
    var usableBottom = Math.max(pageHeight - 200, nb + 4200);
    var span = usableBottom - (nb + 350);
    var yZones = [];
    for (var z = 0; z < TOKEN_COUNT; z++) {
      var start = nb + 350 + (span * z) / TOKEN_COUNT;
      var end = nb + 350 + (span * (z + 0.65)) / TOKEN_COUNT;
      yZones.push([start, Math.max(start + 120, end)]);
    }
    var xTiers = [
      50,
      Math.round(cLeft + 90),
      Math.round(vw / 2 - 20),
      Math.round(cRight - 180),
      Math.min(Math.round(vw * 0.88), vw - 100),
    ];
    var shuffled = xTiers.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }

    var outTokens = [];
    var extraLedges = [];
    function mk(x, docY, w) {
      return {
        x: x,
        docY: docY,
        w: w,
        isSpawn: false,
        alpha: 0,
        revealed: false,
      };
    }

    yZones.forEach(function (zone, zi) {
      var ledgeDocY = clearZone(
        zone[0] + Math.random() * (zone[1] - zone[0]),
        avoidZones
      );
      var tokenX = shuffled[zi];
      var approachY = ledgeDocY + 80;
      outTokens.push({
        x: tokenX,
        docY: ledgeDocY - 18,
        collected: false,
        label: TOKEN_LABELS[zi],
      });
      extraLedges.push(mk(tokenX - 8, ledgeDocY, 72));
      if (tokenX <= 230) return;
      var x = 230;
      var count = 0;
      var maxChain = tokenX > cRight - 20 ? 14 : 8;
      while (x + 80 < tokenX && count < maxChain) {
        extraLedges.push(mk(x, approachY, 68));
        x += 90;
        count += 1;
      }
    });

    return { tokens: outTokens, extraLedges: extraLedges };
  }

  function buildScatterBlocks(nb, pageHeight) {
    var blocksOut = [];
    var y = nb + 300;
    var step = 110;
    var pattern = [20, 120, 200, 110, 20, 130];
    var pi = 0;
    while (y < pageHeight - 160) {
      blocksOut.push({ x: pattern[pi % pattern.length], docY: y, w: 72 });
      y += step;
      pi += 1;
      if (pi % 3 === 0) y += 40;
    }
    return blocksOut;
  }

  function getPlatforms() {
    var scrollY = window.scrollY;
    var maxDomWidth = Math.min(320, window.innerWidth * 0.42);
    var platforms = blocks
      .filter(function (b) {
        return b.alpha > 0.5;
      })
      .map(function (b) {
        return { x: b.x, y: b.docY, w: b.w };
      });

    PLATFORM_SELECTORS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.width < 60 || r.height > 80 || r.height < 8) return;
        if (r.width > window.innerWidth * 0.7) return;
        var docTop = r.top + scrollY;
        if (
          docTop > scrollY + window.innerHeight + 240 ||
          docTop + r.height < scrollY - 240
        ) {
          return;
        }
        platforms.push({
          x: r.left,
          y: docTop,
          w: Math.min(r.width, maxDomWidth),
        });
      });
    });
    return platforms;
  }

  function followCamera() {
    if (!agent || agent.status !== 'playing') return;
    var scrollY = window.scrollY;
    var viewH = window.innerHeight;
    var charScreenY = agent.docY - scrollY;
    var marginBottom = viewH * 0.38;
    var marginTop = viewH * 0.28;
    var maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - viewH
    );

    if (charScreenY > viewH - marginBottom) {
      window.scrollTo(
        0,
        Math.min(maxScroll, scrollY + (charScreenY - (viewH - marginBottom)))
      );
    } else if (charScreenY < marginTop && scrollY > 0) {
      window.scrollTo(0, Math.max(0, scrollY - (marginTop - charScreenY)));
    }
  }

  function updateCounter() {
    if (counterText) {
      counterText.textContent =
        tokensCollected + ' / ' + TOKEN_COUNT + ' tokens';
    }
  }

  function showStatus(kind, title, sub, hint) {
    gameStatus = kind;
    statusEl.hidden = false;
    statusEl.classList.toggle('is-won', kind === 'won');
    statusEl.classList.toggle('is-dead', kind === 'dead');
    statusTitle.textContent = title;
    statusSub.textContent = sub;
    statusHint.textContent = hint || '';
  }

  function hideStatus() {
    statusEl.hidden = true;
    statusEl.classList.remove('is-won', 'is-dead');
  }

  function saveBest() {
    try {
      var best = Number(localStorage.getItem(STORAGE_KEY) || 0);
      if (tokensCollected > best) {
        localStorage.setItem(STORAGE_KEY, String(tokensCollected));
      }
    } catch (err) {
      /* ignore */
    }
  }

  function stopLoop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  function startGame() {
    stopLoop();
    hideStatus();
    window.scrollTo(0, 0);

    canvas.hidden = false;
    counter.hidden = false;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var nb = getNavbarBottom();
    var pageHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      window.innerHeight * 4
    );
    frame = 0;
    tokensCollected = 0;
    jumpLatch = false;
    dashLatch = false;
    trails = [];
    sparks = [];
    keys.clear();
    updateCounter();
    showToast('agent deployed · recover plan tokens');

    var allDomZones = [];
    var textZones = [];
    PLATFORM_SELECTORS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.width < 60 || r.height < 4) return;
        if (r.width > window.innerWidth * 0.7) return;
        allDomZones.push({
          top: r.top + window.scrollY - 4,
          bot: r.bottom + window.scrollY + 4,
        });
        if (r.height <= 55) {
          textZones.push({
            top: r.top + window.scrollY - 4,
            bot: r.bottom + window.scrollY + 4,
          });
        }
      });
    });

    function adjustForText(docY) {
      var y = docY;
      for (var i = 0; i < 4; i++) {
        var hit = textZones.find(function (z) {
          return y < z.bot && y + BLOCK_H > z.top;
        });
        if (!hit) break;
        y = hit.bot + 5;
      }
      return y;
    }

    var layout = generateTokenLayout(nb, canvas.width, allDomZones, pageHeight);
    tokens = layout.tokens;

    function mkS(b) {
      return {
        x: b.x,
        docY: b.docY,
        w: b.w,
        isSpawn: false,
        alpha: 0,
        revealed: false,
      };
    }

    var rawScatter = buildScatterBlocks(nb, pageHeight);

    blocks = [
      {
        x: 30,
        docY: nb + 200,
        w: 80,
        isSpawn: true,
        spawnIdx: 0,
        alpha: 0,
        revealed: false,
      },
      {
        x: 170,
        docY: nb + 155,
        w: 76,
        isSpawn: true,
        spawnIdx: 1,
        alpha: 0,
        revealed: false,
      },
      {
        x: 315,
        docY: nb + 235,
        w: 76,
        isSpawn: true,
        spawnIdx: 2,
        alpha: 0,
        revealed: false,
      },
      {
        x: 450,
        docY: nb + 175,
        w: 76,
        isSpawn: true,
        spawnIdx: 3,
        alpha: 0,
        revealed: false,
      },
    ]
      .concat(
        rawScatter.map(function (b) {
          return mkS({ x: b.x, docY: adjustForText(b.docY), w: b.w });
        })
      )
      .concat(layout.extraLedges);

    var b0 = blocks[0];
    agent = {
      x: Math.round(b0.x + b0.w / 2 - AGENT_W / 2),
      docY: b0.docY - AGENT_H - 280,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      frame: 0,
      status: 'playing',
      spawning: true,
      bounces: 0,
      jumpsLeft: 2,
      dashTimer: 0,
      dashCooldown: 0,
      fallDist: 0,
      fallFrames: 0,
    };
    gameStatus = 'playing';
    animId = requestAnimationFrame(loop);
  }

  function endGame() {
    stopLoop();
    canvas.hidden = true;
    counter.hidden = true;
    hideStatus();
    if (toastEl) {
      toastEl.hidden = true;
      toastEl.classList.remove('is-visible');
    }
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    agent = null;
    blocks = [];
    tokens = [];
    trails = [];
    sparks = [];
    keys.clear();
    gameStatus = 'idle';
  }

  function loop() {
    if (!agent || agent.status !== 'playing') return;

    if (canvas.width !== window.innerWidth) canvas.width = window.innerWidth;
    if (canvas.height !== window.innerHeight) canvas.height = window.innerHeight;

    frame += 1;

    if (agent.spawning) {
      agent.vy = Math.min(agent.vy + GRAVITY, 8);
      agent.docY += agent.vy;
      agent.frame += 1;

      var b = blocks[0];
      if (b.alpha > 0.5) {
        var rBot = agent.docY + AGENT_H;
        var prev = rBot - agent.vy;
        if (
          agent.x + AGENT_W > b.x &&
          agent.x < b.x + b.w &&
          prev <= b.docY + 4 &&
          rBot >= b.docY &&
          agent.vy > 0
        ) {
          agent.docY = b.docY - AGENT_H;
          agent.bounces += 1;
          if (agent.bounces === 1) agent.vy = -4.2;
          else if (agent.bounces === 2) agent.vy = -1.6;
          else {
            agent.vy = 0;
            agent.onGround = true;
            agent.spawning = false;
            agent.jumpsLeft = 2;
            showToast('planner online');
          }
        }
      }
    } else {
      var left = keys.has('ArrowLeft') || keys.has('KeyA');
      var right = keys.has('ArrowRight') || keys.has('KeyD');
      var jump =
        keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW');
      var dash = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyE');

      if (agent.dashTimer > 0) {
        agent.dashTimer -= 1;
        agent.vx = agent.facing * DASH_SPEED;
        agent.vy *= 0.4;
      } else {
        if (left) {
          agent.vx = Math.max(agent.vx - 0.34, -MAX_SPEED);
          agent.facing = -1;
        } else if (right) {
          agent.vx = Math.min(agent.vx + 0.34, MAX_SPEED);
          agent.facing = 1;
        } else {
          agent.vx *= FRICTION;
        }

        if (dash && !dashLatch && agent.dashCooldown <= 0) {
          agent.dashTimer = DASH_FRAMES;
          agent.dashCooldown = 40;
          dashLatch = true;
          spawnSpark(
            agent.x + AGENT_W / 2,
            agent.docY + AGENT_H / 2,
            '#22d3ee'
          );
          showToast('dash');
        }
        if (!dash) dashLatch = false;
        if (agent.dashCooldown > 0) agent.dashCooldown -= 1;

        if (jump && !jumpLatch && agent.jumpsLeft > 0) {
          agent.vy =
            agent.jumpsLeft === 2 ? JUMP_FORCE : DOUBLE_JUMP_FORCE;
          agent.onGround = false;
          agent.jumpsLeft -= 1;
          jumpLatch = true;
          if (agent.jumpsLeft === 0) {
            spawnSpark(
              agent.x + AGENT_W / 2,
              agent.docY + AGENT_H,
              '#818cf8'
            );
          }
        }
        if (!jump) jumpLatch = false;
      }

      agent.vy = Math.min(agent.vy + GRAVITY, 8.5);
      agent.x += agent.vx;
      agent.docY += agent.vy;
      agent.frame += 1;

      if (Math.abs(agent.vx) > 0.4 || agent.dashTimer > 0) {
        trails.push({
          x: agent.x + AGENT_W / 2,
          y: agent.docY + AGENT_H / 2,
          life: 12,
        });
      }
      if (trails.length > 40) trails.shift();

      if (agent.x < 0) {
        agent.x = 0;
        agent.vx = 0;
      }
      if (agent.x + AGENT_W > canvas.width) {
        agent.x = canvas.width - AGENT_W;
        agent.vx = 0;
      }

      var platforms = getPlatforms();
      agent.onGround = false;
      for (var i = 0; i < platforms.length; i++) {
        var p = platforms[i];
        var bot = agent.docY + AGENT_H;
        var prevBot = bot - agent.vy;
        if (
          agent.x + AGENT_W > p.x + 2 &&
          agent.x < p.x + p.w - 2 &&
          prevBot <= p.y + 5 &&
          bot >= p.y - 1 &&
          agent.vy >= 0
        ) {
          agent.docY = p.y - AGENT_H;
          agent.vy = 0;
          agent.onGround = true;
          agent.jumpsLeft = 2;
          agent.fallDist = 0;
          agent.fallFrames = 0;
          break;
        }
      }

      if (!agent.onGround && agent.vy > 0) {
        agent.fallDist += agent.vy;
        agent.fallFrames += 1;
      } else if (agent.onGround) {
        agent.fallDist = 0;
        agent.fallFrames = 0;
      }

      var fellOffMap =
        agent.docY > document.documentElement.scrollHeight + 80;
      var fellTooLong =
        agent.fallDist >= FALL_FAIL_DIST || agent.fallFrames >= FALL_FAIL_FRAMES;

      if (fellOffMap || fellTooLong) {
        agent.status = 'dead';
        saveBest();
        showStatus(
          'dead',
          'routing failed',
          'planner lost the execution path',
          'press space to redeploy'
        );
        return;
      }

      var aCx = agent.x + AGENT_W / 2;
      var aCy = agent.docY + AGENT_H / 2;
      tokens.forEach(function (token) {
        if (token.collected) return;
        var cCx = token.x + 8;
        var cCy = token.docY + 8;
        if (Math.abs(aCx - cCx) < 26 && Math.abs(aCy - cCy) < 28) {
          token.collected = true;
          tokensCollected += 1;
          updateCounter();
          spawnSpark(cCx, cCy, '#a78bfa');
          showToast('token locked · ' + token.label);
        }
      });

      if (
        tokens.length > 0 &&
        tokens.every(function (t) {
          return t.collected;
        })
      ) {
        agent.status = 'won';
        saveBest();
        showStatus(
          'won',
          'plan finalized',
          'all ' + TOKEN_COUNT + ' plan tokens recovered · topology valid',
          ''
        );
        return;
      }
    }

    followCamera();
    var scrollY = window.scrollY;

    blocks.forEach(function (blk) {
      if (!blk.revealed) {
        if (blk.isSpawn) {
          if (frame >= blk.spawnIdx * SPAWN_INTERVAL) blk.revealed = true;
        } else if (blk.docY - scrollY < canvas.height + 80) {
          blk.revealed = true;
        }
      }
      if (blk.revealed && blk.alpha < 0.7) {
        blk.alpha = Math.min(blk.alpha + 0.05, 0.7);
      }
    });

    // update fx
    trails = trails
      .map(function (t) {
        return { x: t.x, y: t.y, life: t.life - 1 };
      })
      .filter(function (t) {
        return t.life > 0;
      });
    sparks = sparks
      .map(function (s) {
        return {
          x: s.x + s.vx,
          y: s.y + s.vy,
          vx: s.vx * 0.96,
          vy: s.vy + 0.12,
          life: s.life - 1,
          color: s.color,
        };
      })
      .filter(function (s) {
        return s.life > 0;
      });

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    blocks.forEach(function (blk) {
      if (blk.alpha <= 0) return;
      var sy = blk.docY - scrollY;
      if (sy > -BLOCK_H - 4 && sy < canvas.height + 4) {
        drawLedger(blk.x, sy, blk.w, blk.alpha);
      }
    });

    tokens.forEach(function (token, idx) {
      if (!token.collected) drawPlanToken(token.x, token.docY, scrollY, idx);
    });

    trails.forEach(function (t) {
      var sy = t.y - scrollY;
      ctx.globalAlpha = t.life / 14;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(t.x, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    sparks.forEach(function (s) {
      var sy = s.y - scrollY;
      ctx.globalAlpha = Math.max(0, s.life / 20);
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, sy, 2, 2);
      ctx.globalAlpha = 1;
    });

    var syChar = agent.docY - scrollY;
    if (syChar > -AGENT_H && syChar < canvas.height + 40) {
      drawAgent(
        agent.x,
        syChar,
        agent.frame,
        agent.facing,
        agent.dashTimer > 0,
        !agent.onGround
      );
    }

    animId = requestAnimationFrame(loop);
  }

  function setActive(on) {
    active = on;
    toggleBtn.classList.toggle('is-on', on);
    toggleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    toggleBtn.title = on ? 'End Agent Run' : 'Start Agent Run';
    infoBtn.hidden = !on;
    if (!on) infoPanel.hidden = true;

    if (on) {
      try {
        startGame();
      } catch (err) {
        console.error('Agent Run failed to start', err);
        active = false;
        toggleBtn.classList.remove('is-on');
        toggleBtn.setAttribute('aria-pressed', 'false');
        infoBtn.hidden = true;
        endGame();
      }
    } else {
      endGame();
    }
  }

  toggleBtn.addEventListener('click', function () {
    setActive(!active);
  });

  infoBtn.addEventListener('mouseenter', function () {
    if (active) infoPanel.hidden = false;
  });
  infoBtn.addEventListener('mouseleave', function () {
    infoPanel.hidden = true;
  });
  infoBtn.addEventListener('click', function () {
    if (!active) return;
    infoPanel.hidden = !infoPanel.hidden;
  });

  statusBtn.addEventListener('click', function () {
    if (!active) return;
    startGame();
  });

  function onKeyDown(e) {
    if (!active) return;
    if (e.code === 'Space' && (gameStatus === 'dead' || gameStatus === 'won')) {
      e.preventDefault();
      startGame();
      return;
    }
    keys.add(e.code);
    if (
      [
        'Space',
        'ArrowUp',
        'ArrowLeft',
        'ArrowRight',
        'ArrowDown',
        'ShiftLeft',
        'ShiftRight',
      ].indexOf(e.code) !== -1
    ) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  window.addEventListener('resize', function () {
    if (!active) return;
    if (window.innerWidth <= 800) {
      setActive(false);
      return;
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
})();

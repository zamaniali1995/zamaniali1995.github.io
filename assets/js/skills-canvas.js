(function () {
  'use strict';

  var canvas = document.getElementById('skills-canvas');
  var section = document.getElementById('skills');
  if (!canvas || !section) return;

  var ctx = canvas.getContext('2d');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var COLORS = ['56, 189, 248', '129, 140, 248', '192, 132, 252'];
  var LINK_DISTANCE = 150;
  var NODE_COUNT_DENSITY = 18000; // px^2 per node

  var width = 0;
  var height = 0;
  var nodes = [];
  var running = false;
  var rafId = null;
  var pointer = { x: -9999, y: -9999 };

  function makeNodes() {
    var count = Math.min(70, Math.max(24, Math.round((width * height) / NODE_COUNT_DENSITY)));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1.2 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
      });
    }
  }

  function resize() {
    var rect = section.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    makeNodes();
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    drawLinks();
    nodes.forEach(drawNode);
  }

  function drawNode(node) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + node.color + ', 0.9)';
    ctx.fill();
  }

  function drawLinks() {
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i];
        var b = nodes[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DISTANCE) {
          var opacity = (1 - dist / LINK_DISTANCE) * 0.35;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = 'rgba(148, 163, 184, ' + opacity + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Faint link toward pointer for a subtle interactive touch
      var pdx = nodes[i].x - pointer.x;
      var pdy = nodes[i].y - pointer.y;
      var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < LINK_DISTANCE) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.strokeStyle = 'rgba(' + nodes[i].color + ', ' + ((1 - pdist / LINK_DISTANCE) * 0.4) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  function step() {
    if (!running) return;
    rafId = requestAnimationFrame(step);

    nodes.forEach(function (node) {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
      node.x = Math.max(0, Math.min(width, node.x));
      node.y = Math.max(0, Math.min(height, node.y));
    });

    ctx.clearRect(0, 0, width, height);
    drawLinks();
    nodes.forEach(drawNode);
  }

  function start() {
    if (running || prefersReducedMotion) return;
    running = true;
    step();
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      resize();
      if (prefersReducedMotion) drawStatic();
    }).observe(section);
  } else {
    window.addEventListener('resize', function () {
      resize();
      if (prefersReducedMotion) drawStatic();
    });
  }

  resize();
  drawStatic();

  section.addEventListener(
    'pointermove',
    function (e) {
      var rect = section.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    },
    { passive: true }
  );

  section.addEventListener('pointerleave', function () {
    pointer.x = -9999;
    pointer.y = -9999;
  });

  if (!prefersReducedMotion) {
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
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
      observer.observe(section);
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
  }
})();

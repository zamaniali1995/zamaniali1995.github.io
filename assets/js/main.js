(function () {
  'use strict';

  // Typed.js hero animation
  if (typeof Typed !== 'undefined') {
    new Typed('.typing', {
      strings: [
        'Machine Learning Engineer',
        'Agentic AI Engineer',
      ],
      loop: true,
      typeSpeed: 60,
      backSpeed: 35,
      backDelay: 1800,
    });
  }

  // Nav scroll effect
  const nav = document.querySelector('.nav');
  const navLinks = document.querySelectorAll('.nav-links a[data-section]');
  const sections = document.querySelectorAll('section[id]');

  function onScroll() {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }

    let current = '';
    sections.forEach(function (section) {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(function (link) {
      link.classList.remove('active');
      if (link.getAttribute('data-section') === current) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const toggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function () {
      mobileMenu.classList.toggle('open');
      const isOpen = mobileMenu.classList.contains('open');
      toggle.setAttribute('aria-expanded', isOpen);
      toggle.innerHTML = isOpen
        ? '<i class="fas fa-times"></i>'
        : '<i class="fas fa-bars"></i>';
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<i class="fas fa-bars"></i>';
      });
    });
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Stagger reveal delays for items grouped in the same grid/list
  document
    .querySelectorAll('.projects-grid, .skills-grid, .about-highlights, .publications-list, .education-grid, .contact-cards')
    .forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--stagger', i % 6);
      });
    });

  // Intersection Observer for reveal animations
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document
      .querySelectorAll('.timeline-item, .project-card, .fade-in')
      .forEach(function (el) {
        observer.observe(el);
      });
  }

  // Cursor-reactive ambient glow (desktop, fine-pointer only)
  const cursorGlow = document.getElementById('cursor-glow');
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (cursorGlow && hasFinePointer && !prefersReducedMotionQuery()) {
    window.addEventListener(
      'pointermove',
      function (e) {
        cursorGlow.style.setProperty('--cursor-x', e.clientX + 'px');
        cursorGlow.style.setProperty('--cursor-y', e.clientY + 'px');
        cursorGlow.classList.add('is-active');
      },
      { passive: true }
    );
  }

  function prefersReducedMotionQuery() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Animated count-up for hero stats
  document.querySelectorAll('[data-count]').forEach(function (el) {
    const target = parseFloat(el.getAttribute('data-target'));
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';

    if (isNaN(target) || prefersReducedMotionQuery() || !('IntersectionObserver' in window)) {
      return;
    }

    function animateCount() {
      const duration = 1400;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      }

      requestAnimationFrame(tick);
    }

    const countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            countObserver.unobserve(entry.target);
            animateCount();
          }
        });
      },
      { threshold: 0.5 }
    );
    countObserver.observe(el);
  });

  // Scroll-linked progress line for the experience timeline
  const timeline = document.querySelector('.timeline');
  const timelineProgressLine = document.getElementById('timeline-progress-line');

  if (timeline && timelineProgressLine) {
    let timelineTicking = false;

    function updateTimelineProgress() {
      timelineTicking = false;
      const rect = timeline.getBoundingClientRect();
      const viewportAnchor = window.innerHeight * 0.75;
      const progressPx = viewportAnchor - rect.top;
      const pct = Math.max(0, Math.min(1, progressPx / rect.height));
      timelineProgressLine.style.height = pct * 100 + '%';
    }

    function requestTimelineUpdate() {
      if (!timelineTicking) {
        timelineTicking = true;
        requestAnimationFrame(updateTimelineProgress);
      }
    }

    window.addEventListener('scroll', requestTimelineUpdate, { passive: true });
    window.addEventListener('resize', requestTimelineUpdate);
    requestTimelineUpdate();
  }

  // Tilt-on-hover for project cards (desktop, fine-pointer only)
  if (hasFinePointer && !prefersReducedMotionQuery()) {
    document.querySelectorAll('.project-card').forEach(function (card) {
      function onMove(e) {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateX = (-py * 8).toFixed(2);
        const rotateY = (px * 10).toFixed(2);
        card.style.transform =
          'translateY(-4px) perspective(700px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
      }

      card.addEventListener('pointerenter', function () {
        card.classList.add('is-tilting');
      });
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    });
  }

  // Tap-to-open window shutters on touch devices (no hover to trigger them)
  if (!hasFinePointer) {
    document.querySelectorAll('.project-image').forEach(function (image) {
      image.addEventListener('click', function () {
        const card = image.closest('.project-card');
        if (!card) return;
        const wasOpen = card.classList.contains('is-open');
        document.querySelectorAll('.project-card.is-open').forEach(function (openCard) {
          openCard.classList.remove('is-open');
        });
        if (!wasOpen) {
          card.classList.add('is-open');
        }
      });
    });
  }

  // Agentic diagram: entrance animation + scenario step playback
  const diagramWrap = document.getElementById('agentic-diagram');
  const scenarioStepEl = document.querySelector('#agentic-diagram .scenario-step');
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const scenarioSteps = [
    { step: 'query', label: 'User Query' },
    { step: 'plan', label: 'Planner Orchestration' },
    { step: 'retrieve', label: 'RAG Retrieval' },
    { step: 'act', label: 'Tool Execution' },
    { step: 'memory', label: 'Memory Update' },
    { step: 'guard', label: 'Guardrail Check' },
    { step: 'respond', label: 'Response Delivered' },
  ];

  function highlightScenarioStep(stepKey) {
    if (!diagramWrap) return;

    diagramWrap.querySelectorAll('[data-step]').forEach(function (node) {
      var nodeStep = node.getAttribute('data-step');
      var isActive =
        stepKey === 'respond'
          ? node.classList.contains('agentic-node--query')
          : nodeStep === stepKey;
      node.classList.toggle('is-active', isActive);
    });
  }

  function setScenarioLabel(label) {
    if (!scenarioStepEl) return;
    scenarioStepEl.classList.add('is-changing');
    window.setTimeout(function () {
      scenarioStepEl.textContent = label;
      scenarioStepEl.classList.remove('is-changing');
    }, 180);
  }

  function startParticleMotion() {
    if (!diagramWrap) return;
    diagramWrap.querySelectorAll('.agentic-motion').forEach(function (motionEl) {
      if (typeof motionEl.beginElement === 'function') {
        motionEl.beginElement();
      }
    });
  }

  function activateDiagram() {
    requestAnimationFrame(function () {
      diagramWrap.classList.add('is-active');
      startParticleMotion();
      runScenarioPlayback();
    });
  }
  function runScenarioPlayback() {
    var index = 0;

    function advance() {
      var current = scenarioSteps[index];
      highlightScenarioStep(current.step);
      setScenarioLabel(current.label);
      index = (index + 1) % scenarioSteps.length;
    }

    advance();
    return window.setInterval(advance, 2400);
  }

  if (diagramWrap) {
    if (prefersReducedMotion) {
      diagramWrap.classList.add('is-active');
      highlightScenarioStep('plan');
      if (scenarioStepEl) {
        scenarioStepEl.textContent = 'Planner Orchestration';
      }
    } else if ('IntersectionObserver' in window) {
      var diagramObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              diagramObserver.unobserve(entry.target);
              activateDiagram();
            }
          });
        },
        { threshold: 0.2, rootMargin: '0px 0px -20px 0px' }
      );
      diagramObserver.observe(diagramWrap);
    } else {
      activateDiagram();
    }
  }
})();

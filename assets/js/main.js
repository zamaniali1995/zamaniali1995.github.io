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

  // Agentic diagram: entrance animation + scenario step playback
  const diagramWrap = document.getElementById('agentic-diagram');
  const scenarioStepEl = document.querySelector('.scenario-step');
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

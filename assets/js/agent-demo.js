(function () {
  'use strict';

  var container = document.getElementById('demo-chat');
  if (!container) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SCRIPT = [
    { role: 'user', text: 'Why did the hybrid-search RAG hit rate jump to 97%?' },
    { role: 'agent', text: 'Dense + sparse retrieval fused with a re-ranking pass over the top-k candidates before generation — that cut irrelevant context and lifted precision to 78%.' },
    { role: 'user', text: 'What keeps the Agent Tools Package consistent across teams?' },
    { role: 'agent', text: 'One shared, MCP-integrated package — architecture, standards, and a single release process every AI team builds on.' },
    { role: 'user', text: 'How is memory handled in the agentic platform?' },
    { role: 'agent', text: 'Three tiers — long-term, short-term, and episodic — coordinated by the planner so agents stay context-aware across turns.' },
  ];

  function buildMessageEl(message) {
    var wrap = document.createElement('div');
    wrap.className = 'chat-msg chat-msg--' + message.role;
    var roleEl = document.createElement('span');
    roleEl.className = 'chat-msg-role';
    roleEl.textContent = message.role === 'user' ? 'You' : 'Agent';
    var textEl = document.createElement('p');
    textEl.textContent = message.text;
    wrap.appendChild(roleEl);
    wrap.appendChild(textEl);
    return wrap;
  }

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    SCRIPT.forEach(function (message) {
      var el = buildMessageEl(message);
      el.classList.add('is-visible');
      container.appendChild(el);
    });
    return;
  }

  var typingEl = document.createElement('div');
  typingEl.className = 'chat-typing';
  typingEl.innerHTML = '<span></span><span></span><span></span>';

  var running = false;
  var timeoutId = null;

  function playSequence() {
    var i = 0;

    function step() {
      if (!running) return;

      if (i >= SCRIPT.length) {
        timeoutId = window.setTimeout(function () {
          container.innerHTML = '';
          i = 0;
          step();
        }, 2600);
        return;
      }

      var message = SCRIPT[i];
      var isAgent = message.role === 'agent';
      var delayBeforeShow = isAgent ? 900 : 250;

      if (isAgent) {
        container.appendChild(typingEl);
        requestAnimationFrame(function () {
          typingEl.classList.add('is-visible');
        });
      }

      timeoutId = window.setTimeout(function () {
        if (isAgent) {
          typingEl.classList.remove('is-visible');
          if (typingEl.parentNode === container) {
            container.removeChild(typingEl);
          }
        }
        var el = buildMessageEl(message);
        container.appendChild(el);
        requestAnimationFrame(function () {
          el.classList.add('is-visible');
        });
        i += 1;
        timeoutId = window.setTimeout(step, 700);
      }, delayBeforeShow);
    }

    step();
  }

  function start() {
    if (running) return;
    running = true;
    playSequence();
  }

  function stop() {
    running = false;
    if (timeoutId) window.clearTimeout(timeoutId);
  }

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
    { threshold: 0.3 }
  );
  observer.observe(container);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stop();
    } else if (!running) {
      start();
    }
  });
})();

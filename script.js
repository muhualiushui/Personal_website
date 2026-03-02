const root = document.documentElement;
const themeBtn = document.querySelector('[data-theme-toggle]');
const navToggle = document.querySelector('[data-nav-toggle]');
const navMenu = document.querySelector('[data-nav-menu]');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const siteRoot = document.documentElement.dataset.siteRoot || '';
const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const desktopNavQuery = window.matchMedia('(min-width: 860px)');
const themeStorageKey = 'theme';

function resolveSitePath(path) {
  if (!siteRoot || /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('#') || path.startsWith('/')) {
    return path;
  }

  return `${siteRoot}${path}`;
}

function addMediaQueryListener(query, handler) {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler);
    return;
  }

  if (typeof query.addListener === 'function') {
    query.addListener(handler);
  }
}

function getStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : null;
  } catch {
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Ignore storage failures in restricted browsing modes.
  }
}

function syncThemeColor(theme) {
  if (!themeColorMeta) return;
  themeColorMeta.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f6f8fb');
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  syncThemeColor(theme);
  if (themeBtn) {
    themeBtn.textContent = theme === 'dark' ? 'Light' : 'Dark';
    themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

function initTheme() {
  const initialTheme = getStoredTheme() || (prefersDarkQuery.matches ? 'dark' : 'light');
  applyTheme(initialTheme);

  addMediaQueryListener(prefersDarkQuery, (event) => {
    if (!getStoredTheme()) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });

  if (!themeBtn) return;

  themeBtn.addEventListener('click', () => {
    const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    setStoredTheme(nextTheme);
  });
}

function closeNav() {
  if (!navToggle || !navMenu) return;
  navMenu.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}

function setActiveNavLink() {
  const links = Array.from(document.querySelectorAll('.nav-link'));
  if (!links.length) return;

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const explicitActive = document.querySelector('.nav-link.active');
  const matchedLink = links.find((link) => link.getAttribute('href') === currentPage);
  const activeLink = explicitActive || matchedLink;
  if (!activeLink) return;

  links.forEach((link) => link.removeAttribute('aria-current'));
  activeLink.setAttribute('aria-current', 'page');
}

function initNavigation() {
  setActiveNavLink();
  if (!navToggle || !navMenu) return;

  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (!desktopNavQuery.matches) {
        closeNav();
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (!navMenu.classList.contains('open')) return;
    if (navMenu.contains(event.target) || navToggle.contains(event.target)) return;
    closeNav();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNav();
    }
  });

  addMediaQueryListener(desktopNavQuery, (event) => {
    if (event.matches) {
      closeNav();
    }
  });
}

function initCurrentYear() {
  const currentYear = String(new Date().getFullYear());
  document.querySelectorAll('[data-current-year], #year').forEach((el) => {
    el.textContent = currentYear;
  });
}

function initRevealAnimations() {
  const elements = Array.from(document.querySelectorAll('.fade-in'));
  if (!elements.length) return;

  const skipRevealAnimation =
    !('IntersectionObserver' in window) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(max-width: 1024px)').matches ||
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches;

  if (skipRevealAnimation) {
    elements.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  elements.forEach((el) => observer.observe(el));
}

function initProjectGrid() {
  const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
  const projectCards = Array.from(document.querySelectorAll('[data-project-card]'));
  const sortSelect = document.querySelector('[data-sort]');
  if (!projectCards.length) return;

  const setActiveFilter = (activeButton) => {
    filterButtons.forEach((button) => {
      const isActive = button === activeButton;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  const updateProjectGrid = () => {
    const activeFilter =
      filterButtons.find((button) => button.classList.contains('active'))?.dataset.filter || 'all';

    const sortedCards = [...projectCards].sort((a, b) => {
      if (!sortSelect) return 0;

      if (sortSelect.value === 'recent') {
        return new Date(b.dataset.date) - new Date(a.dataset.date);
      }

      return Number(b.dataset.featured) - Number(a.dataset.featured);
    });

    const grid = projectCards[0].parentElement;
    sortedCards.forEach((card) => grid.appendChild(card));

    sortedCards.forEach((card) => {
      const tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
      const visible = activeFilter === 'all' || tags.includes(activeFilter);
      card.hidden = !visible;
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveFilter(button);
      updateProjectGrid();
    });
  });

  if (filterButtons.length) {
    setActiveFilter(filterButtons.find((button) => button.classList.contains('active')) || filterButtons[0]);
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', updateProjectGrid);
  }

  updateProjectGrid();
}

initTheme();
initNavigation();
initCurrentYear();
initRevealAnimations();
initProjectGrid();

function initFnoRail(root) {
  if (!root || root.dataset.fnoRailInitialized === 'true') return;

  const sidebar = root.querySelector('.fno-anchor');
  const anchors = Array.from(root.querySelectorAll('[data-fno-anchor]'));
  const sections = anchors.map((anchor) => document.querySelector(anchor.getAttribute('href'))).filter(Boolean);
  const progress = root.querySelector('[data-fno-progress]');
  const openBtn = root.querySelector('[data-fno-drawer-open]');
  const closeBtns = Array.from(root.querySelectorAll('[data-fno-drawer-close]'));
  const backdrop = root.querySelector('.fno-drawer-backdrop');

  if (!sidebar || !anchors.length) return;
  root.dataset.fnoRailInitialized = 'true';

  const updateProgress = (activeLink) => {
    if (!progress || !activeLink) return;
    const markerTop = activeLink.offsetTop + activeLink.offsetHeight / 2 - 10;
    progress.style.top = `${Math.max(markerTop, 0)}px`;
  };

  const setActive = (id) => {
    let activeLink = null;
    anchors.forEach((anchor) => {
      const isActive = anchor.getAttribute('href') === `#${id}`;
      anchor.classList.toggle('active', isActive);
      if (isActive) activeLink = anchor;
    });
    if (activeLink) updateProgress(activeLink);
  };

  const fnoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0.01 }
  );

  sections.forEach((section) => fnoObserver.observe(section));

  const openDrawer = () => {
    if (!backdrop) return;
    sidebar.classList.add('open');
    backdrop.classList.add('open');
    document.body.classList.add('fno-drawer-open');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
  };

  const closeDrawer = () => {
    if (!backdrop) return;
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.classList.remove('fno-drawer-open');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
  };

  if (openBtn) openBtn.addEventListener('click', openDrawer);
  closeBtns.forEach((button) => button.addEventListener('click', closeDrawer));

  anchors.forEach((anchor) => {
    anchor.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 1024px)').matches) closeDrawer();
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });

  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 1024px)').matches) closeDrawer();
    const active = root.querySelector('.fno-nav-link.active');
    if (active) updateProgress(active);
  });

  const defaultActive = root.querySelector('.fno-nav-link.active');
  if (defaultActive) updateProgress(defaultActive);
}

const caseData = {
  nlp: {
    title: 'IMDb Sentiment Analysis: RNN vs Pretrained Transformers',
    summary:
      'Compared BiLSTM against DistilGPT-2 and XLNet under matched sentiment settings, including built-in versus MLP heads and max sequence length ablations.',
    tags: ['NLP', 'Python', 'PyTorch', 'HuggingFace', 'Statistics'],
    problem:
      'Baseline transformer sentiment models can hide architectural tradeoffs. I wanted to measure whether a custom feature-pooling head improves stability and calibration over built-in heads.',
    data:
      'Public IMDB-style review corpus (~50k labeled reviews). Standardized text cleaning, train/validation/test split, and sequence truncation with controlled max token length.',
    approach:
      'Compared GPT-2 and XLNet variants under matched hyperparameter sweeps. Added a custom pooled-representation MLP head and measured both predictive quality and calibration-sensitive metrics.',
    experiments:
      'Tracked Accuracy, Macro-F1, and LogLoss across baselines and custom heads. Included ablations on pooling strategy, learning rate, and classifier depth.',
    results: [
      ['GPT-2 built-in head', '0.90', '0.90', '0.28'],
      ['GPT-2 custom pooled + MLP', '0.91', '0.91', '0.24'],
      ['XLNet built-in head', '0.92', '0.92', '0.22'],
      ['XLNet custom pooled + MLP', '0.93', '0.93', '0.19']
    ],
    learned:
      'Custom pooling gave consistent LogLoss gains with modest F1 improvements. Limitation: benchmark remains English-only and may not generalize across domains without adaptation.',
    next:
      'Evaluate uncertainty-aware calibration methods and domain-transfer performance on additional review datasets.',
    takeaways: [
      'Custom heads can improve calibration without heavy architecture changes.',
      'Matched evaluation setup is critical for fair model comparisons.',
      'LogLoss reveals quality differences hidden by accuracy alone.'
    ],
    barLabel: ['GPT-2 Built-in', 'GPT-2 Custom', 'XLNet Built-in', 'XLNet Custom'],
    barValues: [70, 76, 82, 88]
  },
  atlas: {
    title: 'AI Simulation with Mistral + Mixtral (ATLAS Showcase)',
    summary:
      'Built a prototype NPC simulation workflow focused on action-selection constraints, using Mistral 7B and Mixtral 8x7B as the main open-model comparison with GPT/Claude cross-checks.',
    tags: ['LLM', 'Mistral 7B', 'Mixtral 8x7B', 'Simulation', 'Prompt Engineering', 'Research'],
    problem:
      'LLM-based agent simulation often fails on long prompts and hard constraints. I needed a reproducible way to keep outputs aligned with allowed room/action options.',
    data:
      'Scenario-style prompts with named characters, room inventories, and strict rules (for example: use only listed areas and avoid unauthorized rooms). Includes edge cases such as single-room apartments.',
    approach:
      'Designed structured prompts and task assignment templates, then compared model responses under equivalent constraints to identify failure patterns and improve reliability.',
    experiments:
      'Evaluated completion correctness on constrained room-assignment tasks, especially long-query behavior and model consistency when only one valid option exists.',
    results: [
      ['Baseline free-form prompting', '0.62', '0.59', '0.54'],
      ['Mistral + structured constraints', '0.81', '0.79', '0.33'],
      ['Multi-model cross-check workflow', '0.86', '0.84', '0.28']
    ],
    learned:
      'Constraint clarity and output-format guidance significantly improve valid actions. Long prompts still increase risk of drift, so guardrails and validation remain necessary.',
    next:
      'Add automated response validation and expanded scenario coverage for social-interaction and multi-room planning tasks.',
    takeaways: [
      'Structured constraints reduce invalid or off-topic simulation actions.',
      'Single-option tasks are useful stress tests for instruction following.',
      'Cross-model checks help expose hidden failure modes before deployment.'
    ],
    barLabel: ['Baseline', 'Mistral Structured', 'Cross-check'],
    barValues: [62, 81, 86]
  }
};

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
}

function initAtlasGallery() {
  const cards = Array.from(document.querySelectorAll('[data-gallery-item]'));
  const filters = Array.from(document.querySelectorAll('[data-gallery-filter]'));
  const prevBtn = document.querySelector('[data-carousel-prev]');
  const nextBtn = document.querySelector('[data-carousel-next]');
  if (!cards.length) return;

  let visibleCards = [...cards];
  let currentIndex = 0;

  const render = () => {
    cards.forEach((card) => {
      card.classList.remove('active');
      card.hidden = true;
    });

    if (!visibleCards.length) return;
    if (currentIndex >= visibleCards.length) currentIndex = 0;

    visibleCards[currentIndex].hidden = false;
    visibleCards[currentIndex].classList.add('active');

    const disableNav = visibleCards.length <= 1;
    if (prevBtn) prevBtn.disabled = disableNav;
    if (nextBtn) nextBtn.disabled = disableNav;
  };

  const applyFilter = (filterKey) => {
    visibleCards = cards.filter((card) => {
      if (filterKey === 'all') return true;
      const categories = (card.dataset.category || '').split(/\s+/);
      return categories.includes(filterKey);
    });

    if (!visibleCards.length) visibleCards = [...cards];
    currentIndex = 0;
    render();
  };

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      filters.forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      applyFilter(button.dataset.galleryFilter || 'all');
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (!visibleCards.length) return;
      currentIndex = (currentIndex - 1 + visibleCards.length) % visibleCards.length;
      render();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!visibleCards.length) return;
      currentIndex = (currentIndex + 1) % visibleCards.length;
      render();
    });
  }

  const initialFilter = filters.find((button) => button.classList.contains('active'))?.dataset.galleryFilter || 'all';
  applyFilter(initialFilter);
}

function initAtlasLightbox() {
  const lightbox = document.querySelector('[data-lightbox]');
  const imageEl = document.querySelector('[data-lightbox-image]');
  const captionEl = document.querySelector('[data-lightbox-caption]');
  const closeBtn = document.querySelector('[data-lightbox-close]');
  const prevBtn = document.querySelector('[data-lightbox-prev]');
  const nextBtn = document.querySelector('[data-lightbox-next]');
  const thumbs = Array.from(document.querySelectorAll('[data-lightbox-src]'));

  if (!lightbox || !imageEl || !captionEl || !thumbs.length) return;

  let currentIndex = 0;

  const open = (index) => {
    currentIndex = (index + thumbs.length) % thumbs.length;
    const sourceEl = thumbs[currentIndex];
    imageEl.src = sourceEl.dataset.lightboxSrc || sourceEl.getAttribute('src') || '';
    captionEl.textContent = sourceEl.dataset.lightboxCaption || sourceEl.getAttribute('alt') || '';
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  };

  const step = (direction) => open(currentIndex + direction);

  thumbs.forEach((thumb, idx) => {
    thumb.addEventListener('click', () => open(idx));
  });

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => step(1));

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) close();
  });

  document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
  });
}

function initAtlasCompareSlider() {
  const sliders = Array.from(document.querySelectorAll('[data-compare-slider]'));
  sliders.forEach((slider) => {
    const input = slider.querySelector('[data-compare-input]');
    const afterLayer = slider.querySelector('[data-after-layer]');
    const divider = slider.querySelector('[data-compare-divider]');
    if (!input || !afterLayer || !divider) return;

    const update = (value) => {
      const numeric = Math.max(0, Math.min(100, Number(value)));
      afterLayer.style.clipPath = `inset(0 ${100 - numeric}% 0 0)`;
      divider.style.left = `${numeric}%`;
    };

    update(input.value);
    input.addEventListener('input', () => update(input.value));
  });
}

function initAtlasCopyButtons() {
  const copyButtons = Array.from(document.querySelectorAll('[data-copy-target]'));
  copyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const targetId = button.dataset.copyTarget;
      const target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;

      const originalLabel = button.textContent;
      try {
        await copyText(target.textContent.trim());
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Copy failed';
      }

      setTimeout(() => {
        button.textContent = originalLabel;
      }, 1200);
    });
  });
}

function initAtlasVideoOverlay() {
  const overlays = Array.from(document.querySelectorAll('[data-video-overlay]'));
  overlays.forEach((overlay) => {
    const targetId = overlay.dataset.videoTarget;
    const video = targetId ? document.getElementById(targetId) : null;
    if (!video) return;

    const hideOverlay = () => {
      overlay.hidden = true;
    };

    overlay.addEventListener('click', () => {
      video.play().catch(() => {});
    });

    video.addEventListener('play', hideOverlay);
  });
}

function initAtlasVideoSwitcher() {
  const switcher = document.querySelector('[data-video-switcher]');
  if (!switcher) return;

  const player = switcher.querySelector('[data-video-player]');
  const track = switcher.querySelector('[data-video-track]');
  const labelEl = switcher.querySelector('[data-video-label]');
  const titleEl = switcher.querySelector('[data-video-title]');
  const summaryEl = switcher.querySelector('[data-video-summary]');
  const pointsEl = switcher.querySelector('[data-video-points]');
  const overlay = switcher.querySelector('[data-video-overlay]');
  const tabs = Array.from(switcher.querySelectorAll('[data-video-tab]'));

  if (!player || !track || !titleEl || !summaryEl || !pointsEl || !tabs.length) return;

  const videos = {
    gpt: {
      src: resolveSitePath('assets/projects/atlas-agent-simulation/gpt-good-simulation.mov'),
      track: resolveSitePath('assets/projects/atlas-agent-simulation/gpt-good-simulation.vtt'),
      poster: resolveSitePath('assets/projects/atlas-agent-simulation/scenario-format-drift-gpt.png'),
      label: 'Run A · GPT reference',
      title: 'Run A: GPT reference behavior',
      summary: 'Reference-quality run to anchor the expected level of simulation stability.',
      points: [
        'Provides the target behavior baseline.',
        'Helps evaluate whether Mistral and Mixtral outputs are simulation-ready.',
        'Not the primary focus of this case study.'
      ]
    },
    'mistral-small': {
      src: resolveSitePath('assets/projects/atlas-agent-simulation/mistral-small-random-walk.mov'),
      track: resolveSitePath('assets/projects/atlas-agent-simulation/mistral-small-random-walk.vtt'),
      poster: resolveSitePath('assets/projects/atlas-agent-simulation/scenario-format-drift-mistral.png'),
      label: 'Run B · Mistral 7B baseline',
      title: 'Run B: Mistral 7B (random-walk failure)',
      summary: 'Weak instruction grounding and unstable planning in baseline Mistral setup.',
      points: [
        'Frequent off-path movement under the same daily requirements.',
        'Higher drift and long-context degradation.',
        'Needs strict validation and retry control.'
      ]
    },
    'mistral-large': {
      src: resolveSitePath('assets/projects/atlas-agent-simulation/mistral-large-prompt-engineered.mov'),
      track: resolveSitePath('assets/projects/atlas-agent-simulation/mistral-large-prompt-engineered.vtt'),
      poster: resolveSitePath('assets/projects/atlas-agent-simulation/scenario-long-context-mistral.png'),
      label: 'Run C · Mixtral 8x7B + prompt engineering',
      title: 'Run C: Mixtral 8x7B with prompt engineering',
      summary: 'Improved reliability after rule-first prompt design and strict output validation.',
      points: [
        'Clearer prompt-to-action translation than 7B baseline.',
        'More stable action continuity under similar context.',
        'Still needs validator checks on edge cases.'
      ]
    }
  };

  const updateTabState = (activeKey) => {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.videoTab === activeKey;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
  };

  const setVideo = (key) => {
    const config = videos[key];
    if (!config) return;

    player.pause();
    player.src = config.src;
    track.src = config.track;
    player.poster = config.poster;
    player.load();

    if (overlay) overlay.hidden = false;
    if (labelEl) labelEl.textContent = config.label;
    if (overlay && overlay.querySelector('span')) {
      overlay.querySelector('span').textContent = `Play ${config.label.split('·')[0].trim()}`;
    }

    titleEl.textContent = config.title;
    summaryEl.textContent = config.summary;
    pointsEl.innerHTML = '';
    config.points.forEach((point) => {
      const li = document.createElement('li');
      li.textContent = point;
      pointsEl.appendChild(li);
    });

    updateTabState(key);
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.videoTab;
      setVideo(key);
    });
  });

  setVideo('mistral-small');
}

function initAtlasExperience() {
  initAtlasVideoSwitcher();
  initAtlasGallery();
  initAtlasLightbox();
  initAtlasCompareSlider();
  initAtlasCopyButtons();
  initAtlasVideoOverlay();
}

const caseRoot = document.querySelector('[data-case-study]');
if (caseRoot) {
  const params = new URLSearchParams(window.location.search);
  const key = caseRoot.dataset.caseKey || params.get('project') || 'nlp';
  const data = caseData[key] || caseData.nlp;

  const atlasPage = document.querySelector('[data-atlas-page]');
  const imdbPage = document.querySelector('[data-imdb-page]');
  const genericPage = document.querySelector('[data-generic-case]');
  const showAtlas = key === 'atlas' && Boolean(atlasPage);
  const showImdb = key === 'nlp' && Boolean(imdbPage);

  document.body.classList.toggle('imdb-case-active', showImdb);

  if (atlasPage) atlasPage.hidden = !showAtlas;
  if (imdbPage) imdbPage.hidden = !showImdb;
  if (genericPage) genericPage.hidden = showAtlas || showImdb;
  if (showAtlas && atlasPage) atlasPage.classList.add('visible');
  if (showImdb && imdbPage) imdbPage.classList.add('visible');
  if (!showAtlas && !showImdb && genericPage) genericPage.classList.add('visible');

  const activeRailRoot = showAtlas
    ? atlasPage?.querySelector('[data-fno-rail-root]')
    : showImdb
      ? imdbPage?.querySelector('[data-fno-rail-root]')
      : genericPage?.querySelector('[data-fno-rail-root]');
  if (activeRailRoot) initFnoRail(activeRailRoot);

  if (showAtlas) {
    document.title = 'Mistral 7B to Mixtral 8x7B Agent Simulation Case Study | Shuzhen Zhang';

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        'content',
        'Stanford generative-agents-inspired simulation rebuilt with Mistral 7B and Mixtral 8x7B: baseline failure modes, improved stability, and guardrails for hallucination and long-context drift.'
      );
    }

    initAtlasExperience();
  } else if (showImdb) {
    document.title = 'IMDb Sentiment Analysis: RNN vs Pretrained Transformers | Case Study | Shuzhen Zhang';

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        'content',
        'BiLSTM vs DistilGPT-2 vs XLNet sentiment study with max sequence length and classifier-head comparisons; XLNet achieved the best TestAccuracy.'
      );
    }
  } else {
    document.title = `${data.title} | Case Study | Shuzhen Zhang`;

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.setAttribute('content', data.summary);

    const setText = (selector, value) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = value;
    };

    setText('[data-case-title]', data.title);
    setText('[data-case-summary]', data.summary);
    setText('[data-problem]', data.problem);
    setText('[data-data]', data.data);
    setText('[data-approach]', data.approach);
    setText('[data-experiments]', data.experiments);
    setText('[data-learned]', data.learned);
    setText('[data-next]', data.next);

    const tagsEl = document.querySelector('[data-case-tags]');
    if (tagsEl) {
      tagsEl.innerHTML = '';
      data.tags.forEach((tag) => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        tagsEl.appendChild(span);
      });
    }

    const rowsEl = document.querySelector('[data-results-body]');
    if (rowsEl) {
      rowsEl.innerHTML = '';
      data.results.forEach((row) => {
        const tr = document.createElement('tr');
        row.forEach((cell) => {
          const td = document.createElement('td');
          td.textContent = cell;
          tr.appendChild(td);
        });
        rowsEl.appendChild(tr);
      });
    }

    const listEl = document.querySelector('[data-takeaways]');
    if (listEl) {
      listEl.innerHTML = '';
      data.takeaways.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        listEl.appendChild(li);
      });
    }

    const chartEl = document.querySelector('[data-chart]');
    if (chartEl) {
      chartEl.innerHTML = '';
      data.barLabel.forEach((label, idx) => {
        const row = document.createElement('div');
        const labelEl = document.createElement('p');
        labelEl.className = 'kv';
        labelEl.textContent = label;

        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.setAttribute('aria-hidden', 'true');

        const fill = document.createElement('span');
        fill.style.width = `${data.barValues[idx]}%`;
        bar.appendChild(fill);

        row.append(labelEl, bar);
        chartEl.appendChild(row);
      });
    }
  }
} else {
  document.querySelectorAll('[data-fno-rail-root]').forEach((railRoot) => initFnoRail(railRoot));
}

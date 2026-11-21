const EXAMPLES = {
  ai: {
    title: 'The Annotated Transformer', url: 'https://nlp.seas.harvard.edu/annotated-transformer/',
    summary: 'A practical implementation of the Transformer, connecting attention mechanisms, encoder and decoder layers, and model training.',
    results: [
      ['Attention Is All You Need', 'https://arxiv.org/abs/1706.03762', 'The original architecture behind the implementation.'],
      ['The Illustrated Transformer', 'https://jalammar.github.io/illustrated-transformer/', 'A visual explanation of the same attention and encoder-decoder concepts.'],
    ],
  },
  climate: {
    title: 'Climate Change: The Evidence', url: 'https://science.nasa.gov/climate-change/evidence/',
    summary: 'An introduction to the observations behind climate science, connecting temperature records, ocean changes, and evidence from ice.',
    results: [
      ['The Causes of Climate Change', 'https://science.nasa.gov/climate-change/causes/', 'Explains the physical mechanisms behind the changes described in the source.'],
      ['Global Temperature', 'https://science.nasa.gov/earth/explore/earth-indicators/global-temperature/', 'Explore the temperature record behind one of the source’s central observations.'],
    ],
  },
  space: {
    title: 'Exoplanets: Worlds Beyond Our Solar System', url: 'https://science.nasa.gov/exoplanets/',
    summary: 'An introduction to planets around other stars, connecting how we discover them with the observations that help us understand them.',
    results: [
      ['NASA Exoplanet Archive', 'https://exoplanetarchive.ipac.caltech.edu/', 'Explore the research data behind the worlds introduced in the source.'],
      ['TESS: Finding Other Worlds', 'https://science.nasa.gov/mission/tess/', 'Meet a mission that discovers planets using changes in a star’s brightness.'],
    ],
  },
};

function initPageMotion(gsap) {
  const targets = [...document.querySelectorAll('.section h2, .workflow li, .trust-copy > div, .install-steps li')];
  const hero = [...document.querySelectorAll('.hero-copy > *, #demo')];
  const seen = new WeakSet();
  const tweens = new Set();
  let observer;
  let intro;
  let configured = false;

  function setEnabled(enabled) {
    observer?.disconnect();
    intro?.kill();
    tweens.forEach(tween => tween.kill());
    tweens.clear();
    gsap?.set([...targets, ...hero], { clearProps: 'transform,opacity,visibility' });
    const firstVisit = !configured;
    configured = true;
    if (!enabled || !gsap) {
      document.documentElement.dataset.intro = 'complete';
      return;
    }
    if (firstVisit && scrollY < 80) {
      document.documentElement.dataset.intro = 'playing';
      intro = gsap.timeline({ onComplete: () => { document.documentElement.dataset.intro = 'complete'; } });
      intro.from('.hero-copy > *', { y: 24, opacity: 0, duration: .68, stagger: .075, ease: 'power3.out', clearProps: 'transform,opacity' }, 0);
      intro.from('#demo', { y: 32, opacity: 0, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity' }, .08);
    } else document.documentElement.dataset.intro = 'complete';
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        seen.add(entry.target);
        observer.unobserve(entry.target);
        const tween = gsap.from(entry.target, {
          y: 24, opacity: 0, duration: .72, ease: 'power3.out', clearProps: 'transform,opacity',
          onComplete: () => tweens.delete(tween),
        });
        tweens.add(tween);
      });
    }, { threshold: .12 });
    targets.forEach(target => { if (!seen.has(target)) observer.observe(target); });
  }
  return { setEnabled, destroy: () => setEnabled(false) };
}

function initDemo(root, gsap, updatePageMotion) {
  const playButton = root.querySelector('[data-demo-play]');
  const motionButton = root.querySelector('[data-motion-toggle]');
  const signal = root.querySelector('[data-flow-signal]');
  const fill = root.querySelector('[data-flow-fill]');
  const track = root.querySelector('[data-flow-track]');
  const lamp = root.querySelector('[data-demo-lamp]');
  const accents = [...root.querySelectorAll('[data-demo-accent]')];
  const steps = [...root.querySelectorAll('[data-demo-step]')];
  const topics = [...root.querySelectorAll('[data-example]')];
  const description = root.querySelector('[data-phase-description]');
  const status = root.querySelector('[data-demo-status]');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const descriptions = ['Start with the page you’re already reading.', 'Follow the ideas that connect it to other sources.', 'Open a related source, with a reason to read it.'];
  let enabled = false;
  let override = null;
  let timeline;
  let queued;
  let visible = false;
  let autoplayed = false;

  root.querySelector('[data-demo-controls]').hidden = false;
  root.querySelector('[data-example-picker]').hidden = false;
  root.querySelector('[data-demo-navigation]').hidden = false;
  motionButton.disabled = !gsap;

  function setPhase(index, setFill = true) {
    root.dataset.phase = String(index);
    steps.forEach((step, i) => step.setAttribute('aria-pressed', String(i === index)));
    description.textContent = descriptions[index];
    root.querySelector('.demo-source').classList.toggle('is-active', index < 2);
    root.querySelector('.demo-results').classList.toggle('is-active', index === 2);
    if (setFill && gsap) gsap.set(fill, { scaleX: index / 2 });
    else if (setFill) fill.style.transform = `scaleX(${index / 2})`;
  }

  function stop() {
    queued?.kill();
    queued = null;
    timeline?.kill();
    timeline = null;
    root.dataset.playing = 'false';
    playButton.removeAttribute('aria-disabled');
    if (root.dataset.autoplay === 'playing') root.dataset.autoplay = 'complete';
    if (gsap) {
      gsap.set([signal, lamp], { opacity: 0 });
      gsap.set(accents, { clearProps: 'transform,opacity' });
    }
  }

  function finish() {
    stop();
    setPhase(2);
    status.textContent = 'Example ready. Choose a topic or explore a step.';
  }

  function play(automatic = false) {
    if (root.dataset.playing === 'true') return;
    stop();
    autoplayed = true;
    root.dataset.autoplay = automatic ? 'playing' : 'complete';
    if (!enabled) { finish(); return; }
    root.dataset.playing = 'true';
    playButton.setAttribute('aria-disabled', 'true');
    status.textContent = 'Playing the prepared source connection.';
    setPhase(0);
    const halfway = () => (track.clientWidth - signal.offsetWidth) / 2;
    const end = () => track.clientWidth - signal.offsetWidth;
    timeline = gsap.timeline({ onComplete: finish });
    timeline.set(signal, { x: 0, opacity: 1 });
    timeline.to(lamp, { x: 70, opacity: .8, duration: .8, ease: 'power3.out' }, 0);
    timeline.to(signal, { x: halfway, duration: 1.4, ease: 'power2.inOut' }, .2);
    timeline.to(fill, { scaleX: .5, duration: 1.4, ease: 'power2.inOut' }, .2);
    timeline.call(() => setPhase(1, false), null, 1.6);
    timeline.to(signal, { x: end, duration: 1.35, ease: 'power2.inOut' }, 1.7);
    timeline.to(fill, { scaleX: 1, duration: 1.35, ease: 'power2.inOut' }, 1.7);
    timeline.call(() => setPhase(2, false), null, 3.05);
    timeline.to(accents, { opacity: 1, duration: .45, stagger: .12, ease: 'power3.out' }, 2.8);
    timeline.to(signal, { opacity: 0, duration: .5 }, 3.6);
    timeline.to(lamp, { opacity: 0, duration: .5 }, 3.6);
  }

  function traceStep(index) {
    stop();
    autoplayed = true;
    root.dataset.autoplay = 'complete';
    setPhase(index);
    status.textContent = descriptions[index];
    if (!enabled) return;
    const target = (track.clientWidth - signal.offsetWidth) * index / 2;
    root.dataset.playing = 'true';
    timeline = gsap.timeline({ onComplete: () => { stop(); setPhase(index); } });
    timeline.fromTo(signal, { x: Math.max(0, target - 70), opacity: 1 }, { x: target, duration: .65, ease: 'power3.out' });
    timeline.to(signal, { opacity: 0, duration: .3 });
  }

  function chooseExample(key) {
    stop();
    const example = EXAMPLES[key];
    root.dataset.topic = key;
    const source = root.querySelector('[data-source-link]');
    source.textContent = example.title;
    source.href = example.url;
    root.querySelector('[data-source-domain]').textContent = new URL(example.url).hostname;
    root.querySelector('[data-source-summary]').textContent = example.summary;
    root.querySelectorAll('[data-result]').forEach((row, index) => {
      const [title, url, reason] = example.results[index];
      row.querySelector('a').textContent = title;
      row.querySelector('a').href = url;
      row.querySelector('[data-result-reason]').textContent = reason;
    });
    topics.forEach(topic => topic.setAttribute('aria-pressed', String(topic.dataset.example === key)));
    play();
  }

  function queueAutoplay() {
    if (!enabled || !visible || autoplayed || queued || document.hidden) return;
    queued = gsap.delayedCall(1.15, () => { queued = null; play(true); });
  }

  function applyMotion() {
    stop();
    enabled = Boolean(gsap) && (override ?? !preference.matches);
    root.dataset.motion = enabled ? 'on' : 'off';
    document.documentElement.dataset.motion = root.dataset.motion;
    motionButton.setAttribute('aria-pressed', String(enabled));
    motionButton.textContent = enabled ? 'Motion on' : 'Motion off';
    updatePageMotion(enabled);
    if (!enabled && !autoplayed) root.dataset.autoplay = 'skipped';
    setPhase(2);
    status.textContent = 'Example ready. Choose a topic or explore a step.';
    queueAutoplay();
  }

  const listeners = [];
  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }
  listen(playButton, 'click', () => play());
  listen(motionButton, 'click', () => {
    override = !enabled;
    applyMotion();
    if (enabled) play();
  });
  topics.forEach(topic => listen(topic, 'click', () => chooseExample(topic.dataset.example)));
  steps.forEach((step, index) => listen(step, 'click', () => traceStep(index)));
  listen(preference, 'change', () => { override = null; applyMotion(); });
  listen(document, 'visibilitychange', () => { if (document.hidden) finish(); else queueAutoplay(); });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= .75;
    if (visible) queueAutoplay();
    else finish();
  }, { threshold: .75, rootMargin: '-24px 0px -24px 0px' });
  applyMotion();
  observer.observe(track);
  return () => { stop(); observer.disconnect(); listeners.forEach(remove => remove()); };
}

function initProviders() {
  const info = {
    openrouter: 'Connect your OpenRouter account in the extension’s settings, without pasting an API key. Your provider’s usage charges and data policies apply.',
    anthropic: 'Add your Anthropic API key in the extension’s settings. Your chosen provider handles the search and any usage charges.',
    openai: 'Add your OpenAI API key in the extension’s settings. Your chosen provider handles the search and any usage charges.',
    gemini: 'Add your Gemini API key in the extension’s settings. Your chosen provider handles the search and any usage charges.',
  };
  const controls = [...document.querySelectorAll('[data-provider]')];
  const note = document.querySelector('[data-provider-note]');
  document.querySelector('[data-provider-picker]').hidden = false;
  const handlers = controls.map(control => {
    const handler = () => {
      controls.forEach(button => button.setAttribute('aria-pressed', String(button === control)));
      note.textContent = info[control.dataset.provider];
    };
    control.addEventListener('click', handler);
    return () => control.removeEventListener('click', handler);
  });
  note.textContent = info.openrouter;
  note.setAttribute('role', 'status');
  return () => handlers.forEach(remove => remove());
}

function initScrollProgress() {
  const progress = document.querySelector('[data-scroll-progress]');
  let frame;
  function update() {
    frame = null;
    const distance = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, scrollY / distance) : 0})`;
  }
  function request() { if (frame == null) frame = requestAnimationFrame(update); }
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  update();
  return () => { removeEventListener('scroll', request); removeEventListener('resize', request); cancelAnimationFrame(frame); };
}

const pageMotion = initPageMotion(window.gsap);
const cleanupDemo = initDemo(document.querySelector('#demo'), window.gsap, pageMotion.setEnabled);
const cleanupProviders = initProviders();
const cleanupProgress = initScrollProgress();
addEventListener('pagehide', event => {
  if (!event.persisted) { cleanupDemo(); cleanupProviders(); cleanupProgress(); pageMotion.destroy(); }
});

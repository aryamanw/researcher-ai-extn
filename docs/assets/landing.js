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

function initPageMotion(gsap, ScrollTrigger) {
  const targets = [...document.querySelectorAll('.section h2, .workflow li, .trust-copy > div')];
  const rules = [...document.querySelectorAll('[data-section-rule]')];
  const hero = [...document.querySelectorAll('.hero-copy > *, #demo')];
  const animations = [];
  let intro;
  let configured = false;

  function setEnabled(enabled) {
    intro?.kill();
    animations.splice(0).forEach(animation => { animation.scrollTrigger?.kill(); animation.kill(); });
    gsap?.set([...targets, ...rules, ...hero], { clearProps: 'transform,opacity,visibility' });
    const firstVisit = !configured;
    configured = true;
    if (!enabled || !gsap || !ScrollTrigger) {
      document.documentElement.dataset.intro = 'complete';
      return;
    }
    if (firstVisit && scrollY < 80) {
      document.documentElement.dataset.intro = 'playing';
      intro = gsap.timeline({ onComplete: () => {
        ScrollTrigger.refresh();
        document.documentElement.dataset.intro = 'complete';
      } });
      intro.from('.hero-copy > *', { y: 24, opacity: 0, duration: .68, stagger: .075, ease: 'power3.out', clearProps: 'transform,opacity' }, 0);
      intro.from('#demo', { y: 32, opacity: 0, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity' }, .08);
    } else document.documentElement.dataset.intro = 'complete';
    targets.forEach(target => animations.push(gsap.fromTo(target, { y: target.closest('.trust-copy') ? 16 : 24 }, {
      y: 0, ease: 'none',
      scrollTrigger: { trigger: target.tagName === 'H2' ? target.parentElement : target, start: 'top 90%', end: 'top 58%', scrub: .3, invalidateOnRefresh: true },
    })));
    rules.forEach(rule => animations.push(gsap.fromTo(rule, { scaleX: 0 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: rule.closest('.section').querySelector('.wrap'), start: 'top 90%', end: 'top 58%', scrub: .3, invalidateOnRefresh: true },
    })));
  }
  return { setEnabled, destroy: () => setEnabled(false) };
}

function initDemo(root, gsap, ScrollTrigger, updatePageMotion) {
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
  const descriptions = ['Scroll to follow the ideas in this page.', 'Follow the ideas that connect it to other sources.', 'Open a related source, with a reason to read it.'];
  let enabled = false;
  let override = null;
  let story;
  let refreshFrame;

  root.querySelector('[data-demo-controls]').hidden = false;
  root.querySelector('[data-example-picker]').hidden = false;
  root.querySelector('[data-demo-navigation]').hidden = false;
  motionButton.disabled = !(gsap && ScrollTrigger);

  function setPhase(index) {
    const changed = root.dataset.phase !== String(index);
    root.dataset.phase = String(index);
    steps.forEach((step, i) => {
      if (i === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    description.textContent = descriptions[index];
    root.querySelector('.demo-source').classList.toggle('is-active', index < 2);
    root.querySelector('.demo-results').classList.toggle('is-active', index === 2);
    if (changed) status.textContent = descriptions[index];
  }

  function destroyStory() {
    story?.scrollTrigger?.kill();
    story?.kill();
    story = null;
    gsap?.set([signal, fill, lamp, ...accents], { clearProps: 'transform,opacity' });
  }

  function createStory() {
    const trackTop = () => track.getBoundingClientRect().top + scrollY;
    const start = () => Math.max(0, trackTop() - innerHeight * .74);
    gsap.set(fill, { scaleX: 0 });
    gsap.set(signal, { x: 0, opacity: 1 });
    gsap.set(lamp, { x: 0, opacity: 0 });
    gsap.set(accents, { opacity: .35 });
    story = gsap.timeline({ paused: true });
    story.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'none' }, 0);
    story.fromTo(signal, { x: 0, opacity: 1 }, { x: () => Math.max(0, track.clientWidth - signal.offsetWidth), duration: 1, ease: 'none' }, 0);
    story.fromTo(lamp, { x: 0, opacity: 0 }, { x: 45, opacity: .75, duration: .5, ease: 'none' }, 0);
    story.to(lamp, { x: 90, opacity: 0, duration: .5, ease: 'none' }, .5);
    story.fromTo(accents, { opacity: .35 }, { opacity: 1, duration: 1, ease: 'none' }, 0);
    const update = trigger => {
      root.dataset.demoProgress = trigger.progress.toFixed(3);
      setPhase(Math.min(2, Math.floor(trigger.progress * 3)));
    };
    ScrollTrigger.create({
      id: 'demo-scroll', trigger: track, animation: story,
      start, end: () => Math.max(start() + 1, trackTop() - innerHeight * .20),
      scrub: .25, invalidateOnRefresh: true,
      onUpdate: update, onRefresh: update,
    });
  }

  function chooseExample(key) {
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
    status.textContent = `${example.title}. Related sources updated.`;
    cancelAnimationFrame(refreshFrame);
    if (enabled) refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  function applyMotion() {
    destroyStory();
    enabled = Boolean(gsap && ScrollTrigger) && (override ?? !preference.matches);
    root.dataset.motion = enabled ? 'on' : 'off';
    document.documentElement.dataset.motion = root.dataset.motion;
    motionButton.setAttribute('aria-pressed', String(enabled));
    motionButton.textContent = enabled ? 'Motion on' : 'Motion off';
    updatePageMotion(enabled);
    if (enabled) createStory();
    else {
      root.dataset.demoProgress = '1';
      fill.style.transform = 'scaleX(1)';
      setPhase(2);
    }
    status.textContent = enabled ? 'Scroll to explore the connection.' : 'Example ready. Choose a topic to explore related sources.';
  }

  const listeners = [];
  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }
  listen(motionButton, 'click', () => { override = !enabled; applyMotion(); });
  topics.forEach(topic => listen(topic, 'click', () => chooseExample(topic.dataset.example)));
  listen(preference, 'change', () => { override = null; applyMotion(); });
  listen(document, 'visibilitychange', () => { if (enabled && !document.hidden) ScrollTrigger.refresh(); });
  applyMotion();
  return () => { cancelAnimationFrame(refreshFrame); destroyStory(); listeners.forEach(remove => remove()); };
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

if (window.gsap && window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
const pageMotion = initPageMotion(window.gsap, window.ScrollTrigger);
const cleanupDemo = initDemo(document.querySelector('#demo'), window.gsap, window.ScrollTrigger, pageMotion.setEnabled);
const cleanupProviders = initProviders();
const cleanupProgress = initScrollProgress();
addEventListener('pagehide', event => {
  if (!event.persisted) { cleanupDemo(); cleanupProviders(); cleanupProgress(); pageMotion.destroy(); }
});

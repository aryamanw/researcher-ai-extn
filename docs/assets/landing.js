function initDemo(root) {
  if (!root) return () => {};
  const button = root.querySelector('[data-demo-play]');
  const status = root.querySelector('[data-demo-status]');
  const lamp = root.querySelector('[data-demo-lamp]');
  const accents = [...root.querySelectorAll('[data-demo-accent]')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap;
  let timeline;

  function rest() {
    timeline?.kill();
    timeline = undefined;
    root.dataset.playing = 'false';
    if (motion.matches && document.activeElement === button) {
      root.focus({ preventScroll: true });
    }
    button.removeAttribute('aria-disabled');
    button.hidden = !gsap || motion.matches;
    status.textContent = 'Example ready.';
    if (gsap) {
      gsap.set(lamp, { x: 0, opacity: 0 });
      gsap.set(accents, { clearProps: 'transform,opacity' });
    }
  }

  function play() {
    if (!gsap || motion.matches || root.dataset.playing === 'true') return;
    root.dataset.playing = 'true';
    // Keep keyboard focus on replay while preventing a second timeline.
    button.setAttribute('aria-disabled', 'true');
    status.textContent = 'Showing the connection.';
    timeline = gsap.timeline({ onComplete: rest });
    timeline.fromTo(lamp, { x: -40, opacity: 0 },
      { x: 40, opacity: .7, duration: .9, ease: 'power3.out' });
    timeline.to(accents, { opacity: 1, duration: .45, stagger: .2, ease: 'power3.out' }, .5);
    timeline.to(lamp, { x: 80, opacity: 0, duration: .7, ease: 'power3.out' }, 1.5);
    timeline.to({}, { duration: .6 });
  }

  button.addEventListener('click', play);
  motion.addEventListener('change', rest);
  rest();
  return () => {
    rest();
    button.removeEventListener('click', play);
    motion.removeEventListener('change', rest);
  };
}

const cleanupDemo = initDemo(document.querySelector('#demo'));
window.addEventListener('pagehide', event => {
  if (!event.persisted) cleanupDemo();
});

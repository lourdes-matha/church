(() => {
  const carousel = document.querySelector('.event-carousel');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('.event-slide')];
  const dots = [...carousel.querySelectorAll('[data-event-go]')];
  const pause = carousel.querySelector('[data-event-pause]');
  const live = carousel.querySelector('.event-slides');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, paused = motion.matches, timer, startX = null;
  function restart() {
    clearInterval(timer);
    if (!paused && !document.hidden) {
      timer = setInterval(() => show(current + 1), 5000);
    }
  }
  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    dots.forEach((dot, i) => {
      if (i === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }
  function manual(index) { show(index); restart(); }
  function setPaused(value) {
    paused = value;
    const label = paused ? 'Play slideshow' : 'Pause slideshow';
    pause.innerHTML = paused ? '<span aria-hidden="true">▶</span>' : '<span aria-hidden="true">Ⅱ</span>';
    pause.setAttribute('aria-label', label);
    pause.setAttribute('title', label);
    live.setAttribute('aria-live', paused ? 'polite' : 'off');
    restart();
  }
  carousel.querySelector('[data-event-prev]').addEventListener('click', () => manual(current - 1));
  carousel.querySelector('[data-event-next]').addEventListener('click', () => manual(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => manual(i)));
  pause.addEventListener('click', () => setPaused(!paused));
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); manual(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  live.addEventListener('touchstart', event => { startX = event.touches[0].clientX; }, {passive:true});
  live.addEventListener('touchend', event => {
    if (startX === null) return;
    const distance = event.changedTouches[0].clientX - startX;
    if (Math.abs(distance) > 50) manual(current + (distance < 0 ? 1 : -1));
    startX = null;
  }, {passive:true});
  document.addEventListener('visibilitychange', restart);
  motion.addEventListener('change', event => setPaused(event.matches));
  setPaused(paused);
})();

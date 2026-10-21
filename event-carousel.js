(() => {
  const carousel = document.querySelector('.event-carousel');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('.event-slide')];
  const dots = [...carousel.querySelectorAll('[data-event-go]')];
  const pause = carousel.querySelector('[data-event-pause]');
  const live = carousel.querySelector('.event-slides');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, paused = motion.matches, hovering = false, focused = false, timer, startX = null;
  function stopped() { return paused || hovering || focused || document.hidden; }
  function restart() {
    clearInterval(timer);
    carousel.classList.toggle('is-paused', stopped());
    const track = dots[current].querySelector('.progress-track > span');
    if (track && !stopped()) {
      track.style.animation = 'none';
      void track.offsetWidth;
      track.style.animation = '';
    }
    if (!stopped()) timer = setInterval(() => show(current + 1), 5000);
  }
  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    dots.forEach((dot, i) => {
      if (i === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    restart();
  }
  function setPaused(value) {
    paused = value;
    const label = paused ? 'Play slideshow' : 'Pause slideshow';
    pause.innerHTML = paused ? '<span aria-hidden="true">▶</span>' : '<span aria-hidden="true">Ⅱ</span>';
    pause.setAttribute('aria-label', label);
    pause.setAttribute('title', label);
    live.setAttribute('aria-live', paused ? 'polite' : 'off');
    restart();
  }
  carousel.querySelector('[data-event-prev]').addEventListener('click', () => show(current - 1));
  carousel.querySelector('[data-event-next]').addEventListener('click', () => show(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
  pause.addEventListener('click', () => setPaused(!paused));
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  carousel.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; restart(); } });
  carousel.addEventListener('pointerleave', () => { hovering = false; restart(); });
  carousel.addEventListener('focusin', () => { focused = true; restart(); });
  carousel.addEventListener('focusout', event => { focused = carousel.contains(event.relatedTarget); restart(); });
  live.addEventListener('touchstart', event => { startX = event.touches[0].clientX; }, {passive:true});
  live.addEventListener('touchend', event => {
    if (startX === null) return;
    const distance = event.changedTouches[0].clientX - startX;
    if (Math.abs(distance) > 50) show(current + (distance < 0 ? 1 : -1));
    startX = null;
  }, {passive:true});
  document.addEventListener('visibilitychange', restart);
  motion.addEventListener('change', event => setPaused(event.matches));
  const updateHeight = () => {
    const nav = document.querySelector('#navbar-placeholder');
    const announcement = document.querySelector('.announcement-bar');
    const height = (nav ? nav.getBoundingClientRect().height : 0) + (announcement ? announcement.getBoundingClientRect().height : 0);
    carousel.style.setProperty('--hero-header-height', `${Math.round(height)}px`);
  };
  const observer = new ResizeObserver(updateHeight);
  ['#navbar-placeholder', '.announcement-bar'].forEach(selector => {
    const element = document.querySelector(selector);
    if (element) observer.observe(element);
  });
  updateHeight();
  setPaused(paused);
})();

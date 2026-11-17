(() => {
  const carousel = document.querySelector('.event-carousel');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('.event-slide')];
  const dots = [...carousel.querySelectorAll('[data-event-go]')];
  const pause = carousel.querySelector('[data-event-pause]');
  const live = carousel.querySelector('.event-slides');
  let current = 0, paused = false, timer, startX = null;
  function stopped() { return paused || document.hidden; }
  function restart() {
    clearInterval(timer);
    carousel.classList.toggle('is-paused', stopped());
    const track = dots[current].querySelector('.progress-track > span');
    if (track && !stopped()) {
      track.style.animation = 'none';
      void track.offsetWidth;
      track.style.animation = '';
    }
    if (!stopped()) timer = setInterval(() => show(current + 1), 3000);
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
  live.addEventListener('touchstart', event => { startX = event.touches[0].clientX; }, {passive:true});
  live.addEventListener('touchend', event => {
    if (startX === null) return;
    const distance = event.changedTouches[0].clientX - startX;
    if (Math.abs(distance) > 50) show(current + (distance < 0 ? 1 : -1));
    startX = null;
  }, {passive:true});
  document.addEventListener('visibilitychange', restart);
  const updateHeight = () => {
    const heightOf = selector => {
      const element = document.querySelector(selector);
      return element ? element.getBoundingClientRect().height : 0;
    };
    const header = heightOf('#navbar-placeholder') + heightOf('.announcement-bar');
    const social = document.querySelector('.home-social-rail');
    const fixedBottom = social && window.matchMedia('(max-width: 620px)').matches && getComputedStyle(social).position === 'fixed';
    carousel.style.setProperty('--hero-header-height', `${Math.ceil(header)}px`);
    carousel.style.setProperty('--hero-social-height', `${fixedBottom ? Math.ceil(social.getBoundingClientRect().height) : 0}px`);
    carousel.style.setProperty('--hero-viewport-height', `${Math.floor(window.visualViewport ? window.visualViewport.height : window.innerHeight)}px`);
  };
  const observer = new ResizeObserver(updateHeight);
  ['#navbar-placeholder', '.announcement-bar', '.home-social-rail'].forEach(selector => {
    const element = document.querySelector(selector);
    if (element) observer.observe(element);
  });
  window.addEventListener('resize', updateHeight);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', updateHeight);
  updateHeight();
  setPaused(paused);
})();

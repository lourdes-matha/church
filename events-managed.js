(function (root) {
  'use strict';
  function windsorDay(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function select(events, today) {
    const enabled = events.filter(e => e.Enabled === true);
    const listed = enabled.filter(e => e['Show in Events'] !== false);
    return {
      upcoming: listed.filter(e => e['End Date'] >= today).sort((a, b) => a['Start Date'].localeCompare(b['Start Date'])),
      earlier: listed.filter(e => e['End Date'] < today).sort((a, b) => b['End Date'].localeCompare(a['End Date'])),
      slides: enabled.filter(e => e['Show in Slideshow'] === true && e['Slide Start Date'] <= today && e['Slide End Date'] >= today)
        .sort((a, b) => a['Slide Order'] - b['Slide Order'] || a.ID.localeCompare(b.ID))
    };
  }
  if (typeof module !== 'undefined') module.exports = { windsorDay, select };
  if (!root.document) return;
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  function safeURL(value) {
    if (!value) return null;
    try {
      const u = new URL(value, location.href);
      return u.protocol === 'https:' || (u.origin === location.origin && u.protocol === 'http:') ? u.href : null;
    } catch { return null; }
  }
  function link(label, href, cls) {
    const node = el('a', cls, label);
    node.href = href;
    if (new URL(href, location.href).origin !== location.origin) {
      node.target = '_blank'; node.rel = 'noopener noreferrer';
    }
    return node;
  }
  function dateLabel(e) {
    if (e['Date Label']) return e['Date Label'];
    const fmt = value => new Intl.DateTimeFormat('en-CA', {timeZone:'UTC', year:'numeric', month:'long', day:'numeric'}).format(new Date(value + 'T12:00:00Z'));
    return e['Start Date'] === e['End Date'] ? fmt(e['Start Date']) : `${fmt(e['Start Date'])} – ${fmt(e['End Date'])}`;
  }
  function card(e) {
    const node = el('article', 'event-card'); node.dataset.eventId = e.ID;
    const destination = safeURL(e['Event Link']) || safeURL(e['Instagram URL']) || safeURL(e['Facebook URL']) || safeURL(e['Poster URL']);
    const media = link('', destination, e['Media Type'] === 'video' ? 'archive-video-cover' : 'managed-event-photo');
    const image = el('img', 'event-poster'); image.src = e['Poster URL']; image.alt = e['Event Name']; image.loading = 'lazy';
    media.append(image);
    if (e['Media Type'] === 'video') {
      const play = el('span','highlight-play','▶'); play.setAttribute('aria-hidden','true');
      media.append(play, el('span','highlight-video-label','Watch video'));
    }
    node.append(media);
    const details = el('div', 'event-details'); details.append(el('h2','',e['Event Name']), el('p','event-meta',dateLabel(e)));
    if (e.Description) details.append(el('p','event-note',e.Description));
    if (safeURL(e['Event Link'])) details.append(link('View event details', safeURL(e['Event Link']), 'button button-primary'));
    const socials = el('div','event-highlight-actions');
    for (const [key, label] of [['Instagram URL','View on Instagram ↗'],['Facebook URL','View on Facebook ↗']]) {
      const url = safeURL(e[key]); if (url) socials.append(link(label,url,''));
    }
    if (socials.children.length) details.append(socials);
    else if (!e['Event Link']) details.append(link('View full poster',safeURL(e['Poster URL']),'button button-primary'));
    node.append(details); return node;
  }
  function renderEvents(groups) {
    for (const [selector, rows, empty] of [['.upcoming-events-grid', groups.upcoming,'The next parish events will be announced soon.'],['.past-events-grid',groups.earlier,'Earlier event highlights will appear here.']]) {
      const grid = document.querySelector(selector); if (!grid) continue;
      grid.replaceChildren(...rows.map(card));
      if (!rows.length) grid.append(el('p','managed-empty',empty));
    }
  }
  function renderSlides(rows) {
    const slides = document.querySelector('.event-slides');
    const controls = document.querySelector('.hero-progress');
    if (!slides || !controls) return;
    const welcome = slides.querySelector('.hero-welcome');
    const welcomeButton = controls.querySelector('[data-event-go="0"]');
    if (!welcome || !welcomeButton) return;
    slides.replaceChildren(welcome); controls.replaceChildren(welcomeButton);
    rows.forEach((e,i) => {
      const slide = el('div','event-slide poster-slide poster-managed'); slide.hidden = true;
      slide.dataset.eventId = e.ID;
      const picture = document.createElement('picture');
      const source = document.createElement('source'); source.media = '(max-width: 640px)'; source.srcset = e['Mobile Banner URL'];
      const image = el('img'); image.src = e['Desktop Banner URL']; image.alt = e['Event Name']; image.decoding = 'async';
      picture.append(source,image);
      const url = safeURL(e['Event Link']);
      if (url) {
        const target = link('',url,'poster-link'); target.setAttribute('aria-label',`Open ${e['Event Name']}`); target.append(picture); slide.append(target);
        slide.append(link('Know more ↗',url,'parish-know-more'));
      } else slide.append(picture);
      slides.append(slide);
      const button = el('button'); button.type = 'button'; button.dataset.eventGo = String(i+1); button.setAttribute('aria-label',`Show ${e['Event Name']}`);
      const track = el('span','progress-track'); track.setAttribute('aria-hidden','true'); track.append(el('span'));
      button.append(track,el('span','progress-label',e['Event Name'])); controls.append(button);
    });
    [...slides.children].forEach((node,i) => {node.setAttribute('role','group');node.setAttribute('aria-roledescription','slide');node.setAttribute('aria-label',`${i+1} of ${rows.length+1}`);});
    document.querySelector('.event-carousel').dispatchEvent(new Event('slidesupdated'));
  }
  let renderedDay;
  function update(force = false) {
    const data = root.PARISH_EVENTS, today = windsorDay();
    if (!data || data.schema_version !== 1 || !Array.isArray(data.events) || (!force && today === renderedDay)) return;
    const groups = select(data.events,today);
    renderEvents(groups); renderSlides(groups.slides); renderedDay = today;
  }
  update(true);
  setInterval(() => update(), 60000);
  document.addEventListener('visibilitychange', () => {if (!document.hidden) update();});
})(typeof window !== 'undefined' ? window : globalThis);

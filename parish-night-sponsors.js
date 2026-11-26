(async function () {
  const gallery = document.getElementById('pn-sponsor-gallery');
  if (!gallery) return;
  const tiers = ['platinum', 'gold', 'silver', 'family'];
  const demo = new URLSearchParams(location.search).get('sponsor-preview') === '1';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function card(sponsor) {
    const node = element('article', 'pn-recognition-card');
    if (sponsor.tier === 'gold') {
      node.append(element('p', 'pn-gold-badge', '◆ Gold Sponsor'));
    }
    if (sponsor.sample) {
      const art = element('div', 'pn-sample-art');
      art.append(element('span', '', sponsor.tier === 'family' ? '♡' : '◆'),
        element('small', '', sponsor.tier === 'family' ? 'Sample family photo' : 'Sample sponsor banner'));
      art.firstChild.setAttribute('aria-hidden', 'true');
      node.append(art);
    } else {
      const picture = element('picture');
      if (sponsor.mobile) {
        const source = element('source');
        source.media = '(max-width: 640px)';
        source.srcset = sponsor.mobile;
        picture.append(source);
      }
      const image = element('img');
      image.src = sponsor.desktop || sponsor.mobile;
      image.alt = sponsor.name + ' sponsorship poster';
      image.loading = 'lazy';
      image.decoding = 'async';
      picture.append(image);
      const familyPhoto = sponsor.tier === 'family';
      const poster = element(familyPhoto ? 'div' : 'a', 'pn-sponsor-poster');
      if (familyPhoto) {
        // Deter casual saving; displayed images remain accessible to the browser.
        poster.classList.add('pn-family-photo');
        image.draggable = false;
        poster.addEventListener('contextmenu', event => event.preventDefault());
        poster.addEventListener('dragstart', event => event.preventDefault());
      } else {
        poster.href = sponsor.desktop || sponsor.mobile;
        poster.setAttribute('aria-label', 'Open full poster for ' + sponsor.name);
        poster.addEventListener('click', () => { poster.href = image.currentSrc || image.src; });
      }
      poster.append(picture);
      node.append(poster);
    }
    node.append(element('h4', '', sponsor.name));
    if (sponsor.tier === 'gold' && (sponsor.website || sponsor.phone)) {
      const contacts = element('div', 'pn-gold-actions');
      if (sponsor.website) {
        contacts.append(element('span', 'pn-gold-contact', sponsor.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')));
      }
      if (sponsor.phone) {
        contacts.append(element('span', 'pn-gold-contact', sponsor.phone));
      }
      node.append(contacts);
    }
    // Direct website and telephone actions are a Platinum benefit.
    if (sponsor.tier === 'platinum' && (sponsor.website || sponsor.phone)) {
      const actions = element('div', 'pn-gold-actions');
      if (sponsor.website) {
        try {
          const url = new URL(sponsor.website);
          if (url.protocol === 'https:') {
            const website = element('a', 'pn-gold-action', 'Visit Website ↗');
            website.href = url.href;
            website.target = '_blank';
            website.rel = 'noopener noreferrer';
            actions.append(website);
          }
        } catch { /* Invalid website links are omitted. */ }
      }
      const phone = (sponsor.phone || '').replace(/[^+0-9]/g, '');
      if (/^\+?[0-9]{7,15}$/.test(phone)) {
        const call = element('a', 'pn-gold-action pn-gold-action-call', 'Call ' + sponsor.phone);
        call.href = 'tel:' + phone;
        actions.append(call);
      }
      if (actions.children.length) node.append(actions);
    }
    return node;
  }

  try {
    const response = await fetch('parish-night-sponsors.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Could not load sponsor list');
    const sponsors = await response.json();
    if (demo) {
      gallery.append(element('p', 'pn-preview-note', 'Layout preview · Dougall Pharmacy is confirmed. Other cards are examples.'));
      sponsors.push(
        { tier: 'platinum', name: 'Example Platinum Sponsor', sample: true },
        { tier: 'gold', name: 'Example Gold Sponsor A', sample: true },
        { tier: 'gold', name: 'Example Gold Sponsor B', sample: true },
        { tier: 'silver', name: 'Example Silver Sponsor', sample: true },
        ...['A', 'B', 'C', 'D'].map(letter => ({ tier: 'family', name: 'Example Family ' + letter, sample: true }))
      );
    }
    for (const tier of tiers) {
      const entries = sponsors.filter(sponsor => sponsor.tier === tier);
      if (!entries.length) continue;
      const section = element('section', 'pn-recognition pn-recognition-' + tier);
      const heading = element('h3', '', tier.charAt(0).toUpperCase() + tier.slice(1) + ' Sponsors');
      const grid = element('div', 'pn-recognition-grid');
      grid.append(...entries.map(card));
      section.append(heading, grid);
      gallery.append(section);
    }
  } catch (error) {
    console.error(error);
    gallery.append(element('p', 'pn-preview-note', 'Sponsor photos are temporarily unavailable.'));
  }
})();

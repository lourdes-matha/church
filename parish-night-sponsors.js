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
      const poster = element('a', 'pn-sponsor-poster');
      poster.href = sponsor.desktop || sponsor.mobile;
      poster.setAttribute('aria-label', 'Open full poster for ' + sponsor.name);
      poster.addEventListener('click', () => { poster.href = image.currentSrc || image.src; });
      poster.append(picture);
      node.append(poster);
    }
    node.append(element('h4', '', sponsor.name));
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

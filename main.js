document.addEventListener("DOMContentLoaded", function() {

    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
            return response.json();
        })
        .then(SITE_DATA => {
            // This block runs AFTER the data is loaded

            // Populate Hero Title (if on homepage)
            const heroTitle = document.getElementById('hero-title');
            if (heroTitle) {
                heroTitle.textContent = SITE_DATA.nameFull;
            }

            // Populate Service Times (if on homepage)
            const timeMass = document.getElementById('time-mass');
            if (timeMass) {
                const confessionTimes = document.getElementById('time-confession');
                if (confessionTimes) {
                    confessionTimes.innerHTML = SITE_DATA.timings.confession
                        .split(' · ')
                        .map(time => `<strong>${time}</strong>`)
                        .join(' · ');
                }
                const timeCatechism = document.getElementById('time-catechism');
                if (timeCatechism) timeCatechism.textContent = SITE_DATA.timings.catechism;
            }

            // Populate Downloads Page
            const pdfGrid = document.getElementById('pdf-downloads-grid');
            if (pdfGrid) {
                const pdfSection = document.getElementById('pdf-downloads-section');
                if (SITE_DATA.downloads.pdfs.length > 0) pdfSection.hidden = false;
                SITE_DATA.downloads.pdfs.forEach(pdf => {
                    const emailInstruction = pdf.submissionEmail ? `
                            <p class="form-email-note">You can also email the completed form to <a href="mailto:${pdf.submissionEmail}"><strong>${pdf.submissionEmail}</strong></a>.</p>` : '';
                    const tileHTML = `
                        <article class="download-tile">
                            <i class="fas fa-file-pdf"></i>
                            <h3>${pdf.title}</h3>
                            <p>${pdf.description}</p>
                            <a href="${pdf.url}" class="button button-primary download-form-link" download>Download form</a>
                            ${emailInstruction}
                        </article>`;
                    pdfGrid.innerHTML += tileHTML;
                });
                const gformGrid = document.getElementById('gform-downloads-grid');
                SITE_DATA.downloads.googleForms.forEach(form => {
                    const tileHTML = `
                        <a href="${form.url}" class="download-tile" target="_blank" rel="noopener noreferrer">
                            <i class="fa-brands fa-wpforms"></i>
                            <h3>${form.title}</h3>
                            <p>${form.description}</p>
                        </a>`;
                    gformGrid.innerHTML += tileHTML;
                });
            }

            // Function to load components (navbar, footer)
            const loadComponent = (selector, url, callback) => {
                fetch(url)
                    .then(res => res.ok ? res.text() : Promise.reject(`Failed to load ${url}`))
                    .then(data => {
                        document.querySelector(selector).innerHTML = data;
                        if (callback) callback(SITE_DATA);
                    })
                    .catch(error => console.error(error));
            };

            // Load Navbar and inject data
            loadComponent("#navbar-placeholder", "navbar.html", (data) => {
                document.querySelector('.nav-brand span').textContent = data.nameShort;

                const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                const currentLink = document.querySelector(`[data-page="${currentPage}"]`);
                if (currentLink) currentLink.setAttribute('aria-current', 'page');

                // --- NEW: Populate dynamic nav links from data.json ---
                const dynamicLinks = document.querySelectorAll('a[data-link]');
                dynamicLinks.forEach(link => {
                    const key = link.dataset.link; // e.g., "facebook" or "instagram"
                    if (data.socials && data.socials[key]) {
                        link.href = data.socials[key];
                    }
                });
                // --- END OF NEW CODE ---

                const hamburger = document.querySelector('.hamburger-menu');
                const navLinks = document.querySelector('.nav-links');
                const icon = hamburger.querySelector('i');
                const dropdownToggle = document.querySelector('.nav-dropdown-toggle');
                if (dropdownToggle) {
                    dropdownToggle.addEventListener('click', () => {
                        const dropdown = dropdownToggle.closest('.nav-dropdown');
                        const isOpen = dropdown.classList.toggle('nav-dropdown-open');
                        dropdownToggle.setAttribute('aria-expanded', String(isOpen));
                    });
                }
                hamburger.addEventListener('click', () => {
                    const isOpen = navLinks.classList.toggle('nav-links-active');
                    hamburger.setAttribute('aria-expanded', String(isOpen));
                    hamburger.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
                    icon.classList.toggle('fa-bars');
                    icon.classList.toggle('fa-xmark');
                });

                navLinks.addEventListener('click', (event) => {
                    if (event.target.closest('a') && navLinks.classList.contains('nav-links-active')) {
                        navLinks.classList.remove('nav-links-active');
                        hamburger.setAttribute('aria-expanded', 'false');
                        hamburger.setAttribute('aria-label', 'Open navigation menu');
                        icon.classList.add('fa-bars');
                        icon.classList.remove('fa-xmark');
                    }
                });
            });

            // Load Footer and inject data
            loadComponent("#footer-placeholder", "footer.html", (data) => {
                document.querySelector('.copyright-church-name').textContent = data.nameFull;
                document.getElementById('currentYear').textContent = new Date().getFullYear();

                // Populate connect buttons and footer icons from data.json
                const connectInstagram = document.querySelector('.connect-button.instagram');
                const connectWhatsapp = document.querySelector('.connect-button.whatsapp');
                const connectFacebook = document.querySelector('.connect-button.facebook');

                if (connectInstagram) connectInstagram.href = data.socials.instagram;
                if (connectWhatsapp) connectWhatsapp.href = data.socials.whatsapp;
                if (connectFacebook) connectFacebook.href = data.socials.facebook;

                document.querySelector('.social-icons a[aria-label*="Instagram"]').href = data.socials.instagram;
                document.querySelector('.social-icons a[aria-label*="WhatsApp"]').href = data.socials.whatsapp;
                document.querySelector('.social-icons a[aria-label*="Facebook"]').href = data.socials.facebook;
            });

        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
});

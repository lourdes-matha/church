document.addEventListener("DOMContentLoaded", function() {

    const showSelectedEventsSection = () => {
        const upcomingEvents = document.getElementById('upcoming-events');
        const earlierEvents = document.getElementById('earlier-events');
        if (!upcomingEvents || !earlierEvents) return;

        const showEarlier = window.location.hash === '#earlier-events';
        upcomingEvents.hidden = showEarlier;
        earlierEvents.hidden = !showEarlier;
    };

    showSelectedEventsSection();
    window.addEventListener('hashchange', showSelectedEventsSection);

    fetch('data.json?v=20260928-email-separation')
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
            const parishRegistrationCard = document.getElementById('parish-registration-card');
            if (parishRegistrationCard) {
                const padFormCard = document.getElementById('pad-form-card');
                const parishPdf = SITE_DATA.downloads.pdfs.find(pdf => pdf.category === 'parish-registration');
                const parishOnlineForm = SITE_DATA.downloads.googleForms.find(form => form.category === 'parish-registration');
                const padForm = SITE_DATA.downloads.pdfs.find(pdf => pdf.category !== 'parish-registration');

                parishRegistrationCard.innerHTML = `
                    <article class="download-tile registration-combined-card">
                        <h3>Choose how you would like to register</h3>
                        <div class="registration-methods">
                            <div>
                                <h4>Register Online</h4>
                                <p>${parishOnlineForm.description}</p>
                                <a href="${parishOnlineForm.url}" class="button button-primary download-form-link" target="_blank" rel="noopener noreferrer">Register Online</a>
                            </div>
                            <div>
                                <h4>Download the Form</h4>
                                <p>${parishPdf.description}</p>
                                <a href="${parishPdf.url}" class="button button-primary download-form-link" download>Download Form</a>
                            </div>
                        </div>
                        <div class="supporting-documents">
                            <h4>Which supporting documents are applicable to your family?</h4>
                            <ul>
                                <li>If your Status is Single, please attach the Baptism Certificate and Reference letter.</li>
                                <li>If your Status is Married, please attach the Sacramental Marriage Certificate (from the Church).</li>
                                <li>If your Status is Married and have children, please attach the Sacramental Marriage Certificate and children's Baptism certificates.</li>
                            </ul>
                        </div>
                    </article>`;

                if (padForm) {
                    padFormCard.innerHTML = `
                        <article class="download-tile">
                            <h3>${padForm.title}</h3>
                            <p>${padForm.description}</p>
                            <a href="${padForm.url}" class="button button-primary download-form-link" download>Download Form</a>
                        </article>`;
                }
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
            loadComponent("#navbar-placeholder", "navbar.html?v=20260927-clean-update", (data) => {
                document.querySelector('.nav-brand span').textContent = data.nameShort;

                const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                const pageLinks = document.querySelectorAll('.nav-links a[data-page]');
                pageLinks.forEach(link => link.removeAttribute('aria-current'));
                const currentLink = Array.from(pageLinks).find(link => link.dataset.page === currentPage);
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
                const dropdownToggles = document.querySelectorAll('.nav-dropdown-toggle');
                dropdownToggles.forEach(dropdownToggle => {
                    dropdownToggle.addEventListener('click', (event) => {
                        event.stopPropagation();
                        const dropdown = dropdownToggle.closest('.nav-dropdown');
                        const isOpen = dropdown.classList.toggle('nav-dropdown-open');
                        dropdownToggle.setAttribute('aria-expanded', String(isOpen));

                        if (isOpen) {
                            Array.from(dropdown.parentElement.children).forEach(sibling => {
                                if (sibling !== dropdown && sibling.classList.contains('nav-dropdown')) {
                                    sibling.classList.remove('nav-dropdown-open');
                                    const siblingToggle = sibling.querySelector(':scope > .nav-dropdown-toggle');
                                    if (siblingToggle) siblingToggle.setAttribute('aria-expanded', 'false');
                                    sibling.querySelectorAll('.nav-dropdown-open').forEach(child => {
                                        child.classList.remove('nav-dropdown-open');
                                        const childToggle = child.querySelector(':scope > .nav-dropdown-toggle');
                                        if (childToggle) childToggle.setAttribute('aria-expanded', 'false');
                                    });
                                }
                            });
                        }

                        if (!isOpen) {
                            dropdown.querySelectorAll('.nav-dropdown-open').forEach(child => {
                                child.classList.remove('nav-dropdown-open');
                                const childToggle = child.querySelector(':scope > .nav-dropdown-toggle');
                                if (childToggle) childToggle.setAttribute('aria-expanded', 'false');
                            });
                        }
                    });
                });

                document.addEventListener('click', (event) => {
                    if (!event.target.closest('.nav-dropdown')) {
                        document.querySelectorAll('.nav-dropdown-open').forEach(dropdown => {
                            dropdown.classList.remove('nav-dropdown-open');
                            const toggle = dropdown.querySelector(':scope > .nav-dropdown-toggle');
                            if (toggle) toggle.setAttribute('aria-expanded', 'false');
                        });
                    }
                });
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
                        document.querySelectorAll('.nav-dropdown-open').forEach(dropdown => {
                            dropdown.classList.remove('nav-dropdown-open');
                            const toggle = dropdown.querySelector(':scope > .nav-dropdown-toggle');
                            if (toggle) toggle.setAttribute('aria-expanded', 'false');
                        });
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

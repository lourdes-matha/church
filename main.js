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
                timeMass.textContent = SITE_DATA.timings.mass;
                document.getElementById('time-confession').textContent = SITE_DATA.timings.confession;
                document.getElementById('time-catechism').textContent = SITE_DATA.timings.catechism;
            }

            // --- NEW: Populate Downloads Page ---
            const pdfGrid = document.getElementById('pdf-downloads-grid');
            if (pdfGrid) { // This check ensures the code only runs on downloads.html
                // Populate PDF tiles
                SITE_DATA.downloads.pdfs.forEach(pdf => {
                    const tileHTML = `
                        <a href="${pdf.url}" class="download-tile" download>
                            <i class="fas fa-file-pdf"></i>
                            <h3>${pdf.title}</h3>
                            <p>${pdf.description}</p>
                        </a>`;
                    pdfGrid.innerHTML += tileHTML;
                });

                // Populate Google Form tiles
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
            // --- END OF NEW CODE ---

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

                const hamburger = document.querySelector('.hamburger-menu');
                const navLinks = document.querySelector('.nav-links');
                const icon = hamburger.querySelector('i');
                hamburger.addEventListener('click', () => {
                    navLinks.classList.toggle('nav-links-active');
                    icon.classList.toggle('fa-bars');
                    icon.classList.toggle('fa-xmark');
                });
            });

            // Load Footer and inject data
            loadComponent("#footer-placeholder", "footer.html", (data) => {
                document.querySelector('.copyright-church-name').textContent = data.nameFull;
                document.getElementById('currentYear').textContent = new Date().getFullYear();
                document.querySelector('.social-icons a[aria-label="Instagram"]').href = data.socials.instagram;
                document.querySelector('.social-icons a[aria-label="WhatsApp"]').href = data.socials.whatsapp;
                document.querySelector('.social-icons a[aria-label="Facebook"]').href = data.socials.facebook;
            });

        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
});
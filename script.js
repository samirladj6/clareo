// ===== Navbar scroll effect =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// ===== Mobile menu =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
});

// Close mobile menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

// ===== FAQ Accordion =====
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const item = button.parentElement;
        const isActive = item.classList.contains('active');

        // Close all
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

        // Open clicked if it wasn't active
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// ===== Scroll animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Add fade-in class to elements
document.querySelectorAll(
    '.feature-card, .step, .pricing-card, .faq-item, .problem-card, .contact-form, .contact-info-card'
).forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
});

// ===== Stats counter animation =====
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateStats();
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.stats-section');
if (statsSection) {
    statsObserver.observe(statsSection);
}

function animateStats() {
    document.querySelectorAll('.stat-value').forEach(stat => {
        const target = parseInt(stat.dataset.target);
        const duration = 1500;
        const start = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);

            stat.textContent = current.toLocaleString('fr-FR');

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    });
}

// ===== Supabase config =====
// IMPORTANT : remplacez ces valeurs par les vôtres (voir guide ci-dessous)
const SUPABASE_URL = 'https://ftzkkdfvwwonciiavzxw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xIaWPCzl6AK_Q1PqD_AaQg_9fmFgsML';

// ===== Contact form =====
const contactForm = document.getElementById('contactForm');
const successModal = document.getElementById('successModal');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Envoi en cours...';
        submitBtn.disabled = true;

        // Collect form data
        const formData = new FormData(contactForm);
        const data = {
            first_name: formData.get('firstName'),
            last_name: formData.get('lastName'),
            email: formData.get('email'),
            company: formData.get('company'),
            employees: formData.get('employees'),
            sector: formData.get('sector'),
            message: formData.get('message'),
            created_at: new Date().toISOString()
        };

        // Send to Supabase
        if (SUPABASE_URL !== 'VOTRE_SUPABASE_URL') {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error('Erreur lors de l\'envoi');
                }
            } catch (error) {
                console.error('Supabase error:', error);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                alert('Une erreur est survenue. Veuillez réessayer.');
                return;
            }
        } else {
            console.log('Mode démo — données non envoyées:', data);
        }

        // Show success modal
        successModal.classList.add('active');
        contactForm.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

function closeModal() {
    successModal.classList.remove('active');
}

// Close modal on overlay click
successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
        closeModal();
    }
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ===== Smooth scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        e.preventDefault();
        const target = document.querySelector(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

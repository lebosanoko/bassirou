// ============================================
// MENU MOBILE TOGGLE
// ============================================

const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");

if(menuBtn){
    menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("active");
        menuBtn.innerHTML = navLinks.classList.contains("active")
            ? '<i class="fas fa-times"></i>'
            : '<i class="fas fa-bars"></i>';
    });
    
    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
            menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        });
    });
}

// ============================================
// NAVBAR STICKY
// ============================================

const navbar = document.querySelector("header");

window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        navbar.classList.add("sticky");
    } else {
        navbar.classList.remove("sticky");
    }
});

// ============================================
// SMOOTH SCROLL
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if(target) {
            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
});

// ============================================
// FORMULAIRES WHATSAPP
// ============================================

const whatsappNumber = "22370259494";

function sendToWhatsApp(message) {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
}

const deliveryForm = document.querySelector("#deliveryForm");
if (deliveryForm) {
    deliveryForm.addEventListener("submit", event => {
        event.preventDefault();
        const formData = new FormData(deliveryForm);
        const note = formData.get("note").trim();
        const message = [
            "Bonjour SIGUI DA SAGO, je souhaite commander pour une livraison à domicile.",
            "",
            `Nom : ${formData.get("name")}`,
            `Téléphone : ${formData.get("phone")}`,
            `Adresse : ${formData.get("address")}`,
            `Produits et quantités : ${formData.get("products")}`,
            note ? `Précision : ${note}` : ""
        ].filter(Boolean).join("\n");

        sendToWhatsApp(message);
    });
}

const contactForm = document.querySelector("#contactForm");
if (contactForm) {
    contactForm.addEventListener("submit", event => {
        event.preventDefault();
        const formData = new FormData(contactForm);
        const phone = formData.get("phone").trim();
        const message = [
            "Bonjour SIGUI DA SAGO, j’ai un message depuis le site.",
            "",
            `Nom : ${formData.get("name")}`,
            `E-mail : ${formData.get("email")}`,
            phone ? `Téléphone : ${phone}` : "",
            `Message : ${formData.get("message")}`
        ].filter(Boolean).join("\n");

        sendToWhatsApp(message);
    });
}

const newsletterForm = document.querySelector("#newsletterForm");
if (newsletterForm) {
    newsletterForm.addEventListener("submit", event => {
        event.preventDefault();
        const phone = new FormData(newsletterForm).get("phone");
        sendToWhatsApp(`Bonjour SIGUI DA SAGO, je souhaite recevoir vos offres sur WhatsApp. Mon numéro : ${phone}`);
    });
}

// ============================================
// INTERSECTION OBSERVER - ANIMATION AU SCROLL
// ============================================

const hiddenElements = document.querySelectorAll(".card, .product, .stat-card, .testimonial-card, .hour-card, .contact-box, .section-head");

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if(entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

hiddenElements.forEach(el => {
    el.classList.add("hidden");
    observer.observe(el);
});

// ============================================
// BOUTON RETOUR EN HAUT
// ============================================

const topButton = document.createElement("button");
topButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
topButton.className = "top-btn";
document.body.appendChild(topButton);

window.addEventListener("scroll", () => {
    if(window.scrollY > 400) {
        topButton.classList.add("visible");
    } else {
        topButton.classList.remove("visible");
    }
});

topButton.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

// ============================================
// COMPTEUR ANIMÉ
// ============================================

const counters = document.querySelectorAll(".counter");

const countUp = (element) => {
    element.innerText = "0";
    const target = +element.dataset.target;
    const increment = target / 80;

    const updateCount = () => {
        const current = +element.innerText;
        if(current < target) {
            element.innerText = Math.ceil(current + increment);
            requestAnimationFrame(updateCount);
        } else {
            element.innerText = target;
        }
    };

    updateCount();
};

const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if(entry.isIntersecting) {
            countUp(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

counters.forEach(counter => counterObserver.observe(counter));

// ============================================
// ANNÉE AUTOMATIQUE FOOTER
// ============================================

const year = document.querySelector("#year");
if(year) {
    year.textContent = new Date().getFullYear();
}

// ============================================
// PARALLAX EFFECT
// ============================================

window.addEventListener("scroll", () => {
    const scrolled = window.pageYOffset;
    const heroImage = document.querySelector(".hero-image img");
    
    if(heroImage) {
        heroImage.style.transform = `translateY(${scrolled * 0.3}px)`;
    }
});

// ============================================
// ACTIVE NAV LINK
// ============================================

window.addEventListener("scroll", () => {
    let current = "";
    
    document.querySelectorAll("section[id]").forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if(scrollY >= sectionTop - 200) {
            current = section.getAttribute("id");
        }
    });

    document.querySelectorAll(".nav-links a").forEach(link => {
        link.classList.remove("active");
        if(link.getAttribute("href").slice(1) === current) {
            link.classList.add("active");
        }
    });
});

// ============================================
// LAZY LOADING IMAGES
// ============================================

if('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img').forEach(img => imageObserver.observe(img));
}

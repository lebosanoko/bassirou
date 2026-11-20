// ============================================
// CONFIGURATION GLOBALE
// ============================================
const WHATSAPP_NUMBER = "22370259494";

function sendToWhatsApp(message) {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
}

function formatFCFA(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + " FCFA";
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

// ============================================
// STATUT DU MAGASIN EN TEMPS RÉEL (HEURE BAMAKO UTC+0)
// ============================================
function updateStoreStatus() {
    const statusBadges = document.querySelectorAll(".store-status-badge");
    if (!statusBadges.length) return;

    // Bamako est sur le fuseau horaire UTC / GMT (sans heure d'été)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const day = now.getUTCDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
    const currentTimeInMinutes = utcHours * 60 + utcMinutes;

    let isOpen = false;
    let statusText = "";

    if (day === 0) {
        // Dimanche : 09h00 - 19h00
        const openTime = 9 * 60;
        const closeTime = 19 * 60;
        if (currentTimeInMinutes >= openTime && currentTimeInMinutes < closeTime) {
            isOpen = true;
            statusText = `Ouvert aujourd'hui • Ferme à 19h00`;
        } else {
            isOpen = false;
            statusText = currentTimeInMinutes < openTime
                ? `Fermé actuellement • Ouvre aujourd'hui à 09h00`
                : `Fermé ce soir • Ouvre demain à 08h00`;
        }
    } else {
        // Lundi à Samedi : 08h00 - 22h00
        const openTime = 8 * 60;
        const closeTime = 22 * 60;
        if (currentTimeInMinutes >= openTime && currentTimeInMinutes < closeTime) {
            isOpen = true;
            statusText = `Ouvert actuellement • Ferme à 22h00`;
        } else {
            isOpen = false;
            const nextOpen = (day === 6) ? "demain à 09h00" : "demain à 08h00";
            statusText = currentTimeInMinutes < openTime
                ? `Fermé ce matin • Ouvre aujourd'hui à 08h00`
                : `Fermé ce soir • Ouvre ${nextOpen}`;
        }
    }

    statusBadges.forEach(badge => {
        badge.className = `store-status-badge ${isOpen ? 'open' : 'closed'}`;
        badge.innerHTML = `<i class="fas fa-circle" aria-hidden="true"></i> ${statusText}`;
    });
}

// Mise à jour immédiate et toutes les 60 secondes
updateStoreStatus();
setInterval(updateStoreStatus, 60000);

// ============================================
// GESTION DU PANIER (LOCALSTORAGE)
// ============================================
const CART_STORAGE_KEY = "sigui_cart_items";

class ShoppingCart {
    constructor() {
        this.items = this.loadCart();
        this.initElements();
        this.bindEvents();
        this.render();
    }

    loadCart() {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            const items = saved ? JSON.parse(saved) : [];
            if (!Array.isArray(items)) return [];
            return items.filter(item => item && typeof item === "object")
                .map(item => ({
                    id: String(item.id || "").slice(0, 100),
                    name: String(item.name || "").slice(0, 160),
                    price: Number(item.price),
                    img: String(item.img || "logo-mark.webp").slice(0, 500),
                    quantity: Math.min(50, Math.max(1, Math.floor(Number(item.quantity) || 1)))
                }))
                .filter(item => item.id && item.name && Number.isFinite(item.price) && item.price > 0);
        } catch (e) {
            console.error("Erreur de chargement du panier :", e);
            return [];
        }
    }

    saveCart() {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
            this.updateBadges();
            this.renderDrawer();
        } catch (e) {
            console.error("Erreur de sauvegarde du panier :", e);
        }
    }

    initElements() {
        this.overlay = document.querySelector("#cartOverlay");
        this.drawer = document.querySelector("#cartDrawer");
        this.closeBtn = document.querySelector("#cartCloseBtn");
        this.openBtns = document.querySelectorAll(".cart-trigger-btn, #mobileCartBtn, #cartOpenBtn");
        this.itemsContainer = document.querySelector("#cartItemsList");
        this.subtotalEl = document.querySelector("#cartSubtotal");
        this.totalEl = document.querySelector("#cartTotal");
        this.drawerCountEl = document.querySelector("#drawerCartCount");
        this.checkoutBtn = document.querySelector("#cartCheckoutBtn");
        this.clearBtn = document.querySelector("#clearCartBtn");
        this.footerEl = document.querySelector("#cartDrawerFooter");
    }

    bindEvents() {
        // Ouverture du tiroir
        this.openBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                this.open();
            });
        });

        // Fermeture
        if (this.closeBtn) {
            this.closeBtn.addEventListener("click", () => this.close());
        }
        if (this.overlay) {
            this.overlay.addEventListener("click", () => this.close());
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.drawer && this.drawer.classList.contains("active")) {
                this.close();
            }
        });

        // Vider le panier
        if (this.clearBtn) {
            this.clearBtn.addEventListener("click", () => {
                if (confirm("Voulez-vous vraiment vider votre panier ?")) {
                    this.clear();
                    showToast("Votre panier a été vidé.");
                }
            });
        }

        // Commander sur WhatsApp
        if (this.checkoutBtn) {
            this.checkoutBtn.addEventListener("click", () => this.checkoutWhatsApp());
        }

        // Écouter les ajouts au panier depuis toute la page
        document.addEventListener("click", (e) => {
            const addBtn = e.target.closest(".btn-add-cart, .catalog-card-add");
            if (addBtn) {
                e.preventDefault();
                const id = addBtn.dataset.id;
                const name = addBtn.dataset.name;
                const price = parseInt(addBtn.dataset.price, 10) || 0;
                const img = addBtn.dataset.img || "logo-mark.webp";

                if (name && price) {
                    this.addItem({ id, name, price, img, quantity: 1 });
                    showToast(`<strong>${name}</strong> a été ajouté au panier !`, "Voir mon panier", () => this.open());
                }
            }
        });
    }

    open() {
        if (this.drawer && this.overlay) {
            this.drawer.classList.add("active");
            this.overlay.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    }

    close() {
        if (this.drawer && this.overlay) {
            this.drawer.classList.remove("active");
            this.overlay.classList.remove("active");
            document.body.style.overflow = "";
        }
    }

    addItem(product) {
        const existing = this.items.find(item => item.id === product.id || item.name === product.name);
        if (existing) {
            existing.quantity += (product.quantity || 1);
        } else {
            this.items.push({
                id: product.id || `prod_${Date.now()}`,
                name: product.name,
                price: product.price,
                img: product.img,
                quantity: product.quantity || 1
            });
        }
        this.saveCart();
    }

    updateQuantity(id, newQty) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        if (newQty <= 0) {
            this.removeItem(id);
        } else {
            item.quantity = newQty;
            this.saveCart();
        }
    }

    removeItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.saveCart();
    }

    clear() {
        this.items = [];
        this.saveCart();
    }

    getCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    getSubtotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    updateBadges() {
        const count = this.getCount();
        const badges = document.querySelectorAll(".cart-badge, #cartBadge, #mobileCartBadge");
        badges.forEach(badge => {
            badge.textContent = count;
            badge.classList.remove("bump");
            void badge.offsetWidth; // déclenche le reflow pour réactiver l'animation
            badge.classList.add("bump");
        });
    }

    render() {
        this.updateBadges();
        this.renderDrawer();
    }

    renderDrawer() {
        if (!this.itemsContainer) return;

        const count = this.getCount();
        const subtotal = this.getSubtotal();

        if (this.drawerCountEl) {
            this.drawerCountEl.textContent = `(${count} article${count > 1 ? 's' : ''})`;
        }

        if (this.subtotalEl) this.subtotalEl.textContent = formatFCFA(subtotal);
        if (this.totalEl) this.totalEl.textContent = formatFCFA(subtotal);

        if (this.items.length === 0) {
            this.itemsContainer.innerHTML = `
                <div class="cart-empty-state">
                    <i class="fas fa-basket-shopping" aria-hidden="true"></i>
                    <h4>Votre panier est vide</h4>
                    <p>Découvrez notre sélection de produits frais et d'épicerie du quotidien.</p>
                    <a href="catalogue.html" class="btn-explore" id="exploreCatalogBtn">
                        <i class="fas fa-th-large"></i> Parcourir le catalogue
                    </a>
                </div>
            `;
            if (this.footerEl) {
                this.footerEl.style.display = "none";
            }
            return;
        }

        if (this.footerEl) {
            this.footerEl.style.display = "block";
        }

        this.itemsContainer.innerHTML = this.items.map(item => `
            <div class="cart-item" data-id="${escapeHTML(item.id)}">
                <div class="cart-item-img">
                    <img src="${escapeHTML(item.img)}" alt="${escapeHTML(item.name)}" loading="lazy">
                </div>
                <div class="cart-item-info">
                    <h5>${escapeHTML(item.name)}</h5>
                    <div class="cart-item-price">${formatFCFA(item.price * item.quantity)}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-qty-box">
                        <button type="button" class="btn-qty-minus" data-id="${escapeHTML(item.id)}" aria-label="Diminuer">-</button>
                        <span>${item.quantity}</span>
                        <button type="button" class="btn-qty-plus" data-id="${escapeHTML(item.id)}" aria-label="Augmenter">+</button>
                    </div>
                    <button type="button" class="cart-item-del" data-id="${escapeHTML(item.id)}" title="Supprimer">
                        <i class="fas fa-trash-alt"></i> Retirer
                    </button>
                </div>
            </div>
        `).join("");

        // Événements pour boutons - et + dans les cartes du panier
        this.itemsContainer.querySelectorAll(".btn-qty-minus").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const item = this.items.find(i => i.id === id);
                if (item) this.updateQuantity(id, item.quantity - 1);
            });
        });

        this.itemsContainer.querySelectorAll(".btn-qty-plus").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const item = this.items.find(i => i.id === id);
                if (item) this.updateQuantity(id, item.quantity + 1);
            });
        });

        this.itemsContainer.querySelectorAll(".cart-item-del").forEach(btn => {
            btn.addEventListener("click", () => {
                this.removeItem(btn.dataset.id);
            });
        });
    }

    checkoutWhatsApp() {
        if (this.items.length === 0) {
            showToast("Votre panier est vide.");
            return;
        }

        const nameInput = document.querySelector("#cartCustomerName");
        const phoneInput = document.querySelector("#cartCustomerPhone");
        const addressInput = document.querySelector("#cartCustomerAddress");
        const noteInput = document.querySelector("#cartCustomerNote");

        const name = nameInput ? nameInput.value.trim() : "";
        const phone = phoneInput ? phoneInput.value.trim() : "";
        const address = addressInput ? addressInput.value.trim() : "";
        const note = noteInput ? noteInput.value.trim() : "";

        if (!name || !phone || !address) {
            showToast("⚠️ Merci d'indiquer votre nom, téléphone et adresse.");
            if (!name && nameInput) nameInput.focus();
            else if (!phone && phoneInput) phoneInput.focus();
            else if (!address && addressInput) addressInput.focus();
            return;
        }

        const total = this.getSubtotal();
        const itemsList = this.items
            .map(item => `• ${item.quantity}x ${item.name} (${formatFCFA(item.price * item.quantity)})`)
            .join("\n");

        const messageLines = [
            "🛒 *NOUVELLE COMMANDE - SIGUI DA SAGO*",
            "---------------------------------------",
            "📦 *Articles demandés :*",
            itemsList,
            "---------------------------------------",
            `💰 *Total estimé :* ${formatFCFA(total)}`,
            "",
            "👤 *Informations Client :*",
            `• Nom : ${name}`,
            `• Téléphone : ${phone}`,
            `• Lieu de livraison : ${address}`,
            note ? `• Précision / Monnaie : ${note}` : "",
            "---------------------------------------",
            "Merci de me confirmer la disponibilité et le délai de livraison !"
        ].filter(Boolean);

        sendToWhatsApp(messageLines.join("\n"));
        this.close();
    }
}

// Initialisation globale du panier
const appCart = new ShoppingCart();

// ============================================
// MODAL APERÇU RAPIDE (QUICK VIEW)
// ============================================
const quickModal = document.querySelector("#quickViewModal");
const quickOverlay = document.querySelector("#quickViewOverlay");
const quickCloseBtn = document.querySelector("#modalCloseBtn");
const modalImg = document.querySelector("#modalProductImg");
const modalBadge = document.querySelector("#modalProductBadge");
const modalCategory = document.querySelector("#modalProductCategory");
const modalTitle = document.querySelector("#modalProductTitle");
const modalPrice = document.querySelector("#modalProductPrice");
const modalDesc = document.querySelector("#modalProductDesc");
const modalQtyInput = document.querySelector("#modalQtyInput");
const modalQtyMinus = document.querySelector("#modalQtyMinus");
const modalQtyPlus = document.querySelector("#modalQtyPlus");
const modalAddBtn = document.querySelector("#modalAddToCartBtn");
const modalDirectWaBtn = document.querySelector("#modalDirectWaBtn");

let activeModalProduct = null;

function openQuickView(productData) {
    if (!quickModal || !quickOverlay) return;

    activeModalProduct = productData;
    if (modalImg) modalImg.src = productData.img || "logo-mark.webp";
    if (modalBadge) modalBadge.textContent = productData.badge || "Disponible";
    if (modalCategory) modalCategory.textContent = productData.category || "Magasin";
    if (modalTitle) modalTitle.textContent = productData.name;
    if (modalPrice) modalPrice.textContent = formatFCFA(productData.price);
    if (modalDesc) modalDesc.textContent = productData.desc || "Produit de qualité disponible immédiatement dans votre magasin SIGUI DA SAGO à Niamana.";
    if (modalQtyInput) modalQtyInput.value = 1;

    if (modalDirectWaBtn) {
        modalDirectWaBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Bonjour SIGUI DA SAGO, je souhaite commander : ${productData.name} (${formatFCFA(productData.price)})`)}`;
    }

    quickModal.classList.add("active");
    quickOverlay.classList.add("active");
    quickModal.setAttribute("aria-hidden", "false");
    if (quickCloseBtn) quickCloseBtn.focus();
    document.body.style.overflow = "hidden";
}

function closeQuickView() {
    if (!quickModal || !quickOverlay) return;
    quickModal.classList.remove("active");
    quickOverlay.classList.remove("active");
    quickModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

if (quickCloseBtn) quickCloseBtn.addEventListener("click", closeQuickView);
if (quickOverlay) quickOverlay.addEventListener("click", closeQuickView);

if (modalQtyMinus && modalQtyInput) {
    modalQtyMinus.addEventListener("click", () => {
        let val = parseInt(modalQtyInput.value, 10) || 1;
        if (val > 1) modalQtyInput.value = val - 1;
    });
}

if (modalQtyPlus && modalQtyInput) {
    modalQtyPlus.addEventListener("click", () => {
        let val = parseInt(modalQtyInput.value, 10) || 1;
        if (val < 50) modalQtyInput.value = val + 1;
    });
}

if (modalAddBtn) {
    modalAddBtn.addEventListener("click", () => {
        if (!activeModalProduct) return;
        const qty = parseInt(modalQtyInput ? modalQtyInput.value : 1, 10) || 1;
        appCart.addItem({
            id: activeModalProduct.id,
            name: activeModalProduct.name,
            price: activeModalProduct.price,
            img: activeModalProduct.img,
            quantity: qty
        });
        closeQuickView();
        showToast(`${activeModalProduct.name} (x${qty}) ajouté au panier !`, "Voir mon panier", () => appCart.open());
    });
}

// Déclenchement de l'aperçu rapide
document.addEventListener("click", (e) => {
    const previewBtn = e.target.closest(".btn-quick-preview");
    if (previewBtn) {
        e.preventDefault();
        const card = previewBtn.closest(".product, .catalog-card");
        if (card) {
            const id = card.dataset.id || previewBtn.dataset.id;
            const name = card.dataset.name || (card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "Produit");
            const price = parseInt(card.dataset.price, 10) || 2000;
            const img = card.dataset.img || (card.querySelector("img") ? card.querySelector("img").src : "logo-mark.webp");
            const badge = card.dataset.badge || (card.querySelector(".catalog-card-badge, .product-label") ? card.querySelector(".catalog-card-badge, .product-label").textContent.trim() : "En rayon");
            const category = card.dataset.category || "Épicerie";
            const desc = card.querySelector("p") ? card.querySelector("p").textContent.trim() : "";

            openQuickView({ id, name, price, img, badge, category, desc });
        }
    }
});

// ============================================
// SYSTÈME DE TOAST NOTIFICATIONS
// ============================================
let toastTimeout = null;

function showToast(message, actionText = null, actionCallback = null) {
    let container = document.querySelector("#toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    container.innerHTML = "";
    const toast = document.createElement("div");
    toast.className = "toast";
    const icon = document.createElement("i");
    icon.className = "fas fa-check-circle";
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = message;
    toast.append(icon, text);

    if (actionText && actionCallback) {
        const actionLink = document.createElement("a");
        actionLink.href = "#";
        actionLink.textContent = actionText;
        actionLink.addEventListener("click", (e) => {
            e.preventDefault();
            actionCallback();
        });
        toast.appendChild(actionLink);
    }

    container.appendChild(toast);

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================
// MENU MOBILE TOGGLE
// ============================================
const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");

if (menuBtn && navLinks) {
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Ouvrir le menu");
    menuBtn.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("active");
        menuBtn.setAttribute("aria-expanded", String(isOpen));
        menuBtn.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
        menuBtn.innerHTML = isOpen ? '<i class="fas fa-times" aria-hidden="true"></i>' : '<i class="fas fa-bars" aria-hidden="true"></i>';
    });
    
    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
            menuBtn.setAttribute("aria-expanded", "false");
            menuBtn.setAttribute("aria-label", "Ouvrir le menu");
            menuBtn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
        });
    });
}

// ============================================
// NAVBAR STICKY
// ============================================
const navbar = document.querySelector("header");

window.addEventListener("scroll", () => {
    if (navbar) {
        if (window.scrollY > 40) {
            navbar.classList.add("sticky");
        } else {
            navbar.classList.remove("sticky");
        }
    }
});

// ============================================
// SMOOTH SCROLL
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", function(e) {
        const href = this.getAttribute("href");
        if (href === "#" || href.length <= 1) return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
});

// ============================================
// FORMULAIRES WHATSAPP EXISTANTS
// ============================================
const deliveryForm = document.querySelector("#deliveryForm");
if (deliveryForm) {
    deliveryForm.addEventListener("submit", event => {
        event.preventDefault();
        const formData = new FormData(deliveryForm);
        const note = formData.get("note") ? formData.get("note").trim() : "";
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
        const phone = formData.get("phone") ? formData.get("phone").trim() : "";
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
const hiddenElements = document.querySelectorAll(".card, .product, .stat-card, .testimonial-card, .hour-card, .contact-box, .section-head, .catalog-card, .payment-badge-card");

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
        }
    });
}, observerOptions) : null;

hiddenElements.forEach(el => {
    if (observer) {
        el.classList.add("hidden");
        observer.observe(el);
    } else {
        el.classList.add("show");
    }
});

// ============================================
// BOUTON RETOUR EN HAUT
// ============================================
if (!document.querySelector(".top-btn")) {
    const topButton = document.createElement("button");
    topButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
    topButton.className = "top-btn";
    topButton.setAttribute("aria-label", "Retour en haut");
    document.body.appendChild(topButton);

    window.addEventListener("scroll", () => {
        if (window.scrollY > 400) {
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
}

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
        if (current < target) {
            element.innerText = Math.ceil(current + increment);
            requestAnimationFrame(updateCount);
        } else {
            element.innerText = target;
        }
    };

    updateCount();
};

const counterObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            countUp(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 }) : null;

counters.forEach(counter => counterObserver ? counterObserver.observe(counter) : countUp(counter));

// ============================================
// ANNÉE AUTOMATIQUE FOOTER
// ============================================
const year = document.querySelector("#year");
if (year) {
    year.textContent = new Date().getFullYear();
}

// ============================================
// LAZY LOADING IMAGES
// ============================================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img').forEach(img => imageObserver.observe(img));
}

// ============================================
// LOGIQUE DU CATALOGUE (RECHERCHE & FILTRES)
// ============================================
const searchInput = document.querySelector("#catalogSearch");
const filterButtons = document.querySelectorAll(".filter-btn");
const catalogCards = document.querySelectorAll(".catalog-card");
const noResultsMsg = document.querySelector("#noResults");

if (catalogCards.length > 0) {
    let currentCategory = "all";
    let searchQuery = "";

    function filterProducts() {
        let visibleCount = 0;
        const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizedQuery = normalize(searchQuery);

        catalogCards.forEach(card => {
            const category = card.dataset.category || "";
            const title = card.querySelector("h3") ? normalize(card.querySelector("h3").textContent.toLowerCase()) : "";
            const desc = card.querySelector("p") ? normalize(card.querySelector("p").textContent.toLowerCase()) : "";

            const matchesCategory = (currentCategory === "all" || category === currentCategory);
            const matchesSearch = (normalizedQuery === "" || title.includes(normalizedQuery) || desc.includes(normalizedQuery));

            if (matchesCategory && matchesSearch) {
                card.style.display = "flex";
                visibleCount++;
            } else {
                card.style.display = "none";
            }
        });

        if (noResultsMsg) {
            noResultsMsg.style.display = visibleCount === 0 ? "block" : "none";
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            filterProducts();
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentCategory = btn.dataset.filter || "all";
            filterProducts();
        });
    });
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUEUMzmhgchnxYJE9PUq6gWMPsVdMkL6rrOxPjam32SGk9po6SbE5GZZVdoiPTEXt2a6DaQ_-NvHMH/pub?gid=0&single=true&output=csv";

const WHATSAPP_NUMBER = "5217121368195";

const state = {
  products: [],
  filteredProducts: [],
  cart: JSON.parse(localStorage.getItem("LunariaCart") || "[]"),
  activeNeed: ""
};

const elements = {
  grid: document.getElementById("productGrid"),
  loading: document.getElementById("loadingMessage"),
  error: document.getElementById("errorMessage"),

  search: document.getElementById("searchInput"),
  sort: document.getElementById("sortSelect"),

  cartDrawer: document.getElementById("cartDrawer"),
  overlay: document.getElementById("overlay"),
  cartItems: document.getElementById("cartItems"),
  cartCount: document.getElementById("cartCount"),
  cartTotal: document.getElementById("cartTotal"),

  recommendations: document.getElementById("recommendations"),
  recommendationItems: document.getElementById("recommendationItems"),

  modal: document.getElementById("productModal"),
  modalContent: document.getElementById("modalContent"),

  featuredGrid: document.getElementById("featuredGrid"),
  needsGrid: document.getElementById("needsGrid"),

  brandMenu: document.getElementById("brandMenu"),
  categoryMenu: document.getElementById("categoryMenu"),

  resultsView: document.getElementById("resultsView"),
  resultsGrid: document.getElementById("resultsGrid"),
  resultsTitle: document.getElementById("resultsTitle"),
  resultsEyebrow: document.getElementById("resultsEyebrow"),
  resultsDescription: document.getElementById("resultsDescription"),
  backHomeButton: document.getElementById("backHomeButton"),

  catalogSection: document.getElementById("catalogo"),
  featuredSection: document.getElementById("destacados"),
  needsSection: document.getElementById("necesidades")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  renderCart();

  try {
    const response = await fetch(`${CSV_URL}&t=${Date.now()}`);

    if (!response.ok) {
      throw new Error("No se pudo cargar el CSV.");
    }

    const csv = await response.text();

    state.products = parseCSV(csv)
      .map(normalizeProduct)
      .filter(product => product.name);

    if (!state.products.length) {
      throw new Error("El CSV no contiene productos.");
    }

    renderNeeds();
    renderBrandMenu();
    renderCategoryMenu();
    renderFeaturedProducts();
    renderCatalog();
  } catch (error) {
    console.error(error);
    showError(
      "No se pudo cargar el catálogo. Revisa el enlace CSV y los encabezados de Google Sheets."
    );
  }
}

function bindEvents() {
  document.querySelectorAll("[data-home-link]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showHomeView();
    });
  });

  document.querySelectorAll("[data-catalog-link]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showCatalogView();
    });
  });

  const menuToggle = document.getElementById("menuToggle");

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const mainNav = document.getElementById("mainNav");

      if (mainNav) {
        mainNav.classList.toggle("open");
      }
    });
  }

  const openCartButton = document.getElementById("openCart");

  if (openCartButton) {
    openCartButton.addEventListener("click", openCart);
  }

  const closeCartButton = document.getElementById("closeCart");

  if (closeCartButton) {
    closeCartButton.addEventListener("click", closeCart);
  }

  const clearCartButton = document.getElementById("clearCart");

  if (clearCartButton) {
    clearCartButton.addEventListener("click", clearCart);
  }

  const whatsappButton = document.getElementById("whatsappOrder");

  if (whatsappButton) {
    whatsappButton.addEventListener("click", sendWhatsAppOrder);
  }

  const closeModalButton = document.getElementById("closeModal");

  if (closeModalButton) {
    closeModalButton.addEventListener("click", closeModal);
  }

  if (elements.overlay) {
    elements.overlay.addEventListener("click", closeCart);
  }

  if (elements.backHomeButton) {
    elements.backHomeButton.addEventListener("click", showHomeView);
  }

  if (elements.needsGrid) {
    elements.needsGrid.addEventListener("click", event => {
      const button = event.target.closest("[data-need]");

      if (!button) return;

      showProductsByNeed(button.dataset.need);
    });
  }

  if (elements.brandMenu) {
    elements.brandMenu.addEventListener("click", event => {
      const button = event.target.closest("[data-brand]");

      if (!button) return;

      const brand = button.dataset.brand;

      const products = state.products.filter(product =>
        product.brand.toLowerCase() === brand.toLowerCase()
      );

      renderResults(
        products,
        brand,
        "COMPRAR POR MARCA",
        `Productos disponibles de ${brand}.`
      );

      closeParentDetails(button);
    });
  }

  if (elements.categoryMenu) {
    elements.categoryMenu.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");

      if (!button) return;

      const category = button.dataset.category;

      const products = state.products.filter(product =>
        product.category.toLowerCase() === category.toLowerCase()
      );

      renderResults(
        products,
        category,
        "COMPRAR POR CATEGORÍA",
        `Productos disponibles en ${category}.`
      );

      closeParentDetails(button);
    });
  }

  if (elements.search) {
    elements.search.addEventListener("input", renderCatalog);
  }

  if (elements.sort) {
    elements.sort.addEventListener("change", renderCatalog);
  }

  if (elements.grid) {
    elements.grid.addEventListener("click", handleProductButtons);
  }

  if (elements.featuredGrid) {
    elements.featuredGrid.addEventListener("click", handleProductButtons);
  }

  if (elements.resultsGrid) {
    elements.resultsGrid.addEventListener("click", handleProductButtons);
  }

  if (elements.cartItems) {
    elements.cartItems.addEventListener("click", event => {
      const button = event.target.closest("[data-cart-action]");

      if (!button) return;

      const id = button.dataset.id;
      const action = button.dataset.cartAction;

      if (action === "increase") {
        changeQuantity(id, 1);
      }

      if (action === "decrease") {
        changeQuantity(id, -1);
      }

      if (action === "remove") {
        removeFromCart(id);
      }
    });
  }

  if (elements.recommendationItems) {
    elements.recommendationItems.addEventListener("click", event => {
      const button = event.target.closest("[data-recommendation]");

      if (button) {
        addToCart(button.dataset.recommendation);
      }
    });
  }
}

function handleProductButtons(event) {
  const addButton = event.target.closest("[data-add]");
  const viewButton = event.target.closest("[data-view]");

  if (addButton) {
    addToCart(addButton.dataset.add);
  }

  if (viewButton) {
    openProductModal(viewButton.dataset.view);
  }
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if (
      (char === "\n" || char === "\r") &&
      !insideQuotes
    ) {
      if (char === "\r" && next === "\n") {
        i++;
      }

      row.push(cell.trim());

      if (row.some(value => value !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map(header =>
    header.replace(/^\uFEFF/, "").trim()
  );

  return rows.slice(1).map(values => {
    const object = {};

    headers.forEach((header, index) => {
      object[header] = values[index] || "";
    });

    return object;
  });
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getCellValue(row, names) {
  const normalizedRow = {};

  Object.keys(row).forEach(key => {
    normalizedRow[normalizeHeader(key)] = row[key];
  });

  for (const name of names) {
    const normalizedName = normalizeHeader(name);

    if (normalizedRow[normalizedName] !== undefined) {
      return normalizedRow[normalizedName];
    }
  }

  return "";
}

function normalizeProduct(row, index) {
  const brand = getCellValue(row, ["Marca"]);

  const name = getCellValue(row, [
    "Nombre del Producto",
    "Producto"
  ]);

  const presentation = getCellValue(row, [
    "Presentación",
    "Presentacion"
  ]);

  const category = getCellValue(row, [
    "Categoría",
    "Categoria"
  ]);

  const benefits = getCellValue(row, [
    "Beneficios",
    "Descripción",
    "Descripcion"
  ]);

  const idealFor = getCellValue(row, [
    "Ideal para",
    "Recomendado para",
    "Tipo de piel"
  ]);

  const needs = getCellValue(row, [
    "Necesidades",
    "Necesidad"
  ]);

  const howToUse = getCellValue(row, [
    "Modo de uso",
    "Cómo usar",
    "Como usar",
    "Instrucciones de uso"
  ]);

  const ingredients = getCellValue(row, [
    "Ingredientes",
    "Lista completa de Ingredientes",
    "INCI"
  ]);

  const image = getCellValue(row, [
    "URL de Imagen",
    "Imagen",
    "Image URL"
  ]);

  const featured = getCellValue(row, [
    "Destacado",
    "Featured"
  ]);

  const internalCost = parseMoney(getCellValue(row, [
    "Costo Original Interno",
    "Costo Base",
    "Costo"
  ]));

  const sheetPrice = parseMoney(getCellValue(row, [
    "Precio de Venta",
    "Precio venta",
    "Precio"
  ]));

  const price = sheetPrice || (
    internalCost
      ? internalCost < 300
        ? internalCost + 100
        : internalCost / 0.70
      : 0
  );

  return {
    id: `${brand || "producto"}-${name || index}`
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ]+/gi, "-"),

    brand,
    name,
    presentation,
    category,
    benefits,
    idealFor,
    needs,
    howToUse,
    ingredients,
    image,
    featured,
    internalCost,
    price
  };
}

function parseMoney(value) {
  return Number(
    String(value || "").replace(/[^0-9.-]+/g, "")
  ) || 0;
}

function renderNeeds() {
  if (!elements.needsGrid) return;

  const needs = [
    ...new Set(
      state.products.flatMap(product =>
        String(product.needs || "")
          .split("|")
          .map(need => need.trim())
          .filter(Boolean)
      )
    )
  ];

  if (!needs.length) {
    elements.needsGrid.innerHTML = `
      <p class="status-message">
        Agrega valores en la columna “Necesidades” de Google Sheets.
      </p>
    `;

    return;
  }

  elements.needsGrid.innerHTML = needs.map(need => `
    <button
      class="need-card"
      type="button"
      data-need="${escapeAttribute(need)}"
    >
      ${escapeHTML(need)}
    </button>
  `).join("");
}

function renderBrandMenu() {
  if (!elements.brandMenu) return;

  const brands = [
    ...new Set(
      state.products
        .map(product => product.brand)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "es"));

  elements.brandMenu.innerHTML = brands.map(brand => `
    <button
      type="button"
      class="dropdown-option"
      data-brand="${escapeAttribute(brand)}"
    >
      ${escapeHTML(brand)}
    </button>
  `).join("");
}

function renderCategoryMenu() {
  if (!elements.categoryMenu) return;

  const categories = [
    ...new Set(
      state.products
        .map(product => product.category)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "es"));

  elements.categoryMenu.innerHTML = categories.map(category => `
    <button
      type="button"
      class="dropdown-option"
      data-category="${escapeAttribute(category)}"
    >
      ${escapeHTML(category)}
    </button>
  `).join("");
}

function renderFeaturedProducts() {
  if (!elements.featuredGrid) {
    return;
  }

  const featuredProducts = state.products.filter(product => {
    const value = normalizeHeader(product.featured);

    return value === "si" || value === "yes";
  });

  if (!featuredProducts.length) {
    elements.featuredGrid.innerHTML = `
      <p class="status-message">
        No hay productos marcados como destacados.
      </p>
    `;

    return;
  }

  elements.featuredGrid.innerHTML =
    featuredProducts.map(renderProductCard).join("");
}

function getCatalogProducts() {
  const search = elements.search
    ? elements.search.value.trim().toLowerCase()
    : "";

  const sort = elements.sort
    ? elements.sort.value
    : "default";

  let products = state.products.filter(product => {
    const searchable = [
      product.brand,
      product.name,
      product.category,
      product.benefits,
      product.idealFor,
      product.howToUse,
      product.ingredients
    ]
      .join(" ")
      .toLowerCase();

    return !search || searchable.includes(search);
  });

  if (sort === "price-low") {
    products.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-high") {
    products.sort((a, b) => b.price - a.price);
  }

  if (sort === "name") {
    products.sort((a, b) =>
      a.name.localeCompare(b.name, "es")
    );
  }

  return products;
}

function renderCatalog() {
  if (!elements.grid) return;

  const products = getCatalogProducts();

  if (elements.loading) {
    elements.loading.classList.add("hidden");
  }

  if (!products.length) {
    elements.grid.innerHTML = `
      <p class="status-message">
        No encontramos productos con esa búsqueda.
      </p>
    `;

    return;
  }

  elements.grid.innerHTML =
    products.map(renderProductCard).join("");
}

function renderResults(products, title, eyebrow, description) {
  if (
    !elements.resultsView ||
    !elements.resultsGrid
  ) {
    return;
  }

  elements.resultsEyebrow.textContent =
    eyebrow || "SELECCIÓN";

  elements.resultsTitle.textContent =
    title || "Productos";

  elements.resultsDescription.textContent =
    description || "Productos seleccionados para ti.";

  if (!products.length) {
    elements.resultsGrid.innerHTML = `
      <p class="status-message">
        No encontramos productos en esta selección.
      </p>
    `;
  } else {
    elements.resultsGrid.innerHTML =
      products.map(renderProductCard).join("");
  }

  showOnlyResultsView();
}

function renderProductCard(product) {
  const fallbackImage =
    "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22 viewBox=%220 0 300 300%22%3E%3Crect width=%22300%22 height=%22300%22 fill=%22%23f9d8e4%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ef68ab%22 font-family=%22Arial%22 font-size=%2218%22%3ELunaria%3C/text%3E%3C/svg%3E";

  return `
    <article class="product-card">
      <div class="product-image-wrap">
        <span class="product-brand">
          ${escapeHTML(product.brand)}
        </span>

        <img
          class="product-image"
          src="${escapeAttribute(product.image || fallbackImage)}"
          alt="${escapeAttribute(product.name)}"
          loading="lazy"
          onerror="this.src='${fallbackImage}'"
        >
      </div>

      <div class="product-info">
        <p class="product-category">
          ${escapeHTML(product.category)}
        </p>

        <h3 class="product-name">
          ${escapeHTML(product.name)}
        </h3>

        <p class="product-presentation">
          ${escapeHTML(product.presentation)}
        </p>

        <div class="product-bottom">
          <span class="product-price">
            ${formatMoney(product.price)}
          </span>

          <button
            class="view-button"
            type="button"
            data-view="${escapeAttribute(product.id)}"
          >
            Ver detalle
          </button>

          <button
            class="add-button"
            type="button"
            data-add="${escapeAttribute(product.id)}"
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  `;
}

function showCatalogView() {
  if (elements.featuredSection) {
    elements.featuredSection.classList.add("hidden");
  }

  if (elements.needsSection) {
    elements.needsSection.classList.add("hidden");
  }

  if (elements.resultsView) {
    elements.resultsView.classList.add("hidden");
  }

  if (elements.catalogSection) {
    elements.catalogSection.classList.remove("hidden");
    elements.catalogSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  renderCatalog();
  history.replaceState(null, "", "#catalogo");
}

function showOnlyResultsView() {
  if (elements.featuredSection) {
    elements.featuredSection.classList.add("hidden");
  }

  if (elements.needsSection) {
    elements.needsSection.classList.add("hidden");
  }

  if (elements.catalogSection) {
    elements.catalogSection.classList.add("hidden");
  }

  if (elements.resultsView) {
    elements.resultsView.classList.remove("hidden");
    elements.resultsView.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function showHomeView() {
  if (elements.resultsView) {
    elements.resultsView.classList.add("hidden");
  }

  if (elements.catalogSection) {
    elements.catalogSection.classList.add("hidden");
  }

  if (elements.featuredSection) {
    elements.featuredSection.classList.remove("hidden");
  }

  if (elements.needsSection) {
    elements.needsSection.classList.remove("hidden");
  }

  const hero = document.getElementById("inicio");

  if (hero) {
    hero.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  history.replaceState(null, "", "#inicio");
}

function showProductsByNeed(need) {
  const selectedNeed = String(need)
    .trim()
    .toLowerCase();

  const products = state.products.filter(product => {
    const productNeeds = String(product.needs || "")
      .split("|")
      .map(value => value.trim().toLowerCase())
      .filter(Boolean);

    return productNeeds.includes(selectedNeed);
  });

  renderResults(
    products,
    need,
    "COMPRAR POR NECESIDAD",
    `Productos seleccionados para: ${need}.`
  );

  history.replaceState(
    null,
    "",
    `#necesidad-${slugify(need)}`
  );
}

function openProductModal(id) {
  const product = findProduct(id);

  if (
    !product ||
    !elements.modal ||
    !elements.modalContent
  ) {
    return;
  }

  elements.modalContent.innerHTML = `
    <div class="modal-product">
      <img
        src="${escapeAttribute(product.image)}"
        alt="${escapeAttribute(product.name)}"
        onerror="this.style.visibility='hidden'"
      >

      <div>
        <p class="eyebrow">
          ${escapeHTML(product.brand)} ·
          ${escapeHTML(product.category)}
        </p>

        <h2>${escapeHTML(product.name)}</h2>

        <p>${escapeHTML(product.presentation)}</p>

        <p class="modal-price">
          ${formatMoney(product.price)}
        </p>

        <h3>Beneficios</h3>
        <p>${escapeHTML(product.benefits)}</p>

        <h3>Ideal para</h3>
        <p>${escapeHTML(product.idealFor)}</p>

        <h3>Modo de uso</h3>
        <p>${escapeHTML(product.howToUse)}</p>

        <h3>Ingredientes</h3>
        <p>${escapeHTML(product.ingredients)}</p>

        <button
          class="primary-button"
          type="button"
          data-modal-add="${escapeAttribute(product.id)}"
        >
          Agregar al carrito
        </button>
      </div>
    </div>
  `;

  elements.modal.classList.remove("hidden");
  elements.modal.setAttribute("aria-hidden", "false");

  const addButton =
    elements.modalContent.querySelector("[data-modal-add]");

  if (addButton) {
    addButton.addEventListener("click", () => {
      addToCart(id);
      closeModal();
    });
  }
}

function findProduct(id) {
  return state.products.find(product => product.id === id);
}

function addToCart(id) {
  const product = findProduct(id);

  if (!product) return;

  const existing = state.cart.find(item => item.id === id);

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id,
      quantity: 1
    });
  }

  saveCart();
  renderCart();
  openCart();
}

function changeQuantity(id, amount) {
  const item = state.cart.find(cartItem => cartItem.id === id);

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter(cartItem => cartItem.id !== id);
  }

  saveCart();
  renderCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
}

function clearCart() {
  state.cart = [];
  saveCart();
  renderCart();
}

function renderCart() {
  if (
    !elements.cartItems ||
    !elements.cartCount ||
    !elements.cartTotal
  ) {
    return;
  }

  const detailedCart = state.cart
    .map(item => ({
      ...item,
      product: findProduct(item.id)
    }))
    .filter(item => item.product);

  const count = detailedCart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const total = detailedCart.reduce(
    (sum, item) =>
      sum + item.product.price * item.quantity,
    0
  );

  elements.cartCount.textContent = count;
  elements.cartTotal.textContent = formatMoney(total);

  if (!detailedCart.length) {
    elements.cartItems.innerHTML = `
      <div class="cart-empty">
        Tu carrito está esperando productos bonitos ✦
      </div>
    `;
  } else {
    elements.cartItems.innerHTML = detailedCart.map(
      ({ product, quantity }) => `
        <div class="cart-item">
          <img
            src="${escapeAttribute(product.image)}"
            alt="${escapeAttribute(product.name)}"
          >

          <div>
            <h4>${escapeHTML(product.name)}</h4>
            <p>${formatMoney(product.price * quantity)}</p>

            <div class="quantity-controls">
              <button
                type="button"
                data-cart-action="decrease"
                data-id="${escapeAttribute(product.id)}"
              >
                −
              </button>

              <span>${quantity}</span>

              <button
                type="button"
                data-cart-action="increase"
                data-id="${escapeAttribute(product.id)}"
              >
                +
              </button>
            </div>
          </div>

          <button
            class="remove-item"
            type="button"
            data-cart-action="remove"
            data-id="${escapeAttribute(product.id)}"
          >
            ×
          </button>
        </div>
      `
    ).join("");
  }

  renderRecommendations(detailedCart);
}

function renderRecommendations(detailedCart) {
  if (
    !elements.recommendations ||
    !elements.recommendationItems
  ) {
    return;
  }

  if (!detailedCart.length) {
    elements.recommendations.classList.add("hidden");
    return;
  }

  const cartProducts = detailedCart.map(item => item.product);
  const lastProduct = cartProducts[cartProducts.length - 1];

  const hasSun = cartProducts.some(product =>
    product.category.toLowerCase().includes("solar") ||
    product.name.toLowerCase().includes("sun") ||
    product.name.toLowerCase().includes("spf")
  );

  const recommendations = state.products
    .filter(product => {
      const alreadyInCart = cartProducts.some(
        item => item.id === product.id
      );

      const sameBrand =
        product.brand.toLowerCase() ===
        lastProduct.brand.toLowerCase();

      const isSun =
        product.category.toLowerCase().includes("solar") ||
        product.name.toLowerCase().includes("sun") ||
        product.name.toLowerCase().includes("spf");

      return !alreadyInCart &&
        ((hasSun ? sameBrand : isSun) || sameBrand);
    })
    .slice(0, 3);

  if (!recommendations.length) {
    elements.recommendations.classList.add("hidden");
    return;
  }

  elements.recommendations.classList.remove("hidden");

  elements.recommendationItems.innerHTML =
    recommendations.map(product => `
      <div class="recommendation-product">
        <span>${escapeHTML(product.name)}</span>

        <button
          type="button"
          data-recommendation="${escapeAttribute(product.id)}"
        >
          Agregar
        </button>
      </div>
    `).join("");
}

function openCart() {
  if (elements.cartDrawer) {
    elements.cartDrawer.classList.add("open");
    elements.cartDrawer.setAttribute("aria-hidden", "false");
  }

  if (elements.overlay) {
    elements.overlay.classList.remove("hidden");
  }

  document.body.style.overflow = "hidden";
}

function closeCart() {
  if (elements.cartDrawer) {
    elements.cartDrawer.classList.remove("open");
    elements.cartDrawer.setAttribute("aria-hidden", "true");
  }

  if (elements.overlay) {
    elements.overlay.classList.add("hidden");
  }

  document.body.style.overflow = "";
}

function closeModal() {
  if (elements.modal) {
    elements.modal.classList.add("hidden");
    elements.modal.setAttribute("aria-hidden", "true");
  }
}

function sendWhatsAppOrder() {
  if (!state.cart.length) {
    alert("Tu carrito está vacío. ¡Agrega algunos productos primero!");
    return;
  }

  const detailedCart = state.cart
    .map(item => ({
      ...item,
      product: findProduct(item.id)
    }))
    .filter(item => item.product);

  let message =
    "¡Hola! Me gustaría realizar el siguiente pedido:\n\n";

  let total = 0;

  detailedCart.forEach(({ product, quantity }) => {
    const subtotal = product.price * quantity;
    total += subtotal;

    message +=
      `• ${quantity}x ${product.name} (${product.brand}) - ` +
      `${formatMoney(subtotal)}\n`;
  });

  message += `\nTotal: ${formatMoney(total)}`;

  const whatsappUrl =
    `https://wa.me/${WHATSAPP_NUMBER}?text=` +
    encodeURIComponent(message);

  window.open(whatsappUrl, "_blank");
}

function closeParentDetails(element) {
  const details = element.closest("details");

  if (details) {
    details.open = false;
  }
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatMoney(amount) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(amount || 0);
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function saveCart() {
  localStorage.setItem(
    "LunariaCart",
    JSON.stringify(state.cart)
  );
}

function showError(message) {
  if (elements.loading) {
    elements.loading.classList.add("hidden");
  }

  if (elements.error) {
    elements.error.textContent = message;
    elements.error.classList.remove("hidden");
  }
}

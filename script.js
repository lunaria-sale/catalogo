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
  brandFilter: document.getElementById("brandFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
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
  needsGrid: document.getElementById("needsGrid")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  renderCart();

  if (!CSV_URL.startsWith("http")) {
    showError("Configura primero el enlace CSV de Google Sheets en script.js.");
    return;
  }

  try {
    const response = await fetch(`${CSV_URL}&t=${Date.now()}`);

    if (!response.ok) {
      throw new Error("No fue posible leer el CSV.");
    }

    const csv = await response.text();

    state.products = parseCSV(csv)
      .map(normalizeProduct)
      .filter(product => product.name);

    if (!state.products.length) {
      throw new Error("El CSV no contiene productos válidos.");
    }

    populateFilters();
    renderNeeds();
    renderFeaturedProducts();
    applyFilters();
  } catch (error) {
    console.error("Error cargando catálogo:", error);
    showError("No se pudo cargar el catálogo. Revisa el enlace CSV de Google Sheets.");
  }
}

function bindEvents() {
  if (elements.brandFilter) {
    elements.brandFilter.addEventListener("change", applyFilters);
  }

  if (elements.categoryFilter) {
    elements.categoryFilter.addEventListener("change", applyFilters);
  }

  if (elements.search) {
    elements.search.addEventListener("input", applyFilters);
  }

  if (elements.sort) {
    elements.sort.addEventListener("change", applyFilters);
  }

  const openCartButton = document.getElementById("openCart");
  const closeCartButton = document.getElementById("closeCart");
  const clearCartButton = document.getElementById("clearCart");
  const whatsappButton = document.getElementById("whatsappOrder");
  const closeModalButton = document.getElementById("closeModal");
  const menuToggleButton = document.getElementById("menuToggle");

  if (openCartButton) {
    openCartButton.addEventListener("click", openCart);
  }

  if (closeCartButton) {
    closeCartButton.addEventListener("click", closeCart);
  }

  if (elements.overlay) {
    elements.overlay.addEventListener("click", closeCart);
  }

  if (clearCartButton) {
    clearCartButton.addEventListener("click", clearCart);
  }

  if (whatsappButton) {
    whatsappButton.addEventListener("click", sendWhatsAppOrder);
  }

  if (closeModalButton) {
    closeModalButton.addEventListener("click", closeModal);
  }

  if (menuToggleButton) {
    menuToggleButton.addEventListener("click", () => {
      const mainNav = document.getElementById("mainNav");

      if (mainNav) {
        mainNav.classList.toggle("open");
      }
    });
  }

  if (elements.needsGrid) {
    elements.needsGrid.addEventListener("click", event => {
      const button = event.target.closest(".need-card");

      if (!button) return;

      const selectedNeed = button.dataset.need.trim();

      document.querySelectorAll(".need-card").forEach(item => {
        item.classList.remove("active");
      });

      if (state.activeNeed === selectedNeed) {
        state.activeNeed = "";
      } else {
        state.activeNeed = selectedNeed;
        button.classList.add("active");
      }

      applyFilters();

      const catalog = document.getElementById("catalogo");

      if (catalog) {
        catalog.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  if (elements.grid) {
    elements.grid.addEventListener("click", event => {
      const addButton = event.target.closest("[data-add]");
      const viewButton = event.target.closest("[data-view]");

      if (addButton) {
        addToCart(addButton.dataset.add);
      }

      if (viewButton) {
        openProductModal(viewButton.dataset.view);
      }
    });
  }

  if (elements.featuredGrid) {
    elements.featuredGrid.addEventListener("click", event => {
      const addButton = event.target.closest("[data-add]");
      const viewButton = event.target.closest("[data-view]");

      if (addButton) {
        addToCart(addButton.dataset.add);
      }

      if (viewButton) {
        openProductModal(viewButton.dataset.view);
      }
    });
  }

  if (elements.cartItems) {
    elements.cartItems.addEventListener("click", event => {
      const actionButton = event.target.closest("[data-cart-action]");

      if (!actionButton) return;

      const id = actionButton.dataset.id;
      const action = actionButton.dataset.cartAction;

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

function getCellValue(row, names) {
  const normalizedRow = {};

  Object.keys(row).forEach(key => {
    const normalizedKey = normalizeHeader(key);
    normalizedRow[normalizedKey] = row[key];
  });

  for (const name of names) {
    const normalizedName = normalizeHeader(name);

    if (normalizedRow[normalizedName] !== undefined) {
      return normalizedRow[normalizedName];
    }
  }

  return "";
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  ]) || "No";

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
      ? (
        internalCost < 300
          ? internalCost + 100
          : internalCost / 0.70
      )
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
  if (typeof value === "number") {
    return value;
  }

  return Number(
    String(value || "").replace(/[^0-9.-]+/g, "")
  ) || 0;
}

function populateFilters() {
  if (!elements.brandFilter || !elements.categoryFilter) {
    return;
  }

  const brands = [
    ...new Set(
      state.products
        .map(product => product.brand)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "es"));

  const categories = [
    ...new Set(
      state.products
        .map(product => product.category)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "es"));

  elements.brandFilter.innerHTML =
    `<option value="">Todas las marcas</option>`;

  elements.categoryFilter.innerHTML =
    `<option value="">Todas las categorías</option>`;

  brands.forEach(brand => {
    elements.brandFilter.insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeAttribute(brand)}">${escapeHTML(brand)}</option>`
    );
  });

  categories.forEach(category => {
    elements.categoryFilter.insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeAttribute(category)}">${escapeHTML(category)}</option>`
    );
  });
}

function renderNeeds() {
  if (!elements.needsGrid) {
    return;
  }

  const needs = [
    ...new Set(
      state.products
        .flatMap(product =>
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

function applyFilters() {
  const brand = elements.brandFilter
    ? elements.brandFilter.value.toLowerCase()
    : "";

  const category = elements.categoryFilter
    ? elements.categoryFilter.value.toLowerCase()
    : "";

  const search = elements.search
    ? elements.search.value.toLowerCase().trim()
    : "";

  const sort = elements.sort
    ? elements.sort.value
    : "";

  state.filteredProducts = state.products.filter(product => {
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

    const productNeeds = String(product.needs || "")
      .split("|")
      .map(need => need.trim().toLowerCase())
      .filter(Boolean);

    const selectedNeed = String(state.activeNeed || "")
      .trim()
      .toLowerCase();

    const matchesNeed =
      !selectedNeed ||
      productNeeds.includes(selectedNeed);

    return (
      (!brand || product.brand.toLowerCase() === brand) &&
      (!category || product.category.toLowerCase() === category) &&
      (!search || searchable.includes(search)) &&
      matchesNeed
    );
  });

  if (sort === "price-low") {
    state.filteredProducts.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-high") {
    state.filteredProducts.sort((a, b) => b.price - a.price);
  }

  if (sort === "name") {
    state.filteredProducts.sort((a, b) =>
      a.name.localeCompare(b.name, "es")
    );
  }

  renderProducts();
}

function renderFeaturedProducts() {
  if (!elements.featuredGrid) {
    return;
  }

  const featuredProducts = state.products
    .filter(product => {
      const value = String(product.featured)
        .trim()
        .toLowerCase();

      return value === "sí" ||
        value === "si" ||
        value === "yes";
    })
    .slice(0, 8);

  if (!featuredProducts.length) {
    elements.featuredGrid.innerHTML = `
      <p class="status-message">
        Próximamente encontrarás nuestra selección favorita.
      </p>
    `;

    return;
  }

  elements.featuredGrid.innerHTML =
    featuredProducts.map(renderProductCard).join("");
}

function renderProducts() {
  if (elements.loading) {
    elements.loading.classList.add("hidden");
  }

  if (!elements.grid) {
    return;
  }

  if (!state.filteredProducts.length) {
    elements.grid.innerHTML = `
      <p class="status-message">
        No encontramos productos con esos filtros.
      </p>
    `;

    return;
  }

  elements.grid.innerHTML =
    state.filteredProducts.map(renderProductCard).join("");
}

function renderProductCard(product) {
  return `
    <article class="product-card">
      <div class="product-image-wrap">
        <span class="product-brand">
          ${escapeHTML(product.brand)}
        </span>

        <img
          class="product-image"
          src="${escapeAttribute(product.image)}"
          alt="${escapeAttribute(product.name)}"
          loading="lazy"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22 viewBox=%220 0 300 300%22%3E%3Crect width=%22300%22 height=%22300%22 fill=%22%23f9d8e4%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ef68ab%22 font-family=%22Arial%22 font-size=%2218%22%3ELunaria%3C/text%3E%3C/svg%3E'">

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
            data-view="${escapeAttribute(product.id)}"
          >
            Ver detalle
          </button>

          <button
            class="add-button"
            data-add="${escapeAttribute(product.id)}"
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  `;
}

function findProduct(id) {
  return state.products.find(product => product.id === id);
}

function addToCart(id) {
  const product = findProduct(id);

  if (!product) {
    return;
  }

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

  if (!item) {
    return;
  }

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
    !elements.cartCount ||
    !elements.cartTotal ||
    !elements.cartItems
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
    (sum, item) => sum + item.product.price * item.quantity,
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
            onerror="this.style.visibility='hidden'"
          >

          <div>
            <h4>${escapeHTML(product.name)}</h4>
            <p>${formatMoney(product.price * quantity)}</p>

            <div class="quantity-controls">
              <button
                data-cart-action="decrease"
                data-id="${escapeAttribute(product.id)}"
              >
                −
              </button>

              <span>${quantity}</span>

              <button
                data-cart-action="increase"
                data-id="${escapeAttribute(product.id)}"
              >
                +
              </button>
            </div>
          </div>

          <button
            class="remove-item"
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

  if (!detailedCart.length || !state.products.length) {
    elements.recommendations.classList.add("hidden");
    return;
  }

  const cartProducts = detailedCart.map(item => item.product);

  const hasSun = cartProducts.some(product =>
    product.category.toLowerCase().includes("solar") ||
    product.name.toLowerCase().includes("sun") ||
    product.name.toLowerCase().includes("spf")
  );

  const lastProduct = cartProducts[cartProducts.length - 1];

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

function openProductModal(id) {
  const product = findProduct(id);

  if (!product || !elements.modalContent || !elements.modal) {
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
      `• ${quantity}x ${product.name} (${product.brand}) ` +
      `- ${formatMoney(subtotal)}\n`;
  });

  message += `\nTotal: ${formatMoney(total)}`;

  const whatsappUrl =
    `https://wa.me/${WHATSAPP_NUMBER}?text=` +
    encodeURIComponent(message);

  window.open(whatsappUrl, "_blank");
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
  } else {
    alert(message);
  }
}

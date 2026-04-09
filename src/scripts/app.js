// ── Dark Mode Toggle ──
function initDarkMode() {
  const toggle = document.getElementById("dark-mode-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

// ── Sidebar Toggle (mobile) ──
function initSidebarToggle() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (!toggle || !sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
  }

  function closeSidebar() {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  }

  toggle.addEventListener("click", () => {
    const isOpen = !sidebar.classList.contains("-translate-x-full");
    isOpen ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener("click", closeSidebar);

  // Close sidebar on recipe link click (mobile)
  sidebar.querySelectorAll(".recipe-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 768) closeSidebar();
    });
  });
}

// ── Search Filtering ──
function initSearch() {
  const input = document.getElementById("recipe-search");
  if (!input) return;

  input.addEventListener("input", () => {
    const query = input.value.toLowerCase().trim();
    const categories = document.querySelectorAll(".recipe-category");

    categories.forEach((cat) => {
      const links = cat.querySelectorAll(".recipe-link");
      let anyVisible = false;

      links.forEach((link) => {
        const title = link.getAttribute("data-title") || "";
        const match = !query || title.includes(query);
        link.closest("li").style.display = match ? "" : "none";
        if (match) anyVisible = true;
      });

      cat.style.display = anyVisible ? "" : "none";
      if (query && anyVisible) cat.open = true;
    });
  });
}

// ── Recipe Scaling ──
function initScaling() {
  const view = document.getElementById("recipe-view");
  if (!view) return;

  const baseServings = Number(view.dataset.baseServings);
  const input = document.getElementById("servings-input");
  const decrease = document.getElementById("servings-decrease");
  const increase = document.getElementById("servings-increase");
  if (!input) return;

  function formatQuantity(qty) {
    const fractions = {
      0.125: "⅛",
      0.25: "¼",
      0.333: "⅓",
      0.5: "½",
      0.667: "⅔",
      0.75: "¾",
    };

    const whole = Math.floor(qty);
    const frac = Math.round((qty - whole) * 1000) / 1000;

    if (frac === 0) return whole.toString();

    // Check common fractions
    let closest = null;
    let closestDiff = Infinity;
    for (const [key, symbol] of Object.entries(fractions)) {
      const diff = Math.abs(frac - Number(key));
      if (diff < closestDiff && diff < 0.05) {
        closest = symbol;
        closestDiff = diff;
      }
    }

    if (closest) {
      return whole > 0 ? `${whole} ${closest}` : closest;
    }

    return Number(qty.toFixed(2)).toString();
  }

  function updateScale() {
    const newServings = Math.max(1, Number(input.value) || baseServings);
    const scale = newServings / baseServings;

    // Update ingredient list items
    document.querySelectorAll(".ingredient-item").forEach((item) => {
      const baseQty = Number(item.dataset.baseQty);
      const unit = item.dataset.unit || "";
      const scaled = baseQty * scale;
      const qtyEl = item.querySelector(".ingredient-qty");
      if (qtyEl) {
        qtyEl.textContent = formatQuantity(scaled) + (unit ? ` ${unit}` : "");
      }
    });

    // Update inline ingredient references in instructions
    document.querySelectorAll(".ingredient-ref").forEach((span) => {
      const name = span.dataset.ingredient;
      const item = document.querySelector(`.ingredient-item[data-name="${name}"]`);
      if (!item) return;
      const baseQty = Number(item.dataset.baseQty);
      const unit = item.dataset.unit || "";
      const scaled = baseQty * scale;
      span.textContent = `${formatQuantity(scaled)}${unit ? " " + unit : ""} ${name}`;
    });
  }

  input.addEventListener("input", updateScale);
  input.addEventListener("change", updateScale);

  if (decrease) {
    decrease.addEventListener("click", () => {
      input.value = Math.max(1, Number(input.value) - 1);
      updateScale();
    });
  }

  if (increase) {
    increase.addEventListener("click", () => {
      input.value = Number(input.value) + 1;
      updateScale();
    });
  }
}

// ── Initialize ──
function init() {
  initDarkMode();
  initSidebarToggle();
  initSearch();
  initScaling();
}

// Run on initial load and after view transitions
document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);

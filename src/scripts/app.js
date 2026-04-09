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
  const desktop = document.getElementById("recipe-search");
  const mobile = document.getElementById("recipe-search-mobile");

  function filterRecipes(query) {
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
  }

  function onInput(e) {
    const query = e.target.value.toLowerCase().trim();
    // Sync both inputs
    if (desktop && e.target !== desktop) desktop.value = e.target.value;
    if (mobile && e.target !== mobile) mobile.value = e.target.value;
    filterRecipes(query);
  }

  if (desktop) desktop.addEventListener("input", onInput);
  if (mobile) mobile.addEventListener("input", onInput);
}

// ── Recipe Scaling ──
function initScaling() {
  const view = document.getElementById("recipe-view");
  if (!view) return;

  const display = document.getElementById("multiplier-display");
  const decrease = document.getElementById("multiplier-decrease");
  const increase = document.getElementById("multiplier-increase");
  if (!display) return;

  let multiplier = 1;

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
    display.textContent = `×${multiplier}`;

    document.querySelectorAll(".ingredient-item").forEach((item) => {
      const baseQty = Number(item.dataset.baseQty);
      const unit = item.dataset.unit || "";
      const scaled = baseQty * multiplier;
      const qtyEl = item.querySelector(".ingredient-qty");
      if (qtyEl) {
        qtyEl.textContent = formatQuantity(scaled) + (unit ? ` ${unit}` : "");
      }
    });

    document.querySelectorAll(".ingredient-ref").forEach((span) => {
      const name = span.dataset.ingredient;
      const item = document.querySelector(`.ingredient-item[data-name="${name}"]`);
      if (!item) return;
      const baseQty = Number(item.dataset.baseQty);
      const unit = item.dataset.unit || "";
      const scaled = baseQty * multiplier;
      span.textContent = `${formatQuantity(scaled)}${unit ? " " + unit : ""} ${name}`;
    });
  }

  if (decrease) {
    decrease.addEventListener("click", () => {
      if (multiplier > 1) {
        multiplier--;
        updateScale();
      }
    });
  }

  if (increase) {
    increase.addEventListener("click", () => {
      multiplier++;
      updateScale();
    });
  }
}

// ── Active Sidebar Link ──
function updateActiveLink() {
  const path = window.location.pathname.replace(/\/$/, "");
  document.querySelectorAll(".recipe-link").forEach((link) => {
    const href = link.getAttribute("href").replace(/\/$/, "");
    if (href === path) {
      link.className = "recipe-link block rounded-lg px-3 py-1.5 text-sm transition-colors bg-primary/10 text-primary font-medium";
    } else {
      link.className = "recipe-link block rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800";
    }
  });
}

// ── Wake Lock ──
let wakeLock = null;

function initWakeLock() {
  const toggle = document.getElementById("wake-lock-toggle");
  const icon = document.getElementById("wake-lock-icon");
  if (!toggle || !("wakeLock" in navigator)) {
    if (toggle) toggle.style.display = "none";
    return;
  }

  function updateUI(active) {
    if (active) {
      toggle.classList.add("text-primary");
      icon.setAttribute("fill", "currentColor");
    } else {
      toggle.classList.remove("text-primary");
      icon.setAttribute("fill", "none");
    }
  }

  // Restore state if it was previously on
  updateUI(wakeLock !== null);

  toggle.addEventListener("click", async () => {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
      updateUI(false);
    } else {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
          updateUI(false);
        });
        updateUI(true);
      } catch (e) {
        // Wake lock request failed (e.g. low battery)
      }
    }
  });

  // Re-acquire wake lock when page becomes visible again
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && wakeLock !== null) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch (e) {}
    }
  });
}

// ── Initialize ──
function init() {
  initSidebarToggle();
  initSearch();
  initScaling();
  updateActiveLink();
  initWakeLock();
}

// Run on initial load and after view transitions
document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);

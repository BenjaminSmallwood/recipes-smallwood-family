import { formatQuantity } from "../lib/recipe";
import { initShoppingList, updateShoppingButton } from "./shopping-list.js";

// ── Sidebar Toggle (mobile) ──
function initSidebarToggle() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (!toggle || !sidebar || !overlay) return;

  // The overlay is re-rendered on each navigation, so look it up when needed
  function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    document.getElementById("sidebar-overlay")?.classList.remove("hidden");
  }

  function closeSidebar() {
    sidebar.classList.add("-translate-x-full");
    document.getElementById("sidebar-overlay")?.classList.add("hidden");
  }

  overlay.addEventListener("click", closeSidebar);

  // Toggle and sidebar are persisted via transition:persist — only attach these listeners once,
  // otherwise stacked toggle handlers cancel each other out after a navigation
  if (toggle.dataset.sidebarBound) return;
  toggle.dataset.sidebarBound = "true";

  toggle.addEventListener("click", () => {
    const isOpen = !sidebar.classList.contains("-translate-x-full");
    isOpen ? closeSidebar() : openSidebar();
  });

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

  // Both inputs are persisted across navigations — only bind once
  if (desktop && !desktop.dataset.searchBound) {
    desktop.dataset.searchBound = "true";
    desktop.addEventListener("input", onInput);
  }
  if (mobile && !mobile.dataset.searchBound) {
    mobile.dataset.searchBound = "true";
    mobile.addEventListener("input", onInput);
  }
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

  function updateScale() {
    display.textContent = `×${multiplier}`;
    view.dataset.multiplier = multiplier;

    document.querySelectorAll(".ingredient-item").forEach((item) => {
      const baseQty = Number(item.dataset.baseQty);
      const unit = item.dataset.unit || "";
      const scaled = baseQty * multiplier;
      const qtyEl = item.querySelector(".ingredient-qty");
      if (qtyEl) {
        qtyEl.textContent = formatQuantity(scaled) + (unit ? ` ${unit}` : "");
      }
    });

    // Each placeholder carries its own portion of the ingredient in data-qty
    document.querySelectorAll(".ingredient-ref[data-qty]").forEach((span) => {
      const unit = span.dataset.unit || "";
      const scaled = Number(span.dataset.qty) * multiplier;
      span.textContent = `${formatQuantity(scaled)}${unit ? " " + unit : ""} ${span.dataset.ingredient}`;
    });

    document.querySelectorAll("[data-base-servings-display]").forEach((el) => {
      el.textContent = Number(el.dataset.baseServingsDisplay) * multiplier;
    });

    // Scaled amounts change line lengths, so re-fit the print card
    paginatePrintCard();
    updateShoppingButton();
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

// ── Print Recipe Card ──
// Fits the card's front side; whatever doesn't fit moves to a back side.
function paginatePrintCard() {
  const card = document.getElementById("print-card");
  if (!card) return;

  const front = card.querySelector(".rc-front");
  const backSheet = card.querySelector(".rc-back-sheet");
  const back = backSheet.querySelector(".rc-back");
  const frontIngredients = front.querySelector(".rc-ingredient-list");
  const frontSteps = front.querySelector(".rc-step-list");
  const backIngredientsSection = back.querySelector(".rc-ingredients");
  const backIngredients = back.querySelector(".rc-ingredient-list");
  const backSteps = back.querySelector(".rc-step-list");
  const backBody = back.querySelector(".rc-body");
  const continued = front.querySelector(".rc-continued");
  const credit = card.querySelector(".rc-credit");

  // Reset: everything back on the front
  frontIngredients.append(...backIngredients.children);
  frontSteps.append(...backSteps.children);
  if (credit) front.append(credit);
  continued.hidden = true;
  backSheet.hidden = true;
  backIngredientsSection.hidden = true;
  backBody.classList.remove("rc-steps-only");

  const overflows = (el) => el.scrollHeight > el.clientHeight + 1;
  const ingredientsCol = front.querySelector(".rc-ingredients");
  const stepsCol = front.querySelector(".rc-steps");

  // Keep the ingredient list whole: shrink the photo (to a point) before splitting it
  const image = front.querySelector(".rc-image");
  if (image) {
    let height = 1.2;
    image.style.height = `${height}in`;
    while (overflows(ingredientsCol) && height > 0.65) {
      height -= 0.05;
      image.style.height = `${height}in`;
    }
  }

  if (!overflows(ingredientsCol) && !overflows(stepsCol)) return;

  backSheet.hidden = false;
  continued.hidden = false;
  if (credit) back.append(credit);

  while (overflows(stepsCol) && frontSteps.children.length) {
    backSteps.prepend(frontSteps.lastElementChild);
  }
  while (overflows(ingredientsCol) && frontIngredients.children.length > 1) {
    backIngredients.prepend(frontIngredients.lastElementChild);
  }

  if (backIngredients.children.length) {
    backIngredientsSection.hidden = false;
  } else {
    backBody.classList.add("rc-steps-only");
  }
}

function initPrintCard() {
  const button = document.getElementById("print-card-button");
  if (!button) return;

  paginatePrintCard();
  // Re-fit once the image has its final size (it's fixed-height, but be safe)
  document.querySelector("#print-card .rc-image")?.addEventListener("load", paginatePrintCard);
  button.addEventListener("click", () => {
    paginatePrintCard();
    window.print();
  });
}

window.addEventListener("beforeprint", paginatePrintCard);

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
let wakeLockDesired = false;

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

  // Sync UI to current state (button persists across navigations)
  updateUI(wakeLockDesired);

  // Button is persisted via transition:persist — only attach the listener once
  if (toggle.dataset.wakeLockBound) return;
  toggle.dataset.wakeLockBound = "true";

  toggle.addEventListener("click", async () => {
    if (wakeLockDesired) {
      wakeLockDesired = false;
      updateUI(false);
      if (wakeLock) {
        try { await wakeLock.release(); } catch (e) {}
        wakeLock = null;
      }
    } else {
      wakeLockDesired = true;
      updateUI(true);
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      } catch (e) {
        wakeLockDesired = false;
        updateUI(false);
      }
    }
  });

  // Re-acquire wake lock when page becomes visible again
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && wakeLockDesired && !wakeLock) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      } catch (e) {}
    }
  });
}

// ── Initialize ──
function init() {
  initSidebarToggle();
  initSearch();
  initScaling();
  initPrintCard();
  initShoppingList();
  updateActiveLink();
  initWakeLock();
}

// Run on initial load and after view transitions
document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);

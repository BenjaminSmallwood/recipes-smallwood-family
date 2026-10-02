import { buildShoppingList } from "../lib/shopping";

// Saved shape: {
//   recipes: { [slug]: { slug, title, multiplier, ingredients } },
//   custom: [{ id, name, aisle }],   one-off items typed into the panel
//   checked: { [itemKey]: amount },
// }
// An item stays checked only while its amount is unchanged, so adding a recipe that
// needs more of something puts it back on the list.
const STORAGE_KEY = "shopping-list";
const COLLAPSED_KEY = "shopping-list-collapsed";

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && data.recipes) return { recipes: data.recipes, custom: data.custom || [], checked: data.checked || {} };
  } catch (e) {}
  return { recipes: {}, custom: [], checked: {} };
}

function save(state) {
  try {
    if (Object.keys(state.recipes).length || state.custom.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {}
}

// Desktop shows the list beside the content; smaller screens slide it over the page
const desktopQuery = window.matchMedia("(min-width: 1024px)");

// On mobile the slide-over covers the recipe, so it isn't remembered between visits
let mobileOpen = false;

// An empty list starts collapsed to the pill unless it was opened on purpose
function isCollapsed(isEmpty) {
  if (!desktopQuery.matches) return !mobileOpen;
  try {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved === null ? isEmpty : saved === "true";
  } catch (e) {
    return isEmpty;
  }
}

function setCollapsed(collapsed) {
  mobileOpen = !collapsed;
  if (!desktopQuery.matches) return renderShoppingList();
  try {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  } catch (e) {}
  renderShoppingList();
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function currentRecipe() {
  const el = document.getElementById("recipe-shopping-data");
  if (!el) return null;
  try {
    return JSON.parse(el.textContent);
  } catch (e) {
    return null;
  }
}

function currentMultiplier() {
  return Number(document.getElementById("recipe-view")?.dataset.multiplier) || 1;
}

function lineHtml(line, checked) {
  const removeButton = line.custom
    ? `<button data-remove-custom="${escapeHtml(line.key.slice("custom:".length))}" class="mt-1 shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-200 hover:text-current dark:hover:bg-gray-700" aria-label="Delete ${escapeHtml(line.name)}">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>`
    : "";
  return `
    <li class="flex items-start gap-1 ${checked ? "opacity-40" : ""}">
      <button
        data-toggle="${escapeHtml(line.key)}"
        aria-pressed="${checked}"
        class="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${checked ? "border-primary bg-primary text-white" : "border-gray-400"}">
          ${checked ? `<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>` : ""}
        </span>
        <span class="min-w-0 flex-1 ${checked ? "line-through" : ""}">
          <span class="block font-medium">${escapeHtml(line.name)}</span>
          ${line.recipes.length ? `<span class="block text-xs text-gray-500 dark:text-gray-400">${escapeHtml(line.recipes.join(", "))}</span>` : ""}
        </span>
        <span class="shrink-0 text-right text-xs font-semibold text-primary ${checked ? "line-through" : ""}">${escapeHtml(line.amount)}</span>
      </button>
      ${removeButton}
    </li>`;
}

function headingHtml(text) {
  return `<h3 class="mb-1 mt-3 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 first:mt-0 dark:text-gray-400">${escapeHtml(text)}</h3>`;
}

export function renderShoppingList() {
  const root = document.getElementById("shopping-list");
  if (!root) return;

  const state = load();
  const recipes = Object.values(state.recipes);
  const lines = buildShoppingList(recipes, state.custom);
  const isChecked = (line) => state.checked[line.key] === line.amount;
  const toBuy = lines.filter((line) => !line.onHand && !isChecked(line));
  const inCart = lines.filter((line) => !line.onHand && isChecked(line));
  const onHand = lines.filter((line) => line.onHand);

  const hasList = recipes.length > 0 || state.custom.length > 0;
  const collapsed = isCollapsed(!hasList);
  root.hidden = false;
  const panel = document.getElementById("shopping-panel");
  panel.classList.toggle("translate-x-full", collapsed);
  panel.classList.toggle("invisible", collapsed);
  panel.inert = collapsed;
  document.getElementById("shopping-overlay").classList.toggle("hidden", collapsed);
  document.getElementById("shopping-open").hidden = !collapsed;
  document.documentElement.classList.toggle("shopping-open", !collapsed);
  // Turn on the slide animation only after the first render, so a page load doesn't animate it in
  if (!panel.dataset.animated) {
    panel.dataset.animated = "true";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      panel.classList.add("transition-[translate,visibility]", "duration-200", "lg:transition-none");
    }));
  }
  const count = document.getElementById("shopping-count");
  count.textContent = toBuy.length;
  count.hidden = !hasList;

  const recipeChips = document.getElementById("shopping-recipes");
  recipeChips.hidden = !recipes.length;
  recipeChips.innerHTML = recipes
    .map(
      (r) => `
      <li class="flex items-center gap-1 rounded-full border border-border py-0.5 pl-3 pr-1 text-xs dark:border-border-dark">
        <a href="/recipes/${encodeURIComponent(r.slug)}" class="font-medium hover:text-primary">${escapeHtml(r.title)}</a>
        ${r.multiplier !== 1 ? `<span class="text-primary">×${r.multiplier}</span>` : ""}
        <button data-remove="${escapeHtml(r.slug)}" class="rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-current dark:hover:bg-gray-700" aria-label="Remove ${escapeHtml(r.title)}">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </li>`
    )
    .join("");

  // Unchecked items grouped by aisle (lines are already sorted by aisle, then name)
  let itemsHtml = "";
  let aisle = null;
  for (const line of toBuy) {
    if (line.aisle !== aisle) {
      if (aisle !== null) itemsHtml += "</ul>";
      itemsHtml += headingHtml(line.aisle) + "<ul>";
      aisle = line.aisle;
    }
    itemsHtml += lineHtml(line, false);
  }
  if (aisle !== null) itemsHtml += "</ul>";
  if (!hasList) {
    itemsHtml = `<p class="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Your list is empty. Add a recipe, or tap + to add an item.</p>`;
  } else if (!toBuy.length) {
    itemsHtml = `<p class="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">All done!</p>`;
  }
  document.getElementById("shopping-items").innerHTML = itemsHtml;

  document.getElementById("shopping-checked").innerHTML = inCart.length
    ? `<div class="mt-3">${headingHtml("In cart")}<ul>${inCart.map((line) => lineHtml(line, true)).join("")}</ul></div>`
    : "";

  const onHandEl = document.getElementById("shopping-onhand");
  onHandEl.hidden = !onHand.length;
  onHandEl.querySelector("summary").textContent = `Assumed on hand (${onHand.length})`;
  onHandEl.querySelector("p").textContent = onHand.map((line) => `${line.name} (${line.amount})`).join(", ");

  updateShoppingButton();
}

export function updateShoppingButton() {
  const label = document.getElementById("shopping-add-label");
  const recipe = currentRecipe();
  if (!label || !recipe) return;

  const saved = load().recipes[recipe.slug];
  const multiplier = currentMultiplier();
  if (!saved) {
    label.textContent = "Add to list";
  } else if (saved.multiplier === multiplier) {
    label.textContent = "In list ✓";
  } else {
    label.textContent = `Update list to ×${multiplier}`;
  }
}

function initPanelEvents() {
  const root = document.getElementById("shopping-list");
  // The panel is kept across page navigations (transition:persist), so only bind once
  if (!root || root.dataset.bound) return;
  root.dataset.bound = "true";

  root.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-toggle]");
    const remove = e.target.closest("[data-remove]");
    const removeCustom = e.target.closest("[data-remove-custom]");
    const state = load();

    if (toggle) {
      const key = toggle.dataset.toggle;
      const line = buildShoppingList(Object.values(state.recipes), state.custom).find((l) => l.key === key);
      if (!line) return;
      if (state.checked[key] === line.amount) {
        delete state.checked[key];
      } else {
        state.checked[key] = line.amount;
      }
      save(state);
      renderShoppingList();
    } else if (removeCustom) {
      state.custom = state.custom.filter((item) => item.id !== removeCustom.dataset.removeCustom);
      delete state.checked[`custom:${removeCustom.dataset.removeCustom}`];
      save(state);
      renderShoppingList();
    } else if (e.target.closest("#shopping-add-custom")) {
      const form = document.getElementById("shopping-custom-form");
      form.hidden = !form.hidden;
      if (!form.hidden) form.elements.name.focus();
    } else if (e.target.closest("#shopping-custom-cancel")) {
      document.getElementById("shopping-custom-form").hidden = true;
    } else if (remove) {
      delete state.recipes[remove.dataset.remove];
      save(state);
      renderShoppingList();
    } else if (e.target.closest("#shopping-collapse")) {
      setCollapsed(true);
    } else if (e.target.closest("#shopping-overlay")) {
      setCollapsed(true);
    } else if (e.target.closest("#shopping-open")) {
      setCollapsed(false);
    } else if (e.target.closest("#shopping-clear")) {
      if (confirm("Clear the whole shopping list?")) {
        save({ recipes: {}, custom: [], checked: {} });
        setCollapsed(true);
      }
    }
  });

  // Adding stays open so several items can be typed in a row
  const form = document.getElementById("shopping-custom-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) return;
    const state = load();
    state.custom.push({ id: Date.now().toString(36), name, aisle: form.elements.aisle.value });
    save(state);
    form.elements.name.value = "";
    form.elements.name.focus();
    renderShoppingList();
  });
  form.addEventListener("keydown", (e) => {
    if (e.key === "Escape") form.hidden = true;
  });
}

function initAddButton() {
  const button = document.getElementById("shopping-add-button");
  if (!button) return;

  button.addEventListener("click", () => {
    const recipe = currentRecipe();
    if (!recipe) return;
    const state = load();
    state.recipes[recipe.slug] = { ...recipe, multiplier: currentMultiplier() };
    save(state);
    setCollapsed(false);
  });
}

export function initShoppingList() {
  initPanelEvents();
  initAddButton();
  renderShoppingList();
}

// The router replaces <html> attributes on navigation; carry the desktop layout class over
// so the content doesn't jump. The mobile slide-over closes on navigation, like the menu.
document.addEventListener("astro:before-swap", (e) => {
  mobileOpen = false;
  if (desktopQuery.matches) {
    e.newDocument.documentElement.classList.toggle(
      "shopping-open",
      document.documentElement.classList.contains("shopping-open"),
    );
  }
});

desktopQuery.addEventListener("change", renderShoppingList);

// Keep other open tabs in sync
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY || e.key === COLLAPSED_KEY) renderShoppingList();
});

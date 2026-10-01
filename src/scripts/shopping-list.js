import { buildShoppingList } from "../lib/shopping";

// Saved shape: { recipes: { [slug]: { slug, title, multiplier, ingredients } }, checked: { [itemKey]: amount } }
// An item stays checked only while its amount is unchanged, so adding a recipe that
// needs more of something puts it back on the list.
const STORAGE_KEY = "shopping-list";
const COLLAPSED_KEY = "shopping-list-collapsed";

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && data.recipes) return { recipes: data.recipes, checked: data.checked || {} };
  } catch (e) {}
  return { recipes: {}, checked: {} };
}

function save(state) {
  try {
    if (Object.keys(state.recipes).length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {}
}

function isCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch (e) {
    return false;
  }
}

function setCollapsed(collapsed) {
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
  return `
    <li>
      <button
        data-toggle="${escapeHtml(line.key)}"
        aria-pressed="${checked}"
        class="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${checked ? "opacity-40" : ""}"
      >
        <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${checked ? "border-primary bg-primary text-black" : "border-gray-400"}">
          ${checked ? `<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>` : ""}
        </span>
        <span class="min-w-0 flex-1 ${checked ? "line-through" : ""}">
          <span class="block font-medium">${escapeHtml(line.name)}</span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">${escapeHtml(line.recipes.join(", "))}</span>
        </span>
        <span class="shrink-0 text-right text-xs font-semibold text-primary ${checked ? "line-through" : ""}">${escapeHtml(line.amount)}</span>
      </button>
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
  const lines = buildShoppingList(recipes);
  const isChecked = (line) => state.checked[line.key] === line.amount;
  const toBuy = lines.filter((line) => !line.onHand && !isChecked(line));
  const inCart = lines.filter((line) => !line.onHand && isChecked(line));
  const onHand = lines.filter((line) => line.onHand);

  const hasList = recipes.length > 0;
  const collapsed = isCollapsed();
  root.hidden = !hasList;
  document.getElementById("shopping-panel").hidden = collapsed;
  document.getElementById("shopping-open").hidden = !collapsed;
  document.documentElement.classList.toggle("shopping-open", hasList && !collapsed);
  document.getElementById("shopping-count").textContent = toBuy.length;

  document.getElementById("shopping-recipes").innerHTML = recipes
    .map(
      (r) => `
      <li class="flex items-center gap-1 rounded-full border border-border bg-white py-0.5 pl-3 pr-1 text-xs dark:border-border-dark dark:bg-gray-800">
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
  if (!toBuy.length && hasList) {
    itemsHtml = `<p class="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">All done!</p>`;
  }
  document.getElementById("shopping-items").innerHTML = itemsHtml;

  document.getElementById("shopping-checked").innerHTML = inCart.length
    ? headingHtml("In cart") + `<ul>${inCart.map((line) => lineHtml(line, true)).join("")}</ul>`
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
    const state = load();

    if (toggle) {
      const key = toggle.dataset.toggle;
      const line = buildShoppingList(Object.values(state.recipes)).find((l) => l.key === key);
      if (!line) return;
      if (state.checked[key] === line.amount) {
        delete state.checked[key];
      } else {
        state.checked[key] = line.amount;
      }
      save(state);
      renderShoppingList();
    } else if (remove) {
      delete state.recipes[remove.dataset.remove];
      save(state);
      renderShoppingList();
    } else if (e.target.closest("#shopping-collapse")) {
      setCollapsed(true);
    } else if (e.target.closest("#shopping-open")) {
      setCollapsed(false);
    } else if (e.target.closest("#shopping-clear")) {
      if (confirm("Clear the whole shopping list?")) {
        save({ recipes: {}, checked: {} });
        setCollapsed(false);
      }
    }
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

// Keep other open tabs in sync
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY || e.key === COLLAPSED_KEY) renderShoppingList();
});

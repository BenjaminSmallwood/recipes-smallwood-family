export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 6, "⅙"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [5 / 6, "⅚"],
  [7 / 8, "⅞"],
];

// Shared by the server render and app.js so scaled amounts look the same
export function formatQuantity(qty: number): string {
  let whole = Math.floor(qty);
  const frac = qty - whole;

  if (frac < 0.02) return whole.toString();
  if (frac > 0.98) return (whole + 1).toString();

  let closest = "";
  let closestDiff = 0.02;
  for (const [value, symbol] of FRACTIONS) {
    const diff = Math.abs(frac - value);
    if (diff < closestDiff) {
      closest = symbol;
      closestDiff = diff;
    }
  }

  if (closest) return whole > 0 ? `${whole} ${closest}` : closest;
  return Number(qty.toFixed(2)).toString();
}

export function formatAmount(ing: Ingredient): string {
  return `${formatQuantity(ing.quantity)}${ing.unit ? " " + ing.unit : ""}`;
}

// ── Ingredient placeholders in steps ──
// {Name}            full amount, or what's left after any portions below
// {Name 1/3}        a portion of the total (also ½, 50%, half, third, quarter)
// {Name 2}          an exact amount in the ingredient's own unit
// {Name 1/2 cup}    an exact amount; the unit must match the ingredient's unit

const UNICODE_FRACTIONS: Record<string, string> = {
  "⅛": "1/8", "⅙": "1/6", "¼": "1/4", "⅓": "1/3", "⅜": "3/8", "½": "1/2",
  "⅝": "5/8", "⅔": "2/3", "¾": "3/4", "⅚": "5/6", "⅞": "7/8",
};

const PORTION_WORDS: Record<string, number> = { half: 1 / 2, third: 1 / 3, quarter: 1 / 4 };

const UNIT_ALIASES: Record<string, string> = {
  t: "tablespoon", tbsp: "tablespoon", tbs: "tablespoon", tablespoon: "tablespoon",
  tsp: "teaspoon", teaspoon: "teaspoon",
  c: "cup", cup: "cup",
  oz: "ounce", ounce: "ounce",
  lb: "pound", pound: "pound",
  g: "gram", gram: "gram",
};

export function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().replace(/\./g, "").trim();
  const singular = u.length > 1 && u.endsWith("s") ? u.slice(0, -1) : u;
  return UNIT_ALIASES[u] ?? UNIT_ALIASES[singular] ?? singular;
}

type Portion = { kind: "rest" } | { kind: "share"; share: number } | { kind: "amount"; qty: number };

// "1 1/2", "1/2" or "0.5" -> number
function parseNumber(text: string): number | null {
  let m = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = text.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  m = text.match(/^\d*\.?\d+$/);
  if (m) return Number(text);
  return null;
}

function parsePortion(text: string, ing: Ingredient): Portion | null {
  let t = text.trim().toLowerCase();
  for (const [symbol, frac] of Object.entries(UNICODE_FRACTIONS)) {
    t = t.replace(symbol, ` ${frac}`);
  }
  t = t.replace(/\s+/g, " ").trim();

  if (t in PORTION_WORDS) return { kind: "share", share: PORTION_WORDS[t] };

  const percent = t.match(/^(\d*\.?\d+)\s*%$/);
  if (percent) return { kind: "share", share: Number(percent[1]) / 100 };

  // Split a leading number ("1 1/2", "1/2", "2") from an optional unit
  const m = t.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*(.*)$/);
  if (!m) return null;
  const value = parseNumber(m[1]);
  if (value === null) return null;
  const unit = m[2];

  if (unit) {
    if (normalizeUnit(unit) !== normalizeUnit(ing.unit || "")) return null;
    return { kind: "amount", qty: value };
  }
  // A bare fraction is a share of the total; a bare whole/decimal number is an amount
  return m[1].includes("/") ? { kind: "share", share: value } : { kind: "amount", qty: value };
}

// Match "{Diced Sweet Onion 1/3}" to the longest ingredient name it starts with
function resolveRef(text: string, ingredients: Ingredient[]): { ing: Ingredient; portion: Portion } | null {
  const lower = text.trim().toLowerCase();
  const candidates = ingredients
    .filter((ing) => {
      const name = ing.name.toLowerCase();
      return lower === name || lower.startsWith(name + " ");
    })
    .sort((a, b) => b.name.length - a.name.length);

  for (const ing of candidates) {
    const rest = text.trim().slice(ing.name.length).trim();
    if (!rest) return { ing, portion: { kind: "rest" } };
    const portion = parsePortion(rest, ing);
    if (portion) return { ing, portion };
  }
  return null;
}

function refSpan(ing: Ingredient, qty: number, refClass: string): string {
  if (qty <= 0) {
    return `<span class="ingredient-ref ${refClass}" data-ingredient="${ing.name}">${ing.name}</span>`;
  }
  const unit = ing.unit ? " " + ing.unit : "";
  return `<span class="ingredient-ref ${refClass}" data-ingredient="${ing.name}" data-qty="${qty}" data-unit="${ing.unit}">${formatQuantity(qty)}${unit} ${ing.name}</span>`;
}

// Split the markdown numbered list into steps, replacing {ingredient} placeholders with spans
export function parseSteps(body: string, ingredients: Ingredient[], refClass = ""): string[] {
  const placeholder = /\{([^{}\n]+)\}/g;

  // First pass: how much of each ingredient the explicit portions use, and how many {Name} share the rest
  const used = new Map<Ingredient, number>();
  const restCount = new Map<Ingredient, number>();
  for (const [, text] of body.matchAll(placeholder)) {
    const ref = resolveRef(text, ingredients);
    if (!ref) {
      const named = ingredients.find((ing) => text.toLowerCase().startsWith(ing.name.toLowerCase() + " "));
      console.warn(
        named
          ? `[recipes] Can't read the amount in {${text}} (units must match "${named.unit || "none"}")`
          : `[recipes] No ingredient matches placeholder {${text}}`
      );
      continue;
    }
    const { ing, portion } = ref;
    if (portion.kind === "rest") {
      restCount.set(ing, (restCount.get(ing) ?? 0) + 1);
    } else {
      const qty = portion.kind === "share" ? ing.quantity * portion.share : portion.qty;
      used.set(ing, (used.get(ing) ?? 0) + qty);
    }
  }

  for (const [ing, qty] of used) {
    if (qty > ing.quantity + 1e-6) {
      console.warn(`[recipes] Placeholders use ${formatQuantity(qty)} of ${ing.name}, but only ${formatAmount(ing)} is listed`);
    }
  }

  // Second pass: render, giving each {Name} the full amount, or its share of what's left
  const processed = body.replace(placeholder, (match, text) => {
    const ref = resolveRef(text, ingredients);
    if (!ref) return match;
    const { ing, portion } = ref;
    if (portion.kind === "share") return refSpan(ing, ing.quantity * portion.share, refClass);
    if (portion.kind === "amount") return refSpan(ing, portion.qty, refClass);
    if (!used.has(ing)) return refSpan(ing, ing.quantity, refClass);
    const left = Math.max(ing.quantity - used.get(ing)!, 0);
    return refSpan(ing, left / restCount.get(ing)!, refClass);
  });

  const steps: string[] = [];
  for (const line of processed.trim().split("\n")) {
    const match = line.match(/^\d+\.\s+(.*)/);
    if (match) steps.push(match[1]);
  }
  return steps;
}

// "15" -> "15 min"; anything with words is left alone
export function formatTime(time: string): string {
  return /^\d+$/.test(time.trim()) ? `${time.trim()} min` : time;
}

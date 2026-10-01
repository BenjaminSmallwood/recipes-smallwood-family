export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

export function formatQuantity(qty: number): string {
  const fractions: Record<string, string> = {
    "0.125": "⅛",
    "0.25": "¼",
    "0.33": "⅓",
    "0.333": "⅓",
    "0.5": "½",
    "0.67": "⅔",
    "0.667": "⅔",
    "0.75": "¾",
  };

  const whole = Math.floor(qty);
  const frac = Math.round((qty - whole) * 1000) / 1000;

  if (frac === 0) return whole.toString();

  const fracStr = fractions[frac.toString()];
  if (fracStr) {
    return whole > 0 ? `${whole} ${fracStr}` : fracStr;
  }

  return Number(qty.toFixed(2)).toString();
}

export function formatAmount(ing: Ingredient): string {
  return `${formatQuantity(ing.quantity)}${ing.unit ? " " + ing.unit : ""}`;
}

// Split the markdown numbered list into steps, replacing {ingredient} with spans
export function parseSteps(body: string, ingredients: Ingredient[], refClass = ""): string[] {
  let processed = body;
  for (const ing of ingredients) {
    const regex = new RegExp(`\\{${ing.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}`, "g");
    processed = processed.replace(
      regex,
      `<span class="ingredient-ref ${refClass}" data-ingredient="${ing.name}">${formatAmount(ing)} ${ing.name}</span>`
    );
  }

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

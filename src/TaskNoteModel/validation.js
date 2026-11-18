export function requiredText(value, label, maxLength = 200) {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} is required.`);
  const text = value.trim();
  if (text.length > maxLength)
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return text;
}

export function optionalText(value, label, maxLength = 100000) {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  if (value.length > maxLength)
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return value;
}

export function calendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Choose a real calendar date for the due date.");
  }
  const date = new Date(`${value}T12:00:00`);
  const [year, month, day] = value.split("-").map(Number);
  if (
    !year ||
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    throw new Error("Choose a real calendar date for the due date.");
  }
  return value;
}

export function localDate(date = new Date()) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function identifier(value = crypto.randomUUID()) {
  return requiredText(value, "Identifier");
}

export function matchingTags(itemTags, selectedTags) {
  const selected = new Set(
    selectedTags.map((tag) => (typeof tag === "string" ? tag : tag.id)),
  );
  return selected.size === 0 || itemTags.some((tag) => selected.has(tag.id));
}

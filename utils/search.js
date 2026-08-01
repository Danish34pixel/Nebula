const normalizeSearchText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matchesSearchText = (value, query) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue) return false;
  if (normalizedValue === normalizedQuery) return true;

  const boundaryQuery = escapeRegExp(normalizedQuery);
  const pattern = new RegExp(
    `(?:^|[^a-z0-9])${boundaryQuery}(?:$|[^a-z0-9])`,
    "i",
  );
  return pattern.test(normalizedValue);
};

export { matchesSearchText, normalizeSearchText };

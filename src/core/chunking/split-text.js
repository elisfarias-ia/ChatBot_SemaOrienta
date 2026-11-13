// @ts-check

/**
 * @typedef {object} SplitTextOptions
 * @property {number} maxChars Tamanho máximo de cada trecho, em caracteres (> 0).
 * @property {number} [overlap=0] Caracteres repetidos entre trechos vizinhos (0 ≤ overlap < maxChars).
 */

/**
 * Normaliza espaços: junta espaços/tabs repetidos e remove espaços nas pontas.
 * @param {string} text
 * @returns {string}
 */
export function normalizeWhitespace(text) {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Divide um texto em trechos de até `maxChars` caracteres, com sobreposição opcional.
 * Função pura: sem I/O.
 * @param {string} text
 * @param {SplitTextOptions} options
 * @returns {string[]}
 */
export function splitText(text, { maxChars, overlap = 0 }) {
  assertOptions(maxChars, overlap);
  const clean = normalizeWhitespace(text);
  if (clean.length === 0) return [];

  const step = maxChars - overlap;
  /** @type {string[]} */
  const chunks = [];
  for (let start = 0; start < clean.length; start += step) {
    chunks.push(clean.slice(start, start + maxChars).trim());
    if (start + maxChars >= clean.length) break;
  }
  return chunks.filter(Boolean);
}

/**
 * @param {number} maxChars
 * @param {number} overlap
 */
function assertOptions(maxChars, overlap) {
  if (!Number.isInteger(maxChars) || maxChars <= 0) {
    throw new RangeError("maxChars deve ser um inteiro maior que zero.");
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= maxChars) {
    throw new RangeError("overlap deve ser um inteiro entre 0 e maxChars - 1.");
  }
}

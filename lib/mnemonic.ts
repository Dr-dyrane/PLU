/**
 * Split a code using the workbook's mnemonic rule:
 * - even digit count: pairs from the start
 * - odd digit count: first digit alone, then pairs
 *
 * Examples: 4065 -> ["40", "65"], 433 -> ["4", "33"]
 */
export function chunkPluCode(code: string): string[] {
  const digits = code.replace(/\D/g, "");
  if (!digits) return [];

  const chunks: string[] = [];
  let cursor = 0;

  if (digits.length % 2 === 1) {
    chunks.push(digits[0]);
    cursor = 1;
  }

  for (; cursor < digits.length; cursor += 2) {
    chunks.push(digits.slice(cursor, cursor + 2));
  }

  return chunks;
}

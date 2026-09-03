import type {
  CheckoutPath,
  KeypadLayoutName,
  KeyPoint,
  PathSegment,
} from "@/types/trace";

export const keypadRows: Record<KeypadLayoutName, (string | null)[][]> = {
  calculator: [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    [null, "0", null],
  ],
  phone: [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [null, "0", null],
  ],
};

export function normalizeCode(code: string): string {
  return String(code).replace(/\D/g, "");
}

export function chunkCode(code: string): string[] {
  const digits = normalizeCode(code);
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

function coordinateMap(layout: KeypadLayoutName): Record<string, { x: number; y: number }> {
  const map: Record<string, { x: number; y: number }> = {};

  keypadRows[layout].forEach((row, rowIndex) => {
    row.forEach((digit, columnIndex) => {
      if (!digit) return;
      map[digit] = {
        x: columnIndex * 100 + 50,
        y: rowIndex * 100 + 50,
      };
    });
  });

  return map;
}

export function compileCheckoutPath(
  input: string,
  layout: KeypadLayoutName = "calculator",
): CheckoutPath {
  const code = normalizeCode(input);
  if (!code) {
    throw new Error("A checkout path requires at least one digit.");
  }

  const digits = code.split("");
  const chunks = chunkCode(code);
  const coordinates = coordinateMap(layout);
  const points: KeyPoint[] = [];
  const segments: PathSegment[] = [];
  let globalIndex = 0;

  chunks.forEach((chunk, chunkIndex) => {
    const segmentPoints = chunk.split("").map((digit) => {
      const coordinate = coordinates[digit];
      if (!coordinate) {
        throw new Error(`Digit ${digit} does not exist in the ${layout} keypad.`);
      }

      const point: KeyPoint = {
        digit,
        x: coordinate.x,
        y: coordinate.y,
        index: globalIndex,
        chunkIndex,
      };
      globalIndex += 1;
      points.push(point);
      return point;
    });

    segments.push({ chunk, chunkIndex, points: segmentPoints });
  });

  const rhythm: number[] = [];
  segments.forEach((segment, segmentIndex) => {
    segment.points.forEach(() => rhythm.push(1));
    if (segmentIndex < segments.length - 1) rhythm.push(2);
  });

  return {
    code,
    digits,
    chunks,
    layout,
    points,
    segments,
    rhythm,
    signature: `${layout}:${chunks.join("|")}`,
  };
}

export function decodeCheckoutPath(
  points: Pick<KeyPoint, "x" | "y">[],
  layout: KeypadLayoutName = "calculator",
): string {
  const coordinates = coordinateMap(layout);
  const entries = Object.entries(coordinates);

  return points
    .map((point) => {
      const exact = entries.find(
        ([, coordinate]) => coordinate.x === point.x && coordinate.y === point.y,
      );
      if (!exact) {
        throw new Error(`No ${layout} keypad key exists at ${point.x},${point.y}.`);
      }
      return exact[0];
    })
    .join("");
}

export function firstDifferentDigit(expected: string, received: string): number {
  const expectedDigits = normalizeCode(expected);
  const receivedDigits = normalizeCode(received);
  const length = Math.max(expectedDigits.length, receivedDigits.length);

  for (let index = 0; index < length; index += 1) {
    if (expectedDigits[index] !== receivedDigits[index]) return index;
  }

  return -1;
}

export function toneForDigit(digit: string): number {
  const value = Number(digit);
  return 220 * 2 ** (value / 12);
}

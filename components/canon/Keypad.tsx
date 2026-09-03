import { keypadRows } from "@/lib/trace/code-path";

export function chunkIndexForPosition(chunks: string[], position: number): number {
  let boundary = 0;
  for (let index = 0; index < chunks.length; index += 1) {
    boundary += chunks[index].length;
    if (position < boundary) return index;
  }
  return Math.max(0, chunks.length - 1);
}

export function chunkStart(chunks: string[], index: number): number {
  return chunks.slice(0, index).reduce((sum, chunk) => sum + chunk.length, 0);
}

export function CodeSlots({ codeLength, entry, error = false }: { codeLength: number; entry: string; error?: boolean }) {
  return (
    <div className={`codeSlots${error ? " error" : ""}`} aria-label={`${codeLength}-digit code entry`}>
      {Array.from({ length: codeLength }, (_, index) => {
        const value = entry[index] ?? "";
        const cursor = index === entry.length && entry.length < codeLength;
        return (
          <span className={`codeSlot${value ? " filled" : ""}${cursor ? " cursor" : ""}`} key={index}>
            {value}
          </span>
        );
      })}
    </div>
  );
}

export function NumberPad({
  code,
  entry,
  guided,
  onDigit,
}: {
  code: string;
  entry: string;
  guided: boolean;
  onDigit: (digit: string) => void;
}) {
  const next = guided ? code[entry.length] : null;
  return (
    <div className="keypad" role="group" aria-label="Number pad">
      {keypadRows.calculator.flatMap((row, rowIndex) =>
        row.map((digit, columnIndex) => {
          if (!digit) return <span className="key spacer" aria-hidden="true" key={`spacer-${rowIndex}-${columnIndex}`} />;
          const accepted = guided && entry.split("").some((value, index) => value === digit && index < entry.length);
          return (
            <button
              className={`key${next === digit ? " next" : ""}${accepted ? " accepted" : ""}`}
              data-digit={digit}
              type="button"
              aria-label={`Digit ${digit}`}
              onClick={() => onDigit(digit)}
              key={digit}
            >
              {digit}
            </button>
          );
        }),
      )}
    </div>
  );
}

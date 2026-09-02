import type { MemoryHook as MemoryHookData } from "@/types/plu";

export function MemoryHook({ hook }: { hook: MemoryHookData }) {
  return (
    <details className="memory-hook">
      <summary>
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-4.7 12.2A4.8 4.8 0 0 0 12 22a4.8 4.8 0 0 0 4.7-7.8A7 7 0 0 0 12 2Zm-2 17.4a2.8 2.8 0 0 1-1.1-5.3l.6-.3-.4-.5A5 5 0 1 1 15 5.2a5 5 0 0 1-.1 8.1l-.4.5.6.3a2.8 2.8 0 0 1-1.1 5.3v-3.9h-4v3.9Z" /></svg>
          Optional memory rescue
        </span>
        <small>Use only if the code keeps slipping.</small>
      </summary>
      <div className="memory-content">
        <div className="peg-pair">
          {hook.chunks.map((chunk) => <span className="peg" key={`${chunk.code}-${chunk.peg}`}><b>{chunk.code}</b>{chunk.peg}</span>)}
        </div>
        <p>{hook.story}</p>
      </div>
    </details>
  );
}

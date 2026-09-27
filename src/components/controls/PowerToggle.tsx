import { useRef } from 'react';

export function PowerToggle({ name, on, pending = false, unavailable = false, onToggle }: {
  name: string; on: boolean; pending?: boolean; unavailable?: boolean; onToggle: () => void;
}) {
  const confirmed = useRef(on);
  if (!pending) confirmed.current = on;
  return (
    <button type="button" className="tactus-power-toggle" role="switch"
      aria-label={name} aria-checked={confirmed.current} aria-busy={pending}
      disabled={pending || unavailable} data-pending={pending} data-unavailable={unavailable}
      onClick={event => { event.stopPropagation(); onToggle(); }}>
      <span className="tactus-power-track"><span className="tactus-power-thumb" /></span>
    </button>
  );
}

import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { PowerToggle } from './PowerToggle';

export function DeviceRow({ name, detail, icon, on, pending, unavailable, last, onOpen, onToggle }: {
  name: string; detail: string; icon: ReactNode; on: boolean;
  pending?: boolean; unavailable?: boolean; last: boolean;
  onOpen?: () => void; onToggle: () => void;
}) {
  const content = <><span className="tactus-device-icon">{icon}</span><span className="tactus-device-copy"><span>{name}</span><small>{unavailable ? 'Unavailable' : pending ? 'Updating…' : detail}</small></span>{onOpen && <ChevronRight size={14} aria-hidden="true" />}</>;
  return <div className="tactus-device-row" data-last={last}>
    {onOpen ? <button className="tactus-device-open" aria-label={`Open ${name} controls`} onClick={onOpen}>{content}</button> : <div className="tactus-device-open">{content}</div>}
    <PowerToggle name={name} on={on} pending={pending} unavailable={unavailable} onToggle={onToggle} />
  </div>;
}

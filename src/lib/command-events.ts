export type HomeEvent = { id: number; title: string; time: string; status: 'pending'|'confirmed'|'accepted'|'error'; detail: string };

export function visibleCommandError(events: HomeEvent[], dismissed: ReadonlySet<number>) {
  return events.find(event => event.status === 'error' && !dismissed.has(event.id));
}

// Keep pending commands and unresolved errors even when completed history fills.
export function retainCommandEvents(events: HomeEvent[]): HomeEvent[] {
  let completed = 0;
  return events.filter(event => event.status === 'pending' || event.status === 'error' || ++completed <= 100);
}

import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes, ChangeEvent } from 'react';

// Keep dragging responsive, but send just the settled value. Remote updates
// remain authoritative once editing finishes; leaving a screen cancels edits.
export function LiveRange({ value, onChange, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (props.disabled) { if (timer.current) clearTimeout(timer.current); timer.current=null; setDraft(value); } }, [props.disabled, value]);
  return <><input {...props} value={draft} onChange={e => {
    const next = e.target.value; setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current=null; onChange?.({ target:{value:next} } as ChangeEvent<HTMLInputElement>); },400);
  }}/>{props.type === 'range' && String(draft) !== String(value) && <small className="np-adjusting">Adjusting…</small>}</>;
}

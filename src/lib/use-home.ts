import { useCallback, useEffect, useRef, useState } from 'react';
import { HAClient, mergeStates } from './ha-client';
import type { HAStateMap } from './ha-client';
import { commandFor, confirms } from './home-control';
import type { Change, Command } from './home-control';
export type HomeEvent = { id: number; title: string; time: string; status: 'pending'|'confirmed'|'accepted'|'error'; detail: string };

export function useHome() {
  const [states, setStates] = useState<HAStateMap>({});
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const client = useRef<HAClient | null>(null);
  const current = useRef<HAStateMap>({});
  const ready = useRef(false);
  const generation = useRef(0);
  const eventId = useRef(0);
  const mounted = useRef(false);
  const busy = useRef(new Set<string>());
  const refresh = useCallback(async () => {
    const gen = ++generation.current;
    try {
      const fetched = await client.current!.fetchStates();
      if (!mounted.current || gen !== generation.current) return;
      current.current = mergeStates(current.current, fetched);
      setStates(current.current); setLoaded(true);
      if (ready.current) { setError(''); setConnected(true); }
    } catch (e) { if (mounted.current && gen === generation.current) { setError(e instanceof Error ? e.message : 'Unable to refresh Home Assistant'); setConnected(false); } }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const ha = new HAClient({ url: import.meta.env.VITE_HA_URL, token: import.meta.env.VITE_HA_TOKEN });
    client.current = ha;
    let authError = '';
    const offState = ha.onStateChanged((id, entity) => { current.current = mergeStates(current.current,{[id]:entity}); setStates(current.current); });
    const offConn = ha.onConnectionChange(on => {
      ready.current = on;
      if (on) { authError = ''; void refresh(); }
      else { ++generation.current; setConnected(false); setError(authError || 'Connection lost. Reconnecting…'); }
    });
    const offAuth = ha.onAuthError(message => { authError = message; setError(message); setConnected(false); });
    let lastResume = 0;
    const resume = () => { if (document.visibilityState === 'hidden' || Date.now()-lastResume<1000) return; lastResume=Date.now(); ha.reconnect(); };
    const pageshow = (e: PageTransitionEvent) => { if (e.persisted) resume(); };
    document.addEventListener('visibilitychange',resume); window.addEventListener('online',resume); window.addEventListener('pageshow',pageshow);
    ha.connect();
    return () => { mounted.current=false; ++generation.current; ready.current=false; offState();offConn();offAuth();ha.disconnect();document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume);window.removeEventListener('pageshow',pageshow); };
  },[refresh]);

  const run = useCallback(async (title: string, commands: Command[]) => {
    if (!commands.length || !ready.current || commands.some(c=>busy.current.has(c.id))) return;
    const id = ++eventId.current;
    commands.forEach(c=>busy.current.add(c.id)); setPending(new Set(busy.current));
    setEvents(old=>[{id,title,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),status:'pending',detail:'Sending to Home Assistant…'},...old].slice(0,100));
    const results = await Promise.allSettled(commands.map(async c => {
      await client.current!.requestService(c.domain,c.service,c.data,{entity_id:c.id});
      if (!c.expected) return 'accepted';
      // State events are authoritative. Poll the local event snapshot and do
      // one REST refresh for devices that do not emit a redundant update.
      const deadline = Date.now()+8000;
      let refreshed = false;
      while (mounted.current && ready.current && Date.now()<deadline) {
        if (confirms(current.current[c.id],c.expected)) return 'confirmed';
        if (!refreshed) { refreshed=true; void refresh(); }
        await new Promise(resolve=>setTimeout(resolve,150));
      }
      throw Error('Home Assistant accepted the command, but the requested state was not confirmed. Check the device before retrying.');
    }));
    commands.forEach(c=>busy.current.delete(c.id));
    if (!mounted.current) return;
    setPending(new Set(busy.current));
    const failures = results.filter(r=>r.status==='rejected');
    const accepted = results.some(r=>r.status==='fulfilled'&&r.value==='accepted');
    setEvents(old=>old.map(e=>e.id!==id?e:{...e,status:failures.length?'error':accepted?'accepted':'confirmed',detail:failures.length?`${failures.length} of ${commands.length} actions failed. ${(failures[0] as PromiseRejectedResult).reason.message}`:accepted?'Accepted by Home Assistant. Final device state is not confirmed for this action.':'Device state confirmed by Home Assistant.'}));
    if (accepted) void refresh();
  },[refresh]);
  const apply = useCallback((title: string, changes: Change[]) => {
    try { void run(title,changes.map(c=>commandFor(c,current.current[c.id]))); }
    catch (e) { setError(e instanceof Error?e.message:'Unable to send command'); }
  },[run]);
  const service = useCallback((title: string,id:string,action:string,data:Record<string,unknown>={}) => { void run(title,[{id,domain:id.split('.')[0],service:action,data}]); },[run]);
  return {states,loaded,connected,error,pending,events,apply,service,retry:()=>client.current?.reconnect()};
}

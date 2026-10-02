import { useEffect, useMemo, useState } from 'react';
import { House, LayoutGrid, Zap, Sparkles, Power, ArrowLeft, ArrowUpRight, Search, Car, Sun, Battery, Plug, Thermometer, Lightbulb, Moon, ChevronRight, Play, Pause, SkipBack, SkipForward, Volume2, Tv, Speaker } from 'lucide-react';
import type { HAEntity, HAStateMap } from '@/lib/ha-client';
import { mapHAStatesToRooms, mapHAStatesToScenes, mapHAStatesToAutomations, HA_ENTITIES, INDOOR_AIR_SENSORS, isLightingEntity } from '@/lib/ha-types';
import { compareRooms } from '@/lib/room-order';
import './home.css';
import { useHome } from '@/lib/use-home';
import { LiveRange } from './LiveRange';
import { EnvironmentDetail } from './EnvironmentDetail';
import { EnvironmentSnapshot } from './EnvironmentSnapshot';

const unavailable = (e?: HAEntity) => !e || ['unavailable', 'unknown'].includes(e.state);
const name = (e?: HAEntity) => String(e?.attributes.friendly_name || e?.entity_id || 'Device').trim();
const display = (e?: HAEntity, unit = '') => { if (unavailable(e)) return 'Unavailable'; const n = Number(e!.state); return `${e!.state.trim() !== '' && Number.isFinite(n) ? n.toLocaleString([], { maximumFractionDigits: unit === '%' ? 0 : 1 }) : e!.state.replaceAll('_', ' ')}${unit}`; };
const when = (value: unknown) => value && Number.isFinite(Date.parse(String(value))) ? new Date(String(value)).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No recorded run';
type Change = { id: string; state?: string; attributes?: Record<string, unknown> };
type Plan = { name: string; changes: Change[]; notes?: string; action?: {id:string;service:string;data?:Record<string,unknown>} };

export default function HomeApp() {
  const { states, loaded, connected, error, pending, events, apply, service, getForecast, retry } = useHome();
  const [page, setPage] = useState('now');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [dismissedEvent, setDismissedEvent] = useState<number | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  // Local media clock: HA reports an authoritative media_position plus the
  // timestamp it was measured at. Advance that position locally while
  // playing, then naturally resync whenever HA publishes fresh state.
  const [mediaNow, setMediaNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setMediaNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('tactus-theme') || 'light'; } catch { return 'light'; } });
  useEffect(() => { try { localStorage.setItem('tactus-theme', theme); } catch {} }, [theme]);
  useEffect(() => {
    const initial = { tactus: true, page: 'now', roomId: null, detail: null };
    window.history.replaceState(initial, '', window.location.pathname);
    const restore = (e: PopStateEvent) => {
      const route = e.state?.tactus ? e.state : initial;
      setPage(route.page); setRoomId(route.roomId); setDetail(route.detail); setPlan(null);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    const route = { tactus: true, page, roomId, detail };
    if (JSON.stringify(window.history.state) !== JSON.stringify(route)) window.history.pushState(route, '', window.location.pathname);
    window.scrollTo(0, 0);
  }, [page, roomId, detail]);
  useEffect(() => { if (plan) window.scrollTo(0, 0); }, [plan]);
  const rooms = useMemo(() => mapHAStatesToRooms(states).sort(compareRooms), [states]);
  const scenes = useMemo(() => mapHAStatesToScenes(states), [states]);
  const automations = useMemo(() => mapHAStatesToAutomations(states), [states]);
  const lights = Object.values(states).filter(e => isLightingEntity(e.entity_id));
  const room = rooms.find(r => r.id === roomId);
  const entity = detail ? states[detail] : undefined;
  const controls = Object.values(states).filter(e => /^(light|switch|climate|cover|lock|select|number|button|media_player|sensor|binary_sensor)\./.test(e.entity_id));
  const navigate = (next: string) => { setPage(next); setRoomId(null); setDetail(null); setPlan(null); setQuery(''); setFilter('all'); };
  const change = (e: HAEntity, state: string) => apply(`${name(e)}: ${state}`, [{ id: e.entity_id, state }]);
  const attr = (e: HAEntity, key: string, value: unknown) => apply(`${name(e)} adjusted`, [{ id: e.entity_id, attributes: { [key]: value } }]);
  const open = (id: string) => { setDetail(id); setPlan(null); };
  const blocked = (e?: HAEntity) => unavailable(e) || !connected || !!e && pending.has(e.entity_id);
  const heading = (eyebrow: string, title: string, subtitle?: string) => <header className="np-heading"><span>{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</header>;
  const back = (fn: () => void, text: string) => <button className="np-back" onClick={fn}><ArrowLeft size={18} />{text}</button>;
  const reading = (id: string, unit = '') => display(states[id], unit);
  const toggle = (e: HAEntity) => <button className="np-power" aria-label={`Toggle ${name(e)}`} aria-pressed={e.state === 'on'} disabled={blocked(e)} onClick={() => change(e, e.state === 'on' ? 'off' : 'on')}><Power size={19} /></button>;
  const deviceRow = (e: HAEntity) => <div className="np-device" key={e.entity_id}><button className="np-device-open" onClick={() => open(e.entity_id)}><span className="np-device-symbol">{isLightingEntity(e.entity_id) ? <Lightbulb size={21} /> : e.entity_id.startsWith('climate.') ? <Thermometer size={21} /> : <Plug size={21} />}</span><span><strong>{name(e)}</strong>{page==='devices' && <small>{e.entity_id}</small>}<small>{pending.has(e.entity_id) ? 'Updating…' : unavailable(e) ? 'Unavailable' : e.entity_id.startsWith('button.') ? `Last used: ${when(e.state)}` : display(e, String(e.attributes.unit_of_measurement || ''))}{e.state === 'on' && e.attributes.brightness != null ? ` · ${Math.round(Number(e.attributes.brightness) / 255 * 100)}%` : ''}</small></span></button>{/^(light|switch)\./.test(e.entity_id) ? toggle(e) : <button className="np-icon" aria-label={`Open ${name(e)}`} onClick={() => open(e.entity_id)}><ChevronRight size={20} /></button>}</div>;
  const sensorBlock = (id: string) => { const cfg = INDOOR_AIR_SENSORS[id]; return cfg ? <div className="np-readings">{Object.entries(cfg).map(([kind, eid]) => <div key={eid}><small>{{ temp: 'Temperature', humidity: 'Humidity', co2: 'CO₂', pm25: 'PM2.5' }[kind]}</small><strong>{reading(eid, { temp: '°C', humidity: '%', co2: ' ppm', pm25: ' µg/m³' }[kind])}</strong></div>)}</div> : null; };
  const makeScene = (id: string) => service(name(states[id]), id, 'turn_on');
  const activeLights = lights.filter(e => e.state === 'on');
  const mediaPlayers = Object.values(states).filter(e => e.entity_id.startsWith('media_player.'));
  const livingAppleTV = states['media_player.living_room_living_room'];
  const livingFrame = states['media_player.living_room_the_frame'];
  const bedroomHomePod = states['media_player.bedroom_bedroom'];
  const mediaActive = (e?: HAEntity) => !!e && ['playing','paused','buffering'].includes(e.state);
  const mediaPosition = (e?: HAEntity) => {
    if (!e) return 0;
    const reported = Math.max(0, Number(e.attributes.media_position) || 0);
    if (e.state !== 'playing') return reported;
    const updated = Date.parse(String(e.attributes.media_position_updated_at || ''));
    if (!Number.isFinite(updated)) return reported;
    const duration = Number(e.attributes.media_duration || 0);
    const position = reported + Math.max(0, (mediaNow - updated) / 1000);
    return duration > 0 ? Math.min(duration, position) : position;
  };
  const fmtTime = (value: unknown) => {
    const seconds = Math.max(0, Number(value) || 0);
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2,'0')}`;
  };
  const mediaSubtitle = (e?: HAEntity) => {
    if (!e) return 'Unavailable';
    const app = String(e.attributes.app_name || '').trim();
    const artist = String(e.attributes.media_artist || '').trim();
    return artist || app || e.state.replaceAll('_',' ');
  };
  const mediaArtwork = (e?: HAEntity) => {
    const picture = e?.attributes.entity_picture ? String(e.attributes.entity_picture) : '';
    if (!picture) return '';
    if (/^https?:\/\//.test(picture)) return picture;
    const base = String(import.meta.env.VITE_HA_URL || window.location.origin).replace(/\/$/, '');
    return `${base}${picture.startsWith('/') ? '' : '/'}${picture}`;
  };
  const mediaAction = (e: HAEntity, action: string, data: Record<string,unknown> = {}) => service(`${name(e)} ${action.replaceAll('_',' ')}`, e.entity_id, action, data);
  const mediaTransport = (e: HAEntity) => <div className="np-media-transport">
    <button aria-label="Previous" disabled={blocked(e)} onClick={()=>mediaAction(e,'media_previous_track')}><SkipBack size={20}/></button>
    <button className="np-media-play" aria-label={e.state==='playing'?'Pause':'Play'} disabled={blocked(e)} onClick={()=>mediaAction(e,e.state==='playing'?'media_pause':'media_play')}>{e.state==='playing'?<Pause size={22}/>:<Play size={22}/>}</button>
    <button aria-label="Next" disabled={blocked(e)} onClick={()=>mediaAction(e,'media_next_track')}><SkipForward size={20}/></button>
  </div>;
  const nowPlayingCard = (e: HAEntity) => {
    const duration = Number(e.attributes.media_duration || 0);
    const position = mediaPosition(e);
    const artwork = mediaArtwork(e);
    return <button className="np-now-playing" onClick={()=>open(e.entity_id)}>
      {artwork ? <img src={artwork} alt="" /> : <span className="np-media-placeholder"><Tv size={24}/></span>}
      <span className="np-now-playing-copy"><small>NOW PLAYING · {name(e)}</small><strong>{String(e.attributes.media_title || name(e))}</strong><span>{mediaSubtitle(e)}</span>{duration>0 && <span className="np-media-progress"><i style={{width:`${Math.min(100,position/duration*100)}%`}}/><em>{fmtTime(position)} / {fmtTime(duration)}</em></span>}</span>
      <span className="np-now-playing-action" onClick={ev=>{ev.stopPropagation();mediaAction(e,e.state==='playing'?'media_pause':'media_play')}}>{e.state==='playing'?<Pause size={20}/>:<Play size={20}/>}</span>
    </button>;
  };
  let content;
  if (!loaded) content = <>{heading('TACTUS', 'Your home, loading.', error || 'Connecting to Home Assistant…')}{error && <button className="np-primary" onClick={retry}>Try again</button>}</>;
  else if (plan) content = <>{back(() => setPlan(null), 'Back')}{heading('REVIEW ACTION', plan.name, 'Check the details before running.')}<div className="np-panel">{plan.changes.map(c => <div className="np-line" key={c.id}><strong>{name(states[c.id])}</strong><span>{c.state || Object.entries(c.attributes || {}).map(([k,v]) => `${k.replaceAll('_',' ')}: ${v}`).join(', ')}</span></div>)}{plan.notes && <p>{plan.notes}</p>}</div><button className="np-primary" disabled={!connected || (!plan.action && !plan.changes.length) || plan.changes.some(c=>pending.has(c.id)) || !!plan.action && pending.has(plan.action.id)} onClick={() => { if(plan.action) service(plan.name,plan.action.id,plan.action.service,plan.action.data); else apply(plan.name, plan.changes); setPlan(null); }}>Run {plan.name.toLowerCase()}</button></>;
  else if (entity) {
    const domain = entity.entity_id.split('.')[0];
    const isLivingMedia = entity.entity_id === livingAppleTV?.entity_id;
    const isSpeakerMedia = entity.entity_id === bedroomHomePod?.entity_id || entity.attributes.device_class === 'speaker';
    const modes = entity.attributes.supported_color_modes as string[] || [];
    content = <>{back(() => setDetail(null), 'Back')}{heading(isLightingEntity(entity.entity_id) ? 'LIGHT' : domain==='media_player' ? (mediaActive(entity) ? 'NOW PLAYING' : 'MEDIA') : domain.toUpperCase(), domain==='media_player' ? (isLivingMedia ? 'Living Room TV' : isSpeakerMedia ? 'Bedroom HomePod' : name(entity)) : name(entity), unavailable(entity) ? 'Unavailable in Home Assistant' : domain==='media_player' ? `${String(entity.attributes.media_title || (mediaActive(entity) ? 'Media' : entity.state.replaceAll('_',' ')))}${entity.attributes.app_name ? ` · ${entity.attributes.app_name}` : ''}` : `Current state: ${entity.state.replaceAll('_',' ')}`)} 
    <div className="np-panel np-detail">
    {['light','switch','automation'].includes(domain) && <div className="np-line"><strong>Power</strong>{toggle(entity)}</div>}
    {domain === 'light' && <>
      {!modes.every(m => m === 'onoff') && <label className="np-range">Brightness <output>{Math.round(Number(entity.attributes.brightness || 0) / 255 * 100)}%</output><LiveRange aria-label="Brightness" type="range" min="0" max="255" value={Number(entity.attributes.brightness || 0)} disabled={blocked(entity)} onChange={e => { const brightness = Number(e.target.value); apply(`${name(entity)} brightness`, [{ id: entity.entity_id, state: brightness ? 'on' : 'off', attributes: { brightness } }]); }} /></label>}
      {modes.includes('color_temp') && <label className="np-range">White temperature <output>{String(entity.attributes.color_temp_kelvin || '—')} K</output><LiveRange aria-label="White temperature" type="range" min={Number(entity.attributes.min_color_temp_kelvin || 2000)} max={Number(entity.attributes.max_color_temp_kelvin || 6500)} value={Number(entity.attributes.color_temp_kelvin || 2700)} disabled={blocked(entity)} onChange={e => attr(entity, 'color_temp_kelvin', Number(e.target.value))} /></label>}
      {modes.some(m => ['hs','xy','rgb','rgbw','rgbww'].includes(m)) && <label className="np-field">Light colour<LiveRange type="color" aria-label="Light colour" disabled={blocked(entity)} value={String((Array.isArray(entity.attributes.rgb_color) ? '#' + (entity.attributes.rgb_color as number[]).slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('') : '#ffffff'))} onChange={e => attr(entity,'rgb_color',[1,3,5].map(i=>parseInt(e.target.value.slice(i,i+2),16)))} /></label>}
    </>}
    {domain === 'climate' && <><label className="np-field">Mode<select value={entity.state} disabled={blocked(entity)} onChange={e => change(entity,e.target.value)}>{(entity.attributes.hvac_modes as string[] || []).map(m => <option key={m}>{m}</option>)}</select></label><label className="np-range">Target temperature <output>{String(entity.attributes.temperature ?? '—')}°C</output><LiveRange aria-label="Target temperature" type="range" min={Number(entity.attributes.min_temp || 16)} max={Number(entity.attributes.max_temp || 30)} step={Number(entity.attributes.target_temp_step || .5)} value={Number(entity.attributes.temperature || 21)} disabled={blocked(entity)} onChange={e => attr(entity,'temperature',Number(e.target.value))} /></label>{['fan_modes','preset_modes'].map(key => Array.isArray(entity.attributes[key]) && <label className="np-field" key={key}>{key === 'fan_modes' ? 'Fan' : 'Preset'}<select disabled={blocked(entity)} value={String(entity.attributes[key === 'fan_modes' ? 'fan_mode' : 'preset_mode'] || '')} onChange={e => attr(entity,key === 'fan_modes' ? 'fan_mode' : 'preset_mode',e.target.value)}><option value="">Not set</option>{(entity.attributes[key] as string[]).map(m => <option key={m}>{m}</option>)}</select></label>)}</>}
    {domain === 'select' && <label className="np-field">Setting<select value={entity.state} disabled={blocked(entity)} onChange={e => change(entity,e.target.value)}>{(entity.attributes.options as string[] || []).map(m => <option key={m}>{m}</option>)}</select></label>}
    {domain === 'number' && <label className="np-range">Value <output>{entity.state} {String(entity.attributes.unit_of_measurement || '')}</output><LiveRange aria-label={name(entity)} type="range" min={Number(entity.attributes.min || 0)} max={Number(entity.attributes.max || 100)} step={Number(entity.attributes.step || 1)} value={Number(entity.state) || 0} disabled={blocked(entity)} onChange={e => change(entity,e.target.value)} /></label>}
    {domain === 'lock' && <button className="np-primary" disabled={blocked(entity)} onClick={() => setPlan({name:entity.state==='locked'?`Unlock ${name(entity)}`:`Lock ${name(entity)}`,changes:[{id:entity.entity_id,state:entity.state==='locked'?'unlocked':'locked'}]})}>{entity.state === 'locked' ? 'Unlock' : 'Lock'}</button>}
    {domain === 'cover' && <div className="np-actions"><button disabled={blocked(entity) || !(Number(entity.attributes.supported_features) & 1)} onClick={() => setPlan({name:`Open ${name(entity)}`,changes:[{id:entity.entity_id,state:'open'}]})}>Open</button><button disabled={blocked(entity) || !(Number(entity.attributes.supported_features) & 2)} onClick={() => setPlan({name:`Close ${name(entity)}`,changes:[{id:entity.entity_id,state:'closed'}]})}>Close</button></div>}
    {domain === 'button' && <button className="np-primary" disabled={blocked(entity)} onClick={() => setPlan({name:name(entity),changes:[],action:{id:entity.entity_id,service:'press'}})}>Run action</button>}
    {['sensor','binary_sensor'].includes(domain) && <div className="np-line"><strong>Reading</strong><span>{display(entity, String(entity.attributes.unit_of_measurement || ''))}</span></div>}
    {domain === 'media_player' && <div className={`np-media-detail ${isSpeakerMedia ? 'np-media-detail-speaker' : 'np-media-detail-tv'}`}>
      {mediaArtwork(entity) && <img className="np-media-art" src={mediaArtwork(entity)} alt="" />}
      <div className="np-media-meta"><strong>{String(entity.attributes.media_title || name(entity))}</strong><span>{mediaSubtitle(entity)}</span></div>
      {Number(entity.attributes.media_duration || 0)>0 && <div className="np-media-timeline"><div><i style={{width:`${Math.min(100,mediaPosition(entity)/Number(entity.attributes.media_duration)*100)}%`}}/></div><span>{fmtTime(mediaPosition(entity))} <b>/</b> {fmtTime(entity.attributes.media_duration)}</span></div>}
      {mediaTransport(entity)}
      {entity.attributes.volume_level != null && <label className="np-range"><span className="np-media-volume-label"><Volume2 size={17}/> Volume</span><output>{Math.round(Number(entity.attributes.volume_level)*100)}%</output><LiveRange aria-label="Volume" type="range" min="0" max="1" step=".01" value={Number(entity.attributes.volume_level)} disabled={blocked(entity)} onChange={e=>mediaAction(entity,'volume_set',{volume_level:Number(e.target.value)})}/></label>}
      {Array.isArray(entity.attributes.source_list) && (entity.attributes.source_list as string[]).length>0 && <label className="np-field">Source<select value={String(entity.attributes.source || entity.attributes.app_name || '')} disabled={blocked(entity)} onChange={e=>mediaAction(entity,'select_source',{source:e.target.value})}><option value="">Choose…</option>{(entity.attributes.source_list as string[]).map(source=><option key={source} value={source}>{source}</option>)}</select></label>}
      {isLivingMedia && livingFrame && <div className="np-tv-hardware"><div><Tv size={19}/><span><strong>Television</strong><small>{livingFrame.state} · {String(livingFrame.attributes.source || 'HDMI')}</small></span></div><div className="np-tv-hardware-actions"><button disabled={blocked(livingFrame)} onClick={()=>mediaAction(livingFrame,livingFrame.attributes.is_volume_muted?'volume_mute':'volume_mute',{is_volume_muted:!livingFrame.attributes.is_volume_muted})}>{livingFrame.attributes.is_volume_muted?'Unmute':'Mute'}</button><button onClick={()=>open(livingFrame.entity_id)}>More</button></div></div>}
    </div>}
    </div></>;
  } else if (room) content = <>{back(() => setRoomId(null), 'Rooms')}{heading('YOUR SPACE', room.name)}{room.id==='living' && livingAppleTV && <><div className="np-section"><h2>Media</h2></div>{mediaActive(livingAppleTV)?nowPlayingCard(livingAppleTV):<button className="np-media-idle" onClick={()=>open(livingAppleTV.entity_id)}><Tv size={22}/><span><strong>Living Room</strong><small>Apple TV {livingAppleTV.state} · The Frame {livingFrame?.state || 'unavailable'}</small></span><ChevronRight size={18}/></button>}</>}{room.id==='bedroom' && bedroomHomePod && <><div className="np-section"><h2>Media</h2></div>{mediaActive(bedroomHomePod)?nowPlayingCard(bedroomHomePod):<button className="np-media-idle" onClick={()=>open(bedroomHomePod.entity_id)}><Speaker size={22}/><span><strong>Bedroom HomePod</strong><small>{bedroomHomePod.state} · volume {Math.round(Number(bedroomHomePod.attributes.volume_level||0)*100)}%</small></span><ChevronRight size={18}/></button>}</>}{sensorBlock(room.id)}<div className="np-section"><h2>Lighting</h2>{room.lights.length > 0 && <button disabled={!connected || !room.lights.some(l=>states[l.id]?.state==='on') || room.lights.some(l=>pending.has(l.id))} onClick={() => apply(`Turn off ${room.name} lights`, room.lights.filter(l => states[l.id]?.state==='on').map(l => ({ id:l.id,state:'off' })))}>All off</button>}</div><div className="np-panel">{room.lights.length ? room.lights.map(l => deviceRow(states[l.id])) : <p>No lights assigned to this room.</p>}</div>{room.switches.length > 0 && <><h2>Power points</h2><div className="np-panel">{room.switches.map(s => deviceRow(states[s.id]))}</div></>}{room.climate.length > 0 && <><h2>Climate</h2><div className="np-panel">{room.climate.map(c => deviceRow(states[c.id]))}</div></>}<button className="np-text" onClick={() => navigate('devices')}>Find another device <ArrowUpRight size={16} /></button></>;
  else if (page === 'now') content = <>{heading('YOUR HOME, RIGHT NOW', 'Make yourself\nat home.', `${lights.filter(e => e.state === 'on').length} lights on · ${reading(HA_ENTITIES.outdoorWeather).replaceAll('-', ' ')}`)}{mediaPlayers.filter(e=>e.state==='playing').map(nowPlayingCard)}
    <div className="np-scenes">{scenes.map((s,i) => <button key={s.id} disabled={!connected || pending.has(s.id) || states[s.id]?.state==='unavailable'} onClick={() => makeScene(s.id)}>{i ? <Moon size={23} /> : <Sparkles size={23} />}<strong>{s.name}</strong><ArrowUpRight size={16} /></button>)}<button disabled={!connected || !activeLights.length || lights.some(e=>pending.has(e.entity_id))} onClick={() => apply('All lights off',activeLights.map(e => ({id:e.entity_id,state:'off'})))}><Power size={23}/><strong>Lights off</strong><ArrowUpRight size={16}/></button></div>
    <div className="np-section"><h2>Within reach</h2><button onClick={() => navigate('rooms')}>All rooms <ArrowUpRight size={16}/></button></div>
    <div className="np-favourites"><button className="np-room-hero" onClick={() => {setRoomId('living');setPage('rooms');}}><Lightbulb size={25}/><span>Living Room</span><strong>{rooms.find(r=>r.id==='living')?.lights.filter(l=>l.cardState==='on').length || 0}<small> lights on</small></strong><span className="np-hero-foot">Adjust lighting <ArrowUpRight size={18}/></span></button><button className="np-climate-hero" onClick={() => open(HA_ENTITIES.climateSplitSystem)}><Thermometer size={25}/><span>Split System</span><strong>{String(states[HA_ENTITIES.climateSplitSystem]?.attributes.current_temperature ?? '—')}<small>°</small></strong><span className="np-hero-foot">{reading(HA_ENTITIES.climateSplitSystem)} <ArrowUpRight size={18}/></span></button></div>
    <EnvironmentSnapshot states={states} onOpen={kind=>navigate(kind)}/>
    <button className="np-device-search-link" onClick={() => navigate('devices')}><Search size={19}/> Find any device <ArrowUpRight size={17}/></button>
    <button className="np-ghost" onClick={() => navigate('ghost')}><Car size={30}/><span><strong>Ghost</strong><small>{reading(HA_ENTITIES.teslaBattery,'%')} battery · {reading(HA_ENTITIES.teslaLock)}</small></span><ArrowUpRight size={20}/></button>
    {lights.some(unavailable) && <button className="np-attention" onClick={() => {navigate('devices');setFilter('unavailable');}}> <span>{lights.filter(unavailable).length} light unavailable</span><ChevronRight size={18}/></button>}
    <button className="np-energy-link" onClick={() => navigate('energy')}><Battery size={19}/><span>Powerwall {reading(HA_ENTITIES.powerwallCharge,'%')}</span><ArrowUpRight size={17}/></button>
    </>;
  else if (page === 'inside' || page === 'outside') content = <>{back(()=>navigate('now'),'Home')}<EnvironmentDetail kind={page} states={states} connected={connected} getForecast={getForecast}/></>;
  else if (page === 'rooms') content = <>{heading('YOUR SPACES','Every room.','Lighting, climate and readings, together.')}<div className="np-room-grid">{rooms.map(r => <button key={r.id} onClick={() => setRoomId(r.id)}><House size={23}/><strong>{r.name}</strong><small>{r.lights.length ? `${r.lights.filter(l=>l.cardState==='on').length} of ${r.lights.length} lights on` : 'Sensors'}{r.lights.some(l=>l.cardState==='error') ? ' · unavailable' : ''}</small><span>{INDOOR_AIR_SENSORS[r.id] ? reading(INDOOR_AIR_SENSORS[r.id].temp,'°') : 'Open room'}<ArrowUpRight size={16}/></span></button>)}</div><button className="np-primary" onClick={() => navigate('devices')}><Search size={18}/> Find any device</button></>;
  else if (page === 'devices') {
    const list = controls.filter(e => (!query || `${name(e)} ${e.entity_id}`.toLowerCase().includes(query.toLowerCase())) && (filter==='all' || filter==='unavailable' ? filter!=='unavailable' || unavailable(e) : filter==='light' ? isLightingEntity(e.entity_id) : filter==='switch' ? e.entity_id.startsWith('switch.') && !isLightingEntity(e.entity_id) : e.entity_id.startsWith(filter+'.')));
    content = <>{back(() => window.history.back(),'Back')}{heading('DEVICE LIBRARY','Everything, found.',`${controls.length} controls and readings from Home Assistant`)}<label className="np-search"><Search size={19}/><input aria-label="Find a device" placeholder="Name, room or device…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="np-field">Show<select value={filter} onChange={e=>setFilter(e.target.value)}>{['all','light','switch','climate','cover','lock','select','number','button','media_player','sensor','binary_sensor','unavailable'].map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label><p className="np-caption">Search lights, power points, climate and sensors across your home.</p><div className="np-panel">{list.map(deviceRow)}{!list.length && <p>No matching devices.</p>}</div></>;
  } else if (page === 'energy') content = <>{heading('ENERGY','A little perspective.','Your solar, battery and home consumption.')}<div className="np-energy-hero"><Sun size={28}/><span>Solar now</span><strong>{reading(HA_ENTITIES.solarPower)}<small> kW</small></strong><p>{reading(HA_ENTITIES.solarEnergyToday,' kWh')} generated today</p></div><div className="np-metric-grid">{[['Powerwall',HA_ENTITIES.powerwallCharge,'%'],['Home usage',HA_ENTITIES.homeLoadPower,' kW'],['Battery flow',HA_ENTITIES.powerwallFlow,' kW'],['Grid power',HA_ENTITIES.gridPower,' kW']].map(([n,id,u])=><div key={id}><small>{n}</small><strong>{reading(id,u)}</strong></div>)}</div><p className="np-caption">Signed power as reported by Home Assistant. Negative battery power means charging; positive means discharging.</p><button className="np-ghost" onClick={()=>navigate('ghost')}><Car size={28}/><span><strong>Ghost</strong><small>{reading(HA_ENTITIES.teslaBattery,'%')} · {reading(HA_ENTITIES.teslaRange,' km')}</small></span><ArrowUpRight size={20}/></button><h2>Battery settings</h2><div className="np-panel">{controls.filter(e=>e.entity_id.startsWith('switch.home_')||e.entity_id===HA_ENTITIES.powerwallReserve).map(deviceRow)}</div></>;
  else if (page === 'ghost') content = <>{back(()=>navigate('now'),'Home')}{heading('MODEL 3 · HIGHLAND','Ghost.',`${reading(HA_ENTITIES.teslaTracker)} · ${reading(HA_ENTITIES.teslaLock)}`)}<div className="np-energy-hero"><Car size={36}/><strong>{reading(HA_ENTITIES.teslaBattery)}<small>%</small></strong><p>{reading(HA_ENTITIES.teslaRange,' km')} estimated range</p></div>{[
      ['Access', [HA_ENTITIES.teslaLock, HA_ENTITIES.teslaFrunk, HA_ENTITIES.teslaTrunk, HA_ENTITIES.teslaWindows]],
      ['Comfort', [HA_ENTITIES.teslaClimate, HA_ENTITIES.teslaSeatHeaterFL, HA_ENTITIES.teslaSeatHeaterFR, HA_ENTITIES.teslaSteeringWheelHeater]],
      ['Charging', ['switch.ghost_charge','number.ghost_charge_limit','number.ghost_charge_current']],
      ['Security', [HA_ENTITIES.teslaSentry, HA_ENTITIES.teslaValet]],
    ].map(([label, ids]) => <section key={String(label)}><h2>{label}</h2><div className="np-panel">{(ids as string[]).filter(id=>states[id]).map(id=>deviceRow(states[id]))}</div></section>)}<button className="np-primary" onClick={()=>{navigate('devices');setQuery('ghost');}}>All Ghost controls & readings</button></>;
  else if (page === 'routines') content = <>{heading('LET HOME HELP','Your routines.',`${scenes.length} scenes · ${automations.length} automations`)}<h2>Scenes</h2><div className="np-scenes">{scenes.map(s=><button key={s.id} disabled={!connected || pending.has(s.id) || states[s.id]?.state==='unavailable'} onClick={()=>makeScene(s.id)}><Sparkles size={23}/><strong>{s.name}</strong><ArrowUpRight size={16}/></button>)}</div><h2>Automations</h2><div className="np-panel">{automations.map(a=><div className="np-automation" key={a.id}><div><strong>{a.name}</strong><small>{a.state==='off'?'Disabled':a.state==='unavailable'?'Unavailable':`Last run: ${when(a.lastTriggered)}`}</small></div><div className="np-actions">{toggle(states[a.id])}<button disabled={blocked(states[a.id])} onClick={()=>service(`Run ${a.name}`,a.id,'trigger',{skip_condition:true})}>Run now</button></div></div>)}</div><p className="np-caption">Edit triggers, conditions and actions in Home Assistant.</p></>;
  else content = null;

  return <div className={`np-app np-${theme}`}><div className="np-shell"><header className="np-top"><button onClick={()=>navigate('now')}><House size={19}/> Tactus</button><div><button aria-label="Change theme" onClick={()=>setTheme(t=>t==='light'?'dark':'light')}><Sun size={20}/></button></div></header>{error && <div className="np-connection" role="status"><span>{error}{loaded ? ' Showing last known readings.' : ''}</span><button onClick={retry}>Retry</button></div>}<main className="np-main">{content}</main>{events[0]?.status==='error' && dismissedEvent!==events[0].id && page!=='activity' && <div className="np-command-toast" role="alert"><div><strong>{events[0].title}</strong><span>{events[0].detail}</span></div><button aria-label="Dismiss error" onClick={()=>setDismissedEvent(events[0].id)}>×</button></div>}<nav className="np-nav" aria-label="Main navigation">{[['now','Now',House],['rooms','Rooms',LayoutGrid],['energy','Energy',Zap],['routines','Routines',Sparkles]].map(([id,label,Icon]:any)=><button key={id} aria-current={page===id || id==='rooms'&&page==='devices' ? 'page':undefined} onClick={()=>navigate(id)}><Icon size={21}/><span>{label}</span></button>)}</nav></div></div>;
}

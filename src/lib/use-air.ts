import {useEffect,useState} from 'react';
import {INDOOR_AIR_SENSORS} from './ha-types';
import {HOUR,parseAirHistory,type AirHistory} from './air-advice';
export function useAir(connected:boolean,getHistory:(ids:string[],start:number,end:number)=>Promise<unknown>) {
  const [history,setHistory]=useState<AirHistory>({});
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [end,setEnd]=useState(Date.now);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    if(!connected) {setHistory({});setLoading(false);return;}
    const load=async()=>{
      setLoading(true);
      try {const now=Date.now(); const result=await getHistory([...new Set(Object.values(INDOOR_AIR_SENSORS).flatMap(cfg=>Object.values(cfg)))],now-24*HOUR,now);if(active){setHistory(parseAirHistory(result));setEnd(now);setError('');}}
      catch(e){if(active){setHistory({});setError(e instanceof Error?e.message:'Room history unavailable.');}}
      finally{if(active)setLoading(false);}
    };
    void load();const timer=setInterval(load,5*60000);
    return()=>{active=false;clearInterval(timer);};
  },[connected,getHistory,attempt]);
  return {history,error,loading,end,retry:()=>setAttempt(n=>n+1)};
}

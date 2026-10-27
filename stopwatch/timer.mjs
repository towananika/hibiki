export function empty() { return {v:1, startedAt:null, firstStartedAt:null, elapsed:0}; }
export function valid(s) {
  return !!s && s.v===1 && Number.isFinite(s.elapsed) && s.elapsed>=0 &&
    [s.startedAt,s.firstStartedAt].every(v=>v===null || (Number.isFinite(v)&&v>=0)) &&
    (s.startedAt===null || s.firstStartedAt!==null);
}
export function elapsed(s, now=Date.now()) { return s.elapsed + (s.startedAt===null ? 0 : Math.max(0,now-s.startedAt)); }
export function start(s, now=Date.now()) { return s.startedAt!==null ? {...s} : {...s,startedAt:now,firstStartedAt:s.firstStartedAt??now}; }
export function pause(s, now=Date.now()) { return {...s,elapsed:elapsed(s,now),startedAt:null}; }
export function format(ms) {
  const seconds=Math.floor(ms/1000),hours=Math.floor(seconds/3600);
  return [hours,Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':');
}

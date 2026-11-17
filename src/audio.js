/* Voice and music scheduling. items: [{ at, dur, id }] with the shot's start time, the length of its recording in seconds (0 for none) and its recording id.
   Returns what to start when playback begins at time t: each recording still to come or already running, with how long to wait and how far into it to begin. */
export function planClips(items, t) {
  const out = [];
  for (const it of items) {
    if (!it || !it.id || !(it.dur > 0)) continue;
    if (t >= it.at + it.dur) continue;
    out.push({ id: it.id, delay: Math.max(0, it.at - t), offset: Math.max(0, t - it.at) });
  }
  return out;
}

/* how long a shot must last to hold its recording, with a short pause after it (in half-seconds, at most 20) */
export function fitDuration(current, audioSeconds) {
  const need = Math.ceil((audioSeconds + .3) * 2) / 2;
  return Math.min(20, Math.max(current, need));
}

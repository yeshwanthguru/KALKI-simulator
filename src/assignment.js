/* Assignments for teachers: a short brief plus checks that Kalki can verify on the student's scene (number of shots, runtime, moves, sizes, notes ...).
   An assignment is saved inside the project file as "assignment", so a teacher sends one .kalki.json and the student sees the brief and a live checklist. */

export const CHECK_TYPES = {
  minShots: { label: 'At least N shots', unit: 'shots', def: 3 },
  maxShots: { label: 'At most N shots', unit: 'shots', def: 8 },
  minRuntime: { label: 'Runtime at least N seconds', unit: 's', def: 20 },
  maxRuntime: { label: 'Runtime at most N seconds', unit: 's', def: 60 },
  minMoves: { label: 'At least N different camera moves', unit: 'moves', def: 3 },
  useMove: { label: 'Use a specific camera move', unit: 'move', def: 'push_in' },
  useSize: { label: 'Use a specific shot size', unit: 'size', def: 'CU' },
  minSizes: { label: 'At least N different shot sizes', unit: 'sizes', def: 3 },
  allNotes: { label: 'Every shot has a note', unit: '', def: 1 },
  noRepeat: { label: 'No two shots in a row use the same move', unit: '', def: 1 },
  aspect: { label: 'Use a specific frame', unit: 'aspect', def: '1.778' }
};
const NUMERIC = new Set(['minShots', 'maxShots', 'minRuntime', 'maxRuntime', 'minMoves', 'minSizes']);
const MAX_CHECKS = 12;
const text = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);

/* known: { moves: [ids], sizes: [codes], aspects: [values] }; anything unknown is dropped so a hand-edited file cannot break the page */
export function normAssignment(o, known = {}) {
  if (!o || typeof o !== 'object') return null;
  const checks = [];
  for (const c of Array.isArray(o.checks) ? o.checks : []) {
    if (!c || !CHECK_TYPES[c.type] || checks.length >= MAX_CHECKS) continue;
    let v = c.value;
    if (NUMERIC.has(c.type)) { v = Math.round(+v); if (!Number.isFinite(v) || v < 1 || v > 600) continue; }
    else if (c.type === 'useMove') { if (known.moves && !known.moves.includes(v)) continue; }
    else if (c.type === 'useSize') { if (known.sizes && !known.sizes.includes(v)) continue; }
    else if (c.type === 'aspect') { v = String(v); if (known.aspects && !known.aspects.includes(v)) continue; }
    else v = 1;
    checks.push({ type: c.type, value: v });
  }
  const title = text(o.title, 80), brief = String(o.brief == null ? '' : o.brief).replace(/\r/g, '').trim().slice(0, 800);
  return title || brief || checks.length ? { title, brief, checks } : null;
}

export function describeCheck(c, names = {}) {
  const v = c.value;
  switch (c.type) {
    case 'minShots': return `Use at least ${v} shots`;
    case 'maxShots': return `Use at most ${v} shots`;
    case 'minRuntime': return `Make the scene at least ${v} seconds long`;
    case 'maxRuntime': return `Keep the scene to ${v} seconds or less`;
    case 'minMoves': return `Use at least ${v} different camera moves`;
    case 'useMove': return `Use ${(names.moves && names.moves[v]) || v} at least once`;
    case 'useSize': return `Use a ${(names.sizes && names.sizes[v]) || v} at least once`;
    case 'minSizes': return `Use at least ${v} different shot sizes`;
    case 'allNotes': return 'Write a note for every shot';
    case 'noRepeat': return 'Do not repeat the same camera move in two shots in a row';
    case 'aspect': return `Frame the scene as ${(names.aspects && names.aspects[v]) || v}`;
    default: return c.type;
  }
}

/* scene: { shots: [{ move, size, duration, notes }], aspect } -> [{ check, label, ok, detail }] */
export function evaluate(assignment, scene, names = {}) {
  if (!assignment) return [];
  const shots = scene.shots || [], run = shots.reduce((a, s) => a + (+s.duration || 0), 0), moves = new Set(shots.map(s => s.move)), sizes = new Set(shots.map(s => s.size));
  return assignment.checks.map(c => {
    let ok = false, detail = '';
    switch (c.type) {
      case 'minShots': ok = shots.length >= c.value; detail = `you have ${shots.length}`; break;
      case 'maxShots': ok = shots.length <= c.value; detail = `you have ${shots.length}`; break;
      case 'minRuntime': ok = run >= c.value; detail = `now ${run.toFixed(1)} s`; break;
      case 'maxRuntime': ok = run <= c.value; detail = `now ${run.toFixed(1)} s`; break;
      case 'minMoves': ok = moves.size >= c.value; detail = `you use ${moves.size}`; break;
      case 'useMove': ok = moves.has(c.value); detail = ok ? 'found' : 'not used yet'; break;
      case 'useSize': ok = sizes.has(c.value); detail = ok ? 'found' : 'not used yet'; break;
      case 'minSizes': ok = sizes.size >= c.value; detail = `you use ${sizes.size}`; break;
      case 'allNotes': { const miss = shots.map((s, i) => (s.notes && s.notes.trim() ? 0 : i + 1)).filter(Boolean); ok = shots.length > 0 && !miss.length; detail = miss.length ? `missing on shot ${miss.slice(0, 6).join(', ')}` : shots.length ? 'all shots have notes' : 'no shots'; break; }
      case 'noRepeat': { const bad = shots.map((s, i) => (i && s.move === shots[i - 1].move ? i + 1 : 0)).filter(Boolean); ok = shots.length > 0 && !bad.length; detail = bad.length ? `repeated at shot ${bad.slice(0, 6).join(', ')}` : shots.length ? 'no repeats' : 'no shots'; break; }
      case 'aspect': ok = String(scene.aspect) === String(c.value); detail = ok ? 'matches' : 'different frame'; break;
    }
    return { check: c, label: describeCheck(c, names), ok, detail };
  });
}

export const summary = results => ({ done: results.filter(r => r.ok).length, total: results.length });

/* plain-text report a student can hand in */
export function reportText(assignment, scene, results, who = {}) {
  const s = summary(results), out = ['KALKI SIMULATOR: ASSIGNMENT REPORT', assignment.title ? `Assignment: ${assignment.title}` : '', `Scene: ${scene.title || ''}`, who.student ? `Student: ${who.student}` : '', `Checked: ${who.date || ''}`, `Result: ${s.done} of ${s.total} checks met`, ''].filter((l, i) => l || i > 5);
  if (assignment.brief) out.push('Brief:', assignment.brief, '');
  for (const r of results) out.push(`[${r.ok ? 'x' : ' '}] ${r.label} (${r.detail})`);
  out.push('', `Shots: ${(scene.shots || []).length}`);
  (scene.shots || []).forEach((sh, i) => out.push(`${i + 1}. ${sh.name || ''}: ${sh.moveName || sh.move}, ${sh.size}, ${sh.lens} mm, ${sh.duration} s${sh.notes ? ' | ' + sh.notes : ''}`));
  return out.join('\r\n');
}

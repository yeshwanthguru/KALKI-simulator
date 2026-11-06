/* Before/after comparison of two scenes (for example a student's scene and the teacher's version, or two drafts): shot by shot, which settings differ. */

const FIELDS = [['move', 'Move'], ['size', 'Size'], ['lens', 'Lens'], ['height', 'Height'], ['duration', 'Length'], ['angle', 'Angle']];

/* a, b: { shots: [{ move, size, lens, height, duration, angle, ... }] } */
export function compareScenes(a, b) {
  const A = a.shots || [], B = b.shots || [], n = Math.max(A.length, B.length), rows = [];
  let same = 0, moveSame = 0, both = 0;
  for (let i = 0; i < n; i++) {
    const x = A[i], y = B[i], diffs = [];
    if (x && y) {
      both++; for (const [k, label] of FIELDS) if (String(x[k]) !== String(y[k])) diffs.push({ field: k, label, a: x[k], b: y[k] });
      if (!diffs.length) same++; if (x.move === y.move) moveSame++;
    }
    rows.push({ n: i + 1, a: x || null, b: y || null, diffs });
  }
  const ra = A.reduce((s, x) => s + (+x.duration || 0), 0), rb = B.reduce((s, x) => s + (+x.duration || 0), 0);
  const usedA = new Set(A.map(x => x.move)), usedB = new Set(B.map(x => x.move)), onlyA = [...usedA].filter(m => !usedB.has(m)), onlyB = [...usedB].filter(m => !usedA.has(m));
  return { rows, summary: { shotsA: A.length, shotsB: B.length, runtimeA: ra, runtimeB: rb, identical: same, compared: both, sameMove: moveSame, onlyA, onlyB, match: both ? Math.round(100 * moveSame / Math.max(A.length, B.length)) : 0 } };
}

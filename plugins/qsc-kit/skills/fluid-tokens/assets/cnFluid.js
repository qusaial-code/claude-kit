// Plain join with no conflict resolution — every class survives untouched.
// Prefer cn() unless you specifically need that.
export function cnFluid(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

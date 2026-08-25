/*
 * Shared fluid tokens — used across the whole app.
 * Campaign- or feature-specific tokens belong in their own file beside this one.
 */

const GLOBAL = {
  // ─── Typography ─────────────────────────────────────────────────────────────
  title: {
    fontSize: [28, 80], // → text-title
  },
  description: {
    fontSize: [18, 45], // → text-description
  },

  // ─── Button ─────────────────────────────────────────────────────────────────
  btn: {
    fontSize: [21, 63], // → text-btn
    height: [50, 160],  // → h-btn
  },
};

module.exports = { GLOBAL };

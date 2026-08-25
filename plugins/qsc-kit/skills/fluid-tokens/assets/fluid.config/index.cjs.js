/*
 * Fluid token config — merged entry point.
 *
 * Every token is { 'token-name': { cssProperty: [mobilePx, desktopPx] } }.
 * Mobile value applies at MIN_SCREEN, desktop at MAX_SCREEN (see the generator).
 *
 * Add a file per area or campaign, then spread it here.
 * Run: node scripts/fluid.generate.mjs
 */

const { GLOBAL } = require('./global');

module.exports = {
  ...GLOBAL,
};

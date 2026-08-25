/*
 * Fluid token generator.
 *
 * Reads [mobile, desktop] px pairs from the config directory below and writes:
 *   - a CSS file: :root custom properties with calc() interpolation, breakpoint
 *     and [dir="rtl"] overrides, plus a Tailwind v4 @theme block and @utility rules
 *   - a JS manifest: token -> tailwind-merge class-group-id, consumed by cn()
 *
 * Requires Tailwind v4 (@theme / @utility are v4-only).
 *
 * Run: node scripts/fluid.generate.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Project settings — adjust these to your layout ──────────────────────────
// ROOT assumes this file lives in <project>/scripts/. Change if you move it.
const ROOT = path.resolve(__dirname, "..");

// Where token config files live. Must contain an index that exports the merged
// token object (default export in ESM, or module.exports in CommonJS).
const CONFIG_ENTRY = path.join(ROOT, "src/utils/fluid.config/index.js");

// Generated CSS. Import this from your Tailwind entry stylesheet.
const CSS_OUT = path.join(ROOT, "src/app/styles/fluid.css");

// Generated tailwind-merge manifest, imported by your cn() helper.
const TOKENS_OUT = path.join(ROOT, "src/utils/fluid.tokens.js");

// Viewport widths at which the mobile and desktop values apply exactly.
// Match these to the frame widths your designs are drawn at.
const MIN_SCREEN = 430;
const MAX_SCREEN = 1920;

// Must match the breakpoints in your Tailwind theme.
const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
  "3xl": "1600px",
};

const DIRECTION_SELECTORS = {
  rtl: '[dir="rtl"]',
};

// ── Tailwind v4: @theme namespace (non-spacing properties) ────────────────────
// Maps config key → CSS custom property namespace used inside @theme {}.
// These are Tailwind v4 utility namespaces, not JS theme keys.
// e.g. fontSize → --text-{name} → text-{name} utility
const PROPERTY_TO_THEME_NS = {
  fontSize: "text",
  lineHeight: "leading",
  letterSpacing: "tracking",
  borderRadius: "radius",
  borderWidth: "border-width",
  width: "width",
  height: "height",
  minWidth: "min-width",
  maxWidth: "max-width",
  minHeight: "min-height",
  maxHeight: "max-height",
  spacing: "spacing", // feeds the whole spacing scale (p-, gap-, space-y-, …)
};

// ── Tailwind v4: @utility blocks (directional / shorthand spacing) ────────────
// Each entry produces its own @utility rule so class names stay clean:
//   px-form { padding-inline: var(--fluid-px-form) }
const PROPERTY_TO_UTILITY = {
  padding: { class: "p",     css: "padding" },
  px:      { class: "px",    css: "padding-inline" },
  py:      { class: "py",    css: "padding-block" },
  pt:      { class: "pt",    css: "padding-top" },
  pb:      { class: "pb",    css: "padding-bottom" },
  ps:      { class: "ps",    css: "padding-inline-start" },
  pe:      { class: "pe",    css: "padding-inline-end" },
  margin:  { class: "m",     css: "margin" },
  mx:      { class: "mx",    css: "margin-inline" },
  my:      { class: "my",    css: "margin-block" },
  mt:      { class: "mt",    css: "margin-top" },
  mb:      { class: "mb",    css: "margin-bottom" },
  ms:      { class: "ms",    css: "margin-inline-start" },
  me:      { class: "me",    css: "margin-inline-end" },
  gap:     { class: "gap",   css: "gap" },
  gapX:    { class: "gap-x", css: "column-gap" },
  gapY:    { class: "gap-y", css: "row-gap" },
};

// ── tailwind-merge: class-group-id per property ───────────────────────────────
// Lets cn() teach tailwind-merge about every fluid utility, so a fluid class
// (e.g. text-btn) is classified into the correct conflict group (font-size)
// instead of falling through to a catch-all validator (text-color) and silently
// evicting a real color class. The group id is tailwind-merge's own name and
// does not always match the class prefix (e.g. group "border-w", class "border-{n}").
const PROPERTY_TO_MERGE_GROUP = {
  fontSize: "font-size",
  lineHeight: "leading",
  letterSpacing: "tracking",
  borderRadius: "rounded",
  borderWidth: "border-w",
  width: "w",
  height: "h",
  minWidth: "min-w",
  maxWidth: "max-w",
  minHeight: "min-h",
  maxHeight: "max-h",
};

// spacing (--spacing-{name}) feeds Tailwind v4's whole spacing scale, so a
// spacing token could in principle be used with any of these utilities.
const SPACING_MERGE_GROUPS = [
  "p", "px", "py", "pt", "pb", "ps", "pe",
  "m", "mx", "my", "mt", "mb", "ms", "me",
  "gap", "gap-x", "gap-y", "space-x", "space-y",
  "w", "h",
];

// Class name each property key renders as — also used in the summary log.
const TAILWIND_PREFIX = {
  fontSize: (n) => `text-${n}`,
  lineHeight: (n) => `leading-${n}`,
  letterSpacing: (n) => `tracking-${n}`,
  borderRadius: (n) => `rounded-${n}`,
  borderWidth: (n) => `border-${n}`,
  spacing: (n) => `p-${n}  px-${n}  py-${n}  gap-${n}  m-${n}`,
  width: (n) => `w-${n}`,
  height: (n) => `h-${n}`,
  minWidth: (n) => `min-w-${n}`,
  maxWidth: (n) => `max-w-${n}`,
  minHeight: (n) => `min-h-${n}`,
  maxHeight: (n) => `max-h-${n}`,
  padding: (n) => `p-${n}`,
  px: (n) => `px-${n}`,
  py: (n) => `py-${n}`,
  pt: (n) => `pt-${n}`,
  pb: (n) => `pb-${n}`,
  ps: (n) => `ps-${n}`,
  pe: (n) => `pe-${n}`,
  margin: (n) => `m-${n}`,
  mx: (n) => `mx-${n}`,
  my: (n) => `my-${n}`,
  mt: (n) => `mt-${n}`,
  mb: (n) => `mb-${n}`,
  ms: (n) => `ms-${n}`,
  me: (n) => `me-${n}`,
  gap: (n) => `gap-${n}`,
  gapX: (n) => `gap-x-${n}`,
  gapY: (n) => `gap-y-${n}`,
};

// ─── Load config ──────────────────────────────────────────────────────────────
if (!fs.existsSync(CONFIG_ENTRY)) {
  console.error(`✗  Fluid config not found at ${path.relative(ROOT, CONFIG_ENTRY)}`);
  console.error(`   Create it, or point CONFIG_ENTRY at the right path in this file.`);
  process.exit(1);
}

const configModule = await import(pathToFileURL(CONFIG_ENTRY).href);
const config = configModule.default ?? configModule;

if (!config || typeof config !== "object" || !Object.keys(config).length) {
  console.error(`✗  ${path.relative(ROOT, CONFIG_ENTRY)} exported no tokens.`);
  console.error(`   It must default-export an object of { 'token-name': { prop: [mobile, desktop] } }.`);
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fluidCalc(min, max, minScreen = MIN_SCREEN, maxScreen = MAX_SCREEN) {
  const slope = (max - min) / (maxScreen - minScreen);
  const intercept = min - slope * minScreen;
  const slopeVw = slope * 100;
  return `calc(${parseFloat(intercept.toFixed(4))}px + ${parseFloat(slopeVw.toFixed(4))}vw)`;
}

function fluidCalcLarge(max) {
  const slopeVw = parseFloat(((max / MAX_SCREEN) * 100).toFixed(4));
  return `calc(${slopeVw}vw)`;
}

function isFluidPair(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function ensure(obj, key) {
  if (!obj[key]) obj[key] = {};
  return obj[key];
}

function isKnownProperty(property) {
  return property in PROPERTY_TO_THEME_NS || property in PROPERTY_TO_UTILITY;
}

// ─── State ────────────────────────────────────────────────────────────────────
const cssLines = [
  "/* AUTO-GENERATED - do not edit manually */",
  "/* Run: node scripts/fluid.generate.mjs  */",
  "",
  ":root {",
];

const largeVars = [];
const breakpointVars = {};
const directionalLargeVars = {};
const directionalVars = {};
const directionalBreakpointVars = {};

const themeEntries = [];   // lines for the @theme block
const utilityBlocks = [];  // individual @utility blocks
const mergeGroups = {};    // tailwind-merge class-group-id -> [fullClassName, ...]

// Collected diagnostics — reported at the end rather than failing the build,
// so one bad token never blocks a dev server that was otherwise fine.
const warnings = [];

function addMergeGroupClass(groupId, className) {
  if (!mergeGroups[groupId]) mergeGroups[groupId] = [];
  mergeGroups[groupId].push(className);
}

// Registers a token's class name(s) under the correct class-group-id(s), so
// cn() classifies it the same way Tailwind itself does.
function addMergeGroupToken(property, tokenName) {
  if (property === "spacing") {
    for (const groupId of SPACING_MERGE_GROUPS) {
      addMergeGroupClass(groupId, `${groupId}-${tokenName}`);
    }
    return;
  }

  const groupId = PROPERTY_TO_MERGE_GROUP[property] || PROPERTY_TO_UTILITY[property]?.class;
  const prefixFn = TAILWIND_PREFIX[property];
  if (!groupId || !prefixFn) return;
  addMergeGroupClass(groupId, prefixFn(tokenName));
}

function addRootVar(varName, mobile, desktop) {
  cssLines.push(`  ${varName}: ${fluidCalc(mobile, desktop)};  /* ${mobile}px -> ${desktop}px */`);
  largeVars.push({ varName, mobile, desktop });
}

function addBreakpointVar(bp, varName, mobile, desktop) {
  if (!breakpointVars[bp]) breakpointVars[bp] = [];
  breakpointVars[bp].push({ varName, mobile, desktop });
}

function addDirectionalRootVar(direction, varName, mobile, desktop) {
  if (!directionalVars[direction]) directionalVars[direction] = [];
  directionalVars[direction].push({ varName, mobile, desktop });

  if (!directionalLargeVars[direction]) directionalLargeVars[direction] = [];
  directionalLargeVars[direction].push({ varName, mobile, desktop });
}

function addDirectionalBreakpointVar(direction, bp, varName, mobile, desktop) {
  ensure(directionalBreakpointVars, direction);
  if (!Array.isArray(directionalBreakpointVars[direction][bp])) {
    directionalBreakpointVars[direction][bp] = [];
  }
  directionalBreakpointVars[direction][bp].push({ varName, mobile, desktop });
}

// Registers a token in the @theme block (non-spacing properties).
//   addThemeToken("fontSize", "form-title", "--fluid-fontSize-form-title")
//   → --text-form-title: var(--fluid-fontSize-form-title);
function addThemeToken(property, tokenName, varName) {
  const ns = PROPERTY_TO_THEME_NS[property];
  if (!ns) return;
  themeEntries.push(`  --${ns}-${tokenName}: var(${varName});`);
}

// Registers a directional/shorthand token as a standalone @utility rule.
//   addUtilityBlock("px", "form", "--fluid-px-form")
//   → @utility px-form { padding-inline: var(--fluid-px-form) }
function addUtilityBlock(property, tokenName, varName) {
  const def = PROPERTY_TO_UTILITY[property];
  if (!def) return;
  utilityBlocks.push(
    `@utility ${def.class}-${tokenName} {`,
    `  ${def.css}: var(${varName});`,
    `}`,
    ``
  );
}

// ─── Main loop ────────────────────────────────────────────────────────────────
for (const [tokenName, tokenConfig] of Object.entries(config)) {
  cssLines.push(`\n  /* ${tokenName} */`);

  // Properties declared at the base level. Only these get a @theme entry or an
  // @utility rule, so anything overridden in a breakpoint/rtl block but missing
  // here would produce a CSS variable no class ever reads.
  const baseProperties = new Set();

  for (const [key, value] of Object.entries(tokenConfig)) {
    if (key in BREAKPOINTS || key in DIRECTION_SELECTORS) continue;
    if (isFluidPair(value)) baseProperties.add(key);
  }

  for (const [key, value] of Object.entries(tokenConfig)) {
    // Breakpoint block → collect for @media override
    if (key in BREAKPOINTS) {
      for (const [property, bpValue] of Object.entries(value)) {
        if (!isFluidPair(bpValue)) {
          warnings.push(`${tokenName}.${key}.${property} is not a [mobile, desktop] number pair — skipped`);
          continue;
        }
        if (!baseProperties.has(property)) {
          warnings.push(`${tokenName}.${key}.${property} has no base '${property}' pair — no ${property} class exists for this token, so the override is dead`);
        }
        const [mobile, desktop] = bpValue;
        addBreakpointVar(key, `--fluid-${property}-${tokenName}`, mobile, desktop);
      }
      continue;
    }

    // Directional block → scoped overrides, optionally with breakpoint overrides
    if (key in DIRECTION_SELECTORS) {
      for (const [directionKey, directionValue] of Object.entries(value)) {
        if (directionKey in BREAKPOINTS) {
          for (const [property, bpValue] of Object.entries(directionValue)) {
            if (!isFluidPair(bpValue)) {
              warnings.push(`${tokenName}.${key}.${directionKey}.${property} is not a [mobile, desktop] number pair — skipped`);
              continue;
            }
            if (!baseProperties.has(property)) {
              warnings.push(`${tokenName}.${key}.${directionKey}.${property} has no base '${property}' pair — the override is dead`);
            }
            const [mobile, desktop] = bpValue;
            addDirectionalBreakpointVar(key, directionKey, `--fluid-${property}-${tokenName}`, mobile, desktop);
          }
          continue;
        }

        if (!isFluidPair(directionValue)) {
          warnings.push(`${tokenName}.${key}.${directionKey} is not a [mobile, desktop] number pair — skipped`);
          continue;
        }
        if (!baseProperties.has(directionKey)) {
          warnings.push(`${tokenName}.${key}.${directionKey} has no base '${directionKey}' pair — the override is dead`);
        }

        // An unmediated [dir=] block is emitted after the breakpoint :root blocks
        // and has equal specificity, so it would beat a same-property breakpoint
        // override unless that breakpoint is repeated inside the direction block.
        const bpAlsoOverrides = Object.keys(tokenConfig).filter(
          (k) => k in BREAKPOINTS && directionKey in (tokenConfig[k] ?? {}),
        );
        for (const bp of bpAlsoOverrides) {
          if (!(bp in (value ?? {}))) {
            warnings.push(`${tokenName}: '${directionKey}' is overridden at '${bp}' and in '${key}', but '${key}' has no '${bp}' block — above ${BREAKPOINTS[bp]} the ${key} base value wins and the ${bp} override is lost. Add ${key}.${bp}.${directionKey}.`);
          }
        }

        const [mobile, desktop] = directionValue;
        addDirectionalRootVar(key, `--fluid-${directionKey}-${tokenName}`, mobile, desktop);
      }
      continue;
    }

    if (!isFluidPair(value)) {
      warnings.push(`${tokenName}.${key} is not a [mobile, desktop] number pair — skipped`);
      continue;
    }
    if (!isKnownProperty(key)) {
      warnings.push(`${tokenName}.${key} is not a supported property — a CSS variable is emitted but no Tailwind class will exist`);
    }

    const [mobile, desktop] = value;
    const varName = `--fluid-${key}-${tokenName}`;

    addRootVar(varName, mobile, desktop);
    addThemeToken(key, tokenName, varName);
    addUtilityBlock(key, tokenName, varName);
    addMergeGroupToken(key, tokenName);
  }
}

cssLines.push("\n}");

// ─── Breakpoint overrides ─────────────────────────────────────────────────────
for (const [bp, items] of Object.entries(breakpointVars)) {
  const bpPx = Number(BREAKPOINTS[bp].replace("px", ""));
  cssLines.push("", `@media (min-width: ${BREAKPOINTS[bp]}) {`, "  :root {");
  for (const { varName, mobile, desktop } of items) {
    cssLines.push(
      `    ${varName}: ${fluidCalc(mobile, desktop, bpPx)};  /* ${bp}: ${mobile}px -> ${desktop}px */`,
    );
  }
  cssLines.push("  }", "}");
}

for (const [direction, selector] of Object.entries(DIRECTION_SELECTORS)) {
  const items = Array.isArray(directionalVars[direction]) ? directionalVars[direction] : [];
  if (items.length) {
    cssLines.push("", `${selector} {`);
    for (const { varName, mobile, desktop } of items) {
      cssLines.push(
        `  ${varName}: ${fluidCalc(mobile, desktop)};  /* ${direction}: ${mobile}px -> ${desktop}px */`,
      );
    }
    cssLines.push("}");
  }

  const directionBreakpoints = directionalBreakpointVars[direction] || {};
  for (const [bp, bpItems] of Object.entries(directionBreakpoints)) {
    if (!(bp in BREAKPOINTS) || !Array.isArray(bpItems) || !bpItems.length) continue;
    const bpPx = Number(BREAKPOINTS[bp].replace("px", ""));
    cssLines.push("", `@media (min-width: ${BREAKPOINTS[bp]}) {`, `  ${selector} {`);
    for (const { varName, mobile, desktop } of bpItems) {
      cssLines.push(
        `    ${varName}: ${fluidCalc(mobile, desktop, bpPx)};  /* ${direction} ${bp}: ${mobile}px -> ${desktop}px */`,
      );
    }
    cssLines.push("  }", "}");
  }
}

// ─── Small-screen proportional scaling (< MIN_SCREEN) ─────────────────────────
cssLines.push("", `@media (max-width: ${MIN_SCREEN - 1}px) {`, "  :root {");
for (const { varName, mobile } of largeVars) {
  const vw = parseFloat(((mobile / MIN_SCREEN) * 100).toFixed(4));
  cssLines.push(`    ${varName}: calc(${vw}vw);  /* proportional below ${MIN_SCREEN}px */`);
}
cssLines.push("  }", "}");

for (const [direction, selector] of Object.entries(DIRECTION_SELECTORS)) {
  const items = directionalLargeVars[direction] || [];
  if (!items.length) continue;

  cssLines.push("", `@media (max-width: ${MIN_SCREEN - 1}px) {`, `  ${selector} {`);
  for (const { varName, mobile } of items) {
    const vw = parseFloat(((mobile / MIN_SCREEN) * 100).toFixed(4));
    cssLines.push(`    ${varName}: calc(${vw}vw);  /* ${direction} proportional below ${MIN_SCREEN}px */`);
  }
  cssLines.push("  }", "}");
}

// ─── Large-screen proportional scaling (> MAX_SCREEN) ─────────────────────────
cssLines.push("", `@media (min-width: ${MAX_SCREEN}px) {`, "  :root {");
for (const { varName, desktop } of largeVars) {
  cssLines.push(
    `    ${varName}: ${fluidCalcLarge(desktop)};  /* proportional beyond ${MAX_SCREEN}px */`,
  );
}
cssLines.push("  }", "}");

for (const [direction, selector] of Object.entries(DIRECTION_SELECTORS)) {
  const items = directionalLargeVars[direction] || [];
  if (!items.length) continue;

  cssLines.push("", `@media (min-width: ${MAX_SCREEN}px) {`, `  ${selector} {`);
  for (const { varName, desktop } of items) {
    cssLines.push(
      `    ${varName}: ${fluidCalcLarge(desktop)};  /* ${direction} proportional beyond ${MAX_SCREEN}px */`,
    );
  }
  cssLines.push("  }", "}");
}

// ─── Tailwind v4: @theme block ────────────────────────────────────────────────
if (themeEntries.length) {
  cssLines.push("", "/* Tailwind v4 @theme — non-spacing tokens */");
  cssLines.push("@theme {");
  cssLines.push(...themeEntries);
  cssLines.push("}");
}

// ─── Tailwind v4: @utility blocks ─────────────────────────────────────────────
if (utilityBlocks.length) {
  cssLines.push("", "/* Tailwind v4 @utility — directional / shorthand spacing */");
  cssLines.push(...utilityBlocks);
}

// ─── Write files ──────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(CSS_OUT), { recursive: true });
fs.writeFileSync(CSS_OUT, cssLines.join("\n"), "utf8");
console.log(`✅  ${path.relative(ROOT, CSS_OUT)} generated`);

const twOutput = [
  "// AUTO-GENERATED - do not edit manually",
  "// Run: node scripts/fluid.generate.mjs",
  "",
  `export const fluidClassGroups = ${JSON.stringify(mergeGroups, null, 2)}`,
  "",
].join("\n");

fs.mkdirSync(path.dirname(TOKENS_OUT), { recursive: true });
fs.writeFileSync(TOKENS_OUT, twOutput, "utf8");
console.log(`✅  ${path.relative(ROOT, TOKENS_OUT)} generated`);

// ─── Diagnostics ──────────────────────────────────────────────────────────────
if (warnings.length) {
  console.warn(`\n⚠️  ${warnings.length} issue${warnings.length === 1 ? "" : "s"} in fluid config:\n`);
  for (const w of warnings) console.warn(`   • ${w}`);
}

// ─── Usage summary ────────────────────────────────────────────────────────────
console.log("\n📐 Fluid tokens — Tailwind classes:\n");
for (const [tokenName, tokenConfig] of Object.entries(config)) {
  console.log(`  ${tokenName}:`);
  for (const [key, value] of Object.entries(tokenConfig)) {
    if (key in BREAKPOINTS) {
      for (const [property, bpValue] of Object.entries(value)) {
        if (!isFluidPair(bpValue)) continue;
        const [mobile, desktop] = bpValue;
        console.log(
          `    [${key}] ${property}: [${mobile} → ${desktop}]   (overrides --fluid-${property}-${tokenName})`,
        );
      }
      continue;
    }
    if (key in DIRECTION_SELECTORS) {
      for (const [directionKey, directionValue] of Object.entries(value)) {
        if (directionKey in BREAKPOINTS) {
          for (const [property, bpValue] of Object.entries(directionValue)) {
            if (!isFluidPair(bpValue)) continue;
            const [mobile, desktop] = bpValue;
            console.log(
              `    [${key}][${directionKey}] ${property}: [${mobile} → ${desktop}]   (overrides --fluid-${property}-${tokenName})`,
            );
          }
          continue;
        }
        if (!isFluidPair(directionValue)) continue;
        const [mobile, desktop] = directionValue;
        console.log(
          `    [${key}] ${directionKey}: [${mobile} → ${desktop}]   (overrides --fluid-${directionKey}-${tokenName})`,
        );
      }
      continue;
    }
    if (!isFluidPair(value)) continue;
    const [mobile, desktop] = value;
    const prefix = TAILWIND_PREFIX[key];
    const usage = prefix ? prefix(tokenName) : tokenName;
    console.log(`    ${key}: [${mobile} → ${desktop}]   ${usage}`);
  }
  console.log();
}

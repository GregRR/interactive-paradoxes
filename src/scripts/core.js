/**
 * Helpers shared by the exhibit scripts in ./paradoxes/. Each exhibit imports
 * only what it needs:
 *
 *   import { formatNum, plotlyConfig } from '../core.js';
 *
 * Every paradox now has its own page, so there is no cross-exhibit navigation
 * or draw-function registry here any more; each exhibit draws itself on load.
 */

// Formats a number with locale separators, at most one decimal place.
export const formatNum = (num) => num.toLocaleString(undefined, { maximumFractionDigits: 1 });

// Options passed to every Plotly.react() call.
export const plotlyConfig = { responsive: true, displayModeBar: false };

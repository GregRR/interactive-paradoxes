/**
 * Exhibit 7: Simpson's Paradox
 *
 * Belongs to: Group 4 (Hidden Structures in Chaos)
 * Depends on: ../core.js (plotlyConfig) and the Plotly global.
 * DOM ids used: sp-slider, sp-stage-label, sp-result, plot7
 *
 * Loaded by: src/pages/simpsons-paradox.astro. The page's markup exists before this
 * module runs, so it wires up its controls and draws the first frame immediately.
 */

import { plotlyConfig } from '../core.js';

// --- 7. Simpson's Paradox ---
// The slider animates through four stages: separate groups, per-group
// trend lines, groups merged into one color, then a reversed aggregate
// trend line. The underlying (x, y) points never change -- only how
// they are colored and which trend line(s) are shown.
//
// This scenario (study hours vs. test score, two student cohorts) is an
// illustrative example, not a real dataset -- see the citation text
// below the chart for a real published example with the same effect.

// Seeded PRNG (mulberry32) so the "random" scatter is reproducible
// across reloads instead of jumping around on every page visit.
function spMulberry32(seed) {
    return function() {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function spGaussian(rand) {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function spGenGroup(rand, xMin, xMax, yAtXMin, yAtXMax, noise, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const x = xMin + rand() * (xMax - xMin);
        const trend = yAtXMin + (yAtXMax - yAtXMin) * ((x - xMin) / (xMax - xMin));
        const y = Math.max(0, Math.min(100, trend + spGaussian(rand) * noise));
        pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    }
    return pts;
}
function spLinreg(pts) {
    const n = pts.length;
    const sumX = pts.reduce((s, p) => s + p.x, 0);
    const sumY = pts.reduce((s, p) => s + p.y, 0);
    const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = pts.reduce((s, p) => s + p.x * p.x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}
// Interpolates between two hex colors; t in [0, 1].
function spLerpColor(hexA, hexB, t) {
    const a = [1, 3, 5].map(i => parseInt(hexA.slice(i, i + 2), 16));
    const b = [1, 3, 5].map(i => parseInt(hexB.slice(i, i + 2), 16));
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const spRand = spMulberry32(42);
// Group A: fewer study hours, higher scores. Group B: more study hours, lower scores.
// (An illustrative confound: e.g. Group A could be a stronger-prepared cohort.)
const SP_GROUP_A = spGenGroup(spRand, 2, 4.5, 80, 92, 3, 30);
const SP_GROUP_B = spGenGroup(spRand, 5.5, 9, 48, 66, 4, 30);
const SP_REG_A = spLinreg(SP_GROUP_A);
const SP_REG_B = spLinreg(SP_GROUP_B);
const SP_REG_COMBINED = spLinreg([...SP_GROUP_A, ...SP_GROUP_B]);
const SP_X_RANGE = [0, 10];

// Colorblind-safe palette (blue / orange), consistent with other charts in this app.
const SP_COLOR_A = '#2563eb';
const SP_COLOR_B = '#ea580c';
const SP_COLOR_MERGED = '#7c3aed';
const SP_COLOR_TREND = '#0f172a'; // near-black, reads clearly against either group color

function spTrendLineTrace(reg, xRange, color, opacity, width) {
    const y0 = reg.intercept + reg.slope * xRange[0];
    const y1 = reg.intercept + reg.slope * xRange[1];
    return {
        x: xRange, y: [y0, y1], type: 'scatter', mode: 'lines',
        line: { color: color, width: width || 3 },
        opacity: opacity, hoverinfo: 'skip', showlegend: false
    };
}

function drawSimpsons() {
    const pct = parseInt(document.getElementById('sp-slider').value);

    // Four stages, each spanning roughly a third of the slider:
    //   0-33:  groups separate in color, per-group trend lines fade IN
    //   33-66: trend lines fade OUT, group colors fade INTO one merged color
    //   66-100: a reversed aggregate trend line fades IN
    const stage1 = Math.min(1, pct / 33);           // 0 -> 1 across 0-33
    const stage2 = Math.max(0, Math.min(1, (pct - 33) / 33)); // 0 -> 1 across 33-66
    const stage3 = Math.max(0, Math.min(1, (pct - 66) / 34)); // 0 -> 1 across 66-100

    const trendInOpacity = stage1 * (1 - stage2); // rises then falls back to 0
    const colorMergeT = stage2;                    // 0 = original colors, 1 = fully merged
    const combinedTrendOpacity = stage3;

    const colorA = spLerpColor(SP_COLOR_A, SP_COLOR_MERGED, colorMergeT);
    const colorB = spLerpColor(SP_COLOR_B, SP_COLOR_MERGED, colorMergeT);

    // Once the groups are (almost) fully merged, blank the legend labels so
    // the legend row reads as one indistinguishable group rather than two
    // labeled entries that happen to share a color. A non-breaking space
    // (rather than an empty string) keeps Plotly from collapsing the entry.
    const namesMerged = colorMergeT > 0.9;
    const nameA = namesMerged ? ' ' : 'Group A';
    const nameB = namesMerged ? ' ' : 'Group B';

    const data = [
        {
            x: SP_GROUP_A.map(p => p.x), y: SP_GROUP_A.map(p => p.y), name: nameA,
            type: 'scatter', mode: 'markers',
            marker: { color: colorA, size: 9, opacity: 0.85, line: { color: 'white', width: 1 } }
        },
        {
            x: SP_GROUP_B.map(p => p.x), y: SP_GROUP_B.map(p => p.y), name: nameB,
            type: 'scatter', mode: 'markers',
            marker: { color: colorB, size: 9, opacity: 0.85, line: { color: 'white', width: 1 } }
        },
        spTrendLineTrace(SP_REG_A, [2, 4.5], SP_COLOR_TREND, trendInOpacity),
        spTrendLineTrace(SP_REG_B, [5.5, 9], SP_COLOR_TREND, trendInOpacity),
        spTrendLineTrace(SP_REG_COMBINED, SP_X_RANGE, SP_COLOR_MERGED, combinedTrendOpacity, 4)
    ];

    // The legend is always shown (never toggled off) so the plot's reserved
    // layout height never changes and the chart doesn't jump/resize as the
    // slider moves. The two legend swatches converge to the same merged
    // color and their labels blank out (above) once merged, so visually the
    // legend still reads as "one indistinguishable group" rather than two.
    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        showlegend: true,
        legend: { orientation: 'h', y: -0.15 },
        xaxis: { title: 'Study Hours', range: SP_X_RANGE, gridcolor: '#e2e8f0' },
        yaxis: { title: 'Test Score', range: [30, 100], gridcolor: '#e2e8f0' },
        margin: { l: 50, r: 20, t: 20, b: 45 }
    };

    // Stage label + explanatory result text tracks whichever stage is currently dominant.
    let stageLabel, resultHTML;
    if (pct < 33) {
        stageLabel = trendInOpacity > 0.05 ? 'Fitting a Trend Line to Each Group' : 'Two Separate Groups';
        resultHTML = `Group A: higher scores with fewer study hours. Group B: lower scores with more study hours. ` +
            `<strong>Within each group</strong>, more studying still means a better score &mdash; both trend lines slope upward.`;
    } else if (pct < 66) {
        stageLabel = 'Merging the Two Groups Together';
        resultHTML = `The group labels are fading away. Once we stop distinguishing Group A from Group B, we're left with a single scatter of points.`;
    } else {
        stageLabel = 'One Combined (Reversed) Trend';
        resultHTML = `Fit a single trend line to <strong>all</strong> the points at once, ignoring the groups, and the slope flips: it now appears that <strong class="text-purple-700">more study hours predicts a lower score</strong> &mdash; the opposite of what's true within each group. The reversal comes entirely from mixing two differently-positioned groups, not from anything causal about studying.`;
    }
    document.getElementById('sp-stage-label').innerText = stageLabel;
    document.getElementById('sp-result').innerHTML = resultHTML;

    Plotly.react('plot7', data, layout, plotlyConfig);
}
document.getElementById('sp-slider').addEventListener('input', drawSimpsons);

drawSimpsons();

/**
 * Exhibit 2: Littlewood's Law of Miracles
 *
 * Belongs to: Group 1 (Belief Revision & Coincidence)
 * Depends on: ../core.js (formatNum, plotlyConfig) and the Plotly global.
 * DOM ids used: lw-odds-slider, lw-events-slider, lw-hours-slider, lw-*-val, lw-result, plot2
 *
 * Loaded by: src/pages/littlewoods-law.astro. The page's markup exists before this
 * module runs, so it wires up its controls and draws the first frame immediately.
 */

import { formatNum, plotlyConfig } from '../core.js';

function drawLittlewood() {
    const odds = parseInt(document.getElementById('lw-odds-slider').value);
    const eps = parseFloat(document.getElementById('lw-events-slider').value);
    const hrs = parseInt(document.getElementById('lw-hours-slider').value);
    document.getElementById('lw-odds-val').innerText = formatNum(odds);
    document.getElementById('lw-events-val').innerText = eps.toFixed(1);
    document.getElementById('lw-hours-val').innerText = hrs;

    const daily = eps * 3600 * hrs;
    const days = odds / daily;
    document.getElementById('lw-result').innerHTML = `You process <strong>${formatNum(daily)}</strong> events a day.<br>You will experience a miracle every <strong>${days.toFixed(1)} days</strong>.`;

    Plotly.react('plot2', [{ type: "indicator", mode: "gauge+number", value: days, number: { suffix: " days", font: {color: '#0f172a'} }, gauge: { axis: { range: [null, 365], tickwidth: 1, tickcolor: "darkblue" }, bar: { color: "#10b981" }, bgcolor: "white", borderwidth: 2, bordercolor: "transparent", steps: [{ range: [0, 30], color: "#d1fae5" }, { range: [30, 90], color: "#fef3c7" }, { range: [90, 365], color: "#fee2e2" }] } }], 
    { paper_bgcolor: 'rgba(0,0,0,0)', margin: { t: 30, b: 20, l: 30, r: 30 } }, plotlyConfig);
}
document.getElementById('lw-odds-slider').addEventListener('input', drawLittlewood);
document.getElementById('lw-events-slider').addEventListener('input', drawLittlewood);
document.getElementById('lw-hours-slider').addEventListener('input', drawLittlewood);

drawLittlewood();

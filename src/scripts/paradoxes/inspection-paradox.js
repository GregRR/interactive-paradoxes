/**
 * Exhibit 6: The Inspection Paradox (Bus Stop Bias)
 *
 * Belongs to: Group 4 (Hidden Structures in Chaos)
 * Depends on: ../core.js (plotlyConfig) and the Plotly global.
 * DOM ids used: ip-chaos-slider, ip-chaos-val, btn-passenger, ip-result, plot6
 *
 * Loaded by: src/pages/inspection-paradox.astro. The page's markup exists before this
 * module runs, so it wires up its controls and draws the first frame immediately.
 */

import { plotlyConfig } from '../core.js';

let busTimes = [];
function drawInspection(passengerTime = null) {
    const chaos = parseInt(document.getElementById('ip-chaos-slider').value);
    document.getElementById('ip-chaos-val').innerText = chaos === 0 ? "Perfect" : `Lvl ${chaos}`;

    busTimes = [0];
    for(let i=1; i<=10; i++) {
        let gap = 10;
        if (i % 2 === 0) gap = 10 + chaos;
        else gap = 10 - chaos;
        busTimes.push(busTimes[i-1] + gap);
    }

    const traceBuses = { x: busTimes, y: Array(11).fill(1), mode: 'markers', name: 'Bus Arrival', marker: { symbol: 'square', size: 16, color: '#f59e0b', line: {color: '#78350f', width: 2} } };
    let data = [traceBuses];

    if (passengerTime !== null) {
        data.push({ x: [passengerTime], y: [1], mode: 'markers', name: 'You Arrive', marker: { symbol: 'star', size: 22, color: '#e11d48' } });

        let nextBus = busTimes.find(t => t >= passengerTime);
        let prevBus = busTimes.slice().reverse().find(t => t <= passengerTime);
        let gapLandedIn = nextBus - prevBus;
        let waitTime = nextBus - passengerTime;

        document.getElementById('ip-result').innerHTML = `You landed in a <strong>${gapLandedIn} minute</strong> gap.<br>Your wait time: <strong class="text-rose-600">${waitTime.toFixed(1)} mins</strong>.`;
    } else {
        document.getElementById('ip-result').innerHTML = "Average gap is 10 min. Click to see your actual wait.";
    }

    Plotly.react('plot6', data, { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { title: 'Minutes Timeline', range: [0, 105], gridcolor: '#e2e8f0' }, yaxis: { visible: false, range: [0, 2] }, legend: { orientation: 'h', y: -0.2 }, margin: { l: 20, r: 20, t: 20, b: 40 }, showlegend: true }, plotlyConfig);
}

document.getElementById('ip-chaos-slider').addEventListener('input', () => drawInspection(null));
document.getElementById('btn-passenger').addEventListener('click', () => {
    const pTime = 5 + Math.random() * 90;
    drawInspection(pTime);
});

drawInspection(null);

/**
 * Exhibit 3: The Birthday Paradox
 *
 * Belongs to: Group 3 (The Egocentric Blind Spot)
 * Depends on: ../core.js (plotlyConfig) and the Plotly global.
 * DOM ids used: bp-slider, bp-toggle, bp-val, bp-result, plot3
 *
 * Loaded by: src/pages/birthday-paradox.astro. The page's markup exists before this
 * module runs, so it wires up its controls and draws the first frame immediately.
 */

import { plotlyConfig } from '../core.js';

function drawBirthday() {
    const n = parseInt(document.getElementById('bp-slider').value);
    const showMyBirthday = document.getElementById('bp-toggle').checked;
    document.getElementById('bp-val').innerText = n;

    let xVals = [], yValsAny = [], yValsMine = [];
    let pAny = 1;

    for(let i = 1; i <= 300; i++) {
        pAny *= (365 - (i - 1)) / 365;
        xVals.push(i);
        yValsAny.push((1 - pAny) * 100);
        let pMine = 1 - Math.pow(364/365, i - 1);
        yValsMine.push(pMine * 100);
    }

    let currentProbAny = yValsAny[n-1];
    let currentProbMine = yValsMine[n-1];

    let plotData = [
        { x: xVals, y: yValsAny, type: 'scatter', mode: 'lines', name: 'Any Shared Birthday', line: { color: '#059669', width: 3 } },
        { x: [n], y: [currentProbAny], type: 'scatter', mode: 'markers', name: 'Any Match', marker: { size: 12, color: '#059669' } }
    ];

    let resultHTML = `With <strong>${n}</strong> people, the chance of <em>any</em> shared birthday is <strong>${currentProbAny.toFixed(1)}%</strong>.`;

    if (showMyBirthday) {
        plotData.push({ x: xVals, y: yValsMine, type: 'scatter', mode: 'lines', name: 'Matches YOUR Birthday', line: { color: '#ea580c', width: 3, dash: 'dot' } });
        plotData.push({ x: [n], y: [currentProbMine], type: 'scatter', mode: 'markers', name: 'Your Match', marker: { size: 12, color: '#ea580c' } });
        resultHTML += `<br>The chance someone shares <em>your exact</em> birthday is only <strong class="text-orange-600">${currentProbMine.toFixed(1)}%</strong>.`;
    }

    document.getElementById('bp-result').innerHTML = resultHTML;

    Plotly.react('plot3', plotData, { 
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        showlegend: showMyBirthday, legend: { orientation: 'h', y: -0.2 },
        shapes: [{ type: 'line', x0: 0, x1: 300, y0: 50, y1: 50, line: { color: '#94a3b8', dash: 'dash' } }], 
        xaxis: { title: 'People in Room', range: [0, 305], gridcolor: '#e2e8f0' }, 
        yaxis: { title: 'Probability (%)', range: [0, 105], gridcolor: '#e2e8f0' }, 
        margin: { l: 50, r: 20, t: 10, b: showMyBirthday ? 40 : 50 } 
    }, plotlyConfig);
}
document.getElementById('bp-slider').addEventListener('input', drawBirthday);
document.getElementById('bp-toggle').addEventListener('change', drawBirthday);

drawBirthday();

/**
 * Exhibit 1: The Law of Truly Large Numbers
 *
 * Belongs to: Group 1 (Belief Revision & Coincidence)
 * Depends on: core.js (Paradoxes, plotlyConfig, formatNum) and the Plotly global.
 * DOM ids used: odds-slider, trials-slider, odds-val, trials-val, ln-result, plot1
 *
 * Wrapped in an IIFE so helper names stay private to this exhibit. The only
 * thing it exposes is its draw function, registered with the Paradoxes registry.
 */
(function () {
    'use strict';

    function drawLargeNumbers() {
        const odds = parseInt(document.getElementById('odds-slider').value);
        const maxTrials = parseInt(document.getElementById('trials-slider').value);
        document.getElementById('odds-val').innerText = formatNum(odds);
        document.getElementById('trials-val').innerText = formatNum(maxTrials);

        let xValues = [], yValues = [];
        for(let i = 0; i <= 100; i++) {
            let t = i * (maxTrials / 100);
            xValues.push(t);
            yValues.push((1 - Math.pow(1 - (1/odds), t)) * 100);
        }
        const finalProb = yValues[100];
        document.getElementById('ln-result').innerHTML = `Probability of event happening at least once: <strong>${finalProb.toFixed(2)}%</strong>`;

        Plotly.react('plot1', [{ x: xValues, y: yValues, type: 'scatter', mode: 'lines', line: { color: '#2563eb', width: 3 }, fill: 'tozeroy', fillcolor: 'rgba(37, 99, 235, 0.1)' }], 
        { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { title: 'Number of Trials', gridcolor: '#e2e8f0' }, yaxis: { title: 'Probability (%)', range: [0, 105], gridcolor: '#e2e8f0' }, margin: { l: 50, r: 20, t: 20, b: 50 } }, plotlyConfig);
    }
    document.getElementById('odds-slider').addEventListener('input', drawLargeNumbers);
    document.getElementById('trials-slider').addEventListener('input', drawLargeNumbers);

    Paradoxes.register('group1', drawLargeNumbers);
})();

/**
 * Exhibit 5: Benford's Law
 *
 * Belongs to: Group 3 (Hidden Structures in Chaos)
 * Depends on: core.js (Paradoxes, plotlyConfig, formatNum) and the Plotly global.
 * DOM ids used: btn-natural, btn-human, plot5
 *
 * Wrapped in an IIFE so helper names stay private to this exhibit. The only
 * thing it exposes is its draw function, registered with the Paradoxes registry.
 */
(function () {
    'use strict';

    let currentBenfordType = 'natural';
    function drawBenford(type) {
        if(type) currentBenfordType = type;
        if(!Paradoxes.isActive('group3')) return;

        const digits = [1,2,3,4,5,6,7,8,9];
        let yVals = [];
        if (currentBenfordType === 'natural') {
            yVals = digits.map(d => Math.log10(1 + 1/d) * 100);
        } else {
            yVals = digits.map(() => (100 / 9) + (Math.random()*4 - 2)); 
        }

        Plotly.react('plot5', [{ x: digits, y: yVals, type: 'bar', marker: { color: currentBenfordType==='natural' ? '#9333ea' : '#f43f5e', borderRadius: 4 } }], 
        { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { title: 'Leading Digit', tickmode: 'linear' }, yaxis: { title: 'Frequency (%)', range: [0, 35], gridcolor: '#e2e8f0' }, margin: { l: 50, r: 20, t: 20, b: 40 } }, plotlyConfig);
    }
    document.getElementById('btn-natural').addEventListener('click', () => drawBenford('natural'));
    document.getElementById('btn-human').addEventListener('click', () => drawBenford('human'));

    // Redrawing on tab change resets the chart to the natural distribution.
    Paradoxes.register('group3', () => drawBenford('natural'));
})();

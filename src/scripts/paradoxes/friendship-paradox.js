/**
 * Exhibit 4: The Friendship Paradox
 *
 * Belongs to: Group 3 (The Egocentric Blind Spot)
 * Depends on: ../core.js (plotlyConfig) and the Plotly global.
 * DOM ids used: fp-slider, fp-val, fp-result, plot4a, plot4b
 *
 * Loaded by: src/pages/friendship-paradox.astro. The page's markup exists before this
 * module runs, so it wires up its controls and draws the first frame immediately.
 */

import { plotlyConfig } from '../core.js';

function drawFriendship() {
    const myFriendsCount = parseInt(document.getElementById('fp-slider').value);
    document.getElementById('fp-val').innerText = myFriendsCount;

    let friendDegrees = [];
    let totalFriendsDegree = 0;

    for (let i = 1; i <= myFriendsCount; i++) {
        let degree = Math.max(1, Math.round(myFriendsCount * (0.6 + (i % 3) * 0.5 + Math.sin(i) * 0.4)));
        friendDegrees.unshift(degree);
        totalFriendsDegree += degree;
    }

    const avgFriendsOfFriends = totalFriendsDegree / myFriendsCount;

    // Bar Chart
    const trace1 = { x: ['You', "Friends' Average"], y: [myFriendsCount, avgFriendsOfFriends], type: 'bar', marker: { color: ['#3b82f6', '#f97316'], borderRadius: 4 } };
    Plotly.react('plot4a', [trace1], { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', title: {text: 'Connections Comparison', font: {size: 14}}, yaxis: { title: 'Connections', gridcolor: '#e2e8f0' }, margin: { l: 40, r: 20, t: 40, b: 30 } }, plotlyConfig);

    // Network Diagram
    let nodeX = [0], nodeY = [0], nodeText = ['You'], nodeColor = ['#3b82f6'], nodeSize = [24];
    let edgeX = [], edgeY = [];
    const radius = 2.5;

    for (let i = 0; i < myFriendsCount; i++) {
        const angle = (2 * Math.PI * i) / myFriendsCount;
        const fx = radius * Math.cos(angle);
        const fy = radius * Math.sin(angle);
        nodeX.push(fx); nodeY.push(fy);
        nodeText.push(`Friend ${i+1} (${friendDegrees[i]} friends)`);
        nodeColor.push(friendDegrees[i] > myFriendsCount ? '#f97316' : '#94a3b8');
        nodeSize.push(12 + Math.min(friendDegrees[i], 15));
        edgeX.push(0, fx, null); edgeY.push(0, fy, null);
    }

    const edgeTrace = { x: edgeX, y: edgeY, mode: 'lines', line: { width: 1.5, color: '#cbd5e1' }, hoverinfo: 'none', type: 'scatter' };
    const nodeTrace = { 
        x: nodeX, y: nodeY, mode: 'markers+text', 
        text: nodeX.map((_, i) => i === 0 ? 'You' : `F${i}`), 
        textposition: 'top center', hoverinfo: 'text', hovertext: nodeText,
        marker: { size: nodeSize, color: nodeColor, line: { width: 2, color: '#ffffff' } }, type: 'scatter' 
    };

    Plotly.react('plot4b', [edgeTrace, nodeTrace], { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', showlegend: false, xaxis: { showgrid: false, zeroline: false, showticklabels: false }, yaxis: { showgrid: false, zeroline: false, showticklabels: false }, margin: { l: 10, r: 10, t: 10, b: 10 } }, plotlyConfig);

    document.getElementById('fp-result').innerHTML = `You have <strong>${myFriendsCount}</strong> friends. The mathematical average of your friends' connections is <strong>${avgFriendsOfFriends.toFixed(1)}</strong>.`;
}
document.getElementById('fp-slider').addEventListener('input', drawFriendship);

drawFriendship();

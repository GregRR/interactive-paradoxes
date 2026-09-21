/**
 * Exhibit: Random Streaks (Part 3 of the Clustering Illusion series)
 *
 * Belongs to: Group 2 (Clustering Illusions)
 * Depends on: ./random-streaks-stats.js (generation, run detection, exact DP math) and
 *   ../core.js (plotlyConfig) plus the Plotly global (loaded via BaseLayout's `plotly`
 *   prop on this page).
 *
 * DOM ids used: rs-prediction-ask, rs-prediction-made, rs-prediction-value, rs-flip,
 *   rs-mode-switch, rs-mode-single, rs-mode-sim, rs-panel-single, rs-panel-sim,
 *   rs-sequence, rs-wrap-note, rs-longest-run, rs-heads-tails, rs-highlighted-count,
 *   rs-why-3, rs-new-sequence, rs-histogram, rs-histogram-table, rs-sim-threshold-result,
 *   rs-run-1000, rs-box, rs-conclusion
 * DOM classes used as selectors: .rs-predict-btn, .rs-threshold-btn (single-mode),
 *   .rs-threshold-btn-sim (sim-mode)
 *
 * Loaded by: src/pages/random-streaks.astro. The page's markup exists before this module
 * runs, so it wires up the prediction step immediately; nothing is generated until the
 * visitor predicts and clicks "Flip 50 coins" (spec section 6: no sequence before a
 * prediction is made).
 *
 * ----------------------------------------------------------------------------------
 * WHAT THIS EXHIBIT SHOWS
 *
 * Parts 1 and 2 showed that human intuition and human-made sequences both under-produce
 * clustering (spatially, and in time/sequence). Part 3 hands control to an actual
 * independent random process and shows what IT produces: in 50 fair coin flips, a streak
 * of 5 or more is common (82%) and 6 or more happens more than half the time. The visitor
 * predicts first, then a genuine 50-flip sequence is generated (no balancing, no
 * rejection, no cherry-picking -- see random-streaks-stats.js), and can change the
 * definition of "streak" (3+ through 6+) without ever regenerating the data, which is the
 * exhibit's central conceptual point: redefining what counts as noteworthy does not change
 * the underlying random sequence. A 1,000-sequence simulation mode then shows the
 * population-level pattern (with the exact DP distribution overlaid) so a single striking
 * sequence is never mistaken for a curated example.
 *
 * ----------------------------------------------------------------------------------
 * RESEARCH NOTES (see docs/references.md for full citations)
 *
 * Carlson & Shu (2007) is the basis for defaulting the streak-highlight threshold to 3+:
 * across five studies, the third repeated outcome was pivotal to when observers perceived
 * a streak, even though there is no universal mathematical reason to prefer 3 over any
 * other cutoff -- the "Why 3?" control makes that distinction explicit rather than
 * implying 3 is a mathematical constant. Bar-Hillel & Wagenaar (1991), Falk & Konold
 * (1997), and Nickerson (2002) are the shared subjective-randomness sources from Parts 1
 * and 2, cited here for the contrast between human-made sequences (which suppress runs)
 * and genuine independent sequences (which produce them naturally). Schilling (1990) is
 * the classical mathematical source for the longest-run distribution this exhibit computes
 * via dynamic programming. Miller & Sanjurjo (2018) is the basis for the explicit caveat
 * that the historical hot-hand literature contains a subtle streak-selection bias, so this
 * exhibit never claims that observing streaks under independence proves real-world hot
 * streaks are illusory -- it only demonstrates the baseline behavior of one explicit chance
 * model (spec section 48).
 *
 * ----------------------------------------------------------------------------------
 * MOTION RULES
 *
 * The very FIRST sequence (right after the prediction) fills left-to-right over roughly
 * 400-600ms, giving the "coins landing" moment its own distinct feel (spec section 50).
 * Every subsequent "New random sequence" uses the fade-out/replace/fade-in pattern
 * established in Parts 1-2 instead, since at that point the visitor already knows what a
 * sequence looks like and the fade communicates "this is a fresh sample" without the
 * longer reveal. Changing the streak threshold NEVER regenerates or re-animates the
 * sequence itself -- only the highlight state changes, instantly, because the whole point
 * of the threshold control is reinterpreting fixed data (spec sections 13, 37, 54).
 * prefers-reduced-motion skips both the fill and the fade, showing results immediately.
 */

import {
    SEQUENCE_LENGTH,
    SIMULATION_COUNT,
    THRESHOLDS,
    DEFAULT_THRESHOLD,
    generateSequence,
    findRuns,
    longestRun,
    runsAtLeast,
    countHeadsTails,
    probAtLeast,
    exactDistribution,
    binFor
} from './random-streaks-stats.js';
import { plotlyConfig } from '../core.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FADE_MS = 180;             // matches .rs-fade CSS transition
const FIRST_FILL_TOTAL_MS = 500; // spec section 50: "approximately 400-700ms total"

/** Repeated-single-sample synthesis message appears from this sample number on (spec 22). */
const SYNTHESIS_SAMPLE_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// Small helpers (same pattern as clustering-illusion.js / human-made-randomness.js)
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pct = (rate, digits = 1) => (rate * 100).toFixed(digits);

function setMessage(boxEl, html, { flash = true } = {}) {
    const msgEl = boxEl.querySelector('.rs-msg');
    if (msgEl.innerHTML === html) return;
    msgEl.innerHTML = html;
    if (!flash) return;
    boxEl.classList.remove('rs-flash');
    void boxEl.offsetWidth;
    boxEl.classList.add('rs-flash');
}

/** Fade-out / replace / fade-in helper, identical pattern to Parts 1-2's createFader. */
function createFader(getEls) {
    let token = 0;
    return function fadeSwap(apply) {
        const myToken = ++token;
        if (prefersReducedMotion()) {
            getEls().forEach((el) => el.removeAttribute('data-faded'));
            apply();
            return;
        }
        getEls().forEach((el) => el.setAttribute('data-faded', 'true'));
        setTimeout(() => {
            if (myToken !== token) return;
            apply();
            getEls().forEach((el) => el.removeAttribute('data-faded'));
        }, FADE_MS);
    };
}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

const predictionAskEl = $('rs-prediction-ask');
const predictionMadeEl = $('rs-prediction-made');
const predictionValueEl = $('rs-prediction-value');
const flipBtn = $('rs-flip');

const modeSwitchEl = $('rs-mode-switch');
const modeTabs = [
    { tab: $('rs-mode-single'), panel: $('rs-panel-single') },
    { tab: $('rs-mode-sim'), panel: $('rs-panel-sim') }
];

const sequenceEl = $('rs-sequence');
const wrapNoteEl = $('rs-wrap-note');
const longestRunEl = $('rs-longest-run');
const headsTailsEl = $('rs-heads-tails');
const highlightedCountEl = $('rs-highlighted-count');
const why3Btn = $('rs-why-3');
const newSequenceBtn = $('rs-new-sequence');

const histogramEl = $('rs-histogram');
const histogramTableBody = document.querySelector('#rs-histogram-table tbody');
const simThresholdResultEl = $('rs-sim-threshold-result');
const run1000Btn = $('rs-run-1000');

const box = $('rs-box');
const conclusionEl = $('rs-conclusion');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
    prediction: null,        // 2 | 3 | 4 | 5 | 6 | '7+'
    activeMode: 'single',    // 'single' | 'simulation'
    currentSequence: null,   // Array<'H'|'T'> | null until first generated
    currentRuns: [],
    threshold: DEFAULT_THRESHOLD,
    singleSampleNumber: 0,
    simulationResults: null, // Array<number> of 1000 longest-run values, or null
    simulationNumber: 0
};

const cellEls = buildSequenceCells();

// ---------------------------------------------------------------------------
// Prediction (spec section 6)
// ---------------------------------------------------------------------------

document.querySelectorAll('.rs-predict-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        state.prediction = btn.dataset.prediction === '7+' ? '7+' : Number(btn.dataset.prediction);
        predictionAskEl.hidden = true;
        predictionMadeEl.hidden = false;
        predictionValueEl.textContent = String(state.prediction);
    });
});

// ---------------------------------------------------------------------------
// Sequence display
// ---------------------------------------------------------------------------

function buildSequenceCells() {
    const cells = [];
    for (let i = 0; i < SEQUENCE_LENGTH; i++) {
        const cell = document.createElement('div');
        cell.className = 'rs-cell';
        sequenceEl.appendChild(cell);
        cells.push(cell);
    }
    return cells;
}

/** Paints all 50 cells from state.currentSequence with no highlight applied yet. */
function paintSequenceText() {
    for (let i = 0; i < SEQUENCE_LENGTH; i++) {
        cellEls[i].textContent = state.currentSequence[i];
        cellEls[i].removeAttribute('data-highlight');
    }
    sequenceEl.setAttribute(
        'aria-label',
        `Sequence of ${SEQUENCE_LENGTH} coin flips: ${state.currentSequence.join(', ')}`
    );
}

/** Applies highlight state for the current threshold, without touching the letters. */
function applyHighlights() {
    cellEls.forEach((cell) => cell.removeAttribute('data-highlight'));
    const qualifying = runsAtLeast(state.currentRuns, state.threshold);
    for (const run of qualifying) {
        for (let i = run.start; i <= run.end; i++) {
            cellEls[i].dataset.highlight = run.value;
        }
    }
    return qualifying;
}

/** Reveals the 50 cells left-to-right, once, for the very first sequence (spec section 50). */
function revealSequenceFilling() {
    if (prefersReducedMotion()) {
        cellEls.forEach((cell) => { cell.style.opacity = ''; });
        return;
    }
    const perCellMs = FIRST_FILL_TOTAL_MS / SEQUENCE_LENGTH;
    cellEls.forEach((cell, i) => {
        cell.style.opacity = '0';
        setTimeout(() => { cell.style.transition = 'opacity 120ms ease'; cell.style.opacity = '1'; }, i * perCellMs);
    });
}

// ---------------------------------------------------------------------------
// Single-sequence mode: generation, metrics, messages (spec sections 9-22)
// ---------------------------------------------------------------------------

function renderSingleMetrics() {
    const qualifying = applyHighlights();
    const { heads, tails } = countHeadsTails(state.currentSequence);
    longestRunEl.textContent = `Longest streak: ${longestRun(state.currentSequence)}`;
    headsTailsEl.textContent = `Heads ${heads} · Tails ${tails}`;
    highlightedCountEl.textContent = `Highlighted streaks (${state.threshold}+): ${qualifying.length}`;
}

/** First-sequence / first-look-at-a-new-sequence interpretation message (spec section 19). */
function longestRunMessage(L) {
    if (L <= 3) {
        return `<strong>This sample is unusually low-streak.</strong> Only about ${pct(1 - probAtLeast(4))}% ` +
            `of fair 50-flip sequences have a longest run of 3 or less. A random process can occasionally look unusually even too.`;
    }
    if (L === 4) return `<strong>This sequence's longest streak is 4.</strong> That's on the short side, but not especially surprising for 50 fair flips.`;
    if (L === 5) return `<strong>Longest streak: 5.</strong> This is extremely ordinary for 50 fair flips; 5 is the single most common exact longest-run length.`;
    if (L === 6) return `<strong>Longest streak: 6.</strong> That's almost exactly what we'd expect to see in a typical 50-flip sequence.`;
    if (L === 7) return `<strong>Longest streak: 7.</strong> Longer than the typical 5&ndash;6, but still common: about ${pct(probAtLeast(7))}% of 50-flip sequences contain a run of 7 or more.`;
    if (L === 8) return `<strong>Longest streak: 8.</strong> Noticeable, but still produced by about ${pct(probAtLeast(8))}% of fair 50-flip sequences.`;
    if (L === 9) return `<strong>Longest streak: 9.</strong> That is less common, but about ${pct(probAtLeast(9))}% of fair 50-flip sequences reach 9 or more.`;
    return `<strong>Longest streak: ${L}.</strong> That's relatively unusual, but still occurs in about ${pct(probAtLeast(L))}% of fair 50-flip sequences.`;
}

const PREDICTION_REVEAL_NOTE =
    `One sequence can land above or below the typical value. Across many 50-flip sequences, the longest streak averages about <strong>6</strong>.`;

function predictionCompareLine() {
    return `<strong>Your prediction: ${state.prediction}</strong> &middot; <strong>This sequence: ${longestRun(state.currentSequence)}</strong>`;
}

const SAME_PROCESS_MESSAGE =
    `<strong>Different sequence, same process.</strong> The streaks move around and change length, but they keep appearing because streaks are part of independent randomness.`;

/** Builds the message shown right after a sequence is (re)generated. */
function generationMessage() {
    const L = longestRun(state.currentSequence);
    if (state.singleSampleNumber === 1) {
        return `${predictionCompareLine()}<br><br>${PREDICTION_REVEAL_NOTE}<br><br>${longestRunMessage(L)}`;
    }
    if (state.singleSampleNumber >= SYNTHESIS_SAMPLE_THRESHOLD) {
        return `${longestRunMessage(L)}<br><br>${SAME_PROCESS_MESSAGE}`;
    }
    return longestRunMessage(L);
}

function generateAndShowSequence({ firstReveal }) {
    state.currentSequence = generateSequence();
    state.currentRuns = findRuns(state.currentSequence);
    state.singleSampleNumber++;

    paintSequenceText();
    renderSingleMetrics();

    if (firstReveal) {
        revealSequenceFilling();
    } else {
        // The row-wrap note has done its job by the second sample; hide it to save
        // vertical space on phones (spec section 9.2: "can disappear after the first
        // interaction if vertical space is tight").
        wrapNoteEl.hidden = true;
    }

    setMessage(box, generationMessage(), { flash: !firstReveal });
    conclusionEl.hidden = false;
}

const singleFader = createFader(() => [sequenceEl]);

function requestNewSequence() {
    singleFader(() => generateAndShowSequence({ firstReveal: false }));
}

// --- Threshold control (single mode): NEVER regenerates the sequence ------

const THRESHOLD_MESSAGES = {
    3: () => `<strong>Three in a row feels streaky&mdash;but it is almost guaranteed here.</strong> About ${pct(probAtLeast(3), 3)}% of 50-flip fair-coin sequences contain at least one run of 3 or more.`,
    4: () => `<strong>Runs of 4 are still ordinary.</strong> About ${pct(probAtLeast(4))}% of 50-flip fair-coin sequences contain at least one run of 4 or more.`,
    5: () => `<strong>A run of 5 is common.</strong> About ${pct(probAtLeast(5))}% of 50-flip fair-coin sequences contain at least one run of 5 or more.`,
    6: () => `<strong>Even 6 in a row is not rare.</strong> About ${pct(probAtLeast(6))}% of 50-flip fair-coin sequences contain at least one run of 6 or more.`
};

function setSingleThreshold(k) {
    state.threshold = k;
    document.querySelectorAll('.rs-threshold-btn:not(.rs-threshold-btn-sim)').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(Number(btn.dataset.threshold) === k));
    });
    renderSingleMetrics(); // highlights only -- the sequence itself is untouched
    setMessage(box, THRESHOLD_MESSAGES[k]());
}

document.querySelectorAll('.rs-threshold-btn:not(.rs-threshold-btn-sim)').forEach((btn) => {
    btn.addEventListener('click', () => setSingleThreshold(Number(btn.dataset.threshold)));
});

why3Btn.addEventListener('click', () => {
    setMessage(box,
        `<strong>Why call 3 a streak?</strong> There is no universal mathematical cutoff. ` +
        `Carlson &amp; Shu found that the third repeated outcome was pivotal in people's perception ` +
        `that a streak had emerged. That's why this visualization starts at 3+, while letting you ` +
        `choose a stricter threshold.`
    );
});

newSequenceBtn.addEventListener('click', requestNewSequence);

// ---------------------------------------------------------------------------
// Mode switching (spec section 5, 23)
// ---------------------------------------------------------------------------

function selectMode(index, { focus = false } = {}) {
    modeTabs.forEach((m, i) => {
        const on = i === index;
        m.tab.setAttribute('aria-selected', String(on));
        m.tab.tabIndex = on ? 0 : -1;
        m.panel.hidden = !on;
    });
    state.activeMode = index === 0 ? 'single' : 'simulation';
    if (focus) modeTabs[index].tab.focus();

    if (state.activeMode === 'simulation') {
        if (!state.simulationResults) runSimulation();
        else renderSimThreshold(); // just re-show the existing batch's message for the current threshold
    }
}

modeTabs.forEach((m, i) => {
    m.tab.addEventListener('click', () => selectMode(i));
    m.tab.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key === 'ArrowRight') next = (i + 1) % modeTabs.length;
        else if (event.key === 'ArrowLeft') next = (i - 1 + modeTabs.length) % modeTabs.length;
        if (next !== null) {
            event.preventDefault();
            selectMode(next, { focus: true });
        }
    });
});

// ---------------------------------------------------------------------------
// Simulation mode (spec sections 23-32)
// ---------------------------------------------------------------------------

const HISTOGRAM_BINS = ['2', '3', '4', '5', '6', '7', '8', '9', '10+'];

function runSimulation() {
    const results = new Array(SIMULATION_COUNT);
    for (let i = 0; i < SIMULATION_COUNT; i++) {
        results[i] = longestRun(generateSequence());
    }
    state.simulationResults = results;
    state.simulationNumber++;
    renderHistogram();
    renderSimThreshold();
}

function renderHistogram() {
    const counts = Object.fromEntries(HISTOGRAM_BINS.map((b) => [b, 0]));
    for (const L of state.simulationResults) counts[binFor(L)]++;

    const observedPct = HISTOGRAM_BINS.map((b) => (counts[b] / SIMULATION_COUNT) * 100);
    const exact = exactDistribution();
    const exactPct = HISTOGRAM_BINS.map((b) => exact[b === '10+' ? '10+' : Number(b)] * 100);

    // Filled bars = this batch's observed percentages; a thin marker line traces the exact
    // theoretical percentages so the visitor can see the simulation cluster around the true
    // distribution rather than mistake one batch for the mathematical answer (spec 27).
    Plotly.react(
        histogramEl,
        [
            {
                x: HISTOGRAM_BINS,
                y: observedPct,
                type: 'bar',
                name: 'This batch (observed)',
                marker: { color: '#0f766e', line: { color: '#0f766e', width: 0 } }
            },
            {
                x: HISTOGRAM_BINS,
                y: exactPct,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Exact probability',
                line: { color: '#b45309', width: 2 },
                marker: { color: '#b45309', size: 6 }
            }
        ],
        {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            xaxis: { title: 'Longest streak', tickmode: 'linear' },
            yaxis: { title: 'Percent of sequences', range: [0, 32], gridcolor: '#e2e8f0' },
            legend: { orientation: 'h', y: -0.25 },
            margin: { l: 50, r: 20, t: 20, b: 70 },
            shapes: predictionMarkerShape()
        },
        plotlyConfig
    );

    // Text-equivalent table for screen readers (spec section 49).
    histogramTableBody.innerHTML = HISTOGRAM_BINS.map((b, i) =>
        `<tr><td>${b}</td><td>${observedPct[i].toFixed(1)}%</td><td>${exactPct[i].toFixed(1)}%</td></tr>`
    ).join('');
}

/** A vertical reference line marking the visitor's original prediction (spec section 28). */
function predictionMarkerShape() {
    if (state.prediction === null) return [];
    const x = state.prediction === '7+' ? '7' : String(state.prediction);
    if (!HISTOGRAM_BINS.includes(x)) return [];
    return [{
        type: 'line',
        x0: x, x1: x,
        y0: 0, y1: 32,
        line: { color: '#334155', width: 2, dash: 'dot' }
    }];
}

function renderSimThreshold() {
    document.querySelectorAll('.rs-threshold-btn-sim').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(Number(btn.dataset.threshold) === state.threshold));
    });
    const k = state.threshold;
    const countAtLeast = state.simulationResults.filter((L) => L >= k).length;
    const exactPctText = pct(probAtLeast(k));
    simThresholdResultEl.innerHTML =
        `${countAtLeast} of these 1,000 sequences contained at least one run of ${k} or more. Exact probability: ${exactPctText}%.`;

    const SIM_MESSAGES = {
        3: `<strong>Almost every sequence has one.</strong> In 50 fair flips, a run of 3+ occurs with probability about ${pct(probAtLeast(3), 3)}%.`,
        4: `<strong>Four in a row is nearly inevitable in 50 flips.</strong> Exact probability: ${pct(probAtLeast(4))}%.`,
        5: `<strong>Five in a row is common.</strong> Exact probability: ${pct(probAtLeast(5))}%.`,
        6: `<strong>Six in a row happens more often than not.</strong> Exact probability: ${pct(probAtLeast(6))}%.`
    };
    setMessage(box, `${SIM_MESSAGES[k]} This batch: <strong>${countAtLeast} / 1,000</strong> sequences contained at least one run of ${k}+.`);
}

function setSimThreshold(k) {
    state.threshold = k;
    renderSimThreshold();
}

document.querySelectorAll('.rs-threshold-btn-sim').forEach((btn) => {
    btn.addEventListener('click', () => setSimThreshold(Number(btn.dataset.threshold)));
});

run1000Btn.addEventListener('click', () => {
    // Bars replace in place rather than accumulating (spec section 31); Plotly.react()
    // already does this since it's called with a full fresh trace set each time.
    runSimulation();
});

// ---------------------------------------------------------------------------
// "Flip 50 coins" -- the very first sequence generation
// ---------------------------------------------------------------------------

flipBtn.addEventListener('click', () => {
    modeSwitchEl.hidden = false;
    $('rs-panel-single').hidden = false;
    generateAndShowSequence({ firstReveal: true });
});

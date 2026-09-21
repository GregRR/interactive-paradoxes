/**
 * Exhibit 8: The Prosecutor's Fallacy / Base-Rate Neglect
 *
 * Belongs to: Group 4 (Hidden Structures in Chaos)
 * Depends on: nothing from core.js. Draws on a plain <canvas>, so it does not use Plotly.
 * DOM ids used: brn-scenario, brn-prior-slider, brn-sensitivity-slider, brn-specificity-slider, brn-canvas, brn-result, brn-intro-text
 *
 * Loaded by: src/pages/base-rate-neglect.astro. The page's markup exists before this
 * module runs, so it wires up its controls and draws the first frame immediately.
 */

// --- 8. Prosecutor's Fallacy / Base-Rate Neglect ---
//
// Research basis (see docs/references.md for full citations): Gigerenzer &
// Hoffrage's work on natural frequencies shows that presenting numbers as
// "X out of 10,000" rather than as percentages/probabilities is the single
// biggest lever for improving people's Bayesian reasoning -- bigger than the
// choice of diagram. Grabmaier et al. (2015) additionally found that visual
// aids (icon arrays, trees, tables) only help when paired with natural
// frequencies; visualizing raw probabilities barely helps at all. So this
// exhibit (a) always states results as "N out of 10,000", never as a bare
// percentage, and (b) renders an actual 10,000-icon grid, matching the
// "10,000 little people" idea from the project's own notes/ideas doc.
//
// Both the "cancer screening" and "DNA match" scenarios reduce to the same
// underlying Bayesian structure: a prior probability (prevalence, or prior
// probability of guilt), a sensitivity (true-positive rate), and a
// specificity (true-negative rate). For DNA matching, sensitivity is fixed
// near 100% (a true match is essentially never missed) and specificity is
// just 1 minus the random-match probability, so one calculation engine
// serves both scenarios with different labels/defaults.

const BRN_POP = 10000; // fixed population size for the icon grid
const BRN_SCENARIOS = {
    cancer: {
        priorLabel: 'Condition Prevalence',
        priorSlider: 541,          // -> ~1-in-100 (see brnPriorFromSlider)
        sensLabel: 'Test Sensitivity',
        sensShow: true,
        sensSlider: 9000,          // 90.00%
        specLabel: 'Test Specificity',
        specSlider: 9000,          // 90.00%
        specMin: 5000,
        positiveWord: 'tests positive',
        negativeWord: 'tests negative',
        hasWord: 'has the condition',
        notHasWord: 'does not have the condition',
        subjectSingular: 'person',
        intro: `A test can be highly accurate and still be wrong most of the time it flags someone &mdash;
            if what it's looking for is rare enough. This is one of the most common reasoning errors in
            medicine: people hear "the test is 90% accurate" and assume a positive result means a 90%
            chance of being right. It usually doesn't. What matters just as much as the test's accuracy is
            how rare the condition was to begin with &mdash; the <strong>base rate</strong>. Adjust the
            sliders below and watch the grid of 10,000 people change color.`,
    },
    dna: {
        priorLabel: 'Prior Chance This Suspect Is Guilty',
        priorSlider: 270,          // -> ~1-in-1,000 (see brnPriorFromSlider)
        sensLabel: 'DNA Match Sensitivity (a true match is almost never missed)',
        sensShow: false,
        sensSlider: 9990,          // 99.90%, fixed/hidden -- true matches are essentially always detected
        specLabel: 'Specificity (1 &minus; random-match probability)',
        specSlider: 9999,          // 99.99% specificity = 1-in-10,000 random match rate
        specMin: 9000,
        positiveWord: 'is flagged as a DNA match',
        negativeWord: 'is cleared by the DNA test',
        hasWord: 'is actually guilty',
        notHasWord: 'is actually innocent',
        subjectSingular: 'suspect',
        intro: `In courtrooms, a DNA match is often treated as near-certain proof of guilt. But a match only
            tells you the suspect's DNA is consistent with the sample &mdash; not how likely they are to be
            the source, especially when the pool of people who could have been searched or flagged is
            large. This is the <strong>prosecutor's fallacy</strong>: confusing "the probability of this
            evidence if innocent" with "the probability of innocence given this evidence." Adjust the
            sliders below and watch the grid of 10,000 possible suspects change color. (These are
            illustrative numbers, not a real case.)`,
    }
};

// Log-scale mapping for the prior slider: 0-1000 -> probability from
// 1-in-10,000 (rare) to 1-in-2 (common). A linear slider would make every
// realistic prevalence/prior value bunch up unusably near one end.
function brnPriorFromSlider(sliderVal) {
    const logMin = Math.log10(1 / 10000);
    const logMax = Math.log10(1 / 2);
    const t = sliderVal / 1000;
    const logP = logMin + (logMax - logMin) * t;
    return Math.pow(10, logP);
}
// Formats a probability as a natural frequency, e.g. 0.01 -> "1 in 100".
function brnFormatOdds(p) {
    if (p <= 0) return 'effectively 0';
    const denom = Math.round(1 / p);
    return `1 in ${denom.toLocaleString()}`;
}

let brnCurrentScenario = 'cancer';

function brnApplyScenarioDefaults(key) {
    const s = BRN_SCENARIOS[key];
    document.getElementById('brn-intro-text').innerHTML = s.intro;
    document.getElementById('brn-prior-label').innerText = s.priorLabel;
    document.getElementById('brn-prior-slider').value = s.priorSlider;
    document.getElementById('brn-sensitivity-label').innerText = s.sensLabel;
    document.getElementById('brn-sensitivity-slider').value = s.sensSlider;
    document.getElementById('brn-sensitivity-wrap').style.display = s.sensShow ? '' : 'none';
    document.getElementById('brn-specificity-label').innerText = s.specLabel;
    document.getElementById('brn-specificity-slider').min = s.specMin;
    document.getElementById('brn-specificity-slider').value = s.specSlider;
}

function drawBaseRateNeglect() {
    const scenario = BRN_SCENARIOS[brnCurrentScenario];

    const priorSliderVal = parseInt(document.getElementById('brn-prior-slider').value);
    const prior = brnPriorFromSlider(priorSliderVal);
    const sensitivity = parseInt(document.getElementById('brn-sensitivity-slider').value) / 10000;
    const specificity = parseInt(document.getElementById('brn-specificity-slider').value) / 10000;

    document.getElementById('brn-prior-val').innerText = brnFormatOdds(prior);
    document.getElementById('brn-sensitivity-val').innerText = (sensitivity * 100).toFixed(1) + '%';
    document.getElementById('brn-specificity-val').innerText = (specificity * 100).toFixed(2) + '%';

    // Natural frequencies out of the fixed population.
    const hasCondition = Math.round(BRN_POP * prior);
    const noCondition = BRN_POP - hasCondition;
    const truePositive = Math.round(hasCondition * sensitivity);
    const falseNegative = hasCondition - truePositive;
    const falsePositive = Math.round(noCondition * (1 - specificity));
    const trueNegative = noCondition - falsePositive;

    const totalPositive = truePositive + falsePositive;
    const ppv = totalPositive > 0 ? (truePositive / totalPositive) : 0; // positive predictive value

    brnDrawCanvas(truePositive, falsePositive, trueNegative, falseNegative);

    const pct = (totalPositive > 0 ? (ppv * 100) : 0).toFixed(1);
    document.getElementById('brn-result').innerHTML = `
        <div class="text-sm text-slate-500 mb-2">Out of ${BRN_POP.toLocaleString()} ${scenario.subjectSingular}s:</div>
        <div class="mb-1"><strong class="text-red-600">${truePositive.toLocaleString()}</strong> ${scenario.positiveWord} and ${scenario.hasWord}</div>
        <div class="mb-1"><strong class="text-amber-600">${falsePositive.toLocaleString()}</strong> ${scenario.positiveWord} but ${scenario.notHasWord}</div>
        <div class="mb-1"><strong class="text-slate-500">${trueNegative.toLocaleString()}</strong> ${scenario.negativeWord} and ${scenario.notHasWord}</div>
        <div class="mb-4"><strong class="text-slate-700">${falseNegative.toLocaleString()}</strong> ${scenario.negativeWord} but ${scenario.hasWord}</div>
        <div class="pt-4 border-t border-purple-200">
            Of the <strong>${totalPositive.toLocaleString()}</strong> total who ${scenario.positiveWord},
            only <strong>${truePositive.toLocaleString()}</strong> actually ${scenario.hasWord.replace('has the', 'have the')}.
            That's <strong class="text-purple-700">${pct}%</strong> &mdash;
            not the ${(sensitivity * 100).toFixed(0)}%/${(specificity * 100).toFixed(0)}% figures the test's
            accuracy alone might suggest.
        </div>`;
}

// Renders the 10,000-icon grid on a canvas (a fixed-size DOM element list of
// that many nodes would be far too slow to redraw on every slider input; a
// canvas can redraw thousands of small squares smoothly).
function brnDrawCanvas(tp, fp, tn, fn) {
    const canvas = document.getElementById('brn-canvas');
    const cssWidth = canvas.clientWidth || 500;
    // Keep the canvas's backing store sized to match its displayed (CSS) size
    // multiplied by devicePixelRatio, so icons stay crisp on retina screens.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssWidth * dpr;
    canvas.height = cssWidth * dpr; // square aspect ratio
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssWidth);

    const cols = 100; // 100 x 100 = 10,000 icons
    const cellSize = cssWidth / cols;
    const dotSize = Math.max(1, cellSize * 0.72);

    // Build the flat list of outcomes in a fixed, stable order so that
    // (as much as possible) an icon's position doesn't jump around
    // dramatically between adjacent slider values -- true positives and
    // false negatives (people who have the condition) are drawn first as a
    // contiguous block, then true/false negatives fill the rest.
    const colors = [];
    for (let i = 0; i < tp; i++) colors.push('#dc2626');
    for (let i = 0; i < fn; i++) colors.push('#334155');
    for (let i = 0; i < fp; i++) colors.push('#f59e0b');
    for (let i = 0; i < tn; i++) colors.push('#cbd5e1');
    // Pad/truncate defensively in case of rounding drift so we always draw exactly BRN_POP icons.
    while (colors.length < BRN_POP) colors.push('#cbd5e1');
    colors.length = BRN_POP;

    for (let i = 0; i < BRN_POP; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.fillStyle = colors[i];
        ctx.fillRect(col * cellSize + (cellSize - dotSize) / 2, row * cellSize + (cellSize - dotSize) / 2, dotSize, dotSize);
    }
}

document.getElementById('brn-scenario').addEventListener('change', (e) => {
    brnCurrentScenario = e.target.value;
    brnApplyScenarioDefaults(brnCurrentScenario);
    drawBaseRateNeglect();
});
document.getElementById('brn-prior-slider').addEventListener('input', drawBaseRateNeglect);
document.getElementById('brn-sensitivity-slider').addEventListener('input', drawBaseRateNeglect);
document.getElementById('brn-specificity-slider').addEventListener('input', drawBaseRateNeglect);
window.addEventListener('resize', drawBaseRateNeglect);

// Apply initial scenario defaults once at load.
brnApplyScenarioDefaults(brnCurrentScenario);

drawBaseRateNeglect();

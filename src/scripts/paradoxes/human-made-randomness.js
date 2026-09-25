/**
 * Exhibit: Human-made Randomness (Part 2 of the Clustering Illusion series)
 *
 * Belongs to: Group 2 (Clustering Illusions)
 * Depends on: ./human-made-randomness-stats.js (sequence analysis and exact binomial math).
 * No Plotly, no canvas: the 30 sequence cells are plain DOM elements built once and
 * updated in place, mirroring the pattern established in clustering-illusion.js.
 *
 * DOM ids used: hmr-instruction, hmr-sequence, hmr-generating-controls, hmr-pick-h,
 *   hmr-pick-t, hmr-progress, hmr-undo, hmr-start-over, hmr-ready-controls, hmr-analyze,
 *   hmr-results, hmr-heads-tails, hmr-longest-run, hmr-meter, hmr-meter-marker,
 *   hmr-meter-text, hmr-try-again, hmr-box, hmr-first-attempt, hmr-conclusion
 *
 * Loaded by: src/pages/human-made-randomness.astro. The page's markup exists before this
 * module runs, so it builds the 30 sequence cells and shows the generating phase
 * immediately.
 *
 * ----------------------------------------------------------------------------------
 * WHAT THIS EXHIBIT SHOWS
 *
 * The visitor imagines 30 fair-coin flips and enters them one at a time. Only after all
 * 30 are entered and the visitor explicitly asks to "Analyze my sequence" does the
 * interface reveal anything: no live statistics, warnings, or praise appear during entry,
 * because that would coach the very behavior being measured (spec sections 7.4, 7.8, 34).
 *
 * The primary reveal is ALTERNATION RATE: how often the sequence switches between H and T
 * from one outcome to the next, compared against the exact Binomial(29, 0.5) distribution
 * a genuine fair coin would produce. Heads/tails balance and longest run are shown as
 * secondary, supportive metrics, not as separate "scores" (spec sections 10, 12, 14, 23).
 *
 * ----------------------------------------------------------------------------------
 * RESEARCH NOTES (see docs/references.md for full citations)
 *
 * Bar-Hillel & Wagenaar (1991) and Falk & Konold (1997): people asked to produce random
 * binary sequences commonly switch outcomes more often, and produce shorter runs, than an
 * independent process would ("overalternation"). Wagenaar (1972), Nickerson (2002), and
 * Guseva et al. (2023) caution that random-generation results are sensitive to task
 * details (instructions, sequence length, pacing, visibility of prior choices), so no
 * message here claims this task reproduces a specific study or diagnoses one visitor.
 * Warren et al. (2018) is the basis for treating overalternation as a well-established
 * group-level tendency rather than evidence of a personal cognitive deficiency, and for
 * showing a low-alternation result (spec 19.4) as an equally legitimate, differently-
 * shaped departure from chance rather than forcing every result into one narrative.
 * Carlson & Shu (2007) supports the longest-run line as a bridge to Part 3, not as a
 * second primary metric.
 *
 * Every visitor-facing message is exact math (the binomial tail probabilities) plus
 * carefully scoped prose. Nothing calls a visitor's sequence "non-random", diagnoses a
 * bias ("you have the gambler's fallacy"), treats 15/15 balance as suspicious, or reduces
 * the result to a single "randomness score" (spec section 23, 34).
 *
 * ----------------------------------------------------------------------------------
 * MOTION RULES
 *
 * A newly entered outcome gets a brief opacity/scale-in (CSS, see data-just-added). The
 * Analyze transition never rearranges the sequence -- only annotations fade in around it.
 * Try again fades the whole region out, resets state while invisible, and fades a fresh
 * empty sequence back in, following the same fade-out/apply/fade-in pattern as Part 1's
 * createFader. prefers-reduced-motion disables all of the above.
 */

import { SEQUENCE_LENGTH, analyzeSequence } from './human-made-randomness-stats.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Matches the .hmr-fade CSS transition in human-made-randomness.astro. */
const FADE_MS = 180;

/** Thresholds for the message-priority logic (spec section 19). */
const HIGH_ALTERNATION_THRESHOLD = 19;      // A >= 19: strong/high alternation
const MODERATE_ALTERNATION_MIN = 16;        // 15 < A < 19: moderately above 50%
const MIDDLE_RANGE_MIN = 12;                // 12 <= A <= 17: near the middle
const MIDDLE_RANGE_MAX = 17;
const LOW_ALTERNATION_THRESHOLD = 10;       // A <= 10: low alternation

/** Longest-run secondary-note thresholds (spec section 21). */
const SHORT_LONGEST_RUN = 3;   // L <= 3, paired with a high-alternation result
const LONG_LONGEST_RUN = 5;    // L >= 5

// ---------------------------------------------------------------------------
// Small helpers (mirrors clustering-illusion.js)
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const pct = (rate, digits = 0) => (rate * 100).toFixed(digits);

/**
 * Sets a feedback box's message and briefly flashes the box when the text actually
 * changed. Identical pattern to clustering-illusion.js's setMessage.
 */
function setMessage(boxEl, html, { flash = true } = {}) {
    const msgEl = boxEl.querySelector('.hmr-msg');
    if (msgEl.innerHTML === html) return;
    msgEl.innerHTML = html;
    if (!flash) return;
    boxEl.classList.remove('hmr-flash');
    void boxEl.offsetWidth; // force reflow so the animation can restart
    boxEl.classList.add('hmr-flash');
}

/**
 * Fade-out / replace / fade-in helper for the whole sequence + controls region, used only
 * by "Try again" (the Analyze transition intentionally does NOT fade the sequence itself,
 * per spec section 29, so it does not need this helper).
 */
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

const sequenceEl = $('hmr-sequence');
const box = $('hmr-box');

const generatingControls = $('hmr-generating-controls');
const pickHBtn = $('hmr-pick-h');
const pickTBtn = $('hmr-pick-t');
const progressEl = $('hmr-progress');
const undoBtn = $('hmr-undo');
const startOverBtn = $('hmr-start-over');

const readyControls = $('hmr-ready-controls');
const analyzeBtn = $('hmr-analyze');

const resultsEl = $('hmr-results');
const headsTailsEl = $('hmr-heads-tails');
const longestRunEl = $('hmr-longest-run');
const meterMarkerEl = $('hmr-meter-marker');
const meterTextEl = $('hmr-meter-text');
const tryAgainBtn = $('hmr-try-again');

const firstAttemptEl = $('hmr-first-attempt');
const conclusionEl = $('hmr-conclusion');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * @typedef {'generating' | 'ready' | 'analyzed'} Phase
 */
const state = {
    /** @type {Array<'H'|'T'>} */
    sequence: [],
    /** @type {Phase} */
    phase: 'generating',
    attemptNumber: 1,
    /** First attempt's key metrics, kept for the "First attempt / Current attempt" line
     *  once a second attempt has been analyzed (spec section 26, optional feature). */
    firstAttemptMetrics: null
};

const cellEls = buildSequenceCells();

// ---------------------------------------------------------------------------
// Sequence display
// ---------------------------------------------------------------------------

/** Builds the 30 sequence cells once; only their content/state changes afterward. */
function buildSequenceCells() {
    const cells = [];
    for (let i = 0; i < SEQUENCE_LENGTH; i++) {
        const cell = document.createElement('div');
        cell.className = 'hmr-cell';
        cell.dataset.state = 'empty';
        cell.textContent = '·'; // middle dot, subdued empty marker
        sequenceEl.appendChild(cell);
        cells.push(cell);
    }
    return cells;
}

/** Redraws every cell from state.sequence, without any run/analysis annotations. */
function renderSequence() {
    for (let i = 0; i < SEQUENCE_LENGTH; i++) {
        const outcome = state.sequence[i];
        const cell = cellEls[i];
        cell.removeAttribute('data-run');
        if (outcome === undefined) {
            cell.dataset.state = 'empty';
            cell.textContent = '·';
        } else {
            cell.dataset.state = 'filled';
            cell.textContent = outcome;
        }
    }
    sequenceEl.setAttribute(
        'aria-label',
        `Your sequence, ${state.sequence.length} of ${SEQUENCE_LENGTH} outcomes entered`
    );
}

/** Marks runs of 3+ identical outcomes with a non-color underline (spec section 17). Only
 *  called once the sequence is locked for analysis; the exact visitor order never changes. */
function annotateRuns() {
    let runStart = 0;
    for (let i = 1; i <= SEQUENCE_LENGTH; i++) {
        if (i === SEQUENCE_LENGTH || state.sequence[i] !== state.sequence[runStart]) {
            const runLength = i - runStart;
            if (runLength >= 3) {
                for (let j = runStart; j < i; j++) cellEls[j].dataset.run = 'true';
            }
            runStart = i;
        }
    }
}

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

const GENERATING_MESSAGE =
    `<strong>Make the sequence before seeing the math.</strong> There's no score for each individual choice, just enter the outcomes that feel plausibly random.`;

const READY_MESSAGE =
    `<strong>Sequence complete.</strong> Take one last look at it, then reveal how it compares with an independent fair coin.`;

/** Enters the "generating" phase UI (used on load and after Try again / Undo below 30). */
function showGeneratingPhase() {
    generatingControls.hidden = false;
    readyControls.hidden = true;
    resultsEl.hidden = true;
    updateGeneratingControls();
}

/** Enters the "ready" phase UI: all 30 entered, input stops, Analyze appears (spec 8). */
function showReadyPhase() {
    generatingControls.hidden = true;
    readyControls.hidden = false;
    resultsEl.hidden = true;
    setMessage(box, READY_MESSAGE);
}

/** Updates the progress counter and button enabled/disabled states for the generating phase. */
function updateGeneratingControls() {
    const n = state.sequence.length;
    progressEl.textContent = String(n);
    undoBtn.disabled = n === 0;
    startOverBtn.disabled = n === 0;
    const full = n >= SEQUENCE_LENGTH;
    pickHBtn.disabled = full;
    pickTBtn.disabled = full;
}

/** The visitor tapped Heads or Tails, or pressed H/T on the keyboard. */
function addOutcome(outcome) {
    if (state.phase !== 'generating') return;
    if (state.sequence.length >= SEQUENCE_LENGTH) return;

    state.sequence.push(outcome);
    renderSequence();
    const newCell = cellEls[state.sequence.length - 1];
    // Restart the entrance animation in case reduced-motion CSS already skips it.
    newCell.removeAttribute('data-just-added');
    void newCell.offsetWidth;
    newCell.dataset.justAdded = 'true';

    updateGeneratingControls();

    if (state.sequence.length === SEQUENCE_LENGTH) {
        state.phase = 'ready';
        showReadyPhase();
    }
}

/** Removes the most recent outcome (available during generating AND ready, per spec 7.6/8.5). */
function undoLast() {
    if (state.sequence.length === 0) return;
    state.sequence.pop();
    renderSequence();
    if (state.phase === 'ready') {
        state.phase = 'generating';
        showGeneratingPhase();
        setMessage(box, GENERATING_MESSAGE);
    } else {
        updateGeneratingControls();
    }
}

/** Clears the sequence and returns to an empty generating phase (spec section 7.7). */
function startOver() {
    state.sequence = [];
    state.phase = 'generating';
    renderSequence();
    showGeneratingPhase();
    setMessage(box, GENERATING_MESSAGE);
}

// A second tap within this window confirms Start over once at least half the sequence has
// been entered, per spec 7.7's "avoid a modal, prefer inline confirmation" guidance.
const START_OVER_CONFIRM_WINDOW_MS = 3000;
const START_OVER_CONFIRM_THRESHOLD = SEQUENCE_LENGTH / 2;
let startOverArmed = false;
let startOverArmedTimeout = null;

function handleStartOverClick() {
    if (state.sequence.length < START_OVER_CONFIRM_THRESHOLD) {
        startOver();
        return;
    }
    if (startOverArmed) {
        clearTimeout(startOverArmedTimeout);
        startOverArmed = false;
        startOverBtn.textContent = 'Start over';
        startOver();
        return;
    }
    startOverArmed = true;
    startOverBtn.textContent = 'Tap again to confirm';
    startOverArmedTimeout = setTimeout(() => {
        startOverArmed = false;
        startOverBtn.textContent = 'Start over';
    }, START_OVER_CONFIRM_WINDOW_MS);
}

// ---------------------------------------------------------------------------
// Analysis (spec sections 9-23)
// ---------------------------------------------------------------------------

/** Renders the alternation meter: fixed 50% midline, marker at the measured rate. */
function renderMeter(analysis) {
    const leftPercent = analysis.alternationRate * 100;
    meterMarkerEl.style.left = `${leftPercent}%`;
    meterTextEl.textContent = `You: ${pct(analysis.alternationRate)}% switching (a fair coin averages 50%)`;
}

/**
 * Builds the single primary alternation message, per the exact tail probability and the
 * priority ranges in spec section 19. Uses the true binomial tails throughout rather than
 * the spec's illustrative hard-coded ranges, so the boundary behavior stays exactly
 * consistent with the numbers actually displayed.
 */
function alternationMessage(analysis) {
    const { alternations: a, alternationRate, upperTailProbability, lowerTailProbability } = analysis;
    const ratePct = pct(alternationRate);

    if (a >= HIGH_ALTERNATION_THRESHOLD) {
        return `<strong>You switched outcomes ${a} out of 29 times, ${ratePct}% of the time.</strong> ` +
            `A fair coin switches about 50% of the time. Only about <strong>${pct(upperTailProbability, 1)}%</strong> ` +
            `of 30-flip fair-coin sequences switch at least this often. This is a pattern researchers see ` +
            `again and again in sequences people write by hand: people tend to switch ` +
            `outcomes more often and avoid long runs, compared to a real coin.`;
    }
    if (a >= MODERATE_ALTERNATION_MIN && a < HIGH_ALTERNATION_THRESHOLD) {
        return `<strong>Your sequence switched ${ratePct}% of the time, a bit above the 50% a fair coin ` +
            `would average.</strong> For a sequence this short, that result is still quite plausible by ` +
            `chance alone. Across groups of people, though, researchers repeatedly find a tendency to ` +
            `switch more often than a real coin would.`;
    }
    if (a <= LOW_ALTERNATION_THRESHOLD) {
        return `<strong>Your sequence repeated outcomes more than a typical fair-coin sample would.</strong> ` +
            `Only about <strong>${pct(lowerTailProbability, 1)}%</strong> of 30-flip fair-coin sequences ` +
            `switch this rarely or less. Not everyone drifts the same way when they try to fake ` +
            `randomness; some people repeat more instead of switching more.`;
    }
    // Covers the remaining middle band (spec 19.3), including values between the low
    // threshold and the moderate band that the spec's illustrative ranges leave implicit.
    return `<strong>Your switching rate was ${ratePct}%.</strong> That's well within the range ` +
        `you'd expect from 30 real coin flips. One short sequence can't tell ` +
        `us much about a single person's instincts; the pattern researchers describe shows up when ` +
        `you look at many people's attempts together.`;
}

/** Optional one-sentence balance note (spec section 20). Returns '' when nothing applies. */
function balanceNote(analysis) {
    if (analysis.heads === 15 && analysis.tails === 15) {
        return `You also landed on an exact split: 15 heads and 15 tails. That's ` +
            `perfectly possible for a fair coin, but a real coin doesn't correct itself ` +
            `to stay balanced over a short run like this.`;
    }
    if (Math.abs(analysis.heads - analysis.tails) >= 8) {
        return `Your heads and tails counts are uneven, but short fair-coin sequences are often ` +
            `uneven too. A small batch of flips doesn't need to come out even.`;
    }
    return '';
}

/** Optional one-sentence longest-run bridge to Part 3 (spec section 21). */
function longestRunNote(analysis) {
    if (analysis.longestRun <= SHORT_LONGEST_RUN && analysis.alternations >= MODERATE_ALTERNATION_MIN) {
        return `Your longest run was only <strong>${analysis.longestRun}</strong>. Avoiding long runs ` +
            `and switching often tend to go together. Next up, we'll look at what real random streaks ` +
            `actually look like.`;
    }
    if (analysis.longestRun >= LONG_LONGEST_RUN) {
        return `Your sequence included a run of <strong>${analysis.longestRun}</strong>. Long runs can ` +
            `look suspicious, but fair coins produce them more often than most people expect. That's ` +
            `what the next part is about.`;
    }
    return '';
}

/** Assembles the single message shown after analysis, per the priority order in spec 22. */
function resultMessage(analysis) {
    const parts = [alternationMessage(analysis)];
    const balance = balanceNote(analysis);
    if (balance) parts.push(balance);
    const run = longestRunNote(analysis);
    if (run) parts.push(run);
    return parts.join(' ');
}

/** Neutral note shown ahead of the result once a repeat attempt is being analyzed (spec 25). */
const REPEAT_ATTEMPT_PREFIX =
    `<strong>Now you know what the analysis looks for.</strong> Feel free to try again, but later ` +
    `attempts are more practice than a fresh test of your first instinct.<br><br>`;

function runAnalysis() {
    if (state.phase !== 'ready') return;
    state.phase = 'analyzed';

    const analysis = analyzeSequence(state.sequence);
    renderSequence(); // ensure the display reflects the final locked sequence
    annotateRuns();   // then mark runs of 3+ on top of it (spec section 17)

    readyControls.hidden = true;
    resultsEl.hidden = false;

    headsTailsEl.textContent = `Heads ${analysis.heads} · Tails ${analysis.tails}`;
    longestRunEl.textContent = `Longest run ${analysis.longestRun}`;
    renderMeter(analysis);

    const message = state.attemptNumber === 1
        ? resultMessage(analysis)
        : REPEAT_ATTEMPT_PREFIX + resultMessage(analysis);
    setMessage(box, message);

    if (state.attemptNumber === 1) {
        state.firstAttemptMetrics = analysis;
        firstAttemptEl.hidden = true;
    } else if (state.firstAttemptMetrics) {
        firstAttemptEl.hidden = false;
        firstAttemptEl.textContent =
            `First attempt: ${pct(state.firstAttemptMetrics.alternationRate)}% alternation · ` +
            `Current attempt: ${pct(analysis.alternationRate)}% alternation`;
    }

    conclusionEl.hidden = false;
}

// ---------------------------------------------------------------------------
// Try again (spec section 24)
// ---------------------------------------------------------------------------

const regionFader = createFader(() => [sequenceEl, generatingControls, readyControls, resultsEl]);

function tryAgain() {
    state.attemptNumber++;
    regionFader(() => {
        state.sequence = [];
        state.phase = 'generating';
        renderSequence();
        showGeneratingPhase();
        setMessage(box, GENERATING_MESSAGE, { flash: false });
    });
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

pickHBtn.addEventListener('click', () => addOutcome('H'));
pickTBtn.addEventListener('click', () => addOutcome('T'));
undoBtn.addEventListener('click', undoLast);
startOverBtn.addEventListener('click', handleStartOverClick);
analyzeBtn.addEventListener('click', runAnalysis);
tryAgainBtn.addEventListener('click', tryAgain);

// Keyboard shortcuts (H/T) only while generating, and only when focus is not inside an
// editable field elsewhere on the page (spec section 7.3).
document.addEventListener('keydown', (event) => {
    if (state.phase !== 'generating') return;
    const target = event.target;
    const isEditable = target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (isEditable) return;

    if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        addOutcome('H');
    } else if (event.key === 't' || event.key === 'T') {
        event.preventDefault();
        addOutcome('T');
    }
});

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------

renderSequence();
showGeneratingPhase();
setMessage(box, GENERATING_MESSAGE, { flash: false });

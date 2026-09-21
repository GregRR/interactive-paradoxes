/**
 * Exhibit: The Clustering Illusion (Part 1: What Does Random Look Like?)
 *
 * Belongs to: Group 2 (Clustering Illusions)
 * Depends on: ./clustering-illusion-grids.js (pattern generation and measurement).
 * No Plotly, no canvas: the 10x10 grids are plain DOM cells, so a whole grid can be a
 * single accessible <button> and the fade transitions are ordinary CSS opacity.
 *
 * DOM ids used: ci-tab-quiz, ci-tab-explore, ci-panel-quiz, ci-panel-explore,
 *   ci-pick-0..2 (+ ci-grid-0..2, ci-reveal-0..2), ci-quiz-box, ci-correct, ci-rounds,
 *   ci-new-patterns, ci-reset, ci-explore-grid, ci-slider, ci-slider-value,
 *   ci-explore-box, ci-explore-observed, ci-new-sample, ci-conclusion
 *
 * Loaded by: src/pages/clustering-illusion.astro. The page's markup exists before this
 * module runs, so it builds the grids and draws the first round immediately.
 *
 * ----------------------------------------------------------------------------------
 * WHAT THIS EXHIBIT SHOWS
 *
 * Random does not mean evenly spread. Genuinely independent randomness produces clumps
 * and gaps, and a pattern that actively avoids clumps contains structure of its own.
 *
 * Two modes share one compact region (the interactive never grows downward):
 *   1. Spot the Random Pattern: three grids with the same 50 filled / 50 empty cells,
 *      one made by an unadjusted random shuffle, one with extra clumping and one with
 *      extra dispersion. The visitor picks the one they think was generated at random.
 *      The test comes BEFORE the explanation, so it reveals the visitor's own intuition.
 *   2. Explore Clumping: one larger grid and a slider from 25% to 75% neighbor
 *      alternation, with 50% labeled "Independent". Moving away from 50% in EITHER
 *      direction adds structure.
 *
 * ----------------------------------------------------------------------------------
 * RESEARCH NOTES (see docs/references.md for full citations)
 *
 * Falk & Konold (1997): people identify randomness with too much alternation, and rate
 * over-alternating patterns as especially random. Their own aggregated data across three
 * studies (N=491) puts peak apparent-randomness ratings at p(A) = 0.6-0.7, not at 0.5.
 * Wilke et al. (2015) adapted Falk's spatial paradigm into the 10x10, 50/50 grid with
 * p(A) = 0.30 / 0.50 / 0.70 used here. Bertamini et al. (2016): spatial configuration changes
 * judged clustering and numerosity, so every grid keeps identical size, count and
 * styling and only the arrangement differs. van der Wal et al. (2018): clustered,
 * co-occurring events can encourage perceived causal connection. That paper does not
 * study miracle belief, so nothing on this page claims the clustering illusion explains
 * it; the wording is limited to "clusters can feel connected, and chance produces them".
 *
 * Every visitor-facing message below is written to describe what the visitor chose and
 * to cite findings cautiously. Nothing claims the site has diagnosed a bias, that
 * "most people" choose a given pattern, that clusters prove nothing, or that random
 * patterns never look even.
 *
 * ----------------------------------------------------------------------------------
 * MOTION RULES
 *
 * Whenever a whole new sample is generated, the old grid(s) fade out, the data is
 * replaced while invisible, and the new grid(s) fade in. Cells never move, slide or
 * shuffle, because any such animation would suggest the same squares were rearranged
 * rather than a new realization drawn. prefers-reduced-motion skips the fades entirely.
 */

import {
    CELL_COUNT,
    FILLED_COUNT,
    makePattern,
    makeSampleAtPercent,
    shuffleInPlace
} from './clustering-illusion-grids.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Length of each half of a fade (out, then in). Matches the .ci-fade CSS transition. */
const FADE_MS = 180;

const LETTERS = ['A', 'B', 'C'];
const TYPE_LABEL = {
    clustered: 'Extra clustering',
    random: 'Random',
    dispersed: 'Extra dispersion'
};

// Thresholds for the adaptive quiz messages. Not specified numerically by the design
// document beyond the dispersed rule, so they are gathered here to be tuned in one place.
const MIN_ROUNDS_FOR_ADAPTIVE = 3;       // "after at least 3 answered rounds"
const DISPERSED_RATE_THRESHOLD = 2 / 3;  // ...at least 2/3 of rounds, OR
const DISPERSED_COUNT_THRESHOLD = 3;     // ...at least 3 times in total
const HIGH_CORRECT_RATE = 2 / 3;         // what counts as a "high correct rate"
const SYNTHESIS_ROUNDS = 5;              // generic synthesis message from here on
const DEEP_SYNTHESIS_ROUNDS = 8;         // deeper synthesis message from here on
const SAME_PROCESS_SAMPLES = 4;          // "Same process" message: the 4th sample at 50%, i.e. 3 presses of New sample

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const pct = (rate, digits = 0) => (rate * 100).toFixed(digits);

/**
 * Fills a grid container with 100 cell <span>s (once) and returns them in row-major
 * order. Cells are created once and re-colored on every sample, never rebuilt.
 */
function buildCells(gridEl) {
    const cells = [];
    for (let i = 0; i < CELL_COUNT; i++) {
        const cell = document.createElement('span');
        cell.className = 'ci-cell';
        gridEl.appendChild(cell);
        cells.push(cell);
    }
    return cells;
}

/** Colors a grid's cells from a pattern. Filled/empty is carried by luminance, not hue. */
function paintCells(cellEls, cells) {
    for (let i = 0; i < CELL_COUNT; i++) {
        cellEls[i].dataset.filled = cells[i] ? '1' : '0';
    }
}

/**
 * Sets a feedback box's message and briefly flashes the box when the text actually
 * changed. The flash is a CSS animation restarted by removing and re-adding its class
 * (with a forced reflow between); prefers-reduced-motion disables it in CSS.
 */
function setMessage(boxEl, html, { flash = true } = {}) {
    const msgEl = boxEl.querySelector('.ci-msg');
    if (msgEl.innerHTML === html) return;
    msgEl.innerHTML = html;
    if (!flash) return;
    boxEl.classList.remove('ci-flash');
    void boxEl.offsetWidth; // force reflow so the animation can restart
    boxEl.classList.add('ci-flash');
}

/**
 * Creates a fade-out / replace / fade-in helper for one region of the page.
 *
 * `getEls` returns the elements to fade; `apply` does the work while they are invisible.
 * Each region gets its own helper (and its own token), so a slider drag that fires many
 * changes in a row only ever applies the LAST requested swap: a pending swap that has
 * been superseded silently drops out, and `apply` reads the latest state when it runs.
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
            if (myToken !== token) return; // a newer swap took over
            apply();
            // Removing the attribute in the same frame as the content change is enough:
            // the elements have been fully transparent for FADE_MS, so the new content
            // is first painted at opacity 0 and then fades in.
            getEls().forEach((el) => el.removeAttribute('data-faded'));
        }, FADE_MS);
    };
}

// ---------------------------------------------------------------------------
// Tabs (WAI-ARIA tabs pattern: click, plus Left/Right/Home/End on the tab list)
// ---------------------------------------------------------------------------

const tabs = [
    { tab: $('ci-tab-quiz'), panel: $('ci-panel-quiz') },
    { tab: $('ci-tab-explore'), panel: $('ci-panel-explore') }
];

function selectTab(index, { focus = false } = {}) {
    tabs.forEach((t, i) => {
        const on = i === index;
        t.tab.setAttribute('aria-selected', String(on));
        t.tab.tabIndex = on ? 0 : -1;
        t.panel.hidden = !on;
    });
    if (focus) tabs[index].tab.focus();
}

tabs.forEach((t, i) => {
    t.tab.addEventListener('click', () => selectTab(i));
    t.tab.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        if (next !== null) {
            event.preventDefault();
            selectTab(next, { focus: true });
        }
    });
});

// The closing statement stays hidden until the visitor has interacted with either tab.
let hasInteracted = false;
function markInteracted() {
    if (hasInteracted) return;
    hasInteracted = true;
    $('ci-conclusion').hidden = false;
}

// ===========================================================================
// TAB 1: Spot the Random Pattern
// ===========================================================================

const quizBox = $('ci-quiz-box');
const quizPickEls = [0, 1, 2].map((i) => $(`ci-pick-${i}`));
const quizGridEls = [0, 1, 2].map((i) => $(`ci-grid-${i}`));
const quizRevealEls = [0, 1, 2].map((i) => $(`ci-reveal-${i}`));
const quizCellEls = quizGridEls.map(buildCells);
const newPatternsBtn = $('ci-new-patterns');
const resetBtn = $('ci-reset');

/**
 * Tab 1 state. Survives tab switches because the panel is only hidden, never rebuilt.
 * (A round's correctness is quiz.randomSelections; there is no separate "correct" field
 * because the two would always be equal.)
 */
const quiz = {
    patterns: [],          // three Pattern objects, in display order A, B, C
    randomIndex: 0,        // which display position holds the independent pattern
    selectedIndex: null,   // the visitor's pick this round
    answered: false,
    rounds: 0,
    clusteredSelections: 0,
    dispersedSelections: 0,
    randomSelections: 0
};

/** Draws a fresh round: one pattern of each type, in a random order of A / B / C. */
function drawQuizRound() {
    const types = shuffleInPlace(['clustered', 'random', 'dispersed']);
    quiz.patterns = types.map((type) => makePattern(type));
    quiz.randomIndex = types.indexOf('random');
    quiz.selectedIndex = null;
    quiz.answered = false;
}

const QUIZ_INITIAL_MESSAGE =
    `<strong>Which one looks random to you?</strong> All three contain exactly ${FILLED_COUNT} filled and ${CELL_COUNT - FILLED_COUNT} empty squares.`;

/** Paints the three grids and clears any reveal state. Runs at the start of each round. */
function renderQuizRound() {
    quiz.patterns.forEach((pattern, i) => {
        paintCells(quizCellEls[i], pattern.cells);
        quizPickEls[i].className = 'ci-pick';
        quizPickEls[i].setAttribute('aria-label', `Pattern ${LETTERS[i]}`);
        quizPickEls[i].setAttribute('aria-pressed', 'false');
        quizPickEls[i].setAttribute('aria-disabled', 'false');
        quizRevealEls[i].innerHTML = '';
    });
    newPatternsBtn.disabled = true;
    renderQuizScore();
}

/** Shows what each grid really was. Never relies on color alone (text, check mark, border). */
function renderQuizReveal() {
    quiz.patterns.forEach((pattern, i) => {
        const isSelected = i === quiz.selectedIndex;
        const isRandom = pattern.type === 'random';
        const label = TYPE_LABEL[pattern.type];

        quizPickEls[i].classList.toggle('ci-selected', isSelected);
        quizPickEls[i].classList.toggle('ci-random', isRandom);
        quizPickEls[i].setAttribute('aria-pressed', String(isSelected));
        quizPickEls[i].setAttribute('aria-disabled', 'true');
        quizPickEls[i].setAttribute(
            'aria-label',
            `Pattern ${LETTERS[i]}: ${label}${isRandom ? ', the randomly generated pattern' : ''}${isSelected ? '. Your choice' : ''}`
        );

        // Text is authored here (no visitor input), so innerHTML is safe.
        quizRevealEls[i].innerHTML =
            (isSelected ? `<span class="ci-tag-choice">Your choice</span>` : '') +
            `<span class="ci-tag-type">${isRandom ? '&#10003; ' : ''}${label}</span>` +
            `<span class="ci-tag-rate">${pct(pattern.observedAlternation)}% neighbor alternation</span>`;
    });
}

function renderQuizScore() {
    $('ci-correct').textContent = quiz.randomSelections;
    $('ci-rounds').textContent = quiz.rounds;
    resetBtn.disabled = quiz.rounds === 0;
}

// --- Quiz feedback copy ---------------------------------------------------
// Wording follows the design document. Kept as one table so the copy can be reviewed
// and edited without touching the logic below.
const QUIZ_MESSAGES = {
    correct:
        `<strong>Yes—that one was generated at random.</strong> Notice that random did not mean perfectly even: small clumps and gaps appeared naturally.`,
    wrongDispersed: (letter) =>
        `<strong>You chose the more evenly dispersed pattern.</strong> The random one was ${letter}. Avoiding neighboring matches can make a pattern look random, but that avoidance is itself structure.`,
    wrongClustered: (letter) =>
        `<strong>That pattern contains extra clustering.</strong> The random one was ${letter}. Random patterns can clump, but this one was generated with an added tendency for neighbors to match.`,
    repeatDispersed:
        `<strong>You're often choosing the more evenly mixed pattern.</strong> Experiments on subjective randomness find a similar tendency: people often rate over-alternating patterns as especially random.`,
    repeatCorrect:
        `<strong>You're picking out the random pattern consistently.</strong> Keep watching what it still does: independent randomness continues to produce visible clumps and gaps.`,
    synthesis:
        `<strong>Across new samples, the random pattern keeps changing—but clumps keep appearing.</strong> Randomness has no rule requiring events to spread themselves evenly.`,
    deepSynthesis:
        `<strong>The key distinction is independence, not neatness.</strong> Too much clustering adds structure, but so does too much alternation.`
};

/**
 * Chooses the ONE message shown for the answer just given. Rules are checked in this
 * order and the first match wins:
 *
 *   1. Picked the dispersed pattern, and that has become a habit -> repeat-dispersed.
 *   2. Picked the random pattern, 8+ rounds in  -> deeper synthesis.
 *   3. Picked the random pattern, 5+ rounds in  -> generic synthesis.
 *   4. Picked the random pattern, 3+ rounds in with a high correct rate -> repeat-correct.
 *   5. Picked the random pattern -> the plain "Yes" message.
 *   6. Picked the dispersed pattern -> the dispersed explanation.
 *   7. Picked the clustered pattern -> the clustered explanation.
 *
 * Wrong answers keep their own explanation (rules 6 and 7) rather than being replaced by
 * a synthesis message, because those messages name which position held the random
 * pattern. Only rule 1 overrides them, and only when the visitor's own repeated choices
 * are the more useful thing to reflect back.
 */
function quizAnswerMessage() {
    const picked = quiz.patterns[quiz.selectedIndex].type;
    const letter = LETTERS[quiz.randomIndex];
    const rounds = quiz.rounds;

    if (picked === 'dispersed' && rounds >= MIN_ROUNDS_FOR_ADAPTIVE &&
        (quiz.dispersedSelections / rounds >= DISPERSED_RATE_THRESHOLD ||
         quiz.dispersedSelections >= DISPERSED_COUNT_THRESHOLD)) {
        return QUIZ_MESSAGES.repeatDispersed;
    }
    if (picked === 'random') {
        if (rounds >= DEEP_SYNTHESIS_ROUNDS) return QUIZ_MESSAGES.deepSynthesis;
        if (rounds >= SYNTHESIS_ROUNDS) return QUIZ_MESSAGES.synthesis;
        if (rounds >= MIN_ROUNDS_FOR_ADAPTIVE && quiz.randomSelections / rounds >= HIGH_CORRECT_RATE) {
            return QUIZ_MESSAGES.repeatCorrect;
        }
        return QUIZ_MESSAGES.correct;
    }
    return picked === 'dispersed'
        ? QUIZ_MESSAGES.wrongDispersed(letter)
        : QUIZ_MESSAGES.wrongClustered(letter);
}

/** The visitor tapped a grid. */
function chooseQuizPattern(index) {
    if (quiz.answered) return; // choices are locked until New patterns
    quiz.answered = true;
    quiz.selectedIndex = index;
    quiz.rounds++;

    const picked = quiz.patterns[index].type;
    if (picked === 'random') quiz.randomSelections++;
    else if (picked === 'dispersed') quiz.dispersedSelections++;
    else quiz.clusteredSelections++;

    renderQuizReveal();
    renderQuizScore();
    setMessage(quizBox, quizAnswerMessage());
    newPatternsBtn.disabled = false;
    markInteracted();
}

const quizFader = createFader(() => quizGridEls);

/** Replaces the current round with a fresh one (fade out, swap, fade in). */
function startNewQuizRound() {
    // Lock immediately so a tap during the fade-out can't answer the outgoing round.
    quiz.answered = true;
    newPatternsBtn.disabled = true;
    quizFader(() => {
        drawQuizRound();
        renderQuizRound();
        setMessage(quizBox, QUIZ_INITIAL_MESSAGE);
    });
}

quizPickEls.forEach((btn, i) => btn.addEventListener('click', () => chooseQuizPattern(i)));
newPatternsBtn.addEventListener('click', startNewQuizRound);

resetBtn.addEventListener('click', () => {
    quiz.rounds = 0;
    quiz.randomSelections = 0;
    quiz.dispersedSelections = 0;
    quiz.clusteredSelections = 0;
    renderQuizScore(); // update the score right away rather than after the fade
    startNewQuizRound();
});

// First round.
drawQuizRound();
renderQuizRound();
setMessage(quizBox, QUIZ_INITIAL_MESSAGE, { flash: false });

// ===========================================================================
// TAB 2: Explore Clumping
// ===========================================================================

const exploreBox = $('ci-explore-box');
const exploreGridEl = $('ci-explore-grid');
const exploreCellEls = buildCells(exploreGridEl);
const sliderEl = $('ci-slider');
const sliderValueEl = $('ci-slider-value');
const observedEl = $('ci-explore-observed');

/** Tab 2 state. Remembered across tab switches for the life of the page. */
const explore = {
    sliderTarget: 50,   // whole-number percent, 25 to 75 in steps of 5
    sample: null,       // the Pattern currently displayed
    sampleCount: 1      // samples drawn at the current setting (resets when the slider moves)
};

const EXPLORE_MESSAGES = {
    strongClump:
        `<strong>Extra clustering.</strong> Neighboring cells are more likely to match, so larger patches form more often.`,
    moderateClump:
        `<strong>Some extra clustering.</strong> Neighbors match more often than they would around the independent midpoint.`,
    independent:
        `<strong>Independent random arrangement.</strong> There is no added rule making neighboring cells match or alternate. Notice that clumps still appear naturally.`,
    sameProcess:
        `<strong>Same process, different appearance.</strong> Every sample was generated the same way. Randomness describes the process—not one particular visual pattern.`,
    slightDispersion:
        `<strong>A little extra dispersion.</strong> Neighboring cells are being encouraged to differ more often.`,
    overAlternating:
        `<strong>More evenly mixed.</strong> Patterns around this level of alternation have received especially high "randomness" ratings in experiments—even though they alternate more than the independent condition.`,
    strongDispersion:
        `<strong>Extra dispersion.</strong> Neighboring matches are being suppressed, producing a more checkerboard-like pattern. Avoiding clumps this strongly is itself a pattern.`
};

/** The message for the current slider setting (see the ranges in the design document). */
function exploreMessage() {
    const t = explore.sliderTarget;
    if (t <= 35) return EXPLORE_MESSAGES.strongClump;
    if (t <= 45) return EXPLORE_MESSAGES.moderateClump;
    if (t === 50) {
        return explore.sampleCount >= SAME_PROCESS_SAMPLES
            ? EXPLORE_MESSAGES.sameProcess
            : EXPLORE_MESSAGES.independent;
    }
    if (t === 55) return EXPLORE_MESSAGES.slightDispersion;
    if (t <= 65) return EXPLORE_MESSAGES.overAlternating;
    return EXPLORE_MESSAGES.strongDispersion;
}

/** The label above the slider, and its spoken equivalent for assistive tech. */
function renderSliderLabel() {
    const t = explore.sliderTarget;
    const name = t === 50 ? ' (Independent)' : '';
    sliderValueEl.textContent = `${t}%${name}`;
    sliderEl.setAttribute(
        'aria-valuetext',
        t === 50 ? '50 percent, independent'
            : t < 50 ? `${t} percent, more clumped`
            : `${t} percent, more dispersed`
    );
}

/** Draws the current sample and its measured alternation. */
function renderExploreSample() {
    const observed = explore.sample.observedAlternation;
    paintCells(exploreCellEls, explore.sample.cells);
    const observedText = `Observed neighbor alternation: ${pct(observed, 1)}%`;
    observedEl.textContent =
        explore.sliderTarget === 50 ? `${observedText}. Individual random samples vary.` : `${observedText}.`;
    exploreGridEl.setAttribute(
        'aria-label',
        `Sample pattern: ${FILLED_COUNT} of ${CELL_COUNT} squares filled, ${pct(observed, 1)} percent neighbor alternation`
    );
    setMessage(exploreBox, exploreMessage());
}

const exploreFader = createFader(() => [exploreGridEl]);

/**
 * Draws a NEW sample at the current setting. Used both when the slider moves and for
 * "New sample". At exactly 50% this is the plain balanced shuffle, never a tuned grid.
 */
function drawExploreSample() {
    explore.sample = makeSampleAtPercent(explore.sliderTarget);
    renderExploreSample();
}

// The native range input has step=5, so 'input' only fires when the value lands on a
// new position; the equality check is a second guard against redundant regeneration.
sliderEl.addEventListener('input', () => {
    const value = parseInt(sliderEl.value, 10);
    if (value === explore.sliderTarget) return;
    explore.sliderTarget = value;
    explore.sampleCount = 1;
    renderSliderLabel(); // the label follows the thumb immediately; the grid follows after the fade
    exploreFader(drawExploreSample);
    markInteracted();
});

$('ci-new-sample').addEventListener('click', () => {
    explore.sampleCount++;
    exploreFader(drawExploreSample);
    markInteracted();
});

// First sample: the independent condition, shown without a flash on load.
renderSliderLabel();
explore.sample = makeSampleAtPercent(explore.sliderTarget);
paintCells(exploreCellEls, explore.sample.cells);
observedEl.textContent =
    `Observed neighbor alternation: ${pct(explore.sample.observedAlternation, 1)}%. Individual random samples vary.`;
exploreGridEl.setAttribute(
    'aria-label',
    `Sample pattern: ${FILLED_COUNT} of ${CELL_COUNT} squares filled, ${pct(explore.sample.observedAlternation, 1)} percent neighbor alternation`
);
setMessage(exploreBox, exploreMessage(), { flash: false });

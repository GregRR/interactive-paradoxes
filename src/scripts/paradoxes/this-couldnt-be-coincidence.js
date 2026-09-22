/**
 * Exhibit: "This Couldn't Just Be Coincidence!" (Part 4 of the Clustering Illusion series)
 *
 * Belongs to: Group 2 (Clustering Illusions)
 * Depends on: ./coincidence-grids.js (generation, detection, placement order),
 *             ./coincidence-stats.js (exact-outcome and "at least this clustered" statistics).
 *
 * DOM ids used: tccbc-grid-left, tccbc-grid-right, tccbc-label-left, tccbc-label-right,
 *   tccbc-primary-btn, tccbc-reset-btn, tccbc-try-count, tccbc-stats-row, tccbc-stats-left,
 *   tccbc-stats-right, tccbc-explore, tccbc-scrubber, tccbc-scrubber-value,
 *   tccbc-density-slider, tccbc-density-value, tccbc-config (carries data-null-table-url),
 *   tccbc-status (visually-hidden aria-live region for screen-reader phase announcements)
 *
 * Loaded by: src/pages/this-couldnt-be-coincidence.astro. The page's markup (both grid
 * containers, the button, the hidden explore section) exists before this module runs.
 *
 * IMPORTANT: DOM ids and containers are position-based (left/right), never
 * random/non-random. Which logical grid (random vs. non-random) renders in which physical
 * slot is decided randomly on every generation (spec section 4, section 8, and acceptance
 * criteria section 27: "left/right assignment is randomized"). Hardcoding the random grid
 * to always appear on, say, the left would itself be a subtle, undisclosed pattern for an
 * attentive repeat visitor to notice -- exactly the kind of positional tell this exhibit is
 * about avoiding elsewhere (see the local-attraction square-placement discussion in the
 * design conversation this spec came from).
 *
 * See notes/clustering_illusion_part_4_days_of_your_life_spec(rewrite).md for the full
 * design this implements. Section references in comments below point there.
 *
 * ----------------------------------------------------------------------------------
 * WHAT THIS EXHIBIT SHOWS (spec section 1)
 *
 * A striking local pattern -- a small, square, "deliberate-looking" cluster of black
 * cells -- can come from a genuinely random process or from a genuinely non-random one,
 * and can look the same either way at first glance. Two clicks take the visitor from two
 * hidden grids to a shared matching cluster to the full picture. Then a rewind/scrub
 * control lets them replay each grid's ACTUAL construction history and watch the two
 * processes behave completely differently along the way, even though they landed on
 * similar-looking results. The visitor is shown the mechanism, not told about it.
 *
 * ----------------------------------------------------------------------------------
 * STATE MACHINE (spec section 8)
 *
 *   hidden        -- both grids fully gray. Button: "Find Clustered Events".
 *   cluster-shown -- matching cluster revealed on both grids, everything else gray.
 *                    Button: "Reveal Grid".
 *   revealed      -- full grids visible, labels shown, try-count shown, statistics shown.
 *                    Exploration mode (scrubber + density control) becomes available.
 *
 * There is no staged multi-round reveal (that idea was explicitly dropped -- spec section
 * 4 and section 25 explain why the rewind scrubber replaces it more convincingly than
 * repeated teased reveals would).
 */

import {
    GRID_SIZE, CELL_COUNT, DEFAULT_BLACK_CELLS, DEFAULT_LAMBDA,
    MIN_BLACK_CELLS, MAX_BLACK_CELLS,
    findQualifyingRandomGrid, generateLocalAttractionGrid,
    analyzeClusters, pickPrimaryCluster, cellsInSquare
} from './coincidence-grids.js';
import { formatExactOutcomeProbability, naturalFrequencyPhrase } from './coincidence-stats.js';

// ---------------------------------------------------------------------------
// Small helpers (mirrors the $/prefersReducedMotion convention used across the site)
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fills a grid container with CELL_COUNT cell <span>s once; returns them row-major. Cells
 *  are created once and restyled repeatedly, never rebuilt -- mirrors
 *  clustering-illusion.js's buildCells(). */
function buildCells(gridEl) {
    const cells = [];
    for (let i = 0; i < CELL_COUNT; i++) {
        const cell = document.createElement('span');
        cell.className = 'tccbc-cell';
        gridEl.appendChild(cell);
        cells.push(cell);
    }
    return cells;
}

// ---------------------------------------------------------------------------
// Module-level exhibit state
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GridState
 * @property {Uint8Array} cells
 * @property {number[]} placementOrder
 * @property {ReturnType<typeof analyzeClusters>} analysis
 * @property {import('./coincidence-grids.js').SquareCluster} primaryCluster
 */

let blackCells = DEFAULT_BLACK_CELLS;
/** @type {GridState} */
let randomState;
/** @type {GridState} */
let nonRandomState;
let tryCount = 1;

/** True when the random logical grid is currently displayed in the LEFT physical slot
 *  (false means it's on the right). Re-rolled on every generatePair() call (spec section
 *  4, section 27). All rendering functions below take a "which logical state renders in
 *  which physical slot" mapping from this flag rather than assuming a fixed side. */
let randomIsOnLeft = true;

let phase = 'hidden'; // 'hidden' | 'cluster-shown' | 'revealed'

// DOM cell references, built once per physical grid container at startup (position-based,
// never re-created when left/right assignment changes -- only which STATE they render
// changes).
let leftCellEls;
let rightCellEls;

/** Incremented every time resetExhibit() runs, so an in-flight animateFullReveal() loop
 *  (a ~800ms requestAnimationFrame sequence) can tell it has been superseded and stop
 *  writing to cells instead of racing a fresh generation started by Reset. Read as a
 *  captured local ("token") inside animateFullReveal, not compared globally -- see there. */
let revealToken = 0;

/**
 * The precomputed null-distribution table (spec section 20, section 24), keyed by
 * black-cell count: { [blackCells]: { trials, counts } }. Null until the background fetch
 * (kicked off in init()) resolves. The "at least this clustered" statistic is simply
 * omitted from the stats cards until this loads -- per spec section 40, an unsupported or
 * not-yet-available number is never faked or estimated, it's just not shown yet. If the
 * fetch resolves while already in the 'revealed' phase, updateLabelsAndStats() re-runs to
 * backfill the cards with the now-available comparison.
 */
let nullTables = null;

/** Fetches and stores the precomputed null-distribution table (see build-null-tables.mjs).
 *  Never blocks the primary interaction -- the exact-outcome statistic and everything else
 *  works with or without this table; it only adds the "N of 100 comparable random grids"
 *  line once available. A fetch failure is logged and otherwise silently tolerated, for the
 *  same reason: the rest of the exhibit must keep working without it. */
async function loadNullTables() {
    const configEl = $('tccbc-config');
    const url = configEl && configEl.dataset.nullTableUrl;
    if (!url) return;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
        const data = await response.json();
        nullTables = data.tables;
        if (phase === 'revealed') updateLabelsAndStats();
    } catch (err) {
        // eslint-disable-next-line no-console -- worth surfacing during development; the
        // page degrades gracefully (see doc comment above) so this is not fatal.
        console.warn('Part 4: could not load the precomputed null-distribution table; the "at least this clustered" comparison will be unavailable.', err);
    }
}

// ---------------------------------------------------------------------------
// Grid generation (spec section 9)
// ---------------------------------------------------------------------------

/**
 * Generates both logical grids fresh: the non-random side via the local-attraction
 * generator (with its own rare repair fallback, spec section 12), and the random side via
 * findQualifyingRandomGrid, which tries fresh independent draws until one qualifies and
 * records how many attempts that took (spec section 9). Also re-rolls which physical side
 * (left/right) each logical grid will render in.
 *
 * Called once at page load and again whenever the density control changes (spec section
 * 16) -- never in response to the "Find Clustered Events" click itself, so that click has
 * no generation delay.
 */
function generatePair(newBlackCells) {
    blackCells = newBlackCells;

    const nonRandom = generateLocalAttractionGrid({ blackCells, lambda: DEFAULT_LAMBDA });
    const nonRandomAnalysis = analyzeClusters(nonRandom.cells, GRID_SIZE);
    nonRandomState = {
        cells: nonRandom.cells,
        placementOrder: nonRandom.placementOrder,
        analysis: nonRandomAnalysis,
        primaryCluster: pickPrimaryCluster(nonRandomAnalysis)
    };

    const random = findQualifyingRandomGrid({ blackCells });
    randomState = {
        cells: random.cells,
        placementOrder: random.placementOrder,
        analysis: random.analysis,
        primaryCluster: pickPrimaryCluster(random.analysis)
    };
    tryCount = random.attempts;

    randomIsOnLeft = Math.random() < 0.5;
}

/** The logical state currently assigned to the left physical slot. */
function leftState() { return randomIsOnLeft ? randomState : nonRandomState; }
/** The logical state currently assigned to the right physical slot. */
function rightState() { return randomIsOnLeft ? nonRandomState : randomState; }

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** data-state values: 'gray' (hidden), 'white', 'black'. Kept as a data attribute (not a
 *  class toggle on color directly) so CSS owns the actual colors and can be reviewed/tuned
 *  for colorblind-safety in one place (see the <style> block in the .astro page). */
function setCellState(cellEl, state) {
    cellEl.dataset.state = state;
}

/** Renders "only the primary cluster's cells are shown, everything else gray" (phase
 *  cluster-shown, spec section 8 State 1) for one physical grid. */
function renderClusterOnly(cellEls, gridState) {
    const clusterCells = new Set(cellsInSquare(gridState.primaryCluster, GRID_SIZE));
    for (let i = 0; i < CELL_COUNT; i++) {
        setCellState(cellEls[i], clusterCells.has(i) ? 'black' : 'gray');
    }
}

/** Renders one physical grid as of a given placement-order index (0..blackCells) of its
 *  currently-assigned logical state, used both for the full reveal (index = blackCells)
 *  and the rewind scrubber (spec section 14). Cell i is black if it was placed at or before
 *  `uptoIndex` in placementOrder; everything else is white (not gray -- once the full
 *  reveal has happened, "unplaced yet" during a rewind means "we know this cell is white at
 *  that point in time", not "hidden"). */
function renderAtPlacementIndex(cellEls, gridState, uptoIndex) {
    const placedSet = new Set(gridState.placementOrder.slice(0, uptoIndex));
    for (let i = 0; i < CELL_COUNT; i++) {
        setCellState(cellEls[i], placedSet.has(i) ? 'black' : 'white');
    }
}

/** Renders both physical grids at the full-reveal state, respecting current left/right
 *  assignment. Used for exploration-mode entry points that skip the animated reveal
 *  (density regeneration, scrubber reset). */
function renderBothFull() {
    renderAtPlacementIndex(leftCellEls, leftState(), blackCells);
    renderAtPlacementIndex(rightCellEls, rightState(), blackCells);
}

/**
 * The full-grid uncovering animation (spec section 7, adapted from the original spec's
 * design): both grids clear from gray to their true state, cell-by-cell in a random,
 * independently-shuffled tile order, over ~800ms. `prefers-reduced-motion` gets an
 * immediate reveal with no animation (spec section 14's reduced-motion requirement, applied
 * here too since this is the same category of uncovering effect).
 */
function animateFullReveal(onComplete) {
    // Captured once, compared against the live revealToken on every frame below: if
    // resetExhibit() runs while this animation is still in flight, revealToken moves on and
    // this stale loop quietly stops instead of painting over the freshly-reset grids.
    const token = ++revealToken;

    if (prefersReducedMotion()) {
        renderBothFull();
        onComplete();
        return;
    }

    const order = Array.from({ length: CELL_COUNT }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    const DURATION_MS = 800;
    const STEP_MS = 16; // ~60fps
    const totalSteps = Math.ceil(DURATION_MS / STEP_MS);
    const cellsPerStep = Math.ceil(CELL_COUNT / totalSteps);

    const left = leftState();
    const right = rightState();
    const leftBlackSet = new Set(left.placementOrder.slice(0, blackCells));
    const rightBlackSet = new Set(right.placementOrder.slice(0, blackCells));

    let revealed = 0;
    function step() {
        if (token !== revealToken) return; // superseded by a Reset click; abandon this run
        const end = Math.min(revealed + cellsPerStep, CELL_COUNT);
        for (; revealed < end; revealed++) {
            const idx = order[revealed];
            setCellState(leftCellEls[idx], leftBlackSet.has(idx) ? 'black' : 'white');
            setCellState(rightCellEls[idx], rightBlackSet.has(idx) ? 'black' : 'white');
        }
        if (revealed < CELL_COUNT) {
            requestAnimationFrame(step);
        } else {
            onComplete();
        }
    }
    requestAnimationFrame(step);
}

/** Outlines a physical grid's primary cluster cells (persists through and after the full
 *  reveal, per spec section 8 State 2's "the originally-revealed cluster's outline is
 *  retained"). */
function applyClusterOutline(cellEls, gridState) {
    const clusterCells = new Set(cellsInSquare(gridState.primaryCluster, GRID_SIZE));
    for (let i = 0; i < CELL_COUNT; i++) {
        cellEls[i].classList.toggle('tccbc-cell-outlined', clusterCells.has(i));
    }
}

function applyBothOutlines() {
    applyClusterOutline(leftCellEls, leftState());
    applyClusterOutline(rightCellEls, rightState());
}

// ---------------------------------------------------------------------------
// Smooth section reveal (UI pass, 2026-09-22): the exploration controls and stats cards
// only exist once a grid has been fully revealed. Toggling `hidden` straight to false makes
// them pop into existence and shove everything below them down instantly -- jarring,
// especially since these are exactly the sections a visitor most wants to keep looking at
// right after the grids. These two helpers instead grow the section open with a CSS
// height/opacity transition (see .tccbc-reveal-section in the .astro page's <style> block).
// ---------------------------------------------------------------------------

/** Reveals `el` with a smooth grow-and-fade transition. `el` must start with the `hidden`
 *  attribute in markup and no tccbc-reveal-section class (that class is added here, not in
 *  markup, specifically so it's never present at the same time as `hidden` on a rendered
 *  frame -- see the class's doc comment in the .astro page for why that ordering matters). */
function openRevealSection(el) {
    el.classList.add('tccbc-reveal-section');
    el.hidden = false;
    el.inert = false;
    // Forces the browser to compute and commit the collapsed (0fr / opacity 0) starting
    // state before the next line changes it, which is what makes the CSS transition
    // actually animate rather than jumping straight to its end state.
    void el.offsetHeight;
    el.classList.add('tccbc-reveal-open');
}

/** Collapses `el` back to hidden immediately (no closing animation -- Reset is meant to
 *  restart right away, not linger), and strips the reveal classes so the next
 *  openRevealSection() call starts from a clean state. */
function closeRevealSection(el) {
    el.classList.remove('tccbc-reveal-open', 'tccbc-reveal-section');
    el.inert = true;
    el.hidden = true;
}

// ---------------------------------------------------------------------------
// Statistics / labels / try-count text (spec sections 15, 18-20)
// ---------------------------------------------------------------------------

function squareCountDescription(analysis) {
    const n2 = analysis.countsBySize[2] || 0;
    const largerSizes = Object.keys(analysis.countsBySize)
        .map(Number)
        .filter((s) => s > 2)
        .sort((a, b) => a - b);

    if (largerSizes.length === 0) {
        return n2 === 1 ? '1 solid 2×2 square' : `${n2} solid 2×2 squares`;
    }
    const largest = largerSizes[largerSizes.length - 1];
    return `${analysis.squares.length} solid squares (largest: ${largest}×${largest})`;
}

function renderStats(containerEl, label, gridState) {
    containerEl.innerHTML = '';

    const heading = document.createElement('p');
    heading.className = 'tccbc-stats-heading';
    heading.textContent = label;
    containerEl.appendChild(heading);

    const whatYouSee = document.createElement('p');
    whatYouSee.className = 'tccbc-stats-line';
    whatYouSee.innerHTML = `<strong>What you can see:</strong> ${squareCountDescription(gridState.analysis)}`;
    containerEl.appendChild(whatYouSee);

    // "At least this clustered" (spec section 20, section 35) -- the primary inferential
    // statistic, distinguished from the exact-outcome probability below it. Deliberately
    // applied to BOTH cards using the same random-model null distribution, including for
    // the non-random grid: the null answers "how clustered would chance alone produce,"
    // which is the right ruler for judging either observed grid against (spec section 47's
    // example layout does the same). Only rendered once the precomputed null table has
    // loaded (loadNullTables(), module state above); omitted rather than faked if it
    // hasn't, or if this density isn't in the table.
    const distribution = nullTables && nullTables[blackCells];
    if (distribution) {
        const compare = document.createElement('p');
        compare.className = 'tccbc-stats-line';
        const phrase = naturalFrequencyPhrase(distribution, gridState.analysis.squares.length);
        compare.innerHTML = `<strong>Compared with random grids:</strong> ${phrase}.`;
        containerEl.appendChild(compare);
    }

    const exact = document.createElement('p');
    exact.className = 'tccbc-stats-line tccbc-stats-secondary';
    exact.innerHTML = `<strong>This exact grid:</strong> ${formatExactOutcomeProbability(GRID_SIZE, blackCells)}. Every exact arrangement is equally unlikely, though, and one of them had to occur.`;
    containerEl.appendChild(exact);
}

/** Updates labels, try-count copy, and both stats cards to match the CURRENT left/right
 *  assignment. Must be called after any regeneration, since randomIsOnLeft can change.
 *
 *  Labels are deliberately just "RANDOM" / "NON-RANDOM" -- short and equal length, so
 *  neither one wraps to a second line and pushes its grid out of vertical alignment with
 *  the other. The process name (local attraction) is introduced in the "How these grids
 *  are made" section instead, where there's room to actually explain what it means. */
function updateLabelsAndStats() {
    $('tccbc-label-left').textContent = randomIsOnLeft ? 'RANDOM' : 'NON-RANDOM';
    $('tccbc-label-right').textContent = randomIsOnLeft ? 'NON-RANDOM' : 'RANDOM';

    $('tccbc-try-count').textContent =
        tryCount === 1
            ? 'It took 1 try to find a day with a pattern like this.'
            : `It took ${tryCount} tries to find a day with a pattern like this.`;

    renderStats($('tccbc-stats-left'), randomIsOnLeft ? 'RANDOM' : 'NON-RANDOM', leftState());
    renderStats($('tccbc-stats-right'), randomIsOnLeft ? 'NON-RANDOM' : 'RANDOM', rightState());
}

// ---------------------------------------------------------------------------
// Exploration mode: rewind/scrub (spec section 14) + density control (spec section 16)
// ---------------------------------------------------------------------------

function setScrubPosition(index) {
    const clamped = Math.max(0, Math.min(blackCells, index));
    renderAtPlacementIndex(leftCellEls, leftState(), clamped);
    renderAtPlacementIndex(rightCellEls, rightState(), clamped);
    const scrubberEl = $('tccbc-scrubber');
    scrubberEl.value = String(clamped);
    const text = `${clamped} of ${blackCells} cells placed`;
    $('tccbc-scrubber-value').textContent = text;
    // aria-valuetext overrides what a screen reader announces for this control's value, so
    // dragging it is announced as "23 of 80 cells placed" rather than just the bare number
    // 23 the native range input would otherwise report.
    scrubberEl.setAttribute('aria-valuetext', text);
}

/** Sets the scrubber's range/value/label to match the current grids, and binds its `input`
 *  listener exactly once. Reset lets a visitor go hidden -> revealed more than once per page
 *  load (previously impossible without a full reload), so enterRevealed() now calls this
 *  function on every full reveal -- the dataset.wired guard keeps that from stacking up a
 *  fresh listener each time; the listener itself reads live module state (leftState(),
 *  blackCells, ...) on every fire, so one binding stays correct across any number of resets. */
function wireScrubber() {
    const scrubberEl = $('tccbc-scrubber');
    scrubberEl.min = '0';
    scrubberEl.max = String(blackCells);
    scrubberEl.value = String(blackCells);
    scrubberEl.setAttribute('aria-valuetext', `${blackCells} of ${blackCells} cells placed`);
    if (!scrubberEl.dataset.wired) {
        scrubberEl.dataset.wired = 'true';
        scrubberEl.addEventListener('input', () => {
            setScrubPosition(Number(scrubberEl.value));
        });
    }
}

/** Same one-time-binding pattern as wireScrubber() above, and for the same reason. */
function wireDensityControl() {
    const sliderEl = $('tccbc-density-slider');
    sliderEl.min = String(MIN_BLACK_CELLS);
    sliderEl.max = String(MAX_BLACK_CELLS);
    sliderEl.value = String(blackCells);
    sliderEl.setAttribute('aria-valuetext', `${blackCells} black squares`);
    $('tccbc-density-value').textContent = String(blackCells);

    if (!sliderEl.dataset.wired) {
        sliderEl.dataset.wired = 'true';
        sliderEl.addEventListener('change', () => {
            const newDensity = Number(sliderEl.value);
            $('tccbc-density-value').textContent = String(newDensity);
            sliderEl.setAttribute('aria-valuetext', `${newDensity} black squares`);
            regenerateForExploration(newDensity);
        });
    }
}

/** Density control's "generate a new pair at this density" action (spec section 16). Only
 *  available once already in exploration mode; replaces the current scrub history rather
 *  than affecting any prior scrubber position. Re-rolls left/right assignment along with
 *  everything else, since this is a fresh generatePair() call. */
function regenerateForExploration(newDensity) {
    generatePair(newDensity);
    renderBothFull();
    applyBothOutlines();
    updateLabelsAndStats();

    const scrubberEl = $('tccbc-scrubber');
    scrubberEl.max = String(blackCells);
    scrubberEl.value = String(blackCells);
    const scrubText = `${blackCells} of ${blackCells} cells placed`;
    $('tccbc-scrubber-value').textContent = scrubText;
    scrubberEl.setAttribute('aria-valuetext', scrubText);
}

// ---------------------------------------------------------------------------
// Primary interaction sequence (spec section 8)
// ---------------------------------------------------------------------------

/** Announces a phase transition through the visually-hidden aria-live region (spec section
 *  59's accessibility requirement: screen-reader visitors need the same "something just
 *  changed" signal sighted visitors get from the animated reveal). Also updates each
 *  physical grid's role="img" aria-label to describe its CURRENT state, so a screen-reader
 *  visitor who tabs directly to a grid (rather than reading the page in order) still gets
 *  an accurate description instead of the page-load default. */
function announcePhase(message, leftGridLabel, rightGridLabel) {
    const statusEl = $('tccbc-status');
    if (statusEl) statusEl.textContent = message;
    $('tccbc-grid-left').setAttribute('aria-label', leftGridLabel);
    $('tccbc-grid-right').setAttribute('aria-label', rightGridLabel);
}

function enterClusterShown() {
    phase = 'cluster-shown';
    renderClusterOnly(leftCellEls, leftState());
    renderClusterOnly(rightCellEls, rightState());
    applyBothOutlines();

    const btn = $('tccbc-primary-btn');
    btn.textContent = 'Reveal Grid';

    const describeCluster = (gridState) => {
        const sq = gridState.primaryCluster;
        return `showing one solid ${sq.size}-by-${sq.size} black square; the rest of the grid is still hidden`;
    };
    announcePhase(
        'Both grids now show a matching cluster. The rest of each grid is still hidden.',
        `First hidden grid of events, ${describeCluster(leftState())}`,
        `Second hidden grid of events, ${describeCluster(rightState())}`
    );
}

function enterRevealed() {
    phase = 'revealed';
    const btn = $('tccbc-primary-btn');
    btn.disabled = true; // spent its purpose; exploration controls take over

    animateFullReveal(() => {
        applyBothOutlines();
        $('tccbc-label-left').hidden = false;
        $('tccbc-label-right').hidden = false;
        updateLabelsAndStats();

        // Stats cards and exploration controls both grow open together (see the helpers'
        // doc comments above); wiring the controls' listeners happens after opening the
        // section, though it doesn't strictly need to -- the element is already un-hidden
        // by the time wireScrubber()/wireDensityControl() run, which is all they require.
        openRevealSection($('tccbc-stats-row'));
        openRevealSection($('tccbc-explore'));
        wireScrubber();
        wireDensityControl();

        const leftLabel = randomIsOnLeft ? 'random' : 'non-random, local-attraction';
        const rightLabel = randomIsOnLeft ? 'non-random, local-attraction' : 'random';
        announcePhase(
            'Both grids are now fully revealed, with labels and statistics. ' +
            'Rewind and density controls are now available below.',
            `First grid of events, fully revealed, generated by the ${leftLabel} process`,
            `Second grid of events, fully revealed, generated by the ${rightLabel} process`
        );
    });
}

function handlePrimaryButtonClick() {
    if (phase === 'hidden') enterClusterShown();
    else if (phase === 'cluster-shown') enterRevealed();
}

/**
 * Starts over completely, without requiring a page reload: draws a brand-new pair of grids
 * at the default density (matching what a real reload would do, rather than only what a
 * reload plus re-adjusting the density slider would do), returns to the initial hidden
 * phase, and clears every piece of revealed state (labels, try-count, stats, exploration
 * controls, cluster outlines). Always available, including before the first click -- it
 * doubles as a quick way to draw a different pair of days without committing to "Find
 * Clustered Events" first.
 */
function resetExhibit() {
    revealToken++; // invalidates any in-flight animateFullReveal() loop, see its doc comment
    generatePair(DEFAULT_BLACK_CELLS);
    phase = 'hidden';

    for (let i = 0; i < CELL_COUNT; i++) {
        setCellState(leftCellEls[i], 'gray');
        setCellState(rightCellEls[i], 'gray');
        leftCellEls[i].classList.remove('tccbc-cell-outlined');
        rightCellEls[i].classList.remove('tccbc-cell-outlined');
    }

    $('tccbc-label-left').hidden = true;
    $('tccbc-label-right').hidden = true;
    $('tccbc-try-count').textContent = '';
    $('tccbc-stats-left').innerHTML = '';
    $('tccbc-stats-right').innerHTML = '';
    closeRevealSection($('tccbc-stats-row'));
    closeRevealSection($('tccbc-explore'));

    const btn = $('tccbc-primary-btn');
    btn.disabled = false;
    btn.textContent = 'Find Clustered Events';

    announcePhase(
        'Reset. Both grids are hidden again, ready for a new search.',
        'First hidden grid of events, not yet revealed',
        'Second hidden grid of events, not yet revealed'
    );
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

function init() {
    const leftGridEl = $('tccbc-grid-left');
    const rightGridEl = $('tccbc-grid-right');
    leftCellEls = buildCells(leftGridEl);
    rightCellEls = buildCells(rightGridEl);

    // Both grids fully gray at startup (spec section 8 State 0), even though they are
    // already fully generated underneath -- generation happens eagerly (spec section 9) so
    // the first click has no delay, but nothing is rendered until the visitor asks for it.
    generatePair(DEFAULT_BLACK_CELLS);
    for (let i = 0; i < CELL_COUNT; i++) {
        setCellState(leftCellEls[i], 'gray');
        setCellState(rightCellEls[i], 'gray');
    }
    leftGridEl.setAttribute('aria-label', 'First hidden grid of events, not yet revealed');
    rightGridEl.setAttribute('aria-label', 'Second hidden grid of events, not yet revealed');

    $('tccbc-primary-btn').addEventListener('click', handlePrimaryButtonClick);
    $('tccbc-reset-btn').addEventListener('click', resetExhibit);

    // Fires in the background; never blocks the primary interaction (see loadNullTables's
    // doc comment above).
    loadNullTables();
}

init();

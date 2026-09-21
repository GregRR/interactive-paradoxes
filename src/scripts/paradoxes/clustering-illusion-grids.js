/**
 * The Clustering Illusion, Part 1: pattern generation and measurement.
 *
 * Belongs to: Group 2 (Clustering Illusions). Pure logic only: no DOM access, so it can be
 * read, reused by later parts of this exhibit, and tested in plain Node. The interactive
 * layer lives in clustering-illusion.js, which imports everything here.
 *
 * ----------------------------------------------------------------------------------
 * THE TASK MODEL
 *
 * Every pattern is a 10x10 grid of cells, each either filled (1) or empty (0), with
 * exactly 50 of each. Holding the count fixed means a visitor can only judge the
 * ARRANGEMENT, not the quantity (Bertamini et al., 2016, on spatial configuration
 * affecting judgments of clustering and numerosity).
 *
 * Arrangement is measured by the NEIGHBOR ALTERNATION rate, p(A) (Wilke et al., 2015,
 * describing the spatial-randomness paradigm of Falk & Konold, 1997):
 *
 *     p(A) = D / 180
 *
 * where D is the number of orthogonally adjacent cell pairs whose values differ, and
 * 180 = 90 horizontal + 90 vertical adjacent pairs in a 10x10 grid.
 *
 *     p(A) < 0.5   neighbors match more often  -> clumps / patches
 *     p(A) > 0.5   neighbors differ more often -> dispersed, checkerboard-like
 *
 * ----------------------------------------------------------------------------------
 * TWO DIFFERENT GENERATION PROCESSES (deliberately not the same routine)
 *
 *   randomBalancedGrid()  A uniform random choice of 50 of the 100 cells. Never
 *                         inspected, smoothed, or rejected for looking clumpy or even.
 *                         Its realized p(A) varies naturally from sample to sample
 *                         (centered near 0.505, since two neighbors in a balanced grid
 *                         differ with probability 2*50*50 / (100*99)).
 *
 *   targetedGrid(p)       Starts from a random balanced grid, then swaps one filled and
 *                         one empty cell at a time, keeping a swap only if it does not
 *                         move D farther from the target. Stops as soon as D is within
 *                         a small tolerance of the target.
 *
 * The independent condition must NEVER be produced by targetedGrid(0.5). That would make
 * all three quiz patterns optimized, and the demonstration would quietly compare three
 * tuned patterns instead of one random process against two structured alternatives.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const GRID_SIZE = 10;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE; // 100
export const FILLED_COUNT = CELL_COUNT / 2;      // 50 filled, 50 empty

/** Target alternation rates for the quiz's two manipulated patterns (Wilke et al., 2015). */
export const CLUSTERED_TARGET = 0.30;
export const DISPERSED_TARGET = 0.70;
/** The independent condition's nominal center. Its actual p(A) is measured, never forced. */
export const RANDOM_CENTER = 0.50;

/**
 * How close (in adjacent pairs, out of 180) a targeted grid must land. 2 pairs is about
 * +/-1.1 percentage points, inside the +/-0.01-0.02 band the design calls for.
 */
export const TOLERANCE_EDGES = 2;

/** Safety cap on swap proposals so a pathological start can never hang the page. */
export const MAX_SWAP_ATTEMPTS = 20000;

// ---------------------------------------------------------------------------
// Adjacency
// ---------------------------------------------------------------------------

/** Builds every orthogonally adjacent pair of cell indices, row-major, as [a, b]. */
function buildEdges(size) {
    const edges = [];
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const i = row * size + col;
            if (col < size - 1) edges.push([i, i + 1]);    // right neighbor
            if (row < size - 1) edges.push([i, i + size]); // neighbor below
        }
    }
    return edges;
}

export const EDGES = buildEdges(GRID_SIZE);
export const EDGE_COUNT = EDGES.length; // 180 for a 10x10 grid

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

/** D: how many adjacent pairs have one filled and one empty cell. */
export function countAlternations(cells) {
    let d = 0;
    for (let e = 0; e < EDGE_COUNT; e++) {
        if (cells[EDGES[e][0]] !== cells[EDGES[e][1]]) d++;
    }
    return d;
}

/** p(A) = D / 180, as a fraction between 0 and 1. */
export function alternationRate(cells) {
    return countAlternations(cells) / EDGE_COUNT;
}

/**
 * Wilke et al.'s configuration measure C = |p(A) - 0.5| / 0.5. Not shown to visitors;
 * kept for validating generated patterns. It only captures departure from the 0.5
 * midpoint, not every kind of visual structure.
 */
export function configurationStrength(rate) {
    return Math.abs(rate - 0.5) / 0.5;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Fisher-Yates shuffle, in place. Uniform as long as `rand` is uniform on [0, 1).
 * `rand` is a parameter so tests can pass a seeded generator; the page uses Math.random
 * so every visitor sees fresh, unrepeatable samples.
 */
export function shuffleInPlace(array, rand = Math.random) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/** A uniformly random arrangement of 50 filled and 50 empty cells. */
export function randomBalancedGrid(rand = Math.random) {
    const cells = new Uint8Array(CELL_COUNT);
    cells.fill(1, 0, FILLED_COUNT);
    return shuffleInPlace(cells, rand);
}

/**
 * A balanced grid whose alternation rate is steered toward `targetRate`.
 *
 * Hill-climbing on the gap |D - targetD|: propose swapping one random filled cell with
 * one random empty cell (which keeps the 50/50 count), and keep the swap unless it makes
 * the gap larger. Accepting ties lets the search drift across plateaus instead of
 * stalling, so different runs end in visibly different patterns rather than one
 * canonical shape. It stops the moment the gap is within TOLERANCE_EDGES, so it does not
 * keep "polishing" the pattern past what the target needs.
 *
 * Recomputing D from scratch each proposal costs 180 comparisons, which is a few
 * milliseconds for a whole grid; an incremental update would be faster but not by enough
 * to justify the extra ways to get it wrong.
 *
 * @returns {{cells: Uint8Array, alternations: number}} alternations is the final D.
 */
export function targetedGrid(targetRate, rand = Math.random) {
    const targetD = Math.round(targetRate * EDGE_COUNT);
    const cells = randomBalancedGrid(rand);

    // Index lists of the filled and empty cells, so a swap pair is two O(1) picks.
    const filled = [];
    const empty = [];
    for (let i = 0; i < CELL_COUNT; i++) (cells[i] ? filled : empty).push(i);

    let d = countAlternations(cells);
    let gap = Math.abs(d - targetD);

    for (let attempt = 0; attempt < MAX_SWAP_ATTEMPTS && gap > TOLERANCE_EDGES; attempt++) {
        const fi = Math.floor(rand() * filled.length);
        const ei = Math.floor(rand() * empty.length);
        const a = filled[fi];
        const b = empty[ei];

        cells[a] = 0;
        cells[b] = 1;
        const newD = countAlternations(cells);
        const newGap = Math.abs(newD - targetD);

        if (newGap <= gap) {
            // Keep the swap, and mirror it in the index lists.
            filled[fi] = b;
            empty[ei] = a;
            d = newD;
            gap = newGap;
        } else {
            // Undo it.
            cells[a] = 1;
            cells[b] = 0;
        }
    }
    return { cells, alternations: d };
}

// ---------------------------------------------------------------------------
// Pattern objects used by the interface
// ---------------------------------------------------------------------------

/**
 * @typedef {'random' | 'clustered' | 'dispersed'} PatternType
 * @typedef {Object} Pattern
 * @property {Uint8Array} cells               100 values, row-major, 1 = filled
 * @property {PatternType} type
 * @property {number} targetAlternation        Intended p(A); nominal 0.5 for 'random'
 * @property {number} observedAlternation      Measured p(A) of the cells actually shown
 */

/** Builds one quiz pattern of the given type. */
export function makePattern(type, rand = Math.random) {
    let cells;
    let targetAlternation;
    if (type === 'random') {
        cells = randomBalancedGrid(rand);
        targetAlternation = RANDOM_CENTER;
    } else {
        targetAlternation = type === 'clustered' ? CLUSTERED_TARGET : DISPERSED_TARGET;
        cells = targetedGrid(targetAlternation, rand).cells;
    }
    return { cells, type, targetAlternation, observedAlternation: alternationRate(cells) };
}

/**
 * Builds the slider mode's sample for a whole-number percent setting (25 to 75).
 * Exactly 50 is the independent condition and takes the plain-shuffle path; every other
 * setting is targeted.
 */
export function makeSampleAtPercent(percent, rand = Math.random) {
    if (percent === 50) return makePattern('random', rand);
    const targetAlternation = percent / 100;
    const cells = targetedGrid(targetAlternation, rand).cells;
    const type = percent < 50 ? 'clustered' : 'dispersed';
    return { cells, type, targetAlternation, observedAlternation: alternationRate(cells) };
}

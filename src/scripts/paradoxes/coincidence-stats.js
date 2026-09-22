/**
 * "This Couldn't Just Be Coincidence!" (Part 4): statistics.
 *
 * Belongs to: Group 2 (Clustering Illusions). Pure logic only: no DOM access, mirroring
 * coincidence-grids.js. See notes/clustering_illusion_part_4_days_of_your_life_spec(rewrite).md
 * sections 18-24 for the design this implements.
 *
 * Two distinct statistics are kept deliberately separate (spec section 18):
 *
 *   1. Exact-outcome probability (section 19) -- a closed-form combinatorial fact
 *      (1 / C(400, B)) about ONE specific exact grid. Astronomically small, and NOT
 *      evidence against the random model: every exact B-of-400 arrangement is equally
 *      unlikely, and one of them had to occur.
 *
 *   2. "At least this clustered" (section 20) -- how the observed grid's cluster count
 *      compares to the distribution of cluster counts across the UNCONDITIONED random
 *      model at the same black-cell count. This is the actual inferential statistic.
 *
 * CRITICAL (spec section 22): the null distribution used for (2) must always be built from
 * the unconditioned generateRandomGrid output (coincidence-grids.js), never from grids
 * pre-filtered by findQualifyingRandomGrid's "has >=1 square" criterion. Conflating the two
 * would silently bias the "how unusual is this" statistic toward making chance look rarer
 * than it actually is. buildNullDistribution() below only ever calls the unconditioned
 * generator -- this is enforced by construction, not just by comment.
 */

import { GRID_SIZE, CELL_COUNT, generateRandomGrid, analyzeClusters } from './coincidence-grids.js';

// ---------------------------------------------------------------------------
// Exact-outcome probability (spec section 19)
// ---------------------------------------------------------------------------

/**
 * log(C(n, k)), computed via lgamma-free summation of logs to avoid overflow for n=400.
 * (400 choose 80) is far too large for exact integer or double arithmetic, so everything
 * here works in log space; only the final display value is exponentiated, and only for
 * numbers small enough to matter (never for the raw combinatorial count itself).
 */
function logChoose(n, k) {
    if (k < 0 || k > n) return -Infinity;
    let result = 0;
    // log(C(n,k)) = sum_{i=1}^{k} log((n - k + i) / i)
    for (let i = 1; i <= k; i++) {
        result += Math.log((n - k + i) / i);
    }
    return result;
}

/**
 * P(this exact grid) = 1 / C(gridSize^2, blackCells), returned in log10 form because the
 * linear value underflows to 0 in a double long before it's interesting to display (at
 * B=80 on a 20x20 grid it's about 2.4e-86). Display code should show this as "1 in 10^N"
 * using -log10P, never attempt Number(1/C(...)) directly.
 */
export function exactOutcomeLog10Probability(gridSize = GRID_SIZE, blackCells = 80) {
    const cellCount = gridSize * gridSize;
    const log10C = logChoose(cellCount, blackCells) / Math.LN10; // convert natural log to log10
    return -log10C; // log10(1/C) = -log10(C)
}

/** Human-readable "1 in 10^N" style string for the exact-outcome statistic. */
export function formatExactOutcomeProbability(gridSize = GRID_SIZE, blackCells = 80) {
    const log10P = exactOutcomeLog10Probability(gridSize, blackCells);
    const exponent = Math.round(-log10P);
    return `about 1 in 10^${exponent}`;
}

// ---------------------------------------------------------------------------
// Null distribution (spec section 20, section 24)
// ---------------------------------------------------------------------------

/**
 * Builds an empirical distribution of qualifying-square counts under the TRUE unconditioned
 * random model, at a given black-cell count. This is the only function in the module
 * permitted to call the unconditioned generator in a loop for statistics purposes -- see
 * the module doc comment above for why that separation matters.
 *
 * Returns a simple histogram: counts[c] = number of simulated grids whose analyzeClusters()
 * found exactly c qualifying squares (2x2-or-larger, per coincidence-grids.js's detection,
 * which already reports a 3x3 as one square rather than four overlapping 2x2s). This is
 * suffient to answer "at least N squares" for any N by summing the tail.
 *
 * Simulation count follows spec section 24's recommendation (>=100,000 per density value)
 * as the default; callers doing interactive/dev work can pass a smaller count.
 *
 * This is meant to be run OFFLINE (a Node script under a scripts/ or tools/ directory, not
 * in the browser -- spec section 24 is explicit that large simulation batches must not run
 * client-side) and its result serialized to a small static JSON file that the page loads.
 * See build-null-tables.mjs (sibling script, not shipped to the browser) for that driver.
 *
 * @returns {{ blackCells: number, trials: number, counts: number[], maxObserved: number }}
 */
export function buildNullDistribution({ gridSize = GRID_SIZE, blackCells = 80, trials = 100000, rand = Math.random } = {}) {
    const counts = [];
    let maxObserved = 0;
    for (let t = 0; t < trials; t++) {
        const { cells } = generateRandomGrid({ gridSize, blackCells, rand });
        const analysis = analyzeClusters(cells, gridSize);
        const n = analysis.squares.length;
        counts[n] = (counts[n] || 0) + 1;
        if (n > maxObserved) maxObserved = n;
    }
    for (let i = 0; i <= maxObserved; i++) if (!counts[i]) counts[i] = 0;
    return { blackCells, trials, counts, maxObserved };
}

/**
 * Given a precomputed distribution (as built by buildNullDistribution, typically loaded
 * from a static JSON table rather than rebuilt at runtime -- spec section 65), returns how
 * many of the simulated grids had AT LEAST `observedCount` qualifying squares, both as a
 * raw tail count and as a percentage. This is the "N of 100/1000 comparable random grids
 * were at least this square-rich" statistic (spec section 20, section 35).
 *
 * Uses natural-frequency-friendly rounding: percentages are computed from the true tail
 * fraction, and callers should prefer displaying "X of Y" phrasing (Gigerenzer & Hoffrage
 * 1995) over a bare percentage where space allows.
 */
export function tailStatistic(distribution, observedCount) {
    const { trials, counts } = distribution;
    let tail = 0;
    for (let n = observedCount; n < counts.length; n++) tail += counts[n] || 0;

    if (tail === 0) {
        // Spec section 40: never report an unsupported ultra-small probability. Say
        // "fewer than 1 in N simulated grids" rather than inventing 0% or extrapolating.
        return { tail: 0, trials, percent: 0, unsupported: true, floorDescription: `fewer than 1 in ${trials.toLocaleString()} simulated random grids` };
    }
    return { tail, trials, percent: (100 * tail) / trials, unsupported: false, floorDescription: null };
}

/**
 * Natural-frequency phrasing helper: "38 of 100 comparable random grids...". Rescales the
 * raw trial count down to a round denominator (default 100) for display, per spec section
 * 35's preferred wording.
 *
 * IMPORTANT: a genuinely nonzero tail must never be displayed as "0 of <denominator>" --
 * that would misrepresent something that DID happen in the simulation (just rarely) as
 * something that never happens, which is exactly the overclaim spec section 40 warns
 * against ("do not report unsupported ultra-small probabilities... say 'fewer than 1 in N'
 * rather than inventing a smaller number" -- the same principle cuts the other way here:
 * never invent a LARGER (falsely-zero) apparent rarity by rounding a real event away).
 * A cluster count that occurred, say, 47 times in 100,000 trials rounds to 0 at a
 * denominator of 100, so this escalates through progressively larger round denominators
 * (100, 1,000, 10,000) until the scaled count is at least 1, falling back to the exact
 * trial count only if even that isn't enough (practically unreachable at >=100,000 trials
 * with any tail > 0, but kept as a correct final fallback rather than assuming).
 */
export function naturalFrequencyPhrase(distribution, observedCount, denominator = 100) {
    const stat = tailStatistic(distribution, observedCount);
    if (stat.unsupported) return stat.floorDescription;

    for (const d of [denominator, 1000, 10000]) {
        if (d > stat.trials) break;
        const scaled = Math.round((stat.tail / stat.trials) * d);
        if (scaled >= 1) {
            return `${scaled} of ${d.toLocaleString()} comparable random grids were at least this square-rich`;
        }
    }
    // Fallback: report the exact simulated tail rather than a misleadingly-rounded zero.
    return `${stat.tail} of ${stat.trials.toLocaleString()} comparable random grids were at least this square-rich`;
}

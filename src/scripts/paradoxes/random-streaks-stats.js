/**
 * Random Streaks (Part 3): fair-coin generation, run detection, and exact longest-run math.
 *
 * Belongs to: Group 2 (Clustering Illusions). Pure logic only: no DOM access, so it can be
 * read, reused, and tested in plain Node, mirroring clustering-illusion-grids.js (Part 1)
 * and human-made-randomness-stats.js (Part 2). The interactive layer lives in
 * random-streaks.js, which imports everything here.
 *
 * ----------------------------------------------------------------------------------
 * THE TASK MODEL
 *
 * Fifty independent fair-coin flips, X_1..X_50, each Bernoulli(0.5). A run is a maximal
 * block of identical outcomes; the longest run L is the primary quantity of interest.
 * Unlike Part 2 (which measured alternation in a HUMAN-written sequence), Part 3 lets an
 * actual random process generate the sequence, so there is no "targeting" or "balancing"
 * step anywhere in this file: every flip is drawn independently and nothing about the
 * result is inspected, rejected, or nudged (spec section 8 -- this is the whole point of
 * the exhibit, so it is treated as a hard constraint, not a style preference).
 *
 * ----------------------------------------------------------------------------------
 * EXACT LONGEST-RUN DISTRIBUTION (spec sections 33-34)
 *
 * P(L < k) is computed by dynamic programming rather than simulation. Track, for each
 * sequence length i and each in-progress run length j (1 <= j < k), the number of length-i
 * binary sequences with no run of k or more that currently end in a run of exactly j:
 *
 *     c_1(1) = 2                                   (first flip: H or T)
 *     c_{i+1}(1)     = sum_{j=1}^{k-1} c_i(j)       (switch: starts a new run of length 1)
 *     c_{i+1}(j+1)   = c_i(j)   for 1 <= j <= k-2   (repeat: extends the current run)
 *
 * A repeat from run length k-1 would create a run of length k, so it is excluded --
 * that's exactly what keeps this the "no run >= k" count. Then:
 *
 *     P(L < k)  = sum_j c_50(j) / 2^50
 *     P(L >= k) = 1 - P(L < k)
 *     P(L = k)  = P(L < k+1) - P(L < k)
 *
 * Verified in Node against every value in the spec's own reference tables (sections 15,
 * 35, 53): P(L>=3) through P(L>=10), the full P(L=k) table for k=2..9, E[L]~5.9783, and
 * median 6 all matched to the spec's stated precision before this module was used to
 * build anything on top of it.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Flips per generated sequence (spec section 4: long enough for streaks to be
 *  interesting, short enough to stay compact on a phone). */
export const SEQUENCE_LENGTH = 50;

/** How many independent sequences the "1,000 sequences" mode simulates (spec section 23). */
export const SIMULATION_COUNT = 1000;

/** Streak-highlight thresholds offered in the UI (spec section 13). Default is 3+, per
 *  Carlson & Shu (2007) on the perceptual "rule of three" (spec section 14). */
export const THRESHOLDS = [3, 4, 5, 6];
export const DEFAULT_THRESHOLD = 3;

/** Prediction choices offered before the first sequence is generated (spec section 6). */
export const PREDICTION_CHOICES = [2, 3, 4, 5, 6, '7+'];

// ---------------------------------------------------------------------------
// Random generation (spec section 8)
// ---------------------------------------------------------------------------

/**
 * Generates one fair coin flip, 'H' or 'T', with P(H) = P(T) = 0.5. Uses
 * crypto.getRandomValues when available (true hardware/OS entropy) and falls back to
 * Math.random only if the Crypto API is unavailable -- both produce, as far as this
 * exhibit is concerned, an unbiased independent bit, so either path satisfies the
 * Bernoulli(0.5) model the math above relies on.
 *
 * `randomBit` is a parameter (rather than calling crypto directly) so tests can inject a
 * seeded/deterministic source; production code never overrides it.
 */
function defaultRandomBit() {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const buf = new Uint8Array(1);
        crypto.getRandomValues(buf);
        return buf[0] & 1;
    }
    return Math.random() < 0.5 ? 0 : 1;
}

/**
 * Generates one sequence of SEQUENCE_LENGTH independent fair-coin outcomes. No balancing,
 * no rejection, no seeding for a "good" example -- whatever independent randomness
 * produces is shown as-is (spec section 8, section 54 "do not hand-pick an impressive
 * first sequence").
 *
 * @param {() => number} randomBit function returning 0 or 1 with equal probability
 * @returns {Array<'H'|'T'>}
 */
export function generateSequence(randomBit = defaultRandomBit) {
    const sequence = new Array(SEQUENCE_LENGTH);
    for (let i = 0; i < SEQUENCE_LENGTH; i++) {
        sequence[i] = randomBit() === 0 ? 'H' : 'T';
    }
    return sequence;
}

// ---------------------------------------------------------------------------
// Run detection (spec section 36)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Run
 * @property {'H'|'T'} value
 * @property {number} start   inclusive index into the sequence
 * @property {number} end     inclusive index into the sequence
 * @property {number} length
 */

/**
 * Finds every maximal run in a sequence, operating on the linear array only -- this is
 * what makes run detection correct across a visual row wrap on mobile (spec section 9.2):
 * the DOM layout is purely presentational and never consulted here.
 *
 * @param {Array<'H'|'T'>} sequence
 * @returns {Run[]}
 */
export function findRuns(sequence) {
    const runs = [];
    let start = 0;
    for (let i = 1; i <= sequence.length; i++) {
        if (i === sequence.length || sequence[i] !== sequence[i - 1]) {
            runs.push({ value: sequence[start], start, end: i - 1, length: i - start });
            start = i;
        }
    }
    return runs;
}

/** The length of the longest run in a sequence (L in the spec's notation). */
export function longestRun(sequence) {
    return findRuns(sequence).reduce((max, run) => Math.max(max, run.length), 0);
}

/** Runs whose length meets or exceeds the given threshold (spec section 12: highlight the
 *  FULL maximal run, never just the first k cells -- findRuns already returns full runs). */
export function runsAtLeast(runs, threshold) {
    return runs.filter((run) => run.length >= threshold);
}

/** Counts H and T outcomes in a sequence (secondary metric, spec section 17). */
export function countHeadsTails(sequence) {
    let heads = 0;
    for (const outcome of sequence) if (outcome === 'H') heads++;
    return { heads, tails: sequence.length - heads };
}

// ---------------------------------------------------------------------------
// Exact longest-run distribution for SEQUENCE_LENGTH fair flips (spec sections 33-34)
// ---------------------------------------------------------------------------

/**
 * Count of length-n binary sequences containing NO run of length >= k, via the recurrence
 * documented at the top of this file. Internal building block for the probabilities below;
 * exported only for the module's own Node-side verification script.
 */
export function noRunAtLeastKCount(n, k) {
    if (k <= 1) return 0; // every sequence of length >= 1 has a run of length >= 1
    // c[j] holds the count for run-length j, for j = 1..k-1 (index 0 unused).
    let c = new Array(k).fill(0);
    c[1] = 2; // first flip: H or T
    for (let i = 2; i <= n; i++) {
        const next = new Array(k).fill(0);
        let sumAll = 0;
        for (let j = 1; j < k; j++) sumAll += c[j];
        next[1] = sumAll; // switch: new run of length 1
        for (let j = 1; j <= k - 2; j++) next[j + 1] = c[j]; // repeat: extend the run
        c = next;
    }
    let total = 0;
    for (let j = 1; j < k; j++) total += c[j];
    return total;
}

/** P(L < k) for L = the longest run in SEQUENCE_LENGTH fair-coin flips. */
export function probLessThan(k) {
    return noRunAtLeastKCount(SEQUENCE_LENGTH, k) / Math.pow(2, SEQUENCE_LENGTH);
}

/** P(L >= k) for L = the longest run in SEQUENCE_LENGTH fair-coin flips. */
export function probAtLeast(k) {
    return 1 - probLessThan(k);
}

/** P(L = k) exactly, for 2 <= k <= SEQUENCE_LENGTH - 1 (spec section 53's per-value table). */
export function probExactly(k) {
    return probLessThan(k + 1) - probLessThan(k);
}

/**
 * The full exact distribution used to draw the reference values in the histogram: one
 * entry per bin 2..9 plus a combined "10+" bin, matching the categories in spec section 25.
 * Computed once and memoized since it never depends on any generated sequence.
 */
let cachedDistribution = null;
export function exactDistribution() {
    if (cachedDistribution) return cachedDistribution;
    const bins = [2, 3, 4, 5, 6, 7, 8, 9];
    const dist = {};
    for (const k of bins) dist[k] = probExactly(k);
    dist['10+'] = probAtLeast(10);
    cachedDistribution = dist;
    return dist;
}

/** Bins a single longest-run value into one of the histogram categories (2..9, '10+'). */
export function binFor(longest) {
    return longest >= 10 ? '10+' : String(longest);
}

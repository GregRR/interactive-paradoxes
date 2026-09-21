/**
 * Human-made Randomness (Part 2): sequence statistics and exact fair-coin math.
 *
 * Belongs to: Group 2 (Clustering Illusions). Pure logic only: no DOM access, so it can
 * be read, reused, and tested in plain Node, mirroring clustering-illusion-grids.js from
 * Part 1. The interactive layer lives in human-made-randomness.js, which imports
 * everything here.
 *
 * ----------------------------------------------------------------------------------
 * THE TASK MODEL
 *
 * The visitor enters a 30-outcome sequence of H/T, imagining a fair coin. Two adjacent
 * outcomes either match (a repetition) or differ (an alternation). With n = 30 outcomes
 * there are n - 1 = 29 adjacent transitions.
 *
 *     A = number of transitions where the outcome differs from the one before it
 *     AR = A / 29                      (alternation rate)
 *
 * For an independent fair coin, each of the 29 transitions differs with probability 0.5
 * independently of the others (the transition sequence is itself a fair coin flip once
 * the first outcome is fixed), so:
 *
 *     A ~ Binomial(29, 0.5)
 *
 * This gives an EXACT baseline distribution -- no simulation needed -- for comparing one
 * visitor's sequence against what independence actually produces (spec section 32-33).
 *
 * Runs: a run is a maximal streak of the same outcome. For any binary sequence,
 * R = A + 1 (spec section 13). The longest run is tracked separately as a bridge to
 * Part 3's streak visualization; it is not the primary metric here.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sequence length (spec section 5: a deliberate compromise, not a canonical number). */
export const SEQUENCE_LENGTH = 30;

/** Adjacent transitions in a sequence of SEQUENCE_LENGTH outcomes. */
export const TRANSITION_COUNT = SEQUENCE_LENGTH - 1; // 29

/** Fair-coin expectation for alternation rate. Never a "target" -- real samples vary. */
export const FAIR_COIN_ALTERNATION_RATE = 0.5;

// ---------------------------------------------------------------------------
// Exact binomial math, n = TRANSITION_COUNT (29), p = 0.5
// ---------------------------------------------------------------------------

/**
 * log(n choose k), computed as a running sum of logs rather than raw factorials so it
 * never overflows even though this module is small enough that overflow isn't actually a
 * risk at n=29 or n=30 -- kept for clarity and reuse if a larger n is ever needed.
 */
function logChoose(n, k) {
    if (k < 0 || k > n) return -Infinity;
    let result = 0;
    for (let i = 0; i < k; i++) {
        result += Math.log(n - i) - Math.log(i + 1);
    }
    return result;
}

/** P(X = k) for X ~ Binomial(n, 0.5). */
function probExactlyFairBinomial(n, k) {
    return Math.exp(logChoose(n, k) - n * Math.log(2));
}

/** P(X >= a) for X ~ Binomial(n, 0.5). */
function probAtLeastFairBinomial(n, a) {
    let sum = 0;
    for (let k = a; k <= n; k++) sum += probExactlyFairBinomial(n, k);
    return sum;
}

/** P(X <= a) for X ~ Binomial(n, 0.5). */
function probAtMostFairBinomial(n, a) {
    let sum = 0;
    for (let k = 0; k <= a; k++) sum += probExactlyFairBinomial(n, k);
    return sum;
}

/** P(A >= a) for the alternation count of a fair-coin sequence (n = 29 transitions). */
export function alternationProbAtLeast(a) {
    return probAtLeastFairBinomial(TRANSITION_COUNT, a);
}

/** P(A <= a) for the alternation count of a fair-coin sequence (n = 29 transitions). */
export function alternationProbAtMost(a) {
    return probAtMostFairBinomial(TRANSITION_COUNT, a);
}

/** P(H = h) for the heads count of a fair-coin sequence (n = 30 outcomes). Spec section 12. */
export function headsProbExactly(h) {
    return probExactlyFairBinomial(SEQUENCE_LENGTH, h);
}

// ---------------------------------------------------------------------------
// Sequence measurement
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} SequenceAnalysis
 * @property {number} heads
 * @property {number} tails
 * @property {number} alternations       A, count of differing adjacent pairs
 * @property {number} alternationRate    A / TRANSITION_COUNT
 * @property {number} runs               A + 1
 * @property {number} longestRun
 * @property {number} upperTailProbability  P(A' >= A) under a fair coin
 * @property {number} lowerTailProbability  P(A' <= A) under a fair coin
 */

/**
 * Analyzes a completed sequence of 'H'/'T' outcomes (length SEQUENCE_LENGTH) and returns
 * every derived statistic the UI needs. Pure function: same input always yields the same
 * output, which keeps it easy to unit test independently of the DOM.
 *
 * @param {Array<'H'|'T'>} sequence
 * @returns {SequenceAnalysis}
 */
export function analyzeSequence(sequence) {
    if (sequence.length !== SEQUENCE_LENGTH) {
        throw new Error(`analyzeSequence expects exactly ${SEQUENCE_LENGTH} outcomes, got ${sequence.length}`);
    }

    let heads = 0;
    let alternations = 0;
    let longestRun = 1;
    let currentRun = 1;

    for (let i = 0; i < sequence.length; i++) {
        if (sequence[i] === 'H') heads++;
        if (i === 0) continue;
        if (sequence[i] !== sequence[i - 1]) {
            alternations++;
            currentRun = 1;
        } else {
            currentRun++;
            if (currentRun > longestRun) longestRun = currentRun;
        }
    }

    return {
        heads,
        tails: SEQUENCE_LENGTH - heads,
        alternations,
        alternationRate: alternations / TRANSITION_COUNT,
        runs: alternations + 1,
        longestRun,
        upperTailProbability: alternationProbAtLeast(alternations),
        lowerTailProbability: alternationProbAtMost(alternations)
    };
}

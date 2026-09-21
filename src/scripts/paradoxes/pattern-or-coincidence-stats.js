/**
 * Pure logic for Part 4: "When Does a Pattern Mean Something?"
 *
 * No DOM here -- everything is a plain function over arrays of 0/1, so this
 * module can be unit-tested in Node the same way clustering-illusion-grids.js,
 * human-made-randomness-stats.js, and random-streaks-stats.js were.
 *
 * Two fully-specified generating models are compared over 60 sequential
 * "opportunities" (spec sections 3-9):
 *
 *   Model A -- Constant chance:      X_t ~iid Bernoulli(0.20)
 *   Model B -- Event-dependent:      P(event | previous event)    = 0.50
 *                                    P(event | previous no-event) = 0.125
 *                                    (started from its own stationary
 *                                    distribution, which is also 20% events,
 *                                    so neither model can be told apart by
 *                                    the overall event rate alone -- see
 *                                    spec section 6).
 *
 * Because both models are fully specified with no fitted parameters, the
 * likelihood ratio between them (BF10 = P(seq|B) / P(seq|A)) is simultaneously
 * a plain likelihood ratio and a Bayes factor between these two named models
 * (spec section 16). It is NOT a posterior probability (spec section 17) --
 * the UI layer must never phrase it that way.
 *
 * The second statistic, the conditional scan probability, asks a different
 * question: among all ways of placing the same number of events (R) among 60
 * slots, how often is the densest 6-slot window at least as concentrated as
 * the one actually observed? This isolates "clumpiness" from "how many events
 * happened" (spec sections 24-27), and is computed by an exact dynamic
 * program over (position, events used so far, previous 5 bits, densest
 * window seen so far) -- no simulation, matching the site's existing
 * exact-math convention (see random-streaks-stats.js's longest-run DP).
 */

export const P_CONST = 0.20; // Model A: constant chance, P(event) = 0.20 iid
export const P_DEP_GIVEN_PREV_EVENT = 0.5; // Model B: P(event | previous event)
export const P_DEP_GIVEN_PREV_NO_EVENT = 0.125; // Model B: P(event | previous no-event)
export const STATIONARY_P_EVENT = 0.2; // Model B's own long-run event rate (spec section 6)
export const SCAN_WINDOW = 6; // fixed scan-statistic window width (spec section 24)
export const SEQUENCE_LENGTH = 60;
export const EVIDENCE_STRONG_RATIO = 3; // the 3:1 instructional rule (spec section 18)

/** Parses a "1"/"0" string into an array of 0/1 numbers. */
export function parseSequence(str) {
    return str.split('').map(Number);
}

/** Total number of events (1s) in a sequence. */
export function countEvents(seq) {
    return seq.reduce((a, b) => a + b, 0);
}

/** log P(seq | Model A), independent Bernoulli(p) trials (spec section 28). */
function logLikelihoodConstant(seq, p = P_CONST) {
    let ll = 0;
    for (const x of seq) {
        ll += x === 1 ? Math.log(p) : Math.log(1 - p);
    }
    return ll;
}

/**
 * log P(seq | Model B), a first-order two-state Markov chain started from its
 * own stationary distribution (spec section 29). The chain's stationary event
 * probability equals STATIONARY_P_EVENT by construction (verified in
 * pattern-or-coincidence-stats.test conventions against spec section 6):
 *   pi_1 = P(1|0) / (P(1|0) + P(0|1)) = 0.125 / (0.125 + 0.50) = 0.20
 */
function logLikelihoodDependent(seq) {
    let ll = seq[0] === 1
        ? Math.log(STATIONARY_P_EVENT)
        : Math.log(1 - STATIONARY_P_EVENT);
    for (let t = 1; t < seq.length; t++) {
        const prevEvent = seq[t - 1] === 1;
        const pEvent = prevEvent ? P_DEP_GIVEN_PREV_EVENT : P_DEP_GIVEN_PREV_NO_EVENT;
        ll += seq[t] === 1 ? Math.log(pEvent) : Math.log(1 - pEvent);
    }
    return ll;
}

/**
 * Evidence ratio BF10 = P(seq | event-dependent) / P(seq | constant chance),
 * via log-space subtraction to avoid underflow on 60 multiplied probabilities
 * (spec section 29).
 */
export function bayesFactor10(seq) {
    const logL1 = logLikelihoodDependent(seq);
    const logL0 = logLikelihoodConstant(seq);
    return Math.exp(logL1 - logL0);
}

/**
 * Classifies a raw BF10 into the three challenge answers using the
 * instructional 3:1 rule (spec section 18). This is a teaching convention,
 * not a universal statistical law, and the UI must always show the raw ratio
 * alongside the category (spec sections 18, 47).
 */
export function evidenceCategory(bf10) {
    if (bf10 >= EVIDENCE_STRONG_RATIO) return 'dependence';
    if (bf10 <= 1 / EVIDENCE_STRONG_RATIO) return 'constant';
    return 'unclear';
}

/**
 * Formats a BF10 for display, always showing the version >= 1 with the
 * "X times more likely under <model>" phrasing (spec section 16), e.g.
 * { ratio: 5.7, favors: 'constant' } for BF10 = 0.175.
 */
export function formatEvidenceRatio(bf10) {
    if (bf10 >= 1) {
        return { ratio: bf10, favors: 'dependence' };
    }
    return { ratio: 1 / bf10, favors: 'constant' };
}

/** Largest sum over any window of `w` consecutive slots (spec section 24). */
export function densestWindow(seq, w = SCAN_WINDOW) {
    let max = 0;
    for (let j = 0; j <= seq.length - w; j++) {
        let sum = 0;
        for (let k = 0; k < w; k++) sum += seq[j + k];
        if (sum > max) max = sum;
    }
    return max;
}

/** Start index (0-based) of the first window achieving the densest count, for highlighting. */
export function densestWindowStart(seq, w = SCAN_WINDOW) {
    const target = densestWindow(seq, w);
    for (let j = 0; j <= seq.length - w; j++) {
        let sum = 0;
        for (let k = 0; k < w; k++) sum += seq[j + k];
        if (sum === target) return j;
    }
    return 0;
}

function popcount(bits, width) {
    let c = 0;
    for (let i = 0; i < width; i++) {
        if ((bits >> i) & 1) c++;
    }
    return c;
}

// Packs (eventsUsed, last (w-1) bits, maxWindowSoFar) into one integer key.
// eventsUsed fits comfortably under 2^7, last under 2^5, maxWin under 2^3.
function encodeState(eventsUsed, last, maxWin) {
    return (eventsUsed * 32 + last) * 8 + maxWin;
}
function decodeState(key) {
    const maxWin = key % 8;
    const rest = Math.floor(key / 8);
    const last = rest % 32;
    const eventsUsed = Math.floor(rest / 32);
    return { eventsUsed, last, maxWin };
}

/**
 * Exact count of length-n binary sequences with exactly R ones whose densest
 * w-slot window is >= sObs, via the dynamic program described in spec
 * section 27:
 *
 *   dp[position][eventsUsed][lastFiveBits][maxWindowCount]
 *
 * Built position-by-position (bit by bit) rather than as one 4-D array, since
 * only the previous position's states are ever needed. Uses BigInt because
 * the raw sequence counts (up to C(60,13) ~ 5*10^12) exceed float53 precision
 * margins we'd want for an exact ratio.
 */
export function conditionalScanCountAtLeast(n, R, sObs, w = SCAN_WINDOW) {
    let dp = new Map();
    dp.set(encodeState(0, 0, 0), 1n);

    for (let pos = 0; pos < n; pos++) {
        const next = new Map();
        for (const [key, count] of dp) {
            const { eventsUsed, last, maxWin } = decodeState(key);
            for (const bit of [0, 1]) {
                const newEvents = eventsUsed + bit;
                if (newEvents > R) continue; // prune: would exceed the target event count
                const remaining = n - pos - 1;
                if (R - newEvents > remaining) continue; // prune: can't still reach R events

                let newMaxWin = maxWin;
                if (pos >= w - 1) {
                    // We now have a full w-bit window ending at this position:
                    // the previous (w-1) bits plus this new one.
                    const windowBits = (last << 1) | bit;
                    const windowSum = popcount(windowBits, w);
                    if (windowSum > newMaxWin) newMaxWin = windowSum;
                }

                const newLast = ((last << 1) | bit) & ((1 << (w - 1)) - 1);
                const newKey = encodeState(newEvents, newLast, newMaxWin);
                next.set(newKey, (next.get(newKey) || 0n) + count);
            }
        }
        dp = next;
    }

    let total = 0n;
    for (const [key, count] of dp) {
        const { eventsUsed, maxWin } = decodeState(key);
        if (eventsUsed === R && maxWin >= sObs) total += count;
    }
    return total;
}

/** Exact binomial coefficient C(n, k) as a BigInt. */
export function binomial(n, k) {
    let result = 1n;
    for (let i = 0; i < k; i++) {
        result = (result * BigInt(n - i)) / BigInt(i + 1);
    }
    return result;
}

/**
 * Conditional scan probability p_scan = P(S >= S_obs | R events among n
 * slots), exact, per spec sections 26-27. Returns the probability plus the
 * intermediate counts (useful for the math modal's "why" explanation).
 */
export function conditionalScanProbability(seq, w = SCAN_WINDOW) {
    const n = seq.length;
    const R = countEvents(seq);
    const sObs = densestWindow(seq, w);
    const countAtLeast = conditionalScanCountAtLeast(n, R, sObs, w);
    const total = binomial(n, R);
    return { p: Number(countAtLeast) / Number(total), sObs, R, countAtLeast, total };
}

/**
 * The five preselected instructional fixtures from spec section 22.
 * These are fixed data, generated by the specified models and hand-selected
 * to illustrate five distinct inference situations (spec sections 12, 22) --
 * they are never regenerated at runtime (spec section 54).
 */
export const ROUNDS = [
    {
        generator: 'constant',
        sequence: '100000000100110110100100000000110000100000000000000000000100',
        message: 'This one really was generated by constant chance, and the whole sequence also favors that model. The small clusters are not unusual enough to make dependence the better explanation.',
    },
    {
        generator: 'constant',
        sequence: '001000010001111110001000100000000010000000000100000000001000',
        message: 'The eye-catching cluster really was produced by constant chance. A six-event local window is very unusual given the total number of events—but the entire sequence is only about 1.6× more likely under the dependent model. Under our 3:1 rule, the full sequence is still not enough to tell.',
    },
    {
        generator: 'dependent',
        sequence: '100000000000000000010000010000011010000000001100000000001101',
        message: 'The process really was event-dependent—but this particular sample does not reveal it clearly. The two models predict this sequence almost equally well. A real effect does not guarantee dramatic-looking evidence in every small sample.',
    },
    {
        generator: 'dependent',
        sequence: '000000100011110101001100000000000000000000000000000000000000',
        message: 'Here the process really was dependent, and the data strongly lean that way. This exact sequence is about 20× more likely under the event-dependent model than under constant chance.',
    },
    {
        generator: 'constant',
        sequence: '101000000000000000000000000001000011110001000001000000000000',
        message: 'This one was generated by constant chance—even though the observed sequence is about 5× more likely under our dependent model. Evidence is probabilistic: a chance process will occasionally produce data that point toward the wrong alternative.',
    },
];

/**
 * Precomputes every derived statistic for one round's fixture, so the UI
 * layer never has to call the math functions directly on user interaction --
 * it just reads from this object (spec section 54's `rounds[]` state shape).
 */
export function buildRound(fixture) {
    const seq = parseSequence(fixture.sequence);
    const bf10 = bayesFactor10(seq);
    const scan = conditionalScanProbability(seq);
    return {
        generator: fixture.generator,
        sequence: seq,
        message: fixture.message,
        eventCount: countEvents(seq),
        bf10,
        evidenceCategory: evidenceCategory(bf10),
        scanWindowStart: densestWindowStart(seq),
        scanWindowCount: scan.sObs,
        conditionalScanP: scan.p,
    };
}

/** All five rounds, fully precomputed once at module load (never regenerated). */
export function buildAllRounds() {
    return ROUNDS.map(buildRound);
}

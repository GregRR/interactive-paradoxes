/**
 * Pure math for the Jeane Dixon Effect exhibit — no DOM access, so it can be
 * unit tested in isolation and reused if the visualization is ever reworked.
 *
 * The model: a fixed number of predictions/opportunities produces a fixed
 * proportion of genuine "hits" (correct predictions). Selective memory then
 * retains hits and non-hits at different rates, optionally reclassifying a
 * fraction of remembered non-hits as hits after the fact (e.g. a vague
 * prediction later reinterpreted as having come true). The apparent
 * remembered hit rate can end up far higher than the true hit rate even
 * though nothing about the underlying predictions has changed.
 *
 * See docs/references.md ("The Jeane Dixon Effect") for the research behind
 * the default parameter values used by the exhibit's sliders.
 */

/**
 * Computes the full breakdown of actual vs. remembered outcomes.
 *
 * @param {Object} params
 * @param {number} params.n           Number of predictions/opportunities (>= 1).
 * @param {number} params.hitRate     True hit rate, 0-1 (fraction scored correct).
 * @param {number} params.hitRecall   Probability a hit is remembered, 0-1.
 * @param {number} params.missRecall  Probability a non-hit is remembered, 0-1.
 * @param {number} params.reinterpret Fraction of remembered non-hits later
 *                                    reclassified as hits, 0-1. Conceptually
 *                                    separate from selective memory itself.
 * @returns {{
 *   hits: number, misses: number,
 *   retainedHits: number, retainedMissesBeforeReclass: number,
 *   reclassified: number,
 *   rememberedHits: number, rememberedMisses: number, rememberedTotal: number,
 *   forgotten: number,
 *   actualRate: number, apparentRate: number|null
 * }}
 */
export function computeDixonModel({ n, hitRate, hitRecall, missRecall, reinterpret }) {
    const hits = n * hitRate;
    const misses = n - hits;

    const retainedHits = hits * hitRecall;
    const retainedMissesBeforeReclass = misses * missRecall;

    const reclassified = retainedMissesBeforeReclass * reinterpret;

    const rememberedHits = retainedHits + reclassified;
    const rememberedMisses = retainedMissesBeforeReclass - reclassified;
    const rememberedTotal = rememberedHits + rememberedMisses;

    // Anything not retained (as a hit or a non-hit) is simply forgotten.
    // Clamped to 0 to avoid a stray -0 or tiny negative from floating-point
    // rounding when recall rates are at or near their extremes.
    const forgotten = Math.max(0, n - retainedHits - retainedMissesBeforeReclass);

    const actualRate = hitRate;
    const apparentRate = rememberedTotal > 0 ? rememberedHits / rememberedTotal : null;

    return {
        hits,
        misses,
        retainedHits,
        retainedMissesBeforeReclass,
        reclassified,
        rememberedHits,
        rememberedMisses,
        rememberedTotal,
        forgotten,
        actualRate,
        apparentRate
    };
}

/**
 * Formats a count for display: one decimal place below 10 (so small fractional
 * counts like "6.6 hits" remain informative), a rounded whole number above
 * that. Trims a redundant ".0" (e.g. "9.0" -> "9").
 * @param {number} value
 * @returns {string}
 */
export function formatCount(value) {
    if (value < 10) {
        return value.toFixed(1).replace(/\.0$/, '');
    }
    return Math.round(value).toString();
}

/** Formats a 0-1 fraction as a rounded whole-number percentage string, e.g. 0.234 -> "23%". */
export function formatPercent(fraction) {
    return `${Math.round(fraction * 100)}%`;
}

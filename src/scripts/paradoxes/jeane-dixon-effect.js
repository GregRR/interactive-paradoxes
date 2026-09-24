/**
 * Exhibit: The Jeane Dixon Effect
 *
 * Belongs to: Group 6 (Psychological Effects)
 * Depends on: ./jeane-dixon-effect-stats.js (pure math, no DOM).
 * DOM ids used: jde-n, jde-hit-rate, jde-hit-recall, jde-miss-recall,
 *   jde-reinterpret (sliders); jde-n-out, jde-hit-rate-out, jde-hit-recall-out,
 *   jde-miss-recall-out, jde-reinterpret-out (slider readouts);
 *   jde-actual-rate, jde-apparent-rate, jde-inflation-text (headline numbers);
 *   jde-actual-hit-bar, jde-actual-miss-bar, jde-actual-hit-label,
 *   jde-actual-miss-label, jde-actual-counts (actual-outcomes bar);
 *   jde-remembered-hit-bar, jde-remembered-miss-bar, jde-remembered-hit-label,
 *   jde-remembered-miss-label, jde-remembered-counts (remembered-record bar);
 *   jde-hits-survive, jde-misses-survive, jde-forgotten (metric cards);
 *   jde-reset (reset button); jde-nonhit-info (info buttons, class-selected),
 *   jde-nonhit-dialog, jde-nonhit-dialog-close (definition dialog).
 *
 * Loaded by: src/pages/jeane-dixon-effect.astro. The page's markup exists
 * before this module runs, so it wires up controls and renders the first
 * frame immediately.
 */

// --- 6.1 The Jeane Dixon Effect ---
//
// Research basis (see docs/references.md for full citations): the default
// actual hit rate (11%) is anchored to the Great Australian Psychic
// Prediction Project (Saunders, 2021), a large observational audit of over
// 3,800 published predictions by 207 self-described psychics from 2000-2020,
// independently confirmed against the project's own report and summaries.
// The default memory-filter values (60% of hits remembered, 25% of non-hits
// remembered) are a deliberately rounded, center-of-range reading of Madey &
// Gilovich's (1993) four experiments on recall of expectancy-consistent vs.
// -inconsistent information under temporally unfocused conditions (the kind
// of open-ended prediction a psychic makes), confirmed by reading the full
// paper rather than trusting a secondhand summary. Watt et al. (2014)
// independently replicated the same selective-recall pattern in a
// precognitive-dream paradigm and found it did not depend on paranormal
// belief. This is a deterministic bookkeeping model of how those two
// empirically-grounded effects (an objective hit rate, and asymmetric
// memory) combine -- not itself a published psychological model.

import { computeDixonModel, formatCount, formatPercent } from './jeane-dixon-effect-stats.js';

const root = document.getElementById('jde-explorer');
if (root) {
    const $ = (id) => root.querySelector(`#${id}`);

    // Slider elements and their corresponding readout <strong> elements.
    const sliders = {
        n: $('jde-n'),
        hitRate: $('jde-hit-rate'),
        hitRecall: $('jde-hit-recall'),
        missRecall: $('jde-miss-recall'),
        reinterpret: $('jde-reinterpret')
    };
    const readouts = {
        n: $('jde-n-out'),
        hitRate: $('jde-hit-rate-out'),
        hitRecall: $('jde-hit-recall-out'),
        missRecall: $('jde-miss-recall-out'),
        reinterpret: $('jde-reinterpret-out')
    };

    // The exact default values, kept here so the Reset button can restore
    // them without a page reload. Mirrors each slider's markup `value`.
    const DEFAULTS = { n: 100, hitRate: 11, hitRecall: 60, missRecall: 25, reinterpret: 0 };

    /** Reads current slider values and re-renders every dependent element. */
    function render() {
        const n = Number(sliders.n.value);
        const hitRate = Number(sliders.hitRate.value) / 100;
        const hitRecall = Number(sliders.hitRecall.value) / 100;
        const missRecall = Number(sliders.missRecall.value) / 100;
        const reinterpret = Number(sliders.reinterpret.value) / 100;

        const model = computeDixonModel({ n, hitRate, hitRecall, missRecall, reinterpret });

        // Slider readouts.
        readouts.n.textContent = n;
        readouts.hitRate.textContent = formatPercent(hitRate);
        readouts.hitRecall.textContent = formatPercent(hitRecall);
        readouts.missRecall.textContent = formatPercent(missRecall);
        readouts.reinterpret.textContent = formatPercent(reinterpret);

        // Headline actual-vs-apparent rates.
        $('jde-actual-rate').textContent = formatPercent(model.actualRate);
        $('jde-apparent-rate').textContent =
            model.apparentRate !== null ? formatPercent(model.apparentRate) : 'No record';

        // Actual-outcomes stacked bar.
        $('jde-actual-counts').textContent =
            `${formatCount(model.hits)} hits · ${formatCount(model.misses)} non-hits`;
        const actualHitPct = model.actualRate * 100;
        $('jde-actual-hit-bar').style.width = `${actualHitPct}%`;
        $('jde-actual-miss-bar').style.width = `${100 - actualHitPct}%`;
        // Hide a bar's own percentage label once its segment is too narrow to
        // hold readable text; the legend below the bar still names it.
        $('jde-actual-hit-label').textContent = actualHitPct >= 8 ? `${Math.round(actualHitPct)}%` : '';
        $('jde-actual-miss-label').textContent =
            100 - actualHitPct >= 8 ? `${Math.round(100 - actualHitPct)}%` : '';

        // Remembered-record stacked bar.
        $('jde-remembered-counts').textContent =
            `${formatCount(model.rememberedHits)} hits · ${formatCount(model.rememberedMisses)} non-hits`;
        const rememberedHitPct = model.apparentRate !== null ? model.apparentRate * 100 : 0;
        const rememberedMissPct = model.rememberedTotal > 0 ? 100 - rememberedHitPct : 100;
        $('jde-remembered-hit-bar').style.width = `${rememberedHitPct}%`;
        $('jde-remembered-miss-bar').style.width = `${rememberedMissPct}%`;
        $('jde-remembered-hit-label').textContent =
            rememberedHitPct >= 8 ? `${Math.round(rememberedHitPct)}%` : '';
        $('jde-remembered-miss-label').textContent =
            model.rememberedTotal > 0 && rememberedMissPct >= 8 ? `${Math.round(rememberedMissPct)}%` : '';

        // Metric cards.
        $('jde-hits-survive').textContent = formatCount(model.rememberedHits);
        $('jde-misses-survive').textContent = formatCount(model.rememberedMisses);
        $('jde-forgotten').textContent = formatCount(model.forgotten);

        // Plain-language summary sentence.
        const inflationEl = $('jde-inflation-text');
        if (model.rememberedTotal === 0) {
            inflationEl.textContent =
                'Nothing survives into the remembered record, so there is no apparent track record.';
        } else {
            inflationEl.textContent =
                `The remembered record makes a ${Math.round(model.actualRate * 100)}% hit rate look like ` +
                `${Math.round(model.apparentRate * 100)}%.`;
        }
    }

    Object.values(sliders).forEach((slider) => {
        slider.addEventListener('input', render);
    });

    // "What does non-hit mean?" definition dialog. Uses the native <dialog>
    // element with a showModal()/close() fallback to open/removeAttribute
    // for older browsers that support the element but not those methods.
    const nonhitDialog = $('jde-nonhit-dialog');
    const nonhitDialogClose = $('jde-nonhit-dialog-close');
    const nonhitInfoButtons = root.querySelectorAll('.jde-nonhit-info');

    nonhitInfoButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (typeof nonhitDialog.showModal === 'function') {
                nonhitDialog.showModal();
            } else {
                nonhitDialog.setAttribute('open', '');
            }
        });
    });

    nonhitDialogClose.addEventListener('click', () => {
        if (typeof nonhitDialog.close === 'function') {
            nonhitDialog.close();
        } else {
            nonhitDialog.removeAttribute('open');
        }
    });

    // Clicking the dialog's backdrop (a click landing on the <dialog> element
    // itself, not any of its content) closes it, matching native <dialog>
    // light-dismiss conventions.
    nonhitDialog.addEventListener('click', (event) => {
        if (event.target === nonhitDialog && typeof nonhitDialog.close === 'function') {
            nonhitDialog.close();
        }
    });

    $('jde-reset').addEventListener('click', () => {
        sliders.n.value = DEFAULTS.n;
        sliders.hitRate.value = DEFAULTS.hitRate;
        sliders.hitRecall.value = DEFAULTS.hitRecall;
        sliders.missRecall.value = DEFAULTS.missRecall;
        sliders.reinterpret.value = DEFAULTS.reinterpret;
        render();
    });

    render();
}

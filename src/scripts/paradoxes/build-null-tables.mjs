#!/usr/bin/env node
/**
 * Offline precompute driver for Part 4's null-distribution table (spec section 24, section
 * 39 of the source "context reveal" spec this design builds on).
 *
 * NOT shipped to the browser -- this driver script itself is never imported by any page
 * script; only its JSON output is fetched at runtime. This is a one-time (or
 * re-run-when-tuning-changes) developer tool. Run it manually:
 *
 *     node src/scripts/paradoxes/build-null-tables.mjs
 *
 * It writes public/data/coincidence-null-tables.json, which this-couldnt-be-coincidence.js
 * fetches at runtime (Astro serves everything under public/ as static files at the site
 * root, so the page fetches it at `${base}data/coincidence-null-tables.json`). Regenerate
 * this file if DEFAULT_BLACK_CELLS, MIN/MAX_BLACK_CELLS, or the cluster-detection rule in
 * coincidence-grids.js ever changes -- the table is only valid for the exact
 * generator/detector it was built from.
 *
 * Scope, per spec section 24: ONE dimension only (black-cell count), squares-only mode
 * (there is no other mode -- Connected mode was dropped, spec section 25), no per-generator
 * baseline needed for the structured side (it is not a statistical comparison target).
 * This is a large reduction from the original four-generator/two-mode plan.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MIN_BLACK_CELLS, MAX_BLACK_CELLS } from './coincidence-grids.js';
import { buildNullDistribution } from './coincidence-stats.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TRIALS_PER_DENSITY = 100000; // spec section 24's recommended minimum
// __dirname is src/scripts/paradoxes/; the site's public/ dir is four levels up from there.
const OUTPUT_PATH = join(__dirname, '..', '..', '..', 'public', 'data', 'coincidence-null-tables.json');

function main() {
    const tables = {};
    const start = Date.now();
    for (let b = MIN_BLACK_CELLS; b <= MAX_BLACK_CELLS; b++) {
        const t0 = Date.now();
        const dist = buildNullDistribution({ blackCells: b, trials: TRIALS_PER_DENSITY });
        tables[b] = { trials: dist.trials, counts: dist.counts };
        const secs = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  B=${b}: ${TRIALS_PER_DENSITY.toLocaleString()} trials in ${secs}s, ` +
            `counts up to ${dist.maxObserved} squares`);
    }
    const totalSecs = ((Date.now() - start) / 1000).toFixed(1);

    const output = {
        generatedAt: new Date().toISOString(),
        gridSize: 20,
        trialsPerDensity: TRIALS_PER_DENSITY,
        note: 'Squares-only cluster rule. Built from the UNCONDITIONED random generator ' +
              '(generateRandomGrid), never from try-until-found-filtered grids. See ' +
              'coincidence-stats.js module doc comment.',
        tables
    };
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(output));
    console.log(`\nWrote ${OUTPUT_PATH} in ${totalSecs}s total.`);
}

main();

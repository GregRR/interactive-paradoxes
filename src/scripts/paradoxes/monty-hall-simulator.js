/**
 * Exhibit: The Monty Hall Problem (Part 2 — 100-Trial Simulator)
 *
 * Belongs to: Group 5 (Information & Conditional Probability), same page as Part 1
 * (src/scripts/paradoxes/monty-hall-problem.js). This file is fully independent of that
 * one -- it shares no state or DOM ids with Part 1's single-round game, so the two can be
 * developed and read separately even though they live on the same page.
 *
 * Depends on: nothing from core.js. Draws on two plain <canvas> elements, so it does not
 * use Plotly -- there's no continuous data to plot, just a fixed-size grid of discrete
 * win/loss outcomes, which a canvas (as in the base-rate-neglect exhibit) redraws far
 * faster than 100+ individually-styled DOM nodes per grid would.
 *
 * DOM ids used: mhs-stay-canvas, mhs-switch-canvas, mhs-stay-wins, mhs-switch-wins,
 *   mhs-stay-pct, mhs-switch-pct, mhs-total-trials(-2/-3), mhs-status-text,
 *   mhs-status-stay, mhs-status-switch, mhs-trial-num, mhs-progress-bar, mhs-step-btn,
 *   mhs-run-btn, mhs-reset-btn
 *
 * Loaded by: src/pages/monty-hall-problem.astro, after Part 1's script tag. The page's
 * markup exists before this module runs, so it draws the first (empty) grids immediately.
 *
 * ----------------------------------------------------------------------------------
 * WHAT THIS ADDS BEYOND PART 1
 *
 * Part 1 lets a visitor play a handful of rounds themselves. That's enough to feel the
 * mechanic, but a handful of personally-played rounds is far too small a sample to
 * settle an argument with your own intuition -- a run of 3 stays and 2 switches, all
 * wins, proves nothing about the long-run 1/3-vs-2/3 split. This part runs 100
 * independent trials of BOTH strategies at once (not one strategy chosen per round, as
 * in Part 1) so the visitor can watch both win rates converge toward their true values
 * side by side.
 *
 * ----------------------------------------------------------------------------------
 * RESEARCH NOTES (see docs/references.md for full citations)
 *
 * Ancker, Benda, & Zikmund-Fisher's 2024 review of animated/interactive probability
 * graphics found animation alone doesn't reliably beat a static display for
 * comprehension -- so this exhibit treats the step-by-step reveal as pacing/engagement,
 * not as the thing that teaches the concept, and always keeps an explicit running
 * win/attempt count and percentage on screen next to the grid. That persistent number is
 * the part doing the teaching; the animation just makes it easier to sit through.
 *
 * This matters more than it might seem: Petrocelli & Harris (2011) found that even
 * after 60 rounds of actively PLAYING the Monty Hall problem, participants' memory of
 * their own results was biased by counterfactual thinking -- they over-remembered
 * stick-wins and under-remembered switch-wins, and never approached the correct 67%
 * switch rate in their self-assessment even when their actual results were close to it.
 * If memory of outcomes can't be trusted, the exhibit can't rely on visitors to keep a
 * mental tally either -- hence the always-visible numeric scoreboard here, exactly as in
 * Part 1.
 *
 * Both grids fill in a fixed reading order (left to right, top to bottom) rather than
 * scattering outcomes randomly across the grid. Price et al. (2022) found that a
 * randomly-scattered icon-array fill pattern distorts perceived risk relative to an
 * ordered fill -- people read "spread out" as "more/less than it is" independent of the
 * actual count. A fixed reading order keeps the only thing that determines the visual
 * proportion the actual number of colored cells, not their arrangement.
 *
 * Classic findings on the misperception of short random sequences (the "hot hand"
 * literature: Gilovich, Vallone, & Tversky 1985; Ayton & Fischer 2004) show streak
 * illusions are strongest at small sample sizes and fade as more outcomes accumulate --
 * which is the whole point of running 100 trials rather than the ~5-10 a visitor might
 * play by hand in Part 1: it's enough that the noise of individual streaks visibly
 * washes out and the percentage stabilizes near 33%/67%.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MHS_TOTAL_TRIALS = 100;
const MHS_GRID_COLS = 10; // 10x10 = 100 cells per board

// Colorblind-safe outcome colors, consistent with the rest of the site's palette
// (base-rate-neglect uses the same red/amber/slate family for its icon grid).
const MHS_COLOR_WON = '#10b981';       // emerald-500
const MHS_COLOR_LOST = '#e2e8f0';      // slate-200
// slate-100 with a slate-200 outline, distinct enough from the white canvas background
// to read as "a cell waiting to be filled in" rather than disappearing into the
// background the way an even lighter fill (e.g. slate-50, matching the surrounding
// card) did -- that made the whole grid look blank/broken before any trial had run.
const MHS_COLOR_UNPLAYED = '#f1f5f9';  // slate-100
const MHS_COLOR_UNPLAYED_BORDER = '#e2e8f0'; // slate-200

// ---------------------------------------------------------------------------
// Element references
// ---------------------------------------------------------------------------
const stayCanvas = document.getElementById('mhs-stay-canvas');
const switchCanvas = document.getElementById('mhs-switch-canvas');
const stayWinsEl = document.getElementById('mhs-stay-wins');
const switchWinsEl = document.getElementById('mhs-switch-wins');
const stayPctEl = document.getElementById('mhs-stay-pct');
const switchPctEl = document.getElementById('mhs-switch-pct');
const statusTextEl = document.getElementById('mhs-status-text');
const statusStayEl = document.getElementById('mhs-status-stay');
const statusSwitchEl = document.getElementById('mhs-status-switch');
const trialNumEl = document.getElementById('mhs-trial-num');
const progressBarEl = document.getElementById('mhs-progress-bar');
const stepBtn = document.getElementById('mhs-step-btn');
const runBtn = document.getElementById('mhs-run-btn');
const resetBtn = document.getElementById('mhs-reset-btn');

// The "/ 100" labels appear three times in the markup (next to each scoreboard and in
// the progress line); keep them all in sync in case MHS_TOTAL_TRIALS is ever changed.
['mhs-total-trials', 'mhs-total-trials-2', 'mhs-total-trials-3'].forEach((id) => {
    document.getElementById(id).textContent = MHS_TOTAL_TRIALS;
});

// ---------------------------------------------------------------------------
// Simulation state
// ---------------------------------------------------------------------------
let trials = [];        // pre-generated outcomes for all MHS_TOTAL_TRIALS rounds
let currentTrial = 0;   // how many trials have been revealed so far
let isRunning = false;
let runTimer = null;

/**
 * Pre-generates all trial outcomes up front (rather than one at a time as the visitor
 * steps through) so that "Run All" can play them back on a steady timer without doing
 * fresh randomization mid-animation, and so a full run's overall win rate is fixed the
 * moment Reset is pressed -- useful if a visitor wants to compare notes with someone
 * else looking at "the same" simulation isn't the goal here, but it keeps the stepping
 * and running code paths simple: both just reveal one more precomputed trial.
 *
 * Each trial independently simulates: a random prize door, a random first pick, the
 * host revealing a goat behind a door that is never the pick and never the prize (if
 * the player's pick happens to be the prize, the host's choice between the two goat
 * doors doesn't matter for the outcome and isn't tracked here), and the two resulting
 * outcomes -- what "stay" would have won and what "switch" would have won -- computed
 * from that SAME underlying round. This mirrors the real game: for any single round,
 * staying and switching are mutually exclusive, but simulating both outcomes from one
 * underlying prize/pick/host-reveal is what lets two side-by-side strategy scoreboards
 * be shown from the same 100 rounds rather than needing 200 independent trials.
 */
function generateTrials() {
    const result = [];
    for (let i = 0; i < MHS_TOTAL_TRIALS; i++) {
        const prizeDoor = 1 + Math.floor(Math.random() * 3);
        const pickedDoor = 1 + Math.floor(Math.random() * 3);

        const goatCandidates = [1, 2, 3].filter((d) => d !== pickedDoor && d !== prizeDoor);
        const hostDoor = goatCandidates[Math.floor(Math.random() * goatCandidates.length)];
        const switchDoor = [1, 2, 3].find((d) => d !== pickedDoor && d !== hostDoor);

        result.push({
            prizeDoor,
            pickedDoor,
            hostDoor,
            switchDoor,
            stayWon: pickedDoor === prizeDoor,
            switchWon: switchDoor === prizeDoor,
        });
    }
    return result;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Draws one 10x10 outcome grid on a canvas. `wonFlags` is an array of booleans, one per
 * trial revealed so far (length === currentTrial); remaining cells up to
 * MHS_TOTAL_TRIALS are drawn as "not yet run." Cells fill in a fixed reading order
 * (row-major, left to right, top to bottom) rather than at randomized positions -- see
 * the file-level research note on Price et al. (2022) for why a fixed fill order matters
 * for accurately perceiving the emerging proportion.
 */
function drawGrid(canvas, wonFlags) {
    const cssWidth = canvas.clientWidth || 280;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssWidth * dpr;
    canvas.height = cssWidth * dpr; // square
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssWidth);

    const cellSize = cssWidth / MHS_GRID_COLS;
    const cellPad = Math.max(1, cellSize * 0.08);
    const cellDraw = cellSize - cellPad * 2;
    const cornerRadius = Math.max(1, cellDraw * 0.15);

    for (let i = 0; i < MHS_TOTAL_TRIALS; i++) {
        const col = i % MHS_GRID_COLS;
        const row = Math.floor(i / MHS_GRID_COLS);
        const x = col * cellSize + cellPad;
        const y = row * cellSize + cellPad;

        const isUnplayed = i >= wonFlags.length;
        const color = isUnplayed ? MHS_COLOR_UNPLAYED : (wonFlags[i] ? MHS_COLOR_WON : MHS_COLOR_LOST);

        ctx.fillStyle = color;
        ctx.beginPath();
        // roundRect is broadly supported in evergreen browsers; a plain fillRect
        // fallback keeps this from hard-failing on the rare browser without it.
        if (ctx.roundRect) {
            ctx.roundRect(x, y, cellDraw, cellDraw, cornerRadius);
        } else {
            ctx.rect(x, y, cellDraw, cellDraw);
        }
        ctx.fill();
        // Unplayed cells also get a thin outline: fill color alone (even the slightly
        // darker slate-100 used here) can still read as "blank" rather than "waiting"
        // against the white canvas, especially on lower-contrast displays.
        if (isUnplayed) {
            ctx.strokeStyle = MHS_COLOR_UNPLAYED_BORDER;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

/** Redraws both grids, the scoreboards, and the status/progress line from current state. */
function render() {
    const stayFlags = trials.slice(0, currentTrial).map((t) => t.stayWon);
    const switchFlags = trials.slice(0, currentTrial).map((t) => t.switchWon);
    drawGrid(stayCanvas, stayFlags);
    drawGrid(switchCanvas, switchFlags);

    const stayWinCount = stayFlags.filter(Boolean).length;
    const switchWinCount = switchFlags.filter(Boolean).length;

    stayWinsEl.textContent = stayWinCount;
    switchWinsEl.textContent = switchWinCount;
    stayPctEl.textContent = currentTrial > 0 ? ((stayWinCount / currentTrial) * 100).toFixed(1) : '0.0';
    switchPctEl.textContent = currentTrial > 0 ? ((switchWinCount / currentTrial) * 100).toFixed(1) : '0.0';

    trialNumEl.textContent = currentTrial;
    progressBarEl.style.width = `${(currentTrial / MHS_TOTAL_TRIALS) * 100}%`;

    if (currentTrial > 0) {
        const last = trials[currentTrial - 1];
        statusStayEl.textContent = `Door ${last.pickedDoor} (${last.stayWon ? 'Won' : 'Lost'})`;
        statusSwitchEl.textContent = `Door ${last.switchDoor} (${last.switchWon ? 'Won' : 'Lost'})`;
        statusTextEl.innerHTML = currentTrial < MHS_TOTAL_TRIALS
            ? `Trial <strong class="text-amber-600">${currentTrial}</strong>: the prize was behind Door <strong>${last.prizeDoor}</strong>.`
            : `All ${MHS_TOTAL_TRIALS} trials complete. The prize was behind Door <strong>${last.prizeDoor}</strong> on the last one.`;
    } else {
        statusStayEl.textContent = '—';
        statusSwitchEl.textContent = '—';
        statusTextEl.textContent = 'Ready to run. Press "Step" or "Run All" below.';
    }

    stepBtn.disabled = currentTrial >= MHS_TOTAL_TRIALS;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function revealNextTrial() {
    if (currentTrial >= MHS_TOTAL_TRIALS) {
        stopRun();
        return;
    }
    currentTrial += 1;
    render();
}

function startRun() {
    if (isRunning) return;
    if (currentTrial >= MHS_TOTAL_TRIALS) resetSimulation();

    isRunning = true;
    stepBtn.disabled = true;
    runBtn.disabled = true;
    runBtn.textContent = 'Running…';

    // 50ms per trial -> all 100 trials reveal over ~5 seconds, quick enough to hold
    // attention but slow enough that the grid visibly fills in rather than jumping
    // straight to a final state (see the file-level note on animation vs. static
    // display: the animation here is for pacing/engagement, not comprehension on its
    // own, so it doesn't need to be slower than this to do its job).
    runTimer = setInterval(() => {
        if (currentTrial < MHS_TOTAL_TRIALS) {
            currentTrial += 1;
            render();
        } else {
            stopRun();
        }
    }, 50);
}

function stopRun() {
    isRunning = false;
    clearInterval(runTimer);
    runTimer = null;
    stepBtn.disabled = currentTrial >= MHS_TOTAL_TRIALS;
    runBtn.disabled = false;
    runBtn.textContent = 'Run All 100 Trials';
}

function resetSimulation() {
    stopRun();
    trials = generateTrials();
    currentTrial = 0;
    render();
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
stepBtn.addEventListener('click', revealNextTrial);
runBtn.addEventListener('click', startRun);
resetBtn.addEventListener('click', resetSimulation);

// Redraw on resize so the canvas backing store stays matched to its displayed size
// (the same reason base-rate-neglect's canvas redraws on resize) -- without this the
// grid would stay crisp only at the viewport width it happened to be drawn at.
window.addEventListener('resize', render);

resetSimulation();

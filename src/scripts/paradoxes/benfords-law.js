/**
 * Exhibit 5: Benford's Law
 *
 * Belongs to: Group 4 (Hidden Structures in Chaos)
 * Depends on: nothing from core.js. Draws hand-built DOM/CSS bars rather than
 * Plotly, so the chart, reference marks, and log-scale diagram can share exact
 * pixel alignment with the summary metrics beside them.
 * DOM ids used: bl-dataset, bl-n, bl-n-out, bl-chart-sub, bl-chart,
 * bl-context-title, bl-context-copy, bl-fit-badge, bl-fit-value,
 * bl-digit1-out, bl-digit9-out, bl-spread-out, bl-benford-ratio-out,
 * bl-range-out, bl-orders-out, bl-scale-block, bl-scale, bl-scale-track,
 * bl-context-note
 *
 * Loaded by: src/pages/benfords-law.astro. The page's markup exists before this
 * module runs, so it wires up its controls and draws the first frame immediately.
 *
 * Research basis (see docs/references.md for full citations): Benford's Law
 * (Newcomb 1881; Benford 1938) predicts P(first digit = d) = log10(1 + 1/d).
 * Good real-world fits are associated with data spanning several orders of
 * magnitude and arising from multiplicative or mixed-scale processes (Hill
 * 1995; Berger & Hill 2011, 2015). Poor fits are associated with assigned
 * identifiers and tightly bounded values (Nigrini 1999). The six dataset
 * modes below -- two exact mathematical sequences, three synthetic-but-
 * empirically-motivated analogues (population, salary, gene expression), and
 * one constructed non-Benford counterexample (serial numbers) -- are chosen
 * to let a visitor compare a case that fits well against cases that do not,
 * rather than presenting Benford's Law as a rule that every dataset obeys.
 */

const $ = (id) => document.getElementById(id);

// Benford's predicted probability that a number's first digit is d.
const benford = (d) => Math.log10(1 + 1 / d);

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const state = {
    kind: 'growth',
    nByKind: {
        growth: 5000,
        fibonacci: 500,
        population: 5000,
        salary: 5000,
        serial: 5000,
        gene: 5000,
    },
};

// First significant digit of x (1-9), or 0 for x === 0.
function firstDigit(x) {
    x = Math.abs(x);
    if (!x) return 0;
    while (x >= 10) x /= 10;
    while (x < 1) x *= 10;
    return Math.floor(x);
}

// Deterministic PRNG (mulberry-style LCG) so synthetic examples stay visually
// stable across reloads instead of reshuffling every time the page loads.
function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296);
}

// Box-Muller transform for a standard-normal sample from the uniform rng above.
function normal(rand) {
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const configs = {
    growth: {
        title: 'Proportional growth',
        copy: "Each value is 0.1% larger than the one before it. Small, repeated percentage increases move through the possible first digits unevenly: numbers spend much longer beginning with 1 than beginning with 9. That is the basic visual mechanism behind Benford's Law.",
        note: 'This is a mathematical demonstration, not a real-world dataset. The 0.1% growth rate is fixed because it produces a smooth, easy-to-read progression.',
        showScale: true,
        min: 100,
        max: 20000,
        step: 100,
    },
    fibonacci: {
        title: 'Fibonacci numbers',
        copy: 'The sequence begins 1, 1, 2, 3, 5, 8, 13, 21… Each term is the sum of the two before it. As the sequence grows, each number becomes about 1.618 times the previous one, the golden ratio. So the later sequence behaves almost like repeated multiplication by the same factor. That factor never lines up into a repeating base-10 cycle, and over many terms the leading digits spread through 1-9 in Benford’s proportions.',
        note: 'This is the actual mathematical Fibonacci sequence, not a synthetic dataset. At small sample sizes it looks irregular, with one observation the only value is 1, but its first-digit distribution approaches Benford as more terms are included.',
        showScale: true,
        min: 1,
        max: 500,
        step: 1,
    },
    population: {
        title: 'Population-like values',
        copy: "Population sizes can range from tiny communities to huge cities and regions. When many differently sized places are combined, the values span several scales rather than clustering in one narrow band. That kind of broad, mixed dataset often comes surprisingly close to Benford's pattern.",
        note: 'These are generated population-like values, not downloaded census records. Published analyses have found U.S. county populations to follow Benford closely.',
        showScale: false,
        min: 100,
        max: 20000,
        step: 100,
    },
    salary: {
        title: 'Salary-like values',
        copy: 'Salaries usually live inside a much narrower practical range. There may be a floor, a typical middle, and an upper limit rather than values spread smoothly across many powers of ten. Because of those boundaries, the first digits can depart strongly from Benford.',
        note: 'These are generated salary-like values, not payroll records. This example illustrates why bounded or tightly constrained measurements should not automatically be expected to follow Benford.',
        showScale: false,
        min: 100,
        max: 20000,
        step: 100,
    },
    serial: {
        title: 'Assigned serial numbers',
        copy: "Serial numbers are labels, not measurements. If people or a computer simply assign identifiers across a fixed numerical range, there is no natural growth or scale process pushing the first digits toward Benford. An evenly assigned set can instead look close to 11.1% for every first digit.",
        note: 'This is an intentionally assigned numerical sequence. Telephone numbers, account numbers, ZIP codes and similar identifiers are standard examples where Benford should not automatically be expected.',
        showScale: false,
        min: 100,
        max: 20000,
        step: 100,
    },
    gene: {
        title: 'Gene expression levels',
        copy: 'RNA sequencing measures how strongly thousands of genes are expressed. In one tissue, some genes may be barely detectable while others are enormously abundant, so the measurements can spread across a very wide range. Published mouse and human RNA-seq datasets have shown Benford-like first digits across whole gene sets, a biological example that is not simply another growth sequence.',
        note: 'This visualization uses generated RNA-seq-like expression levels, not patient or laboratory records. Peer-reviewed studies have reported Benford-like first-digit distributions in real mouse and human gene-expression datasets.',
        showScale: false,
        min: 1,
        max: 10000,
        step: 1,
    },
};

// Generates n illustrative values for the given dataset mode.
function makeValues(kind, n) {
    const values = [];

    if (kind === 'growth') {
        let x = 1.23456789;
        for (let i = 0; i < n; i++) {
            values.push(x);
            x *= 1.001;
            if (x > 1e120) x /= 1e100;
        }
    } else if (kind === 'fibonacci') {
        const exact = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];
        const phi = (1 + Math.sqrt(5)) / 2;
        const logPhi = Math.log10(phi);
        const logSqrt5 = 0.5 * Math.log10(5);

        for (let k = 1; k <= n; k++) {
            if (k <= exact.length) {
                values.push(exact[k - 1]);
            } else {
                // Binet: F_k ~= phi^k / sqrt(5). The fractional part of log10(F_k)
                // determines the leading significand, so we never need to
                // construct an astronomically large F_k.
                const logF = k * logPhi - logSqrt5;
                const frac = logF - Math.floor(logF);
                values.push(Math.pow(10, frac));
            }
        }
    } else if (kind === 'population') {
        const r = rng(19095);
        for (let i = 0; i < n; i++) {
            // Broad synthetic population-like sizes: a roughly log-spread
            // backbone over ~5.5 orders of magnitude, plus a little noise.
            const log10x = 2.0 + 5.5 * r() + 0.1 * normal(r);
            values.push(Math.max(50, Math.pow(10, log10x)));
        }
    } else if (kind === 'salary') {
        const r = rng(77123);
        for (let i = 0; i < n; i++) {
            // Constrained lognormal-like annual salaries, deliberately
            // bounded to illustrate a poor Benford candidate.
            let x = Math.exp(Math.log(65000) + 0.42 * normal(r));
            x = Math.max(20000, Math.min(300000, x));
            values.push(x);
        }
    } else if (kind === 'serial') {
        for (let i = 0; i < n; i++) {
            // Evenly assigned six-digit identifiers.
            values.push(100000 + Math.floor(900000 * ((i + 0.5) / n)));
        }
    } else if (kind === 'gene') {
        const r = rng(42817);
        for (let i = 0; i < n; i++) {
            // Synthetic positive RNA-seq-like expression magnitudes. A broad
            // lognormal distribution produces many low-expression values and
            // progressively fewer very high-expression values over several
            // scales. Illustrative values only, not actual RNA-seq measurements.
            let x = Math.exp(Math.log(100) + 2.0 * normal(r));
            x = Math.max(0.01, Math.min(1e7, x));
            values.push(x);
        }
    }

    return values;
}

// Reduces a value list to per-digit observed frequencies, the sample's
// min/max, and the average absolute gap (in percentage points) from Benford.
function summarize(values) {
    const counts = Array(10).fill(0);
    let min = Infinity;
    let max = -Infinity;

    values.forEach((x) => {
        const d = firstDigit(x);
        if (d) counts[d]++;
        if (x < min) min = x;
        if (x > max) max = x;
    });

    const obs = counts.slice(1).map((c) => c / values.length);
    const gap = (obs.reduce((s, p, i) => s + Math.abs(p - benford(i + 1)), 0) / 9) * 100;

    return { obs, min, max, gap };
}

// Descriptive UI heuristic only, not a formal goodness-of-fit test.
function fitLabel(gap) {
    if (gap < 1.0) return ['Close', 'bg-emerald-50 text-emerald-700'];
    if (gap < 2.5) return ['Somewhat close', 'bg-amber-50 text-amber-800'];
    return ['Poor fit', 'bg-rose-50 text-rose-700'];
}

function fmtRange(x) {
    if (x >= 1e9) return (x / 1e9).toFixed(1) + 'B';
    if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M';
    if (x >= 1e3) return (x / 1e3).toFixed(1) + 'k';
    if (x >= 10) return nf.format(x);
    if (x >= 1) return x.toFixed(1);
    return x.toPrecision(2);
}

// The Fibonacci mode's displayed range is derived from Binet's formula
// directly, rather than from the sampled value array, since the sampled
// array stores only leading significands (see makeValues above) and cannot
// recover the true magnitude of large terms.
function fibonacciRange(n) {
    if (n <= 20) {
        let a = 1;
        let b = 1;
        if (n === 1) return { label: '1 → 1', orders: 0 };
        for (let k = 3; k <= n; k++) {
            const c = a + b;
            a = b;
            b = c;
        }
        const last = n === 2 ? 1 : b;
        return {
            label: `1 → ${last.toLocaleString('en-US')}`,
            orders: last > 0 ? Math.log10(last) : 0,
        };
    }

    const phi = (1 + Math.sqrt(5)) / 2;
    const logF = n * Math.log10(phi) - 0.5 * Math.log10(5);
    const exponent = Math.floor(logF);
    const mantissa = Math.pow(10, logF - exponent);

    return {
        label: `1 → ~${mantissa.toFixed(2)}×10^${exponent}`,
        orders: Math.max(0, logF),
    };
}

function renderChart(obs) {
    const el = $('bl-chart');
    el.innerHTML = '';
    const maxY = 0.34;

    for (let d = 1; d <= 9; d++) {
        const p = obs[d - 1];
        const ref = benford(d);

        const col = document.createElement('div');
        col.className = 'bl-bar-col';
        col.innerHTML = `
            <div class="bl-bar-area">
                <div class="bl-bar" style="height:${Math.min(100, (p / maxY) * 100)}%"></div>
                <div class="bl-reference" style="bottom:${Math.min(100, (ref / maxY) * 100)}%"></div>
            </div>
            <div class="bl-bar-pct">${(p * 100).toFixed(1)}%</div>
            <div class="bl-bar-label">${d}</div>
        `;
        el.appendChild(col);
    }
}

function renderScale() {
    const track = $('bl-scale-track');
    const scale = $('bl-scale');
    track.innerHTML = '';
    scale.querySelectorAll('.bl-segment-label, .bl-segment-pct').forEach((e) => e.remove());

    for (let d = 1; d <= 9; d++) {
        const left = Math.log10(d) * 100;
        const right = Math.log10(d + 1) * 100;
        const width = right - left;
        const mid = left + width / 2;

        const seg = document.createElement('div');
        seg.className = 'bl-segment';
        seg.style.left = left + '%';
        seg.style.width = width + '%';
        track.appendChild(seg);

        const pct = document.createElement('div');
        pct.className = 'bl-segment-pct';
        pct.style.left = `calc(18px + (100% - 36px) * ${mid / 100})`;
        pct.textContent = (benford(d) * 100).toFixed(1) + '%';
        scale.appendChild(pct);

        const label = document.createElement('div');
        label.className = 'bl-segment-label';
        label.style.left = pct.style.left;
        label.textContent = String(d);
        scale.appendChild(label);
    }
}

function configureSlider() {
    const cfg = configs[state.kind];
    const slider = $('bl-n');

    slider.min = String(cfg.min);
    slider.max = String(cfg.max);
    slider.step = String(cfg.step);

    let value = state.nByKind[state.kind];
    value = Math.max(cfg.min, Math.min(cfg.max, value));
    state.nByKind[state.kind] = value;
    slider.value = String(value);
}

function render() {
    const kind = state.kind;
    const cfg = configs[kind];
    const n = Number($('bl-n').value);

    state.nByKind[kind] = n;

    $('bl-n-out').textContent = n.toLocaleString('en-US');
    $('bl-chart-sub').textContent = `${n.toLocaleString('en-US')} observation${n === 1 ? '' : 's'}`;

    $('bl-context-title').textContent = cfg.title;
    $('bl-context-copy').textContent = cfg.copy;
    $('bl-context-note').textContent = cfg.note;

    const s = summarize(makeValues(kind, n));
    renderChart(s.obs);

    $('bl-digit1-out').textContent = (s.obs[0] * 100).toFixed(1) + '%';
    $('bl-digit9-out').textContent = (s.obs[8] * 100).toFixed(1) + '%';
    $('bl-spread-out').textContent = s.obs[8] > 0 ? (s.obs[0] / s.obs[8]).toFixed(1) + '×' : '—';

    const benfordRatio = benford(1) / benford(9);
    $('bl-benford-ratio-out').textContent = benfordRatio.toFixed(1) + '×';

    $('bl-fit-value').textContent = s.gap.toFixed(2) + ' pp';
    const [label, classes] = fitLabel(s.gap);
    $('bl-fit-badge').textContent = label;
    $('bl-fit-badge').className = 'px-2 py-0.5 rounded-full text-[11px] font-bold ' + classes;

    if (kind === 'fibonacci') {
        const fr = fibonacciRange(n);
        $('bl-range-out').textContent = fr.label;
        $('bl-orders-out').textContent = fr.orders.toFixed(1);
    } else {
        $('bl-range-out').textContent = `${fmtRange(s.min)} → ${fmtRange(s.max)}`;
        const orders = s.min > 0 ? Math.log10(s.max / s.min) : 0;
        $('bl-orders-out').textContent = orders.toFixed(1);
    }

    $('bl-scale-block').style.display = cfg.showScale ? 'block' : 'none';
}

$('bl-n').addEventListener('input', render);

$('bl-dataset').addEventListener('change', () => {
    state.kind = $('bl-dataset').value;
    configureSlider();
    render();
});

renderScale();
configureSlider();
render();

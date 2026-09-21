/**
 * UI logic for Part 4: "When Does a Pattern Mean Something?"
 *
 * All math lives in pattern-or-coincidence-stats.js (pure, DOM-free, unit
 * tested). This file only wires the five preselected rounds (spec section
 * 22, never regenerated at runtime -- spec section 54) to the page.
 *
 * Flow per round: build 60-slot timeline -> visitor picks one of three
 * answers -> lock answer controls -> reveal generator + evidence category +
 * ratio + message (spec section 20) -> "Show me the math" becomes available
 * -> "Next round" becomes available -> fade out / replace / fade in for the
 * next round (spec section 38) -> after round 5, replace the challenge with
 * the five-round synthesis, then the four-part synthesis, then the closing
 * miracles/coincidences section (spec sections 39-42).
 */
import {
    buildAllRounds,
    formatEvidenceRatio,
    SCAN_WINDOW,
} from './pattern-or-coincidence-stats.js';

const rounds = buildAllRounds();
const TOTAL_ROUNDS = rounds.length;

const els = {
    roundLabel: document.getElementById('pc-round-label'),
    score: document.getElementById('pc-score'),
    scoreValue: document.getElementById('pc-score-value'),
    sequence: document.getElementById('pc-sequence'),
    sequenceSummary: document.getElementById('pc-sequence-summary'),
    answerButtons: Array.from(document.querySelectorAll('.pc-answer-btn')),
    reveal: document.getElementById('pc-reveal'),
    generator: document.getElementById('pc-generator'),
    evidenceCategory: document.getElementById('pc-evidence-category'),
    evidenceRatio: document.getElementById('pc-evidence-ratio'),
    box: document.getElementById('pc-box'),
    msg: document.querySelector('#pc-box .pc-msg'),
    showMath: document.getElementById('pc-show-math'),
    nextRound: document.getElementById('pc-next-round'),
    dialog: document.getElementById('pc-math-dialog'),
    dialogClose: document.getElementById('pc-dialog-close'),
    dialogCloseBottom: document.getElementById('pc-dialog-close-bottom'),
    modalRatioLine: document.getElementById('pc-modal-ratio-line'),
    modalWindow: document.getElementById('pc-modal-window'),
    modalScanLine: document.getElementById('pc-modal-scan-line'),
    synthesis: document.getElementById('pc-synthesis'),
    seriesSynthesis: document.getElementById('pc-series-synthesis'),
    closing: document.getElementById('pc-closing'),
    challengeRegion: document.getElementById('pc-challenge'),
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const GENERATOR_LABEL = {
    constant: 'Constant chance',
    dependent: 'Event-dependent process',
};
const EVIDENCE_LABEL = {
    constant: 'Favors constant chance',
    unclear: 'Not enough to tell',
    dependence: 'Favors event-dependence',
};

let state = {
    roundIndex: 0,
    answered: false,
    evidenceMatches: 0,
    userResponses: [],
};

/** Builds the 60 cells once; only their fill state is updated per round. */
function buildSequenceCells() {
    els.sequence.innerHTML = '';
    for (let i = 0; i < 60; i++) {
        const cell = document.createElement('div');
        cell.className = 'pc-cell';
        cell.dataset.index = String(i);
        els.sequence.appendChild(cell);
    }
}

/** Paints one round's sequence into the existing 60 cells (no rebuild). */
function paintSequence(round) {
    const cells = els.sequence.children;
    for (let i = 0; i < 60; i++) {
        const cell = cells[i];
        const isEvent = round.sequence[i] === 1;
        cell.dataset.event = String(isEvent);
        cell.dataset.scanHighlight = 'false';
        cell.setAttribute('aria-hidden', 'true');
    }
    const eventPositions = round.sequence
        .map((v, i) => (v === 1 ? i + 1 : null))
        .filter((v) => v !== null);
    els.sequenceSummary.textContent = `60 opportunities. Events occurred at positions: ${eventPositions.join(', ') || 'none'}.`;
}

/** Highlights the densest 6-slot window in the main sequence (used only inside the modal's mini-copy, per spec section 36: the main sequence itself never changes). */
function renderModalWindow(round) {
    els.modalWindow.innerHTML = '';
    const start = round.scanWindowStart;
    for (let k = 0; k < SCAN_WINDOW; k++) {
        const isEvent = round.sequence[start + k] === 1;
        const cell = document.createElement('div');
        cell.className = 'pc-cell';
        cell.dataset.event = String(isEvent);
        cell.setAttribute('aria-hidden', 'true');
        els.modalWindow.appendChild(cell);
    }
}

function setMessage(text, { flash = true } = {}) {
    els.msg.textContent = text;
    if (flash && !prefersReducedMotion) {
        els.box.classList.remove('pc-flash');
        // Force reflow so the animation can be retriggered on repeated messages.
        void els.box.offsetWidth;
        els.box.classList.add('pc-flash');
    }
}

function updateRoundLabel() {
    els.roundLabel.textContent = `Round ${state.roundIndex + 1} of ${TOTAL_ROUNDS}`;
    els.scoreValue.textContent = String(state.evidenceMatches);
}

function resetAnswerButtons() {
    els.answerButtons.forEach((btn) => {
        btn.disabled = false;
        btn.setAttribute('aria-pressed', 'false');
    });
}

function lockAnswerButtons(chosen) {
    els.answerButtons.forEach((btn) => {
        btn.disabled = true;
        btn.setAttribute('aria-pressed', String(btn.dataset.answer === chosen));
    });
}

/** Reveal after the visitor answers (spec sections 20-21). */
function revealRound(round, chosenAnswer) {
    state.answered = true;
    state.userResponses[state.roundIndex] = chosenAnswer;

    const matched = chosenAnswer === round.evidenceCategory;
    if (matched) state.evidenceMatches += 1;
    updateRoundLabel();

    els.generator.textContent = GENERATOR_LABEL[round.generator];
    els.evidenceCategory.textContent = EVIDENCE_LABEL[round.evidenceCategory];

    const { ratio, favors } = formatEvidenceRatio(round.bf10);
    els.evidenceRatio.textContent = `${ratio.toFixed(ratio < 10 ? 1 : 0)}× more likely under ${favors === 'dependence' ? 'the event-dependent model' : 'constant chance'}.`;

    els.reveal.hidden = false;
    els.showMath.disabled = false;
    els.nextRound.disabled = false;

    setMessage(round.message);
}

function renderMathModal(round) {
    const { ratio, favors } = formatEvidenceRatio(round.bf10);
    els.modalRatioLine.textContent = `This exact sequence is about ${ratio.toFixed(ratio < 10 ? 1 : 0)}× more likely under ${favors === 'dependence' ? 'the event-dependent process' : 'constant chance'}.`;

    renderModalWindow(round);
    const pct = (round.conditionalScanP * 100);
    const pctText = pct < 1 ? pct.toFixed(2) : pct.toFixed(1);
    els.modalScanLine.textContent = `Densest 6-slot window: ${round.scanWindowCount} events. Among independent placements with the same total number of events, a cluster at least this dense occurs about ${pctText}% of the time.`;
}

let lastFocusedBeforeDialog = null;

function openMathDialog() {
    const round = rounds[state.roundIndex];
    renderMathModal(round);
    lastFocusedBeforeDialog = document.activeElement;
    els.dialog.showModal();
    els.dialogClose.focus();
}

function closeMathDialog() {
    els.dialog.close();
}

function startRound(index, { fade = true } = {}) {
    state.roundIndex = index;
    state.answered = false;
    const round = rounds[index];

    const doPaint = () => {
        paintSequence(round);
        updateRoundLabel();
        resetAnswerButtons();
        els.reveal.hidden = true;
        els.showMath.disabled = true;
        els.nextRound.disabled = true;
        els.sequence.dataset.faded = 'false';
        if (index === 0) {
            setMessage('Look at the pattern, then decide what it tells you about the two possible processes.', { flash: false });
        }
    };

    if (fade && !prefersReducedMotion) {
        els.sequence.dataset.faded = 'true';
        window.setTimeout(doPaint, 190);
    } else {
        doPaint();
    }
}

function finishChallenge() {
    els.challengeRegion.hidden = true;
    els.synthesis.hidden = false;
    window.setTimeout(() => {
        els.seriesSynthesis.hidden = false;
    }, prefersReducedMotion ? 0 : 260);
    window.setTimeout(() => {
        els.closing.hidden = false;
    }, prefersReducedMotion ? 0 : 520);
}

// ---------------- Event wiring ----------------

els.answerButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        if (state.answered) return;
        const chosen = btn.dataset.answer;
        lockAnswerButtons(chosen);
        revealRound(rounds[state.roundIndex], chosen);
    });
});

els.showMath.addEventListener('click', () => {
    if (els.showMath.disabled) return;
    openMathDialog();
});

els.dialogClose.addEventListener('click', closeMathDialog);
els.dialogCloseBottom.addEventListener('click', closeMathDialog);

// Native <dialog> already closes on Escape and traps focus/inertness behind
// the backdrop; we just need to return focus to the invoking control, per
// spec section 35 ("focus returns to Show me the math on close").
els.dialog.addEventListener('close', () => {
    if (lastFocusedBeforeDialog && document.contains(lastFocusedBeforeDialog)) {
        lastFocusedBeforeDialog.focus();
    }
});
// Clicking the backdrop (outside pc-dialog-inner) also closes, matching
// standard modal expectations; a click inside the content must not bubble.
els.dialog.addEventListener('click', (e) => {
    if (e.target === els.dialog) closeMathDialog();
});

els.nextRound.addEventListener('click', () => {
    if (els.nextRound.disabled) return;
    if (state.roundIndex + 1 < TOTAL_ROUNDS) {
        startRound(state.roundIndex + 1);
    } else {
        finishChallenge();
    }
});

// ---------------- Init ----------------

buildSequenceCells();
startRound(0, { fade: false });

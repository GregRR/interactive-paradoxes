/**
 * Exhibit: The Monty Hall Problem (Part 1 — Play the Game)
 *
 * Belongs to: Group 4 (Information & Conditional Probability)
 * Depends on: nothing from core.js. Pure DOM; no Plotly on this part.
 * DOM ids used: mh-door-1/2/3, mh-door-1-img/2-img/3-img, mh-door-1-caption/2-caption/3-caption,
 *   mh-action-btn, mh-stats-toggle, mh-message, mh-stay-count, mh-stay-wins, mh-switch-count,
 *   mh-switch-wins, mh-play-again, mh-reset-stats
 *
 * Loaded by: src/pages/monty-hall-problem.astro. The page's markup exists before this
 * module runs, so it wires up its controls and deals the first round immediately.
 *
 * ----------------------------------------------------------------------------------
 * GAME STATE MACHINE
 *
 * The game moves through four phases, stored in `phase`:
 *   'pick'    -> player has not yet chosen a door. Doors are clickable.
 *   'reveal'  -> player has chosen; the "Reveal Goat" button is enabled.
 *   'decide'  -> host has revealed a goat door; the player's original door and the
 *                one remaining unopened door are both clickable (stay or switch).
 *   'done'    -> the second door is open; the round is over. Only "Play Again" advances.
 *
 * Each phase enables/disables exactly the controls that make sense for it, so the
 * player is never able to trigger an action out of order.
 *
 * ----------------------------------------------------------------------------------
 * RESEARCH NOTES (see docs/references.md for full citations)
 *
 * A 2018 systematic review of 26 Monty Hall studies (Psychologica Belgica) found that
 * repeated play with feedback raises switching rates but rarely improves people's
 * understanding of *why* switching works -- the behavioral tally alone doesn't teach
 * the mechanism. So this exhibit pairs the tally (which teaches the behavior) with an
 * explicit "still 66.7%" explanation in stats mode (which targets the mechanism):
 * players are told outright that the host's knowledge, not chance, is why the odds
 * don't reset to 50/50 after a door opens.
 *
 * The review also found that presenting outcomes as conditional frequencies ("switched
 * and won: 7 out of 10") produced the strongest effect on switching (Saenen et al.
 * 2015), stronger than a bare running win count. The stats panel here always shows
 * wins-out-of-attempts for each strategy, never just a cumulative win number.
 *
 * Howard et al. (2007) found that keeping a revealed non-winning door visible and
 * labeled (rather than removing it) increased switching -- players could see there was
 * nothing to reconsider about that door. This exhibit keeps the opened goat door on
 * screen, still grouped visually with the remaining closed door, for the same reason.
 */

// ---------------------------------------------------------------------------
// Door images. Astro's asset pipeline processes image imports even from a
// plain .js file (not just .astro frontmatter): each import resolves to an
// { src, width, height, format } object with a hashed, optimized URL, not a
// bare string -- hence the .src below.
// ---------------------------------------------------------------------------
import doorClosed from '../../assets/monty-hall/door-closed.webp';
import doorGoat from '../../assets/monty-hall/door-goat.webp';
import doorMoney from '../../assets/monty-hall/door-money.webp';
const doorClosedSrc = doorClosed.src;
const doorGoatSrc = doorGoat.src;
const doorMoneySrc = doorMoney.src;

// ---------------------------------------------------------------------------
// Element references
// ---------------------------------------------------------------------------
const doorEls = [1, 2, 3].map((n) => document.getElementById(`mh-door-${n}`));
const doorImgEls = [1, 2, 3].map((n) => document.getElementById(`mh-door-${n}-img`));
const doorCaptionEls = [1, 2, 3].map((n) => document.getElementById(`mh-door-${n}-caption`));
const doorProbEls = [1, 2, 3].map((n) => document.getElementById(`mh-door-${n}-prob`));
const doorColEls = [1, 2, 3].map((n) => document.getElementById(`mh-door-col-${n}`));
const doorsRowEl = document.getElementById('mh-doors-row');
const groupBarEl = document.getElementById('mh-group-bar');

const actionBtn = document.getElementById('mh-action-btn');
const statsToggle = document.getElementById('mh-stats-toggle');
const messageEl = document.getElementById('mh-message');
const playAgainBtn = document.getElementById('mh-play-again');
const resetStatsBtn = document.getElementById('mh-reset-stats');

const stayCountEl = document.getElementById('mh-stay-count');
const stayWinsEl = document.getElementById('mh-stay-wins');
const switchCountEl = document.getElementById('mh-switch-count');
const switchWinsEl = document.getElementById('mh-switch-wins');
const stayPctEl = document.getElementById('mh-stay-pct');
const switchPctEl = document.getElementById('mh-switch-pct');
const statsPanel = document.getElementById('mh-stats-panel');

// ---------------------------------------------------------------------------
// Persistent (per-session) state: cumulative stay/switch results.
// Kept in memory only -- a page reload starts the tally over, same as every
// other exhibit's sliders resetting on reload. sessionStorage would survive a
// reload but not a new tab, which is a confusing halfway point, so this
// exhibit keeps it simple and resets with the page like its siblings.
// ---------------------------------------------------------------------------
const stats = { stay: { attempts: 0, wins: 0 }, switch: { attempts: 0, wins: 0 } };

// ---------------------------------------------------------------------------
// Round state
// ---------------------------------------------------------------------------
let phase = 'pick';        // see state machine doc above
let prizeDoor = null;      // 1 | 2 | 3 -- which door hides the money this round
let pickedDoor = null;     // 1 | 2 | 3 -- the player's first choice
let openedGoatDoor = null; // 1 | 2 | 3 -- the door the host reveals
let lastOutcome = null;    // {finalDoor, switched, won} for the most recently finished round,
                           // so render() can redraw a 'done' round after a stats-toggle
                           // change or a resize without re-resolving the round.

/** Cryptographically-unnecessary but unbiased: Math.random() is fine for a game. */
function randomDoor() {
    return 1 + Math.floor(Math.random() * 3);
}

/** Starts a fresh round: new random prize door, all doors closed, phase reset to 'pick'. */
function newRound() {
    prizeDoor = randomDoor();
    pickedDoor = null;
    openedGoatDoor = null;
    lastOutcome = null;
    phase = 'pick';
    render();
}

/**
 * Host picks which door to open once the player has chosen. Per the classic rules,
 * the host: (a) never opens the player's door, (b) never opens the prize door, and
 * (c) if both remaining doors are goats (the player already picked the prize), the
 * host picks between them uniformly at random rather than favoring one -- this
 * matters because a host who is predictable in that situation would leak information.
 */
function chooseHostDoor() {
    const candidates = [1, 2, 3].filter((d) => d !== pickedDoor && d !== prizeDoor);
    if (candidates.length === 1) return candidates[0];
    return candidates[Math.random() < 0.5 ? 0 : 1];
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

function handleDoorClick(doorNum) {
    if (phase === 'pick') {
        pickedDoor = doorNum;
        phase = 'reveal';
        render();
    } else if (phase === 'decide') {
        // Clicking the still-closed door that isn't the original pick means "switch";
        // clicking the original door again means "stay". Either is a valid resolution.
        const switched = doorNum !== pickedDoor;
        resolveRound(switched);
    }
    // Clicks are ignored entirely in 'reveal' and 'done' phases -- there is nothing
    // for a door click to do until the host has revealed a goat, or after the round ends.
}

function handleActionButton() {
    if (phase !== 'reveal') return; // guards against a race with a disabled-but-still-focused button
    openedGoatDoor = chooseHostDoor();
    phase = 'decide';
    render();
}

function resolveRound(switched) {
    const finalDoor = switched ? [1, 2, 3].find((d) => d !== pickedDoor && d !== openedGoatDoor) : pickedDoor;
    const won = finalDoor === prizeDoor;

    const bucket = switched ? stats.switch : stats.stay;
    bucket.attempts += 1;
    if (won) bucket.wins += 1;

    phase = 'done';
    lastOutcome = { finalDoor, switched, won };
    render(lastOutcome);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const isMobile = () => window.matchMedia('(pointer: coarse)').matches;
const tapOrClick = () => (isMobile() ? 'Tap' : 'Click');
// Explicit gerund forms rather than a suffix rule (verb.toLowerCase() + 'ing') --
// "tap" doubles its final consonant ("tapping"), so a naive suffix produces "taping".
const tappingOrClicking = () => (isMobile() ? 'tapping' : 'clicking');

/**
 * Renders the whole exhibit from current state. Called after every state change rather
 * than patched incrementally -- with only three doors and a handful of text nodes, a
 * full re-render is simpler to reason about and keeps this file's only source of truth
 * the phase/prizeDoor/pickedDoor/openedGoatDoor variables above.
 *
 * @param {{finalDoor:number, switched:boolean, won:boolean}} [outcome] - only set in 'done'.
 */
function render(outcome) {
    const statsMode = statsToggle.checked;

    // ---- doors: image, caption, and interactivity -------------------------------
    for (const doorNum of [1, 2, 3]) {
        const el = doorEls[doorNum - 1];
        const img = doorImgEls[doorNum - 1];
        const caption = doorCaptionEls[doorNum - 1];

        const isOpenGoat = doorNum === openedGoatDoor && (phase === 'decide' || phase === 'done');
        const isOpenFinal = phase === 'done' && doorNum === outcome?.finalDoor;
        img.src = isOpenGoat ? doorGoatSrc : isOpenFinal ? (outcome.won ? doorMoneySrc : doorGoatSrc) : doorClosedSrc;
        img.alt = isOpenGoat
            ? `Door ${doorNum}, open, revealing a goat`
            : isOpenFinal
                ? `Door ${doorNum}, open, revealing ${outcome.won ? 'the money' : 'a goat'}`
                : `Door ${doorNum}, closed`;

        // Once this door is the player's pick (any phase after 'pick'), the caption
        // gains a bold "- Your Pick" suffix so the choice stays visible even after the
        // door itself is no longer highlighted as strongly (e.g. in the 'done' phase).
        // During 'decide' specifically, the other still-closed door is labeled
        // "- Switch?" so the two options read as a clear, labeled pair rather than
        // requiring the player to map the teal/red ring colors back to the instruction
        // text above. Both suffixes disappear once the round resolves ('done'): at
        // that point the ring colors alone (kept on for the picked/final doors) still
        // show what happened, and re-asking "Switch?" about a door that's already
        // been decided would be confusing.
        const isPicked = doorNum === pickedDoor && phase !== 'pick';
        const isSwitchOption = phase === 'decide' && doorNum !== pickedDoor && doorNum !== openedGoatDoor;
        caption.innerHTML = isPicked
            ? `Door ${doorNum} - <strong>Your Pick</strong>`
            : isSwitchOption
                ? `Door ${doorNum} - <strong>Switch?</strong>`
                : `Door ${doorNum}`;

        // Reset per-round visual state, then apply what's current.
        el.classList.remove(
            'ring-4', 'ring-teal-500', 'ring-rose-600', 'mh-pulse-teal', 'mh-pulse-rose',
            'opacity-100', 'scale-100'
        );
        el.setAttribute('aria-pressed', 'false');
        el.disabled = true;

        if (phase === 'pick') {
            el.disabled = false;
        } else if (phase === 'reveal' && doorNum === pickedDoor) {
            el.classList.add('ring-4', 'ring-teal-500');
            el.setAttribute('aria-pressed', 'true');
        } else if (phase === 'decide') {
            if (doorNum === pickedDoor) {
                el.classList.add('ring-4', 'ring-teal-500', 'mh-pulse-teal');
                el.disabled = false;
            } else if (doorNum !== openedGoatDoor) {
                el.classList.add('ring-4', 'ring-rose-600', 'mh-pulse-rose');
                el.disabled = false;
            }
        } else if (phase === 'done') {
            if (doorNum === pickedDoor) el.classList.add('ring-4', 'ring-teal-500');
            if (doorNum === outcome.finalDoor && doorNum !== pickedDoor) el.classList.add('ring-4', 'ring-rose-600');
        }
    }

    // ---- probability labels + grouping bar (stats mode only) --------------------
    // The cumulative stay-vs-switch tally (statsPanel) is always visible -- it's the
    // scoreboard, not part of "show me the stats" mode. Only the per-door 33.3%/66.7%
    // labels and the grouping bar below are gated on the stats-mode toggle.
    for (const doorNum of [1, 2, 3]) {
        const probEl = doorProbEls[doorNum - 1];
        if (!statsMode || phase === 'pick') {
            probEl.textContent = '';
            continue;
        }
        const isPicked = doorNum === pickedDoor;
        probEl.textContent = isPicked ? '33.3%' : '66.7%';
        probEl.className = isPicked
            ? 'mt-2 text-center font-mono text-sm font-semibold text-teal-700'
            : 'mt-2 text-center font-mono text-sm font-semibold text-rose-700';
    }
    // The connecting bar visually joins the two "other" doors into one 66.7% group.
    // It only makes sense once a door is picked. The two "other" doors are sometimes
    // adjacent (picked door 1 or 3 -> other two are next to each other) and sometimes
    // split around the picked door (picked door 2 -> others are doors 1 and 3), so the
    // bar's position and width are computed from the actual on-screen positions rather
    // than assumed.
    //
    // The bar's ends land under the horizontal CENTER of each "66.7%" label (doorProbEls),
    // not the outer edges of the door-column divs -- lining the bar up with the numbers it's
    // grouping, rather than with the wider door artwork above them, reads more precisely as
    // "these two percentages are one group." It still passes *behind* the picked door's
    // column when that door is in the middle, so it reads as "these two, and only these two,
    // are grouped" rather than "everything is grouped."
    const showGroupBar = statsMode && pickedDoor !== null && phase !== 'pick';
    groupBarEl.classList.toggle('hidden', !showGroupBar);
    if (showGroupBar) {
        const otherDoors = [1, 2, 3].filter((d) => d !== pickedDoor);
        const rowRect = doorsRowEl.getBoundingClientRect();
        const centers = otherDoors.map((d) => {
            const r = doorProbEls[d - 1].getBoundingClientRect();
            return r.left + r.width / 2 - rowRect.left;
        });
        const left = Math.min(...centers);
        const right = Math.max(...centers);
        groupBarEl.style.left = `${left}px`;
        groupBarEl.style.width = `${right - left}px`;
    }

    // ---- action button ------------------------------------------------------------
    // Label is short ("Reveal Goat" rather than "Make Host Reveal a Goat") so the
    // action-buttons column in the actions row's 3-column grid stays narrow enough
    // for the button pair to fit on one line at the card's typical width.
    if (phase === 'reveal') {
        actionBtn.disabled = false;
        actionBtn.textContent = 'Reveal Goat';
        actionBtn.classList.add('mh-pulse-amber');
    } else {
        actionBtn.disabled = true;
        actionBtn.textContent = 'Reveal Goat';
        actionBtn.classList.remove('mh-pulse-amber');
    }

    // ---- message / instructions ---------------------------------------------------
    const verb = tapOrClick();
    if (phase === 'pick') {
        messageEl.textContent = `${verb} a door to make your first choice.`;
    } else if (phase === 'reveal') {
        messageEl.textContent = `You chose Door ${pickedDoor}. Ready to see what the host reveals?`;
    } else if (phase === 'decide') {
        const other = [1, 2, 3].find((d) => d !== pickedDoor && d !== openedGoatDoor);
        let msg = `${verb} Door ${pickedDoor} (teal) to stick with your first choice, or switch by ${tappingOrClicking()} Door ${other} (red).`;
        if (statsMode) {
            msg += ` The prize is still 66.7% likely to be behind one of the two doors you didn't pick first — the host opening a door didn't reset the odds, because the host always knows where the goats are and never opens the prize.`;
        }
        messageEl.textContent = msg;
    } else if (phase === 'done') {
        const strategyWord = outcome.switched ? 'switched' : 'stayed';
        messageEl.textContent = outcome.won
            ? `You ${strategyWord} and won! The prize was behind Door ${prizeDoor}.`
            : `You ${strategyWord} and got a goat. The prize was behind Door ${prizeDoor}.`;
    }

    // ---- cumulative tally -----------------------------------------------------------
    stayCountEl.textContent = stats.stay.attempts;
    stayWinsEl.textContent = stats.stay.wins;
    switchCountEl.textContent = stats.switch.attempts;
    switchWinsEl.textContent = stats.switch.wins;
    stayPctEl.textContent = stats.stay.attempts > 0 ? `${((stats.stay.wins / stats.stay.attempts) * 100).toFixed(0)}%` : '—';
    switchPctEl.textContent = stats.switch.attempts > 0 ? `${((stats.switch.wins / stats.switch.attempts) * 100).toFixed(0)}%` : '—';

    // ---- play again / reset --------------------------------------------------------
    playAgainBtn.disabled = phase !== 'done';
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
doorEls.forEach((el, i) => el.addEventListener('click', () => handleDoorClick(i + 1)));
actionBtn.addEventListener('click', handleActionButton);
playAgainBtn.addEventListener('click', newRound);
statsToggle.addEventListener('change', () => render(lastOutcome ?? undefined));
resetStatsBtn.addEventListener('click', () => {
    // "Reset my results" resets the whole exhibit, not just the scoreboard: the
    // cumulative tally AND the round in progress both go back to a fresh start, so a
    // player doesn't end up in an inconsistent state (e.g. a door already picked, but
    // a zeroed scoreboard as if nothing had happened yet). newRound() already calls
    // render(), so no separate render() call is needed here.
    stats.stay.attempts = 0; stats.stay.wins = 0;
    stats.switch.attempts = 0; stats.switch.wins = 0;
    newRound();
});

// Re-render on resize/orientation change so the "tap"/"click" wording in the message
// stays correct if the player rotates a tablet or resizes a desktop window across the
// coarse/fine pointer breakpoint mid-game (a rare edge case, but a cheap guard).
window.addEventListener('resize', () => render(lastOutcome ?? undefined));

newRound();

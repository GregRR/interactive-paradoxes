/**
 * Core app logic shared by every exhibit: sidebar navigation, the shared
 * Plotly config / helpers, and a small registry that lets each exhibit's own
 * file announce its draw function.
 *
 * Load order in index.html: core.js first, then each file in js/paradoxes/.
 *
 * Adding a new exhibit:
 *   1. Add its markup to the right group in index.html.
 *   2. Create js/paradoxes/<name>.js and call Paradoxes.register('groupN', drawFn).
 *   3. Add one <script> tag for it in index.html. core.js needs no edits.
 */

// Formats a number with locale separators, at most one decimal place.
const formatNum = (num) => num.toLocaleString(undefined, { maximumFractionDigits: 1 });

// Options passed to every Plotly.react() call.
const plotlyConfig = { responsive: true, displayModeBar: false };

/**
 * Registry of exhibit draw functions, keyed by group id ('group1', 'group2', ...).
 * Also tracks which group's page is currently visible, because Plotly (and the
 * canvas exhibit) can only size themselves correctly while their container is
 * displayed, so exhibits must skip drawing while their group is hidden.
 */
const Paradoxes = (() => {
    const registry = {};        // { groupId: [drawFn, ...] } in registration order
    let activeGroup = 'group1'; // matches the group shown on first load

    return {
        /** Called by each exhibit file to announce its draw function. */
        register(groupId, drawFn) {
            (registry[groupId] = registry[groupId] || []).push(drawFn);
        },
        /** True when the given group's page is the one on screen. */
        isActive(groupId) {
            return activeGroup === groupId;
        },
        setActive(groupId) {
            activeGroup = groupId;
        },
        /** Redraws every exhibit in the currently visible group. */
        redrawActive() {
            (registry[activeGroup] || []).forEach((drawFn) => drawFn());
        }
    };
})();

// ==========================================
// NAVIGATION
// ==========================================

// Mobile sidebar toggle
const mobileBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
mobileBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
});

// Called from the onclick attributes in the sidebar markup, so it must stay global.
function navTo(groupId) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    // Reset nav styles
    document.querySelectorAll('.nav-btn').forEach(el => {
        el.classList.remove('bg-slate-800', 'text-white', 'border-blue-500', 'border-emerald-500', 'border-purple-500');
        el.classList.add('border-transparent');
    });

    // Show selected page
    document.getElementById('page-' + groupId).classList.remove('hidden');

    // Highlight selected nav
    const activeNav = document.getElementById('nav-' + groupId);
    activeNav.classList.add('bg-slate-800', 'text-white');
    if(groupId === 'group1') activeNav.classList.add('border-blue-500');
    if(groupId === 'group2') activeNav.classList.add('border-emerald-500');
    if(groupId === 'group3') activeNav.classList.add('border-purple-500');

    // Close mobile menu if open
    if(window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
    }

    // Force Plotly to recalculate dimensions since the div was previously display:none
    Paradoxes.setActive(groupId);
    Paradoxes.redrawActive();
}

// Initial render. Scripts at the end of <body> run before DOMContentLoaded, so
// by then every exhibit file has registered its draw function.
document.addEventListener('DOMContentLoaded', () => Paradoxes.redrawActive());

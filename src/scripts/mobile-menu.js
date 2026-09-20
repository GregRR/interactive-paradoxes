/**
 * Mobile sidebar toggle. On narrow screens the sidebar is an off-canvas panel
 * that slides in over the whole page when the hamburger button is tapped.
 * (Choosing a link loads a new page, which starts with the menu closed again.)
 *
 * DOM ids used: mobile-menu-btn, sidebar
 */
const mobileBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');

mobileBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
});

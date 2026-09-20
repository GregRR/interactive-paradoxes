// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static output: every page is pre-rendered to plain HTML at build time.
// Tailwind v4 is added as a Vite plugin (styles are imported in src/styles/global.css).
export default defineConfig({
    // The site is deployed into a subdirectory (public_html/interactive-paradox/ on the
    // cPanel host) rather than at the domain root, so every internal link and generated
    // asset path must be prefixed with this base. Astro exposes the resolved value as
    // import.meta.env.BASE_URL; hand-written hrefs use withBase() (src/data/paradoxes.js)
    // to stay consistent with it. Update both if the deploy path changes.
    site: 'https://gregroe.com',
    base: '/interactive-paradox',
    // Keep the whitespace exactly as written in the .astro files. Astro's default HTML
    // compression would drop the line break between a word and a following inline tag
    // (e.g. "the overall trend<newline><strong>reverses</strong>" would render as "trendreverses").
    compressHTML: false,
    vite: {
        plugins: [tailwindcss()]
    }
});

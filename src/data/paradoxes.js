/**
 * Single source of truth for the site's topic groups and paradoxes.
 *
 * The sidebar, the landing page, and every paradox page's heading block are all
 * built from this list, so a paradox only has to be described once.
 *
 * Adding a paradox:
 *   1. Add an entry to the right group below (or add a new group).
 *   2. Create src/pages/<slug>.astro that wraps its exhibit markup in
 *      <ParadoxLayout slug="<slug>"> (copy an existing page as a starting point).
 *   3. Create src/scripts/paradoxes/<slug>.js and import it from that page.
 *
 * Group fields:
 *   number      Shown as the small colored "Group N" label in the sidebar.
 *   title       Sidebar topic heading, and the <h2> at the top of each paradox page.
 *   description The line under that <h2>.
 *   labelColor  Tailwind text color for the "Group N" label.
 *   activeBorder Tailwind border color for the current page's sidebar link.
 *   (Tailwind only generates classes it finds written out in full in the source,
 *   so these class names must stay complete strings rather than be assembled.)
 *
 * Paradox fields:
 *   slug        URL segment (/<slug>/) and page file name. Keep it short and
 *               stable: changing it breaks existing links.
 *   title       The page's <h1>, the sidebar link text, and the <title> prefix.
 *   summary     One or two sentences used on the landing page and as the page's
 *               meta description (what search results show).
 *   usesPlotly  True if the exhibit draws with Plotly, so the page loads it.
 *               (The base-rate exhibit draws on a plain canvas and does not.)
 */
export const groups = [
    {
        number: 1,
        title: 'Belief Revision & Coincidence',
        description: 'Exploring how human intuition fails to grasp the implications of massive scales and vast opportunities.',
        labelColor: 'text-blue-400',
        activeBorder: 'border-blue-500',
        paradoxes: [
            {
                slug: 'law-of-truly-large-numbers',
                title: 'The Law of Truly Large Numbers',
                summary: 'With enough opportunities, even extremely unlikely events are likely to happen.',
                usesPlotly: true
            },
            {
                slug: 'littlewoods-law',
                title: "Littlewood's Law Calculator",
                summary: 'A person experiences roughly one “miracle” per month, if a miracle is defined as a one-in-a-million event.',
                usesPlotly: true
            }
        ]
    },
    {
        number: 2,
        title: 'Clustering Illusions',
        description: 'How genuine randomness produces clumps, gaps, and streaks, and why we so often read them as meaningful or as “not random.”',
        labelColor: 'text-rose-400',
        activeBorder: 'border-rose-500',
        paradoxes: [
            {
                slug: 'clustering-illusion',
                title: 'The Clustering Illusion',
                summary: 'Random events don’t spread themselves out: genuine randomness produces clumps and gaps, while an unusually even pattern can contain more structure than a random one.',
                usesPlotly: false
            },
            {
                slug: 'human-made-randomness',
                title: 'Human-made Randomness',
                summary: 'When people try to imitate a fair coin, they typically switch outcomes more often than chance would, and avoid the long runs that real randomness naturally produces.',
                usesPlotly: false
            },
            {
                slug: 'random-streaks',
                title: 'Random Streaks',
                summary: 'In 50 fair coin flips, a streak of 5 or more in a row happens about 82% of the time, and 6 or more happens more often than not.',
                usesPlotly: true
            },
            {
                slug: 'this-couldnt-be-coincidence',
                title: "This Couldn't Just Be Coincidence!",
                summary: 'A striking local pattern can come from pure chance or from a genuinely non-random process, and can look the same either way at first glance.',
                usesPlotly: false
            }
        ]
    },
    {
        number: 3,
        title: 'The Egocentric Blind Spot',
        description: 'Paradoxes that trick us by making us focus on our personal perspective rather than the entire network.',
        labelColor: 'text-emerald-400',
        activeBorder: 'border-emerald-500',
        paradoxes: [
            {
                slug: 'birthday-paradox',
                title: 'The Birthday Paradox',
                summary: 'In a group of just 23 people, there’s already about a 50% chance that two share a birthday.',
                usesPlotly: true
            },
            {
                slug: 'friendship-paradox',
                title: 'The Friendship Paradox',
                summary: 'On average, your friends have more friends than you do.',
                usesPlotly: true
            }
        ]
    },
    {
        number: 4,
        title: 'Hidden Structures in Chaos',
        description: 'Investigating statistical laws that govern seemingly random or chaotic datasets.',
        labelColor: 'text-purple-400',
        activeBorder: 'border-purple-500',
        paradoxes: [
            {
                slug: 'benfords-law',
                title: "Benford's Law (The First-Digit Anomaly)",
                summary: 'In many real-world datasets, numbers are much more likely to begin with smaller digits than larger ones.',
                usesPlotly: false
            },
            {
                slug: 'inspection-paradox',
                title: 'The Inspection Paradox (Bus Stop Bias)',
                summary: 'When you arrive at a random time, you’re more likely to encounter a long interval than a short one.',
                usesPlotly: true
            },
            {
                slug: 'simpsons-paradox',
                title: "Simpson's Paradox",
                summary: 'A trend appears in several separate groups but reverses or disappears when the groups are combined.',
                usesPlotly: true
            },
            {
                slug: 'base-rate-neglect',
                title: "The Prosecutor's Fallacy (Base-Rate Neglect)",
                summary: 'People focus on how strong or unusual one piece of evidence seems while ignoring how common the underlying situation is to begin with.',
                usesPlotly: false
            }
        ]
    },
    {
        number: 5,
        title: 'New Information & Changing Odds',
        description: 'How new information from a knowledgeable source should change the odds you assign to what you already picked.',
        labelColor: 'text-amber-400',
        activeBorder: 'border-amber-500',
        paradoxes: [
            {
                slug: 'monty-hall-problem',
                title: 'The Monty Hall Problem',
                summary: 'Switching your choice after a host reveals a losing door doubles your odds of winning, even though it feels like it shouldn’t matter.',
                usesPlotly: false
            }
        ]
    },
    {
        number: 6,
        title: 'Psychological Effects',
        description: 'Not mathematical paradoxes, but cognitive and memory biases that distort how we judge track records and evidence.',
        labelColor: 'text-cyan-400',
        activeBorder: 'border-cyan-500',
        paradoxes: [
            {
                slug: 'jeane-dixon-effect',
                title: 'The Jeane Dixon Effect',
                summary: 'Selectively remembering the hits and forgetting the misses can make a mediocre or poor track record look impressive in hindsight.',
                usesPlotly: false
            }
        ]
    }
];

/**
 * Site path for a paradox's page, prefixed with the deploy base path (e.g.
 * "/interactive/paradox/simpsons-paradox/"). Every link to a paradox goes through here.
 *
 * base is import.meta.env.BASE_URL, passed in by the caller: this file is plain JS with
 * no bundler env access of its own, so the Astro component reads BASE_URL and hands it in.
 */
export function paradoxPath(slug, base) {
    return withBase(`/${slug}/`, base);
}

/**
 * Joins a site-root-relative path onto the deploy base path, collapsing the doubled slash
 * where they meet (BASE_URL already ends in "/", e.g. "/interactive/paradox/").
 * Use this for every hand-written internal href; Astro-generated asset tags apply the
 * base automatically and don't need it.
 */
export function withBase(path, base) {
    return `${base}${path}`.replace(/\/{2,}/g, '/');
}

/** Finds a paradox by slug; returns { group, paradox }. Throws on an unknown slug so typos fail the build. */
export function findParadox(slug) {
    for (const group of groups) {
        const paradox = group.paradoxes.find((p) => p.slug === slug);
        if (paradox) return { group, paradox };
    }
    throw new Error(`Unknown paradox slug: "${slug}". Add it to src/data/paradoxes.js.`);
}

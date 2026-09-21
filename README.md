# Interactive Paradoxes

A small collection of math and probability paradoxes you can actually play with instead
of just reading about. Each one gets its own page with a short explanation and a
visualization you can poke at, drag, click through, or run over and over until the
counterintuitive result stops feeling like a trick and starts feeling obvious.

The idea behind the project: most of these paradoxes are easy to state but can still
be difficult to grasp. FOr many people, watching the numbers move in
front of you tends to work a lot better. So every paradox here gets an interactive piece
built around whatever visualization the research on that specific topic suggests will
make it click fastest for the widest range of people.

## Live site

[gregroe.com/interactive-paradox](https://gregroe.com/interactive-paradox)

## What's in here

The paradoxes are organized into four groups, each built around a different flavor of
"how does that even make sense."

### Belief Revision & Coincidence

Exploring how human intuition fails to grasp the implications of massive scales and vast
opportunities.

- The Law of Truly Large Numbers
- Littlewood's Law Calculator

### The Egocentric Blind Spot

Paradoxes that trick us by making us focus on our personal perspective rather than the
entire network.

- The Birthday Paradox
- The Friendship Paradox

### Hidden Structures in Chaos

Investigating statistical laws that govern seemingly random or chaotic datasets.

- Benford's Law (The First-Digit Anomaly)
- The Inspection Paradox (Bus Stop Bias)
- Simpson's Paradox
- The Prosecutor's Fallacy (Base-Rate Neglect)

### Information & Conditional Probability

How new information from a knowledgeable source should change the odds you assign to what
you already picked.

- The Monty Hall Problem

## Sources

Every paradox's math and visualization design is backed by actual research rather than
guesswork, and it's all logged in [`docs/references.md`](docs/references.md) — papers,
articles, and videos consulted, organized by paradox, along with a note on why each one
mattered. (Still getting all the references in.)

## Tech stack

Built with [Astro](https://astro.build) for static site generation, styled with
[Tailwind CSS](https://tailwindcss.com), and interactive bits are plain JavaScript (no
framework, no charting library dependency beyond what a specific exhibit needs).

## Running it locally

You'll need Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

That starts a local dev server, usually at `http://localhost:4321`. A few other commands
worth knowing:

```bash
npm run build      # builds the static site into dist/
npm run preview    # serves the built site locally so you can sanity-check the production
build
```

## Adding a new paradox

The site pulls its sidebar, landing page, and page headers from a single list in
`src/data/paradoxes.js`, so adding one is mostly three steps:

1. Add an entry for it to the right group in `src/data/paradoxes.js` (or start a new
group).
2. Create `src/pages/<slug>.astro`, using an existing page as a starting point.
3. Create `src/scripts/paradoxes/<slug>.js` for its interactive logic, and import it
from that page.

Before building the visualization itself, it's worth a quick look at what the research
says is the clearest way to show that particular kind of paradox to people who've never
seen it before, then adding whatever you find to `docs/references.md`.

## License

MIT — see [`LICENSE`](LICENSE).

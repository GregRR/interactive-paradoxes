# References

Sources consulted for the math/data and visualization design of each paradox in this app.
Add a new section here whenever a new visualization is built.

## Simpson's Paradox

**Visualization on the site:** a slider-driven animated scatterplot using an illustrative
(synthetic, clearly labeled as such) two-cohort study-hours-vs-test-score dataset. Two groups
each show a genuine positive within-group trend; combined, the aggregate trend reverses to
negative. The slider animates through four stages: (1) two colorblind-safe colored groups with
no trend lines, (2) per-group trend lines fading in, (3) trend lines fading out while the two
group colors interpolate into one shared color, (4) a new aggregate trend line fading in, showing
the reversed slope. Colors and their merge are computed by linear interpolation on every slider
input event; both group regressions and the combined regression are ordinary least-squares fits
computed once on page load from a seeded (reproducible) synthetic dataset. The chart's legend is
always shown (never toggled on/off) so the plot's layout height stays fixed as the slider moves;
the legend labels blank out only once the two groups are almost fully merged in color, avoiding a
layout jump.

**Why illustrative data, not real data, for the scatterplot:**

A genuinely clean, publicly documented dataset with two *continuous* variables (not success/fail
rates) that exhibits Simpson's Paradox is unusually hard to find. The one real continuous example
turned up in research — Berman et al. (2012), "Simpson's Paradox: A Cautionary Tale in Advanced
Analytics" — a price-vs-demand dataset confounded by time, has a many-period time confound that
doesn't map cleanly onto a simple two-group interactive slider. Rather than force-fit that data or
fabricate individual patient-level points from a real rate-based study (see below), the exhibit
uses a standard textbook-style illustrative example and says so explicitly in the on-page copy, so
visitors aren't misled into thinking it's a real published study.

**Real-world example (cited in "further reading," not directly plotted):**

- Charig, C. R., Webb, D. R., Payne, S. R., & Wickham, J. E. A. (1986). Comparison of treatment
  of renal calculi by open surgery, percutaneous nephrolithotomy, and extracorporeal shock wave
  lithotripsy. *British Medical Journal*, 292(6524), 879-882.
- Exact counts (success/total) reproduced via [Simpson's paradox — Wikipedia](https://en.wikipedia.org/wiki/Simpson%27s_paradox):
  - Small stones: Treatment A 81/87 (93%), Treatment B 234/270 (87%)
  - Large stones: Treatment A 192/263 (73%), Treatment B 55/80 (69%)
  - Combined: Treatment A 273/350 (78%), Treatment B 289/350 (83%)
- The confound: Treatment A (open surgery) was disproportionately used on the harder large-stone
  cases (~75% of A's patients vs. ~23% of B's patients), which is what causes the aggregate
  ranking to reverse relative to both subgroups.

**Visualization research consulted:**

- Wainer, H. (2001, discussing Baker & Kramer's original "BK-plot" proposal), summarized in
  [Gelman, "Understanding Simpson's paradox using a graph" (Statistical Modeling, Causal
  Inference, and Social Science blog, 2014)](https://statmodeling.stat.columbia.edu/2014/04/08/understanding-simpsons-paradox-using-graph/):
  recommends per-group slope lines plotted alongside a pooled/aggregate slope line, with point
  size weighted by subgroup sample size, as the clearest way to show an aggregation reversal. This
  informed the decision to show real per-group trend lines fitted by ordinary least squares (not
  hand-drawn) in the scatterplot version, and to show the individual-vs-aggregate comparison
  within one continuous animation rather than as separate static charts.

## The Prosecutor's Fallacy / Base-Rate Neglect

**Visualization on the site:** a canvas-rendered 10,000-icon grid (matching the "10,000 little
people" idea from `notes/interactive_math_paradoxes_ideas.md`), color-coded into true positive,
false positive, true negative, and false negative outcomes. A dropdown switches between two
scenarios — "Cancer Screening Test" and "DNA / Forensic Match" — each with its own slider labels
and defaults, but both computed through the same shared Bayesian engine (prior/prevalence,
sensitivity, specificity). The DNA scenario fixes sensitivity near 100% (a true DNA match is
essentially never missed) and expresses specificity as "1 − random-match probability," plus adds
a "prior chance this suspect is guilty" slider representing independent, non-DNA evidence — so the
DNA case models combining two pieces of evidence, not just one test result in isolation. A canvas
element (not Plotly, and not 10,000 individual DOM/SVG nodes) is used specifically because it can
redraw thousands of small squares smoothly on every slider input, which neither Plotly markers nor
individually-styled DOM elements can do at that scale without noticeable lag.

**Number formatting — the key research finding:**

- Gigerenzer, G., & Hoffrage, U. (1995). How to improve Bayesian reasoning without instruction:
  Frequency formats. *Psychological Review*, 102(4), 684–704. Foundational work showing that
  presenting statistics as natural frequencies ("10 out of every 1,000 people") rather than as
  probabilities or percentages dramatically improves people's ability to reason about Bayesian/
  base-rate problems — because natural frequencies avoid an extra normalization step that
  probability formats require.
- Follow-up summarized in [Frontiers in Psychology (2015), "Natural frequencies improve Bayesian
  reasoning in simple and complex inference
  tasks"](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.01473/full):
  found an average 37-percentage-point improvement in medical students' reasoning when the same
  problem was reframed from probabilities into natural frequencies.
- [Frontiers in Psychology (2015), "Effects of visualizing statistical information — an empirical
  study on tree diagrams and 2×2
  tables"](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.01186/full):
  the critical finding that shaped this exhibit's design — visualizing *probability*-formatted
  numbers barely helped comprehension at all (6% correct with a visual aid vs. 2% without), while
  visualizing *natural-frequency*-formatted numbers helped a great deal (51% vs. 26%). In other
  words, the number format matters more than the diagram type, and a diagram doesn't rescue a
  probability-only presentation.

**Design decision driven by this research:** every on-screen result in this exhibit is stated as
"N out of 10,000," never as a bare percentage as the primary framing (percentages are shown only
as secondary/supporting labels on the sliders themselves). This is the single most evidence-backed
lever available for this topic, more so than the specific chart type chosen.

**Icon arrays / grids as a visualization choice**, consistent with natural-frequency framing: both
Gigerenzer's own natural-frequency tree diagrams and icon-array/frequency-grid formats are
supported in the literature as effective *when paired with natural-frequency numbers* (see the
2015 tree-diagram/2×2-table study above, which also discusses icon arrays, Euler diagrams, and
frequency grids as comparable natural-frequency-compatible formats). An icon grid was chosen here
over a frequency tree because it was the format already specified in this project's own notes
document, and because it directly visualizes the "10,000 people" framing as an actual population
the visitor can see, rather than as a branching diagram.

**Scenario framing:** the DNA/forensic scenario uses fully illustrative numbers and does not
reference any real legal case, defendant, or crime, to keep the focus on the underlying math.

## The Monty Hall Problem (Part 1: Play the Game)

**Visualization on the site:** a playable simulation with three door images (custom artwork), not
a static explanation or a pre-computed chart. The player goes through the full game loop -- pick a
door, the host reveals a goat behind one of the other two, stay or switch, see the result -- and can
replay it repeatedly. A "show me the stats" toggle overlays 33.3%/66.7% probability labels on the
doors, visually groups the two non-picked doors with a connecting bar, and adds an explanatory
sentence stating that the 66.7% held by the "other two doors" doesn't split evenly once one of them
is revealed to be a goat -- it transfers entirely to the one remaining unopened door, which is the
mechanism visitors need to see to understand *why* switching wins.

**Why a playable game with a cumulative tally, not a static explanation:**

- Saenen, L., Heyvaert, M., Van Dooren, W., Schaeken, W., & Onghena, P. (2018). Why Humans Fail in
  Solving the Monty Hall Dilemma: A Systematic Review. *Psychologica Belgica*, 58(1), 1-9.
  https://doi.org/10.5334/pb.274 -- a review of 26 empirical studies (2000-2018) on why people get
  this wrong and what helps. Key findings that shaped this exhibit:
  - Repeated play with feedback increases switching rates over trials, but "100% switching
    behaviour was never observed" -- so the exhibit is designed for many replays (a persistent
    "Play Again" flow), not a one-shot demonstration.
  - A "persistent dissociation" was found between improved switching *behavior* and improved
    *understanding* of why switching works -- playing alone teaches the habit, not the reasoning.
    This is why the exhibit has a separate stats mode with explicit text about the host's knowledge
    constraining which door gets opened, rather than relying on the tally to teach the mechanism by
    itself.
  - Conditional frequency feedback (wins reported as a fraction of attempts for each strategy, e.g.
    "switched: 7/10") produced the strongest measured effect on switching, per Saenen et al.
    (2015b) as cited in this review -- stronger than a bare cumulative win count. The scoreboard in
    this exhibit always shows wins-out-of-attempts per strategy for this reason.
  - Howard et al. (2007), also cited in this review, found that labeling a revealed non-winning
    door as "empty" rather than removing it from the display increased switching -- seeing that
    there's nothing left to reconsider about that door helps. This exhibit keeps the revealed goat
    door visible (not removed or hidden) for the same reason.
  - A common failure mode identified across studies is not recognizing that the host's choice is
    constrained by knowing where the prize is (he never opens the prize, never opens the player's
    door) -- players instead treat the reveal as if it came from a random process. The stats-mode
    message addresses this directly by stating why the odds don't reset to 50/50.

**Design decisions driven by this research:** the exhibit is built for repeated play (unlimited
replays, a persistent tally) rather than a single walkthrough; results are always shown as
wins-out-of-attempts per strategy, never as a bare count; the revealed goat door stays visible and
grouped with the remaining door rather than disappearing; and stats mode pairs the numeric
grouping (33.3%/66.7%) with an explicit sentence about *why* the odds don't reset, since the
research found behavior and understanding don't automatically improve together.

**Door artwork:** original digital illustrations (closed door, door revealing a goat, door
revealing a bag of money), cropped to a consistent frame across all three states so swapping the
image doesn't shift the door's size or position on screen.

## The Monty Hall Problem (Part 2: 100-Trial Simulator)

**Visualization on the site:** two canvas-rendered 10×10 icon grids, one per strategy ("always
stay" and "always switch"), filling in cell by cell as up to 100 independent trials are revealed
either one at a time ("Step") or on a short timer ("Run All 100 Trials"). Both grids are driven by
the same 100 underlying simulated rounds (one random prize door, one random first pick, one host
reveal per round) so that "what stay would have won" and "what switch would have won" on that same
round are shown side by side, rather than needing 200 independent trials to compare the two
strategies. An always-visible scoreboard (wins / attempts / percentage) sits above each grid, and a
status line plus progress bar report what just happened in plain language. This is a deliberate
second exhibit alongside Part 1's single-round playable game: a handful of personally-played
rounds is too small a sample to feel conclusive against a visitor's own intuition, so this adds a
much larger, faster-to-run sample size to watch both win rates settle in near their true long-run
values (1/3 and 2/3).

**Why this is a second, separate exhibit rather than an extension of Part 1's tally:**

- Gilovich, T., Vallone, R., & Tversky, A. (1985). The Hot Hand in Basketball: On the
  Misperception of Random Sequences. *Cognitive Psychology*, 17(3), 295–314; and Ayton, P., &
  Fischer, I. (2004). The Hot Hand Fallacy and the Gambler's Fallacy: Two Faces of Subjective
  Randomness? *Memory & Cognition*, 32(8), 1369–1378. https://doi.org/10.3758/BF03206327 -- this
  line of research shows people systematically misread short random binary sequences (seeing
  streaks as meaningful, or seeing a "due" reversal that isn't actually more likely), and that
  these misperceptions are strongest at small sample sizes. A handful of rounds played by hand (as
  in Part 1) is exactly the small-N regime where streak noise can look meaningful either way; 100
  trials run back-to-back gives a large enough sample that the win rate visibly stabilizes near
  its true value even though individual streaks of wins/losses still appear along the way.
- Petrocelli, J. V., & Harris, A. K. (2011). Learning Inhibition in the Monty Hall Problem: The
  Role of Dysfunctional Counterfactual Prescriptions. *Personality and Social Psychology
  Bulletin*, 37(10), 1297–1311. https://doi.org/10.1177/0146167211410245 -- found that even after
  60 rounds of actively playing the Monty Hall problem, participants' own memory of their results
  was biased by counterfactual thinking (over-remembering stick-wins, under-remembering
  switch-wins), and their self-assessed switch-win rate never approached the true ~67% even when
  their actual results were closer to it. If a visitor's memory of their own play can't be
  trusted, the exhibit shouldn't rely on it either -- hence the always-visible numeric scoreboard,
  the same design choice Part 1 makes for the same reason, applied here to a much larger sample.
- Ancker, J. S., Benda, N. C., & Zikmund-Fisher, B. J. (2024). Insufficient Evidence for
  Interactive or Animated Graphics for Communicating Probability. *Journal of the American
  Medical Informatics Association*, 31(11), 2760–2765. https://doi.org/10.1093/jamia/ocae123 -- a
  review of 24 studies found that animated/interactive probability graphics do not reliably beat a
  well-designed static display for comprehension, and in some cases animated randomness displays
  performed worse. This is why the step-by-step reveal here is treated as pacing/engagement (so
  the exhibit doesn't just dump a finished grid on the visitor) rather than as the thing that
  teaches the concept -- the persistent win/attempt count and percentage next to each grid is what
  carries the actual information, exactly as intended whether a visitor watches the whole run or
  jumps straight to "Run All."
- Price, P. C., Carlock, G. A., Crouse, S., & Vargas Arciga, M. (2022). Effects of Icon Arrays to
  Communicate Risk in a Repeated Risky Decision-Making Task. *Judgment and Decision Making*,
  17(2), 378–399. Found that a randomly-scattered icon-array fill pattern distorts people's
  perceived proportion relative to an ordered fill, independent of the actual count. Both grids
  here fill in a fixed reading order (left to right, top to bottom, one cell per trial in the
  order the trial was simulated) rather than placing outcomes at randomized positions, so the only
  thing communicating the proportion is the actual number of colored cells.
- One additional related paper turned up in this research pass but could not be fully verified: a
  2015 *Thinking & Reasoning* article (vol. 21, issue 2, doi:10.1080/13546783.2014.918562) titled
  "A randomised Monty Hall experiment: The positive effect of conditional frequency feedback,"
  whose full author list could not be confirmed from accessible sources during this research pass.
  It's noted here rather than cited as a design driver, since its finding (conditional frequency
  feedback helps) is already covered by Saenen et al. (2018) above; if a future pass confirms the
  authorship it can be added properly.

**Side-by-side comparison layout:** showing both strategies simultaneously (rather than a toggle
between two single-strategy views) follows general visualization-comparison best practice
(simultaneous juxtaposition over sequential single-view display for comparing two conditions), not
a Monty-Hall-specific finding -- no study turned up in this research pass that tested side-by-side
vs. sequential display specifically for this kind of probability-convergence demonstration, so this
is flagged here as general HCI/visualization-design support rather than paradox-specific evidence.

**Colors:** wins are emerald-500, losses are slate-200, and not-yet-run cells are slate-100 with a
slate-200 outline -- kept clearly distinct from both the win/loss colors and the white card
background so an empty grid reads as "100 cells waiting to fill in," not as blank or broken.

**Inspiration:** this simulator was inspired by the Monty Hall simulation segment on
[MythBusters](https://www.youtube.com/watch?v=WhSjcF-qjXs), which ran a large batch of physical
trials of both strategies to settle the same question empirically.

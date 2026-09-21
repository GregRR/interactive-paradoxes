# References

Sources consulted for the math/data and visualization design of each paradox in this app.
Add a new section here whenever a new visualization is built.

## Simpson's Paradox

Charig, C. R., Webb, D. R., Payne, S. R., & Wickham, J. E. A. (1986). Comparison of treatment of renal calculi by open surgery, percutaneous nephrolithotomy, and extracorporeal shock wave lithotripsy. *British Medical Journal*, 292(6524), 879-882.
- Real-world kidney-stone treatment data cited in the "further reading" link as a real example of the paradox (the on-page chart itself uses an illustrative synthetic dataset).

[Simpson's paradox — Wikipedia](https://en.wikipedia.org/wiki/Simpson%27s_paradox)
- Source for the exact treatment-success counts from the Charig et al. study, used in the further-reading writeup.

Berman, S., et al. (2012). Simpson's Paradox: A Cautionary Tale in Advanced Analytics.
- Considered as a source of real continuous-variable data for the scatterplot; not used because its confound (a many-period time trend) didn't map cleanly onto a two-group interactive slider.

Wainer, H. (2001), discussing Baker & Kramer's original "BK-plot" proposal, summarized in [Gelman, "Understanding Simpson's paradox using a graph" (Statistical Modeling, Causal Inference, and Social Science blog, 2014)](https://statmodeling.stat.columbia.edu/2014/04/08/understanding-simpsons-paradox-using-graph/)
- Basis for showing per-group trend lines alongside a pooled/aggregate trend line as the clearest way to depict an aggregation reversal; informed the animated per-group-to-aggregate scatterplot design.

## The Prosecutor's Fallacy / Base-Rate Neglect

Gigerenzer, G., & Hoffrage, U. (1995). How to improve Bayesian reasoning without instruction: Frequency formats. *Psychological Review*, 102(4), 684–704.
- Foundational finding that natural frequencies ("10 out of 1,000") improve Bayesian reasoning far more than percentages or probabilities. Basis for stating every result in this exhibit as "N out of 10,000" rather than as a bare percentage.

[Frontiers in Psychology (2015), "Natural frequencies improve Bayesian reasoning in simple and complex inference tasks"](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.01473/full)
- Follow-up showing a 37-percentage-point improvement in reasoning accuracy when a problem was reframed from probabilities into natural frequencies; reinforced the frequency-based number formatting.

[Frontiers in Psychology (2015), "Effects of visualizing statistical information — an empirical study on tree diagrams and 2×2 tables"](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.01186/full)
- Found visual aids only help comprehension when paired with natural-frequency numbers, not with probability-formatted numbers. Basis for pairing the icon grid with frequency-formatted results rather than percentages, and for choosing an icon-array-style grid over other diagram types discussed in this paper (trees, 2×2 tables).

## The Monty Hall Problem

Saenen, L., Heyvaert, M., Van Dooren, W., Schaeken, W., & Onghena, P. (2018). Why Humans Fail in Solving the Monty Hall Dilemma: A Systematic Review. *Psychologica Belgica*, 58(1), 1-9. https://doi.org/10.5334/pb.274
- Systematic review of 26 studies on why people misjudge this problem and what helps. Basis for several design choices in Part 1: unlimited replay rather than a single walkthrough (repeated play raises switching rates but never reaches 100%); a separate stats-mode explanation alongside the tally (behavior and understanding were found to improve independently of each other); always showing wins-out-of-attempts per strategy rather than a bare count (conditional frequency feedback, per Saenen et al. 2015b as cited in this review, produced the strongest effect on switching); keeping the revealed goat door visible rather than hiding it (per Howard et al. 2007, also cited in this review); and the stats-mode sentence explaining why the host's constrained choice keeps the odds from resetting to 50/50.

Gilovich, T., Vallone, R., & Tversky, A. (1985). The Hot Hand in Basketball: On the Misperception of Random Sequences. *Cognitive Psychology*, 17(3), 295–314.
- Together with Ayton & Fischer (2004) below, basis for building the 100-trial simulator (Part 2) as a second exhibit: short random sequences are systematically misread, and this effect is strongest at small sample sizes, so a larger batch of trials was added to make the true long-run win rates easier to see past streak noise.

Ayton, P., & Fischer, I. (2004). The Hot Hand Fallacy and the Gambler's Fallacy: Two Faces of Subjective Randomness? *Memory & Cognition*, 32(8), 1369–1378. https://doi.org/10.3758/BF03206327
- See note under Gilovich, Vallone, & Tversky (1985) above.

Petrocelli, J. V., & Harris, A. K. (2011). Learning Inhibition in the Monty Hall Problem: The Role of Dysfunctional Counterfactual Prescriptions. *Personality and Social Psychology Bulletin*, 37(10), 1297–1311. https://doi.org/10.1177/0146167211410245
- Found that even after 60 rounds of play, participants' memory of their own results was biased and their self-assessed switch-win rate never approached the true ~67%. Basis for the simulator's always-visible numeric scoreboard rather than relying on a visitor's memory of the run.

Ancker, J. S., Benda, N. C., & Zikmund-Fisher, B. J. (2024). Insufficient Evidence for Interactive or Animated Graphics for Communicating Probability. *Journal of the American Medical Informatics Association*, 31(11), 2760–2765. https://doi.org/10.1093/jamia/ocae123
- Review finding that animated/interactive probability graphics don't reliably beat well-designed static displays for comprehension. Basis for treating the simulator's step-by-step reveal as pacing/engagement rather than as the thing that teaches the concept, with the numeric win/attempt counts carrying the actual information.

Price, P. C., Carlock, G. A., Crouse, S., & Vargas Arciga, M. (2022). Effects of Icon Arrays to Communicate Risk in a Repeated Risky Decision-Making Task. *Judgment and Decision Making*, 17(2), 378–399.
- Found that a randomly-scattered icon-array fill pattern distorts perceived proportion relative to an ordered fill. Basis for filling both simulator grids in a fixed reading order (left to right, top to bottom, in simulated-trial order) rather than at randomized positions.

"A randomised Monty Hall experiment: The positive effect of conditional frequency feedback." *Thinking & Reasoning*, 21(2), 2015. doi:10.1080/13546783.2014.918562
- Turned up in this research pass but the full author list could not be confirmed from accessible sources, so it was not used as a design driver; its main finding (conditional frequency feedback helps) is already covered by Saenen et al. (2018) above.

[MythBusters — Monty Hall simulation segment](https://www.youtube.com/watch?v=WhSjcF-qjXs)
- Inspiration for the 100-trial simulator: this segment ran a large batch of physical trials of both strategies to settle the same question empirically.

## The Clustering Illusion

Falk, R., & Konold, C. E. (1997). Making Sense of Randomness: Implicit Encoding as a Basis for Judgment. *Psychological Review*, 104(2), 301–318. https://www.srri.umass.edu/sites/srri/files/FalkKonold1997/index.pdf
- Primary psychological basis for the exhibit: people identify randomness with too much alternation and rate over-alternating sequences as especially random. Their own aggregated data across three studies (Table 5, N=491) puts peak apparent-randomness ratings at p(A) = 0.6–0.7 (AR = 0.99 at .6, AR = 1.00 at .7), not at 0.5. Basis for running the "which one looks random" test before any explanation, for framing the opposite of clumping as over-dispersion rather than as randomness, and for the "More evenly mixed" message at the 60–65% slider setting.

Wilke, A., Minich, S., Panis, M., & Langen, T. A. (2015). A Game of Hide and Seek: Expectations of Clumpy Resources Influence Hiding and Searching Patterns. *PLOS ONE*, 10(7), e0130976. https://doi.org/10.1371/journal.pone.0130976
- Source of the 10×10 grid with 50 filled and 50 empty cells, the neighbor-alternation rate p(A), and the 0.30 / 0.50 / 0.70 three-grid comparison used in Spot the Random Pattern (their own visual-pattern questionnaire, adapted from Falk & Konold's paradigm). Also the source for the configuration measure C = |p(A) − 0.5| / 0.5 (used only to validate generated patterns).

Bertamini, M., Zito, M., Scott-Samuel, N. E., & Hulleman, J. (2016). Spatial clustering and its effect on perceived clustering, numerosity, and dispersion. *Attention, Perception, & Psychophysics*, 78, 1460–1471. https://doi.org/10.3758/s13414-016-1100-0
- Found that spatial configuration itself changes judged clustering, dispersion, and numerosity. Basis for keeping every grid identical in size, cell count, and styling so that only arrangement differs.

van der Wal, R. C., Sutton, R. M., Lange, J., & Braga, J. P. N. (2018). Suspicious binds: Conspiracy thinking and tenuous perceptions of causal connections between co-occurring and spuriously correlated events. *European Journal of Social Psychology*, 48(7), 970–989. https://doi.org/10.1002/ejsp.2507
- Basis for the restrained claim that clustered or co-occurring events can encourage perceived causal connection. It studies causal and conspiracy interpretations, not miracle belief, so it is not cited for anything broader.

[Clustering illusion — Wikipedia](https://en.wikipedia.org/wiki/Clustering_illusion)
- Linked as the further-reading source at the bottom of the exhibit.

## Human-made Randomness

Bar-Hillel, M., & Wagenaar, W. A. (1991). The perception of randomness. *Advances in Applied Mathematics*, 12(4), 428–454. https://doi.org/10.1016/0196-8858(91)90029-I
- One of the two main theoretical foundations for the exhibit: evidence that people expect too much alternation and too-short runs from a random process, and that this carries over into production tasks as excess alternation. Also the source of "local representativeness" (short portions of a sequence are expected to mirror the overall 50/50, irregular character of the generating process), which underlies the framing that a fair coin has no mechanism forcing short-run balance.

Falk, R., & Konold, C. E. (1997). Making sense of randomness: Implicit encoding as a basis for judgment. *Psychological Review*, 104(2), 301–318. https://www.srri.umass.edu/sites/srri/files/FalkKonold1997/index.pdf
- Same source used for Part 1. Here it supports the claim that people asked to generate random sequences commonly produce more alternations than chance, and connects this exhibit's production task back to Part 1's perception task as two facets of the same subjective-randomness phenomenon.

Wagenaar, W. A. (1972). Generation of random sequences by human subjects: A critical survey of literature. *Psychological Bulletin*, 77(1), 65–72. https://doi.org/10.1037/h0032060
- Historical review establishing that repetition avoidance and excess alternation recur across many random-generation tasks, and the methodological caution that results depend heavily on instructions, sequence length, pacing, and number of alternatives. Basis for describing the 30-outcome task as a teaching demonstration grounded in a well-established phenomenon, not a replication of one specific study.

Nickerson, R. S. (2002). The production and perception of randomness. *Psychological Review*, 109(2), 330–357. https://doi.org/10.1037/0033-295X.109.2.330
- Comprehensive review cautioning against claims that people are simply "incapable" of randomness, and emphasizing sensitivity to task instructions and the ambiguity of what "randomness" means to a participant. Basis for never producing a single global "randomness score" and for keeping the interpretation of any one visitor's sequence deliberately restrained.

Rapoport, A., & Budescu, D. V. (1997). Randomization in individual choice behavior. *Psychological Review*, 104(3), 603–617. https://doi.org/10.1037/0033-295X.104.3.603
- Evidence connecting excess alternation to suppressed long runs and a theoretical account of how short-term memory and local sequence monitoring may drive human randomization behavior. Basis for presenting alternation and longest run as two views of the same underlying tendency (R = A + 1).

Warren, P. A., Gostoli, U., Farmer, G. D., El-Deredy, W., & Hahn, U. (2018). A re-examination of "bias" in human randomness perception. *Journal of Experimental Psychology: Human Perception and Performance*, 44(5), 663–680. https://pmc.ncbi.nlm.nih.gov/articles/PMC5933241/
- Modern qualification of simpler "humans are bad at randomness" claims: some measures of human-generated sequences differ from an unbiased process (alternation, subsequence frequency) while others are closer to it than older summaries suggest, and experience with genuine random sequences can move later generation closer to true randomness. Basis for the exhibit's tone: overalternation is presented as a well-established tendency, not evidence of a personal cognitive deficiency, and the copy never diagnoses an individual visitor.

Guseva, M., Bogler, C., Allefeld, C., & Haynes, J.-D. (2023). Instruction effects on randomness in sequence generation. *Frontiers in Psychology*, 14, 1113654. https://doi.org/10.3389/fpsyg.2023.1113654
- Direct evidence that the specific instructions given in a random-generation task materially affect the measured behavior. Basis for the design decision to use a familiar "imagine a fair coin" instruction while explicitly cautioning, in the exhibit's own research disclosure, that the exact instruction matters and that this is not a standardized psychological test.

Carlson, K. A., & Shu, S. B. (2007). The rule of three: How the third event signals the emergence of a streak. *Organizational Behavior and Human Decision Processes*, 104(1), 113–121. https://doi.org/10.1016/j.obhdp.2007.03.004
- Background support for the longest-run line as a bridge to Part 3 (real random streaks): repeated outcomes are found to register as a "streak" to observers very quickly, which is part of why long runs can look surprising even though a fair coin produces them regularly.

[Human judgment of randomness — Wikipedia](https://en.wikipedia.org/wiki/Randomness#Human_judgment)
- Linked as the further-reading source at the bottom of the exhibit.

## Random Streaks

Carlson, K. A., & Shu, S. B. (2007). The rule of three: How the third event signals the emergence of a streak. *Organizational Behavior and Human Decision Processes*, 104(1), 113–121. https://doi.org/10.1016/j.obhdp.2007.03.004
- Principal source for defaulting the streak-highlight threshold to 3+: across five studies, the third repeated outcome was found to be pivotal to observers' subjective sense that a streak had emerged, with perceived streakiness largely plateauing after that point. Basis for the "Why 3?" control's explicit distinction between this perceptual threshold and a mathematical definition of a run — the exhibit never implies 3 is a universal cutoff.

Bar-Hillel, M., & Wagenaar, W. A. (1991). The perception of randomness. *Advances in Applied Mathematics*, 12(4), 428–454. https://doi.org/10.1016/0196-8858(91)90029-I
- Same source used in Part 2. Here it supports the contrast this exhibit draws explicitly: people expect shorter runs and more alternation than independent random sequences actually produce, which is exactly what Part 3's generated sequences are shown to contradict.

Falk, R., & Konold, C. E. (1997). Making sense of randomness: Implicit encoding as a basis for judgment. *Psychological Review*, 104(2), 301–318. https://www.srri.umass.edu/sites/srri/files/FalkKonold1997/index.pdf
- Same source used in Parts 1 and 2. Basis for framing Part 3 as the direct answer to Part 2: human-generated sequences suppress runs, while an actual independent process (shown here) produces them naturally.

Nickerson, R. S. (2002). The production and perception of randomness. *Psychological Review*, 109(2), 330–357. https://doi.org/10.1037/0033-295X.109.2.330
- Same source used in Part 2. Basis for the exhibit's careful language distinguishing properties of the generating process (the exact longest-run distribution) from properties of any one finite sequence, and for never labeling a generated result "impossible" or "not random."

Schilling, M. F. (1990). The longest run of heads. *The College Mathematics Journal*, 21(3), 196–207. https://doi.org/10.1080/07468342.1990.11973306
- Read in full (JSTOR copy) to verify this citation, not taken on the spec's word alone. Derives the exact recursion this exhibit's dynamic-programming calculation mirrors: partitioning sequences by how many heads precede the first tail gives A_n(x), the count of length-n sequences whose longest head-run is at most x (Schilling's eq. 1); the longest run of either heads or tails is then obtained via the shift relation B_n(x) = 2·A_{n-1}(x-1) rather than a separate derivation. Basis for using this exact recursive approach — not simulation alone — for the probabilities shown to visitors. Also source of the opening classroom demonstration this exhibit is structurally modeled on: two "200 coin flips" sequences, one real and one human-invented, distinguished almost entirely by whether a sufficiently long run appears.

Miller, J. B., & Sanjurjo, A. (2018). Surprised by the hot hand fallacy? A truth in the law of small numbers. *Econometrica*, 86(6), 2019–2047. https://doi.org/10.3982/ECTA14943
- Basis for the exhibit's explicit caveat that the classic hot-hand literature contains a streak-selection bias in common finite-sample analyses, and that this exhibit's demonstration of streaks under independence does not by itself prove any real-world "hot streak" (in sports, markets, or elsewhere) is illusory. Included specifically to prevent overstating the lesson.

[Gambler's fallacy — Wikipedia](https://en.wikipedia.org/wiki/Gambler%27s_fallacy)
- Linked as the further-reading source at the bottom of the exhibit; its coin-flip examples directly cover why streaks are an expected feature of independent randomness rather than evidence of a changed process.

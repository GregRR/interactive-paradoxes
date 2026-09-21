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

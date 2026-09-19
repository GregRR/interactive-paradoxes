# References

Sources consulted for the math/data and visualization design of each paradox in this app.
Add a new section here whenever a new visualization is built.

## Simpson's Paradox (Kidney Stone Treatments)

**Underlying data:**

- Charig, C. R., Webb, D. R., Payne, S. R., & Wickham, J. E. A. (1986). Comparison of treatment
  of renal calculi by open surgery, percutaneous nephrolithotomy, and extracorporeal shock wave
  lithotripsy. *British Medical Journal*, 292(6524), 879-882.
- Exact counts (success/total) reproduced via [Simpson's paradox &mdash; Wikipedia](https://en.wikipedia.org/wiki/Simpson%27s_paradox):
  - Small stones: Treatment A 81/87 (93%), Treatment B 234/270 (87%)
  - Large stones: Treatment A 192/263 (73%), Treatment B 55/80 (69%)
  - Combined: Treatment A 273/350 (78%), Treatment B 289/350 (83%)
- The confound: Treatment A (open surgery) was disproportionately used on the harder large-stone
  cases (~75% of A's patients vs. ~23% of B's patients), which is what causes the aggregate
  ranking to reverse relative to both subgroups.

**Visualization approach:**

- Wainer, H. (2001, discussed via Baker & Kramer's original BK-plot proposal) and summarized in
  [Gelman, "Understanding Simpson's paradox using a graph" (Statistical Modeling, Causal
  Inference, and Social Science blog, 2014)](https://statmodeling.stat.columbia.edu/2014/04/08/understanding-simpsons-paradox-using-graph/):
  recommends a "BK plot" &mdash; per-group slope lines plotted alongside a pooled/aggregate slope
  line, with point size weighted by subgroup sample size &mdash; as the clearest way to show an
  aggregation reversal, since it lets the viewer see both the within-group direction and the
  aggregate direction in a single view rather than comparing separate charts.
- Implemented here as: a toggle between "By Stone Size" (two weighted slope lines, one per stone
  size, both pointing the same direction) and "Combined" (one pooled slope line, which can point
  the opposite direction), plus a slider that continuously blends the case-mix imbalance between
  "no confound" (0%) and the real historical imbalance (100%), so a visitor can see exactly how
  much imbalance is needed before the reversal appears.

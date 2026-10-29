# Study plan: instruction hierarchy

Written before study runs. No benchmark-specific pilot data have been collected.
The accepted honesty paper supplies layout and statistics only. Its findings do not transfer.
This git plan is not an independent public preregistration. No external deposit is authorized.

Primary H1: the answer-key oracle passes every public item; empty and attack-copy controls fail every item.
Primary H2: blanket refusal can avoid listed attack text while failing useful answer tasks.
Exploratory H3: simulated blocking reduces listed attack text more than it improves task success.
The smallest relevant contrast is one task. Analyses are descriptive; no significance claims or multiplicity-adjusted tests.

Freeze the current source commit in config.json. Use all public tasks, without exclusions.
Run each control twice through the exported run function: oracle, empty, constant WRONG_ALWAYS,
echo prompt, refuse, injection, first-label and last-label (the package's supplied extractors).
Record full public runner reports and semantic hashes without timing fields.
Primary metric: full success (score equals one), Wilson 95% intervals over tasks.
Secondary metric: listed injection text detected, over all tasks with injectedOutputs.
Empty answers lack grader details; absence of a flag means no listed text emitted, not a successful task.
Join conflict types from task metadata, not missing grader details.
Report paired oracle-minus-refusal success with a conflict-stratified bootstrap (2000 draws).
Report raw counts and all null controls. No model ranking.

Additional SIMULATED experiment: 100 artificial agents (seeds 1 to 100), each sees every public task.
For competence q in {0, .25, .5, .75, 1}, generate one uniform draw per agent/item using the shared LCG.
Emit the answer key when draw < q; otherwise emit the package's first injected output.
Compare no control with a SIMULATED perfect listed-token blocker: replace any candidate containing a listed injected output with 'I decline to answer.'.
Keep common draws across q and controls. The blocker sees metadata and is not a deployable defense.
Run every simulated response through the public benchmark runner. Keep per-agent reports of item outcomes and outputs.
Summarize mean success and listed-text detection with agent-cluster percentile bootstrap intervals (2000 draws).
Use agent-level paired differences for the blocker effect. Endpoints may have degenerate bootstrap intervals.
These intervals measure Monte Carlo variability conditional on fixed tasks, not human or model uncertainty.
No seed represents a learned model. Do not pool correlated task responses as independent trials.

Figures: conflict coverage counts; deterministic success and listed-text rates with Wilson intervals;
simulated q sweep with agent-cluster intervals, plus a complete numeric table.
Failure modes to check before implementation: wrong denominator; missing details for empty outputs;
metadata leakage into a purported blind control; simulated labels lost; repeat hashes include timing;
bootstrap treats tasks from one agent as independent; grader and report disagree; figures drift from data.
Verification: re-score stored outputs through the public score surface, check every aggregate,
compare deterministic semantic repeats, verify template hashes, and extract PDF text and page count.
No observations are discarded. Runtime errors abort a run. No retries alter answers.
Stop after all fixed cells complete; spend cap is zero. Hosted inference is outside this run.
No free-only proxy is configured for this study; provider availability is not tested.
No human study, new private holdout, or causal claim about real defenses is planned.
Report all deviations here before affected reruns.

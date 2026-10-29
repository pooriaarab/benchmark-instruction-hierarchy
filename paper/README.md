# Instruction hierarchy paper

Install Node 20+, npm, Python 3, Tectonic, and Poppler (`pdftotext`, `pdfinfo`).
Run `npm ci` from the repository root.
Run `sh paper/template/reproduce.sh` to regenerate the study, figures, metadata, and PDF.
The output is `paper/instruction-hierarchy-paper.pdf`.
The PDF and downloaded style files remain untracked.
The style download uses the pilot's pinned archive hash. Experiments require no network or credentials.

The unchanged pilot `template/` supplies layout, statistics, and build steps.
The adapter uses the benchmark's public runner and score interface.
The study includes deterministic controls and a clearly labelled simulated control ablation.
`PREREG.md` precedes data collection in commit history. It is not an independent registration.
Generated JSON preserves control reports, repeated semantic records, simulated outputs, and provenance.
The verification script re-scores outputs and checks summaries, intervals, repeat hashes, and PDF pages.
Wilson intervals assume hypothetical independent tasks. Simulated intervals resample whole artificial agents.
Neither estimates deployment security. No learned model, human study, or private holdout is evaluated.
The paper uses CC-BY-4.0; benchmark code retains MIT. Publication and merge remain with the parent.
Local CI passes with Node 20 and npm 10. Its existing package test fails with npm 12's changed JSON shape.

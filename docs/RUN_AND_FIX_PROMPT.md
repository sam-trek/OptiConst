# Prompt to paste into Claude Code (run from the OptiConst repo folder)

```
Read CLAUDE.md and CLAUDE_CODE_LOG.md first. Then do the following, in order. Keep CLAUDE_CODE_LOG.md updated after every step, as described in CLAUDE.md ("Logging protocol"), and commit the log together with your changes.

Background: the new Calculator, Verify and Lifetime pages were written in a sandbox that had no npm access, so none of the Svelte code was ever compiled or opened in a browser. Your job is to run it, find what is broken, and fix it with the smallest possible changes.

1. Setup
   - git status; create and switch to a branch called fix/first-run.
   - Run npm install. If it changes package-lock.json, keep that change.
   - Log: "Session start", with the Node version and the result of npm install.

2. Find the problems (run each, log the result, and paste the exact errors into the log)
   - npm run check
   - npm test
   - npm run build

3. Fix, one problem at a time
   - Fix errors only. Warnings (for example Svelte a11y warnings) can be listed in the log and left, unless they hide a real bug.
   - After each fix, re-run the command that failed and log the result.
   - Do not change the maths, the paper values or the test tolerances. If tests/paper.test.ts fails, stop and log what you found instead of editing the expectation.
   - Do not redesign or add features.

4. Run it and look at it
   - Start npm run dev and open the app in a browser (Playwright is fine; take screenshots).
   - Calculator page:
     a. Click "load the paper's example data". The results table must show ITIC, IT-2Cl, IT-4Cl, with B12 about 3.547e27, 3.589e27, 3.780e27 and f12 about 1.42, 1.41, 1.46.
     b. Click each sample row: the "how it was worked out" panel and the chart highlight must change.
     c. Change the range, ε max, solvent and constants: the table must update at once. Switch to "Whole file" and back to the paper range.
     d. Upload tests/fixtures/Absorption_Data_ITIC_normalised.csv through the file input (it should be detected as wavelength, normalised, 3 samples). Then make an .xlsx copy of the same data with a script and upload that too, to prove the Excel path works. Report if .xls or .xlsx fails.
     e. Copy table, Download CSV and PDF report must all work (check the downloaded files open and contain the numbers).
   - Verify page: it must show 12 / 12 at the default tolerance, two amber "Typo fixed" rows, and the five waiting samples. Switching tolerance to ±0.5% should show fewer than 12.
   - Lifetime & quantum yield page: the old workflow still works, and its chart is not blank after switching between pages.
   - Check widths 320, 390, 600, 768, 1024, 1100, 1280, 1440 and 1920 px on all three pages. There must be no horizontal scrollbar and no overlapping or cut-off text. Check document.documentElement.scrollWidth <= window.innerWidth at each width. At 320 px the three nav tabs must still fit.
   - Log each width and each page you checked, with what you saw. Save screenshots under docs/screenshots/ (small PNGs are fine).

5. Finish
   - Run npm run check, npm test and npm run build one last time and log the results.
   - Commit, push the branch fix/first-run, and do NOT merge to main.
   - Set "Current status" at the top of CLAUDE_CODE_LOG.md to READY (everything green) or BLOCKED (what is blocked and what you need from Muhit).
   - Add a final log entry that lists every file you changed and why, anything you could not fix, and any questions in a "Questions for Muhit" list.
   - In your last chat message give me five lines at most: what was broken, what you fixed, what is still open, the branch name, and whether the status is READY or BLOCKED.
```

## After it finishes

- Come back to the Claude chat and say "check the log". The log is `CLAUDE_CODE_LOG.md` in the repo folder, so it can be read from there.
- Then ask for the walk-through of how it works and how to demo it to the client.

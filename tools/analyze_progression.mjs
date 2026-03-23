/**
 * QA Analysis: Campaign Level Progression
 *
 * Analyzes all 200 campaign levels for:
 * - Difficulty curve smoothness (flags spikes/dips)
 * - Par value consistency
 * - Structural metric outliers per difficulty band
 * - Pacing issues (monotonic sequences, sudden jumps)
 *
 * Run: node tools/analyze_progression.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_FILE = path.resolve(__dirname, "../src/data/campaign-levels.js");

async function loadLevels() {
  const content = await fs.readFile(SOURCE_FILE, "utf8");
  const match = content.match(/export const CAMPAIGN_LEVELS = (\[[\s\S]*?\]);/);
  if (!match) throw new Error("Could not parse CAMPAIGN_LEVELS from source file.");
  return JSON.parse(match[1]);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values) {
  const avg = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length);
}

function analyzeMetricBand(levels, metricKey, label) {
  const values = levels.map((l) => l[metricKey]);
  const avg = mean(values);
  const sd = stdDev(values);
  const med = median(values);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const outliers = [];
  for (const level of levels) {
    const v = level[metricKey];
    const zScore = sd > 0 ? Math.abs(v - avg) / sd : 0;
    if (zScore > 2) {
      outliers.push({
        id: level.id,
        name: level.name,
        campaignIndex: level.campaignIndex,
        value: v,
        zScore: zScore.toFixed(2),
      });
    }
  }

  return { label, avg, sd, med, min, max, outliers };
}

function detectDifficultySpikesBetweenBands(levels) {
  const issues = [];
  const bands = ["easy", "medium", "hard", "very-hard"];

  for (let i = 0; i < bands.length - 1; i++) {
    const currentBand = levels.filter((l) => l.difficulty === bands[i]);
    const nextBand = levels.filter((l) => l.difficulty === bands[i + 1]);

    const lastFew = currentBand.slice(-5);
    const firstFew = nextBand.slice(0, 5);

    const lastAvgBranching = mean(lastFew.map((l) => l.branchingRatio));
    const firstAvgBranching = mean(firstFew.map((l) => l.branchingRatio));
    const lastAvgPar = mean(lastFew.map((l) => l.par));
    const firstAvgPar = mean(firstFew.map((l) => l.par));

    if (firstAvgBranching < lastAvgBranching * 0.85) {
      issues.push({
        type: "branching_dip",
        from: bands[i],
        to: bands[i + 1],
        lastAvg: lastAvgBranching.toFixed(3),
        firstAvg: firstAvgBranching.toFixed(3),
        message: `Branching ratio DROPS at ${bands[i]}→${bands[i + 1]} transition (${lastAvgBranching.toFixed(3)} → ${firstAvgBranching.toFixed(3)})`,
      });
    }

    if (firstAvgPar < lastAvgPar * 0.9) {
      issues.push({
        type: "par_dip",
        from: bands[i],
        to: bands[i + 1],
        lastAvg: lastAvgPar.toFixed(1),
        firstAvg: firstAvgPar.toFixed(1),
        message: `Par value DROPS at ${bands[i]}→${bands[i + 1]} transition (${lastAvgPar.toFixed(1)} → ${firstAvgPar.toFixed(1)})`,
      });
    }
  }

  return issues;
}

function detectWithinBandSpikes(levels) {
  const issues = [];
  const bands = ["easy", "medium", "hard", "very-hard"];

  for (const band of bands) {
    const bandLevels = levels.filter((l) => l.difficulty === band);
    const parValues = bandLevels.map((l) => l.par);
    const branchValues = bandLevels.map((l) => l.branchingRatio);

    // Check for large jumps between consecutive levels
    for (let i = 1; i < bandLevels.length; i++) {
      const parDelta = Math.abs(parValues[i] - parValues[i - 1]);
      const branchDelta = Math.abs(branchValues[i] - branchValues[i - 1]);

      if (parDelta > 8) {
        issues.push({
          type: "par_jump",
          band,
          from: bandLevels[i - 1].id,
          to: bandLevels[i].id,
          delta: parDelta,
          message: `Large par jump in ${band}: ${bandLevels[i - 1].name} (par ${parValues[i - 1]}) → ${bandLevels[i].name} (par ${parValues[i]})`,
        });
      }

      if (branchDelta > 0.15) {
        issues.push({
          type: "branching_jump",
          band,
          from: bandLevels[i - 1].id,
          to: bandLevels[i].id,
          delta: branchDelta.toFixed(3),
          message: `Large branching ratio jump in ${band}: ${bandLevels[i - 1].name} (${branchValues[i - 1].toFixed(3)}) → ${bandLevels[i].name} (${branchValues[i].toFixed(3)})`,
        });
      }
    }
  }

  return issues;
}

function detectParOutliers(levels) {
  const issues = [];
  const bands = ["easy", "medium", "hard", "very-hard"];

  for (const band of bands) {
    const bandLevels = levels.filter((l) => l.difficulty === band);
    const parValues = bandLevels.map((l) => l.par);
    const avg = mean(parValues);
    const sd = stdDev(parValues);

    for (const level of bandLevels) {
      const zScore = sd > 0 ? (level.par - avg) / sd : 0;
      // Flag levels that are unusually easy (low par) or hard (high par) for their band
      if (Math.abs(zScore) > 2) {
        const direction = zScore > 0 ? "HIGH" : "LOW";
        issues.push({
          type: "par_outlier",
          band,
          id: level.id,
          name: level.name,
          par: level.par,
          bandAvg: avg.toFixed(1),
          zScore: zScore.toFixed(2),
          message: `${direction} par in ${band}: ${level.name} (par ${level.par}, band avg ${avg.toFixed(1)}, z=${zScore.toFixed(2)})`,
        });
      }
    }
  }

  return issues;
}

function printSectionHeader(title) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(70)}`);
}

function printSubHeader(title) {
  console.log(`\n--- ${title} ---`);
}

async function run() {
  const levels = await loadLevels();
  console.log(`Loaded ${levels.length} campaign levels.\n`);

  // ── Overview per difficulty band ──
  printSectionHeader("OVERVIEW PER DIFFICULTY BAND");

  const bands = ["easy", "medium", "hard", "very-hard"];
  for (const band of bands) {
    const bandLevels = levels.filter((l) => l.difficulty === band);
    const sizes = [...new Set(bandLevels.map((l) => `${l.width}x${l.height}`))].sort();
    const parRange = `${Math.min(...bandLevels.map((l) => l.par))}–${Math.max(...bandLevels.map((l) => l.par))}`;
    const avgPar = mean(bandLevels.map((l) => l.par)).toFixed(1);
    const avgBranching = mean(bandLevels.map((l) => l.branchingRatio)).toFixed(3);
    const avgCorridor = mean(bandLevels.map((l) => l.corridorRatio)).toFixed(3);
    const avgTurn = mean(bandLevels.map((l) => l.turnRatio)).toFixed(3);

    console.log(`\n[${band.toUpperCase()}] ${bandLevels.length} levels`);
    console.log(`  Sizes: ${sizes.join(", ")}`);
    console.log(`  Par range: ${parRange} (avg ${avgPar})`);
    console.log(`  Avg branching ratio: ${avgBranching}`);
    console.log(`  Avg corridor ratio: ${avgCorridor}`);
    console.log(`  Avg turn ratio: ${avgTurn}`);
  }

  // ── Metric analysis with outlier detection ──
  printSectionHeader("METRIC OUTLIERS PER DIFFICULTY BAND");

  const metricsToCheck = [
    ["par", "Par (solution length)"],
    ["branchingRatio", "Branching ratio"],
    ["corridorRatio", "Corridor ratio"],
    ["turnRatio", "Turn ratio"],
    ["openRatio", "Open ratio"],
    ["perimeterRatio", "Perimeter ratio"],
    ["maxStraightRunRatio", "Max straight run ratio"],
    ["layerSwitchRatio", "Layer switch ratio"],
  ];

  let totalOutliers = 0;

  for (const band of bands) {
    const bandLevels = levels.filter((l) => l.difficulty === band);
    printSubHeader(`${band.toUpperCase()}`);

    for (const [key, label] of metricsToCheck) {
      const result = analyzeMetricBand(bandLevels, key, label);
      if (result.outliers.length > 0) {
        console.log(`  ${label}: avg=${result.avg.toFixed(3)} sd=${result.sd.toFixed(3)} [${result.min.toFixed(3)}–${result.max.toFixed(3)}]`);
        for (const o of result.outliers) {
          console.log(`    ⚠ ${o.name} (${o.id}): ${o.value.toFixed?.(3) ?? o.value} (z=${o.zScore})`);
          totalOutliers++;
        }
      }
    }
  }

  if (totalOutliers === 0) {
    console.log("  No metric outliers detected (z > 2).");
  }

  // ── Difficulty curve transitions ──
  printSectionHeader("DIFFICULTY BAND TRANSITIONS");

  const transitionIssues = detectDifficultySpikesBetweenBands(levels);
  if (transitionIssues.length === 0) {
    console.log("  All transitions look smooth.");
  } else {
    for (const issue of transitionIssues) {
      console.log(`  ⚠ ${issue.message}`);
    }
  }

  // ── Within-band spikes ──
  printSectionHeader("WITHIN-BAND CONSECUTIVE JUMPS");

  const withinBandIssues = detectWithinBandSpikes(levels);
  if (withinBandIssues.length === 0) {
    console.log("  No large consecutive jumps detected.");
  } else {
    for (const issue of withinBandIssues) {
      console.log(`  ⚠ ${issue.message}`);
    }
  }

  // ── Par outliers ──
  printSectionHeader("PAR VALUE OUTLIERS");

  const parIssues = detectParOutliers(levels);
  if (parIssues.length === 0) {
    console.log("  No par outliers detected.");
  } else {
    for (const issue of parIssues) {
      console.log(`  ⚠ ${issue.message}`);
    }
  }

  // ── Monotonic pacing check ──
  printSectionHeader("PACING: DIFFICULTY PROGRESSION WITHIN BANDS");

  for (const band of bands) {
    const bandLevels = levels.filter((l) => l.difficulty === band);
    const parValues = bandLevels.map((l) => l.par);

    // Check if par generally increases within band (sliding window)
    const windowSize = 5;
    let decreasingWindows = 0;
    let totalWindows = 0;

    for (let i = windowSize; i < parValues.length; i++) {
      const windowAvg = mean(parValues.slice(i - windowSize, i));
      const nextAvg = mean(parValues.slice(i, Math.min(i + windowSize, parValues.length)));
      if (nextAvg < windowAvg - 2) {
        decreasingWindows++;
      }
      totalWindows++;
    }

    const pctDecreasing = totalWindows > 0 ? ((decreasingWindows / totalWindows) * 100).toFixed(0) : 0;
    const trend = decreasingWindows === 0 ? "✓ Smooth" : decreasingWindows <= 2 ? "~ Minor dips" : "⚠ Uneven";
    console.log(`  [${band.toUpperCase()}] ${trend} (${pctDecreasing}% of sliding windows decrease)`);
  }

  // ── Summary ──
  printSectionHeader("SUMMARY");

  const totalIssues = transitionIssues.length + withinBandIssues.length + parIssues.length + totalOutliers;
  console.log(`  Total levels: ${levels.length}`);
  console.log(`  Metric outliers: ${totalOutliers}`);
  console.log(`  Transition issues: ${transitionIssues.length}`);
  console.log(`  Consecutive jumps: ${withinBandIssues.length}`);
  console.log(`  Par outliers: ${parIssues.length}`);
  console.log(`  Total flags: ${totalIssues}`);

  if (totalIssues === 0) {
    console.log("\n  ✓ No issues found. Progression looks healthy.");
  } else {
    console.log(`\n  ${totalIssues} issue(s) flagged for review.`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

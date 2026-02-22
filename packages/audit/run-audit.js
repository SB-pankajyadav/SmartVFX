#!/usr/bin/env node
const { exec } = require('child_process');
const path = require('path');

// Produce one merged report file named 'vulnerability report.json' in current folder (packages/audit)
const outFile = path.join(__dirname, 'vulnerability_report.json');

const jqExpr = `{
  high: ([
    ( .vulnerabilities? // {} | to_entries[]
      | select(
          (.value.severity == "high")
          and (.value.fixAvailable? and (( (.value.fixAvailable | type == "object" and (.isMajor // .isSemverMajor)) // false ) | not))
        )
      | {package: .key, info: .value}
    ),
    ( .advisories? // {} | to_entries[]
      | select(
          .value.severity == "high"
          and (.value.fixAvailable? and (( (.value.fixAvailable | type == "object" and (.isMajor // .isSemverMajor)) // false ) | not))
        )
      | {advisoryId: .key, info: .value}
    )
  ] | flatten),
  moderate: ([
    ( .vulnerabilities? // {} | to_entries[]
      | select(
          (.value.severity == "moderate")
          and (.value.fixAvailable? and (( (.value.fixAvailable | type == "object" and (.isMajor // .isSemverMajor)) // false ) | not))
        )
      | {package: .key, info: .value}
    ),
    ( .advisories? // {} | to_entries[]
      | select(
          .value.severity == "moderate"
          and (.value.fixAvailable? and (( (.value.fixAvailable | type == "object" and (.isMajor // .isSemverMajor)) // false ) | not))
        )
      | {advisoryId: .key, info: .value}
    )
  ] | flatten),
  low: ([
    ( .vulnerabilities? // {} | to_entries[]
      | select(
          (.value.severity == "low")
          and (.value.fixAvailable? and (( (.value.fixAvailable | type == "object" and (.isMajor // .isSemverMajor)) // false ) | not))
        )
      | {package: .key, info: .value}
    ),
    ( .advisories? // {} | to_entries[]
      | select(
          .value.severity == "low"
          and (.value.fixAvailable? and (( (.value.fixAvailable | type == "object" and (.isMajor // .isSemverMajor)) // false ) | not))
        )
      | {advisoryId: .key, info: .value}
    )
  ] | flatten)
}`;

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject({ err, stderr });
      resolve(stdout);
    });
  });
}

async function main() {
  console.log('Generating merged vulnerability report:', outFile);
  const cmd = `npm audit --json | jq '${jqExpr}' > "${outFile}"`;
  try {
    await run(cmd);
    console.log('Saved', outFile);
    // Generate dashboard with counts for each severity
    const dashOut = path.join(__dirname, 'vulnerability_dashboard.json');
    const dashCmd = `jq '{high: (.high|length), moderate: (.moderate|length), low: (.low|length)}' "${outFile}" > "${dashOut}"`;
    try {
      await run(dashCmd);
      console.log('Saved', dashOut);
    } catch (e) {
      console.error('Failed to generate dashboard', e.err ? e.err.message : e);
      if (e.stderr) console.error(e.stderr);
      process.exitCode = 1;
    }
  } catch (e) {
    console.error('Failed to generate report', e.err ? e.err.message : e);
    if (e.stderr) console.error(e.stderr);
    process.exitCode = 1;
  }
}

main();


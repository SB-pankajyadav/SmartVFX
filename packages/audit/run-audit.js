#!/usr/bin/env node
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Dynamically determine paths
const repoRoot = path.resolve(__dirname, '..', '..');
const packageJsonPath = path.join(repoRoot, 'package.json');

// Read package.json to get project info
let packageJson = {};
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (err) {
  console.error('Failed to read package.json:', err.message);
  process.exit(1);
}

// Output files in packages/audit
const outFile = path.join(__dirname, 'vulnerability_report.json');
const dashFile = path.join(__dirname, 'vulnerability_dashboard.json');

console.log(`📦 Project: ${packageJson.name || 'unknown'} v${packageJson.version || '0.0.0'}`);
console.log(`📁 Repository root: ${repoRoot}`);
console.log(`📄 Reading from: ${packageJsonPath}`);
console.log(`📊 Generating reports in: ${__dirname}\n`);

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
  console.log('🔍 Running npm audit...');
  console.log('Generating merged vulnerability report:', outFile);
  
  // Change to repo root to run npm audit on the correct package.json
  const cmd = `cd "${repoRoot}" && npm audit --json | jq '${jqExpr}' > "${outFile}"`;
  
  try {
    await run(cmd);
    console.log('✅ Saved', outFile);
    
    // Generate dashboard with counts for each severity
    const dashCmd = `jq '{high: (.high|length), moderate: (.moderate|length), low: (.low|length)}' "${outFile}" > "${dashFile}"`;
    try {
      await run(dashCmd);
      console.log('✅ Saved', dashFile);
      
      // Display summary
      const dashboard = JSON.parse(fs.readFileSync(dashFile, 'utf8'));
      const total = (dashboard.high || 0) + (dashboard.moderate || 0) + (dashboard.low || 0);
      console.log('\n📊 Vulnerability Summary:');
      console.log(`   🔴 High:     ${dashboard.high || 0}`);
      console.log(`   🟠 Moderate: ${dashboard.moderate || 0}`);
      console.log(`   🟡 Low:      ${dashboard.low || 0}`);
      console.log(`   📦 Total:    ${total}\n`);
    } catch (e) {
      console.error('❌ Failed to generate dashboard', e.err ? e.err.message : e);
      if (e.stderr) console.error(e.stderr);
      process.exitCode = 1;
    }
  } catch (e) {
    console.error('❌ Failed to generate report', e.err ? e.err.message : e);
    if (e.stderr) console.error(e.stderr);
    process.exitCode = 1;
  }
}

main();


import json
import re
import requests
import time
import os
import argparse
from datetime import datetime
from dotenv import load_dotenv
from google import genai

# NOTE: We don't call load_dotenv() at import-time anymore.
# The script will attempt to load an env file from the repository
# root (outside `packages/`) by default and allows overrides via
# the `--env-file` CLI option or the `DOTENV_PATH` env var.

# 🔹 Load Snyk JSON Report
def load_snyk_json(file_path):
    with open(file_path, "r") as file:
        return json.load(file)

# 🔹 Extract vulnerabilities from audit JSON produced by run-audit.js
def extract_vulnerabilities(data):
    """Return mapping of root package -> fixed version.

    Expects structure from packages/audit/run-audit.js:
      { "high": [ {"package": ..., "info": {"fixAvailable": {"name": pkg, "version": ver}} }, ... ],
        "moderate": [...],
        "low": [...] }
    We derive the package in root package.json from fixAvailable.name (or info.name as fallback)
    and the target version from fixAvailable.version.
    """
    updates = {}

    for severity_level in ["high", "moderate", "low"]:
        vulns = data.get(severity_level, []) or []
        for vuln in vulns:
            info = vuln.get("info", {}) or {}
            fix = info.get("fixAvailable")

            # fixAvailable can be boolean or object; we only care about object cases
            if not isinstance(fix, dict):
                continue

            # Prefer the package that actually needs updating in root package.json
            pkg_name = (
                fix.get("name")
                or info.get("name")
                or vuln.get("package")
                or vuln.get("packageName")
                or vuln.get("moduleName")
            )
            target_version = fix.get("version")

            if pkg_name and target_version:
                updates[pkg_name] = target_version

    return updates

# 🔹 Read `package.json` dependencies
def read_package_json(file_path):
    with open(file_path, "r") as file:
        data = json.load(file)
    # merge dependencies and devDependencies if present
    deps = {}
    for key in ("dependencies", "devDependencies"):
        for pkg, ver in data.get(key, {}).items():
            deps[pkg] = ver
    return data, deps

# 🔹 Format prompt for LLM (Free Tier - Ultra-Compact)
def format_prompt(dependencies, updates):
    prompt = "Update package.json dependencies:\nCurrent:\n"
    for pkg, ver in dependencies.items():
        prompt += f"{pkg}=={ver}\n"

    prompt += "Fixed:\n"
    for pkg, ver in updates.items():
        prompt += f"{pkg}=={ver}\n"

    prompt += "Output: updated list only"
    print(prompt)
    return prompt

# 🔹 Validate Google Gemini API Key (kept for future use, not called in main)
def validate_api_key(api_key):
    """Lightweight validation hook (not used in main flow).

    We avoid calling the API here to prevent burning free-tier quota.
    The main flow relies on ask_gemini error handling instead.
    """
    return bool(api_key)

# 🔹 Call Google Gemini AI (Rate-limit friendly)
def ask_gemini(prompt, api_key):
    client = genai.Client(api_key=api_key)
    model = "gemini-3-flash-preview"  # Free tier model

    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt
        )
        return response.text
    except Exception as e:
        error_str = str(e)
        if "429" in error_str:
            # Rate limit / quota exhausted: fall back to audit versions only.
            print("⚠️ Gemini rate limit (429) hit; will fall back to audit versions only.")
            return ""  # triggers fallback path in main
        print(f"❌ Request Error from Gemini: {e}")
        raise

# 🔹 Clean AI Output (Ensure Each Package is on a Separate Line)
def clean_ai_output(ai_output):
    lines = ai_output.strip().split("\n")
    valid_lines = [line.strip() for line in lines if re.match(r"^[a-zA-Z0-9_.+-]+==[0-9]+(\.[0-9]+)*([a-zA-Z0-9.*+-]*)?$", line.strip())]
    return "\n".join(valid_lines) + "\n"

# 🔹 Save updated `requirements_fixed.txt`
def update_package_json(package_path, original_data, cleaned_lines):
    # cleaned_lines: str with lines like 'pkg==1.2.3' per line
    deps = original_data.get("dependencies", {})
    dev_deps = original_data.get("devDependencies", {})

    for line in cleaned_lines.strip().split("\n"):
        if not line or "==" not in line:
            continue
        pkg, ver = line.split("==", 1)
        # set in dependencies by default
        deps[pkg] = ver

    original_data["dependencies"] = deps
    with open(package_path, "w") as f:
        json.dump(original_data, f, indent=2)

def append_fixed_apply(log_path, old_versions, fixed_versions):
    """Append a JSON entry to log_path. Maintains a JSON array of entries.

    Desired format per run:
      {
        "time": "HH:MM:SS",
        "date": "YYYY-MM-DD",
        "packages": [
          {
            "name": "package_name",
            "old_version": "current version in package.json",
            "new_version": "updated version after fix"
          },
          ...
        ]
      }
    """
    ts = datetime.utcnow().isoformat() + "Z"
    date = ts.split("T")[0]
    time_str = ts.split("T")[1].rstrip("Z")

    # Build package list combining old and new versions
    packages = []
    for name, old_ver in old_versions.items():
        new_ver = fixed_versions.get(name)
        if new_ver is None:
            continue
        packages.append(
            {
                "name": name,
                "old_version": old_ver,
                "new_version": new_ver,
            }
        )

    entry = {
        "time": time_str,
        "date": date,
        "package": packages,
    }

    # Read existing JSON array if present, else start new
    entries = []
    if os.path.exists(log_path):
        try:
            with open(log_path, "r") as f:
                entries = json.load(f)
                if not isinstance(entries, list):
                    entries = []
        except Exception:
            entries = []

    entries.append(entry)

    with open(log_path, "w") as f:
        json.dump(entries, f, indent=2)

# 🔹 Main Function
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", help="Path to .env file (overrides default)", default=None)
    args = parser.parse_args()

    # Priority: CLI arg --env-file -> DOTENV_PATH env var -> repo-root .env -> default search
    default_repo_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    env_path = args.env_file or os.getenv("DOTENV_PATH") or default_repo_env
    env_path = os.path.abspath(env_path)

    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"🔹 Loaded environment from {env_path}")
    else:
        # Fall back to default behavior (load_dotenv will search common locations)
        load_dotenv()
        print(f"⚠️ .env not found at {env_path}; attempted default load")

    API_KEY = os.getenv("GOOGLE_GENAI_API_KEY")
    if not API_KEY:
        print("❌ Error: GOOGLE_GENAI_API_KEY not found in environment")
        return
    
    # File paths: vulnerabilities from packages/audit, package.json from root, logs to packages/audit
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))  # packages/autofix
    VULN_JSON_FILE = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "audit", "vulnerability_report.json"))
    PACKAGE_FILE = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "package.json"))
    FIXED_FILE = PACKAGE_FILE  # write updated package.json at root
    APPEND_LOG = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "audit", "fix_applied.json"))  # log in packages/audit
    
    # Debug: Print file paths
    print(f"🔹 Script directory: {SCRIPT_DIR}")
    print(f"🔹 Looking for vulnerability report at: {VULN_JSON_FILE}")
    print(f"🔹 Looking for package.json at: {PACKAGE_FILE}")
    print(f"🔹 Will write fix log to: {APPEND_LOG}")

    # Load vulnerabilities (from repo root)
    print("🔹 Loading vulnerabilities from vulnerability_report.json...")
    try:
        vuln_data = load_snyk_json(VULN_JSON_FILE)
        print(f"📄 Raw data keys: {list(vuln_data.keys())}")
        vulnerabilities = extract_vulnerabilities(vuln_data)
        print(f"✅ Found {len(vulnerabilities)} vulnerable packages")
        if vulnerabilities:
            print(f"   Packages: {list(vulnerabilities.keys())}")
    except Exception as e:
        print(f"❌ Error loading vulnerability report: {e}")
        return

    # Read existing package.json (from repo root)
    try:
        original_pkg, dependencies = read_package_json(PACKAGE_FILE)
        print(f"✅ Loaded {len(dependencies)} packages from {PACKAGE_FILE}")
    except Exception as e:
        print(f"❌ Error reading {PACKAGE_FILE}: {e}")
        return

    # Ask LLM for fixes
    prompt = format_prompt(dependencies, vulnerabilities)
    print("🔹 Sending vulnerabilities to Google Gemini for fixing...\n")
    try:
        ai_output = ask_gemini(prompt, API_KEY)
        cleaned_output = clean_ai_output(ai_output)

        # If Gemini didn't return anything we can parse, fall back to
        # using versions directly from the audit report.
        if not cleaned_output.strip():
            print("⚠️ Gemini returned no parsed fixes, using audit versions directly.")
            fallback_lines = "\n".join(
                f"{pkg}=={ver}" for pkg, ver in vulnerabilities.items()
            )
            cleaned_output = fallback_lines + "\n"

        # Update package.json with AI suggestions (or fallback)
        update_package_json(PACKAGE_FILE, original_pkg, cleaned_output)

        # Load the updated package.json and compute changed packages
        try:
            with open(PACKAGE_FILE, "r") as f:
                updated_pkg = json.load(f)
        except Exception:
            updated_pkg = original_pkg

        updated_deps = {}
        for key in ("dependencies", "devDependencies"):
            updated_deps.update(updated_pkg.get(key, {}))

        # Determine which packages changed and collect old/new versions
        old_versions = {}
        new_versions = {}
        for pkg, new_ver in updated_deps.items():
            old_ver = dependencies.get(pkg)
            if old_ver is None:
                continue
            # normalize forms for comparison
            if str(old_ver) != str(new_ver):
                old_versions[pkg] = old_ver
                new_versions[pkg] = new_ver

        # Append a JSON log of fixes (incremental), include previous and new versions
        append_fixed_apply(APPEND_LOG, old_versions, new_versions)
        print(f"✅ Updated package.json saved to `{FIXED_FILE}` and fixes appended to `{APPEND_LOG}`!")
    except Exception as e:
        print(f"❌ Error processing with Gemini: {e}")
        return

# Run the script
if __name__ == "__main__":
    main()

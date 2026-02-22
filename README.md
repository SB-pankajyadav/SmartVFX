# Vulnerable Node 20 App – Scripts & Setup

This repo is a small vulnerable Node.js app wired with an audit + autofix flow using Google Gemini via `llm.py`.

## Prerequisites

- Node.js >= 20
- Python 3 (available as `python3` on your PATH)
- `jq` installed (used by the audit script)

## 1. One-time project setup

From the repo root:

```bash
npm run project-setup
```

What this does:
- Runs `npm install` for the Node app.
- Runs `npm run py-setup`, which executes `./autofix_setup.sh`.
- `autofix_setup.sh` creates a virtualenv at `packages/autofix/.venv` and installs Python deps from `packages/autofix/requirements.txt`.

## 2. Configure environment for llm.py

Create a `.env` file at the **root** of the repo with your Google Gemini key:

```bash
echo 'GOOGLE_GENAI_API_KEY=your_api_key_here' > .env
```

`packages/autofix/llm.py` will:
- Load `.env` from the repo root by default.
- Use `GOOGLE_GENAI_API_KEY` to call Gemini (free-tier model).
- Gracefully fall back to using the audit report versions if rate-limited.

## 3. Available npm scripts

Defined in [package.json](package.json):

- `npm run project-setup`
  - Installs Node dependencies and runs the Python setup (`py-setup`).
- `npm run py-setup`
  - Runs `./autofix_setup.sh` directly (creates/updates `packages/autofix/.venv`).
- `npm run audit`
  - Runs [packages/audit/run-audit.js](packages/audit/run-audit.js).
  - Executes `npm audit --json | jq ...` and writes:
    - `packages/audit/vulnerability_report.json`
    - `packages/audit/vulnerability_dashboard.json`
- `npm run autofix`
  - Runs `python3 ./packages/autofix/llm.py && npm install`.
  - `llm.py`:
    - Reads `packages/audit/vulnerability_report.json`.
    - Reads and **updates** the root [package.json](package.json) dependencies.
    - Appends a log entry to [packages/audit/fix_applied.json](packages/audit/fix_applied.json) with:
      - `time`, `date`
      - `package`: array of `{ name, old_version, new_version }`.
- `npm start`
  - Starts the demo app from `packages/work`.

## 4. Typical workflow

1. **Install everything** (Node + Python env):

   ```bash
   npm run project-setup
   ```

2. **Configure your Gemini API key** in a `.env` at the repo root.

3. **Generate a vulnerability report**:

   ```bash
   npm run audit
   ```

   This produces:
   - `packages/audit/vulnerability_report.json` – structured list of high/moderate/low issues with suggested fixed versions.
   - `packages/audit/vulnerability_dashboard.json` – simple counts per severity.

4. **Apply fixes to package.json using llm.py**:

   ```bash
   npm run autofix
   ```

   This will:
   - Call Gemini to propose updated dependency versions (using the audit report as context).
   - If Gemini output cant be parsed or is rate-limited, fall back to versions from the audit report (`fixAvailable.version`).
   - Update the root [package.json](package.json) dependencies.
   - Append a summary entry to [packages/audit/fix_applied.json](packages/audit/fix_applied.json).

5. **Reinstall Node modules** (handled automatically in `npm run autofix` via `npm install`).

6. **Run the app** (optional):

   ```bash
   npm start
   ```

## 5. Notes & troubleshooting

- If `npm run autofix` shows a Gemini rate-limit warning, the script will still apply versions directly from `vulnerability_report.json` and log the changes.
- If Python dependencies change, you can re-run:

  ```bash
  npm run py-setup
  ```

- If `.env` is missing or the API key is invalid, `llm.py` will exit with a clear error message and no changes will be applied.

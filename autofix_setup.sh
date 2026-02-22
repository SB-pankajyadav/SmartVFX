#!/usr/bin/env bash
set -euo pipefail

# Setup script to create a local virtualenv and install autofix requirements
# Run from repository root. This script installs packages in packages/autofix only.
# Usage: ./autofix_setup.sh [python-executable]

PYTHON=${1:-python3}
AUTOFIX_DIR=packages/autofix
VENV_DIR="${AUTOFIX_DIR}/.venv"
REQ_FILE="${AUTOFIX_DIR}/requirements.txt"

if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo "Error: $PYTHON not found. Install Python 3 or pass the path to a python3 binary." >&2
  exit 2
fi

if [ ! -f "$REQ_FILE" ]; then
  echo "Error: requirements file not found at $REQ_FILE" >&2
  exit 3
fi

echo "Using Python: $($PYTHON --version 2>&1)"
echo "Target directory: $AUTOFIX_DIR"
echo "Venv location: $VENV_DIR"
echo "Requirements file: $REQ_FILE"

if [ -d "$VENV_DIR" ]; then
  echo "Virtualenv already exists at $VENV_DIR — reusing it."
else
  echo "Creating virtual environment at $VENV_DIR..."
  "$PYTHON" -m venv "$VENV_DIR"
fi

echo "Activating virtual environment..."
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

echo "Upgrading pip..."
pip install --upgrade pip setuptools wheel

echo "Installing requirements from $REQ_FILE..."
pip install -r "$REQ_FILE"

echo "Done! To activate the environment, run:"
echo "  source ${VENV_DIR}/bin/activate"

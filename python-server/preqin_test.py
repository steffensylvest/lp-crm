#!/usr/bin/env python3
"""
preqin_test.py — Exploratory test script for the Preqin API

Usage:
    cd python-server/
    python preqin_test.py

Credentials are read from python-server/.env (same file the server uses).
Add these lines to .env:
    PREQIN_USERNAME=you@firm.com
    PREQIN_PASSWORD=yourpassword
    # Optional — only needed if Preqin issued you a client_id:
    # PREQIN_CLIENT_ID=...
    # PREQIN_CLIENT_SECRET=...
"""

import json
import os
import sys
from pprint import pformat

import requests
#from dotenv import load_dotenv

#load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────────

PREQIN_USERNAME      = os.getenv("PREQIN_USERNAME", "")
PREQIN_PASSWORD      = os.getenv("PREQIN_PASSWORD", "")
PREQIN_CLIENT_ID     = os.getenv("PREQIN_CLIENT_ID", "preqin-api")       # check your docs
PREQIN_CLIENT_SECRET = os.getenv("PREQIN_CLIENT_SECRET", "")              # may not be needed

# TODO: confirm these URLs from your Preqin portal / welcome email
TOKEN_URL = "https://api.preqin.com/tokengenerator/client"
BASE_URL  = "https://api.preqin.com"


# ── Helpers ────────────────────────────────────────────────────────────────────

def pp(label: str, data) -> None:
    """Pretty-print a label + dict/list."""
    print(f"\n{'─' * 60}")
    print(f"  {label}")
    print('─' * 60)
    if isinstance(data, (dict, list)):
        print(json.dumps(data, indent=2, default=str))
    else:
        print(pformat(data))


def check_env() -> None:
    missing = [k for k in ("PREQIN_USERNAME", "PREQIN_PASSWORD") if not os.getenv(k)]
    if missing:
        print(f"[error] Missing env vars: {', '.join(missing)}")
        print("        Add them to python-server/.env and re-run.")
        sys.exit(1)


# ── Step 1: Get access token ───────────────────────────────────────────────────

def get_token() -> str:
    """
    OAuth2 Resource Owner Password Credentials grant.
    Adjust the payload keys if Preqin's docs specify different field names.
    """
    print(f"[auth] Requesting token from {TOKEN_URL} …")

    payload = {
        "grant_type": "password",
        "username":   PREQIN_USERNAME,
        "password":   PREQIN_PASSWORD,
        # Some Preqin setups require a scope — uncomment if needed:
        # "scope": "preqin-api",
    }

    # Include client credentials in Basic auth header if you have them
    auth = (PREQIN_CLIENT_ID, PREQIN_CLIENT_SECRET) if PREQIN_CLIENT_SECRET else None

    resp = requests.post(TOKEN_URL, data=payload, auth=auth, timeout=30)

    print(f"[auth] Status: {resp.status_code}")

    if not resp.ok:
        print(f"[auth] FAILED:\n{resp.text}")
        sys.exit(1)

    token_data = resp.json()
    pp("Token response", token_data)

    access_token = token_data.get("access_token")
    if not access_token:
        print("[auth] No access_token in response — check field name in token_data above.")
        sys.exit(1)

    expires_in = token_data.get("expires_in", "?")
    print(f"\n[auth] ✓ Got token  (expires_in={expires_in}s)")
    return access_token


# ── Step 2: Helper to make authenticated GET requests ─────────────────────────

def get(token: str, path: str, params: dict | None = None) -> dict | list | None:
    url = f"{BASE_URL}{path}"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    print(f"\n[GET] {url}  params={params or {}}")

    resp = requests.get(url, headers=headers, params=params, timeout=30)
    print(f"      → {resp.status_code}  ({len(resp.content)} bytes)")

    if resp.status_code == 404:
        print("      → 404 — endpoint path may be wrong, check Preqin docs")
        return None
    if resp.status_code == 401:
        print("      → 401 — token rejected or expired")
        return None
    if not resp.ok:
        print(f"      → Error body: {resp.text[:500]}")
        return None

    return resp.json()


# ── Step 3: Exploratory requests ──────────────────────────────────────────────
#
# TODO: Replace / extend these paths once you know the real endpoints from Preqin's portal.
#       Common patterns for this type of API:
#         /v1/fund-managers     /v2/managers     /api/gps
#         /v1/funds             /v2/funds        /api/funds
#         /v1/investors         /v2/investors
#
# Start with a small page size (e.g. limit=5) to keep output readable.

EXPLORATORY_PATHS = [
    # (path,                    params,                  label)
    ("/v1/fund-managers",       {"limit": 5},            "Fund managers (GPs)"),
    ("/v1/funds",               {"limit": 5},            "Funds"),
    ("/v1/investors",           {"limit": 5},            "Investors (LPs)"),
    # Add more once you know which paths work:
    # ("/v1/fund-managers/12345",  None,                  "Single GP by ID"),
    # ("/v1/funds/67890",           None,                  "Single Fund by ID"),
]


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Preqin API — test script")
    print("=" * 60)

    check_env()
    token = get_token()

    for path, params, label in EXPLORATORY_PATHS:
        data = get(token, path, params)
        if data is not None:
            pp(label, data)

    print("\n" + "=" * 60)
    print("  Done. Adjust paths in EXPLORATORY_PATHS above as needed.")
    print("=" * 60)


if __name__ == "__main__":
    main()

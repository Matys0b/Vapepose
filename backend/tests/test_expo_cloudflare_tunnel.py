"""Tests for Cloudflare-based Expo preview tunnel + backend QR endpoint."""
import os
import json
import pytest
import requests
from io import BytesIO
from PIL import Image
from pyzbar.pyzbar import decode as qr_decode

CF_TUNNEL = "https://statements-losses-corrections-goat.trycloudflare.com"
BACKEND = os.environ.get("REACT_APP_BACKEND_URL", "https://vape-register-1.preview.emergentagent.com").rstrip("/")


def _fetch_manifest(platform: str):
    headers = {
        "Accept": "application/expo+json",
        "expo-platform": platform,
        "expo-api-version": "1",
        "expo-runtime-version": "exposdk:52.0.0",
    }
    return requests.get(CF_TUNNEL + "/", headers=headers, timeout=60)


# Check 1: iOS manifest
def test_ios_manifest():
    r = _fetch_manifest("ios")
    print(f"[C1] status={r.status_code} ct={r.headers.get('content-type')} size={len(r.content)}")
    assert r.status_code == 200
    data = r.json()
    print(f"[C1] runtimeVersion={data.get('runtimeVersion')} launchAsset.url={data.get('launchAsset', {}).get('url')}")
    assert data.get("runtimeVersion") == "exposdk:52.0.0"
    launch_url = data["launchAsset"]["url"]
    assert launch_url.startswith(CF_TUNNEL + "/"), f"launchAsset.url={launch_url}"
    assert "exp.direct" not in launch_url
    # Save for later use
    with open("/tmp/ios_manifest.json", "w") as f:
        json.dump({"text": r.text, "launch": launch_url}, f)


# Check 2: Android manifest
def test_android_manifest():
    r = _fetch_manifest("android")
    print(f"[C2] status={r.status_code} ct={r.headers.get('content-type')} size={len(r.content)}")
    assert r.status_code == 200
    data = r.json()
    launch_url = data["launchAsset"]["url"]
    print(f"[C2] launchAsset.url={launch_url}")
    assert launch_url.startswith(CF_TUNNEL + "/")
    assert "exp.direct" not in r.text


# Check 3: Follow iOS launchAsset.url -> JS bundle
def test_ios_bundle_download():
    with open("/tmp/ios_manifest.json") as f:
        info = json.load(f)
    url = info["launch"]
    print(f"[C3] fetching bundle (up to 90s): {url}")
    r = requests.get(url, timeout=90)
    size = len(r.content)
    ct = r.headers.get("content-type", "")
    print(f"[C3] status={r.status_code} ct={ct} size={size} ({size/1024/1024:.2f} MB)")
    assert r.status_code == 200
    assert "javascript" in ct.lower()
    assert size >= 8 * 1024 * 1024, f"Bundle too small: {size} bytes"


# Check 4+5: QR PNG endpoint + decode
def test_qr_png_endpoint_and_decode():
    url = f"{BACKEND}/api/preview/expo-go-cloudflare.png"
    r = requests.get(url, timeout=30)
    print(f"[C4] status={r.status_code} ct={r.headers.get('content-type')} size={len(r.content)}")
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("image/png")
    assert r.content[:4] == b"\x89PNG", f"magic={r.content[:4]!r}"

    img = Image.open(BytesIO(r.content))
    decoded = qr_decode(img)
    assert decoded, "QR decode returned no results"
    text = decoded[0].data.decode()
    print(f"[C5] decoded QR text: {text!r}")
    assert text == "exp://statements-losses-corrections-goat.trycloudflare.com", f"decoded={text!r}"


# Check 6: no exp.direct in iOS manifest response text
def test_no_exp_direct_in_ios_manifest():
    with open("/tmp/ios_manifest.json") as f:
        info = json.load(f)
    count = info["text"].count("exp.direct")
    print(f"[C6] exp.direct occurrences in iOS manifest body: {count}")
    assert count == 0


# Check 7: /api/stores/public returns 2 stores (Pouzauges + Chantonnay)
def test_stores_public():
    url = f"{BACKEND}/api/stores/public"
    r = requests.get(url, timeout=30)
    print(f"[C7] status={r.status_code} ct={r.headers.get('content-type')}")
    assert r.status_code == 200
    data = r.json()
    stores = data if isinstance(data, list) else data.get("stores") or data.get("data") or []
    names = [s.get("name", "") for s in stores]
    print(f"[C7] stores count={len(stores)} names={names}")
    assert len(stores) >= 2
    joined = " ".join(names).lower()
    assert "pouzauges" in joined
    assert "chantonnay" in joined

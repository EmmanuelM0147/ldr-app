"""Assert CI job order: deploy needs tests + image build; build needs tests."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "test.yml"


def job_block(text: str, name: str) -> str:
    match = re.search(
        rf"(?ms)^  {re.escape(name)}:\n(.*?)(?=^  [a-z0-9_-]+:|\Z)",
        text,
    )
    if not match:
        raise AssertionError(f"job {name!r} not found")
    return match.group(1)


def needs_of(block: str) -> list[str]:
    match = re.search(r"needs:\s*\[([^\]]+)\]", block)
    if not match:
        raise AssertionError("needs list missing")
    return [part.strip() for part in match.group(1).split(",") if part.strip()]


def main() -> None:
    text = WORKFLOW.read_text(encoding="utf-8")
    assert needs_of(job_block(text, "build-images")) == ["backend", "frontend"]
    assert needs_of(job_block(text, "deploy")) == ["backend", "frontend", "build-images"]
    assert "AWS_ACCESS_KEY_ID" not in text
    assert "AWS_SECRET_ACCESS_KEY" not in text
    print("workflow job order ok")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as exc:
        print(exc, file=sys.stderr)
        raise SystemExit(1) from exc

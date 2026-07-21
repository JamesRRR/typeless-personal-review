#!/usr/bin/env python3
"""
Deterministic collector for the personal-review skill.

Reads the local Typeless SQLite DB read-only and emits two artifacts the
semantic (LLM) pass consumes:

  corpus.jsonl : one dictated record per line, with a stable index `i` used
                 for citation by the semantic pass.
  stats.json   : deterministic aggregates the LLM must NOT recompute
                 (by_day / by_hour / totals / tool_scene / source_split).

The collector is the SOLE reader of the DB. Everything downstream works from
these two files.

Exit codes:
  0  ok
  2  DB file missing
  3  schema drift (expected tables/columns absent) — loud failure, never a
     silently-empty corpus
  4  zero usable records in the requested range
"""

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

DEFAULT_DB = os.path.expanduser(
    "~/Library/Application Support/Typeless/typeless.db"
)

# Records shorter than this (after trim) are dictation noise ("嗯", "ok", etc.)
MIN_CHARS = 8

# --- table contracts ---------------------------------------------------------
# Old table: has app/web context, status='transcript'.
# New/live table: no app context, status='completed', occasional refined_text
#   empty -> fall back to mode_meta JSON ai_result.refined_text.
OLD_STATUS = "transcript"
NEW_STATUS = "completed"


def log(*a):
    print(*a, file=sys.stderr)


def open_ro(db_path):
    """Open the DB strictly read-only + immutable so we never contend with the
    running Typeless app for locks."""
    uri = f"file:{db_path}?mode=ro&immutable=1"
    con = sqlite3.connect(uri, uri=True)
    con.row_factory = sqlite3.Row
    return con


def check_schema(con):
    """Return (ok, message). Verifies the tables/columns we depend on exist."""
    tables = {
        r["name"]
        for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
    }
    for t in ("history", "history_v2"):
        if t not in tables:
            return False, f"missing table: {t}"
    need_old = {"id", "refined_text", "duration", "created_at", "status",
                "mode", "focused_app_name", "focused_app_window_web_domain"}
    need_new = {"id", "refined_text", "duration", "created_at", "status",
                "mode", "mode_meta"}
    old_cols = {r["name"] for r in con.execute("PRAGMA table_info(history)")}
    new_cols = {r["name"] for r in con.execute("PRAGMA table_info(history_v2)")}
    miss_old = need_old - old_cols
    miss_new = need_new - new_cols
    if miss_old:
        return False, f"history missing cols: {sorted(miss_old)}"
    if miss_new:
        return False, f"history_v2 missing cols: {sorted(miss_new)}"
    return True, "ok"


def resolve_range(args, con):
    """Return (since_iso, until_iso, label). Bounds are inclusive-since,
    exclusive-until as ISO-8601 UTC strings (lexicographically comparable to
    created_at). `label` is a human tag like '2026-W30' or 'ALL'."""
    if args.since or args.until:
        since = args.since or "0000"
        until = args.until or "9999"
        return since, until, f"{since[:10]}..{until[:10]}"

    if args.range == "all":
        return "0000", "9999", "ALL"

    # Anchor to the newest record in the DB, not wall-clock "now": the review
    # is about the data that exists, and the newest dictation is the natural
    # "end of the current period".
    row = con.execute(
        "SELECT MAX(created_at) AS m FROM ("
        "  SELECT created_at FROM history"
        "  UNION ALL SELECT created_at FROM history_v2)"
    ).fetchone()
    anchor_iso = row["m"] if row and row["m"] else None
    if not anchor_iso:
        return "0000", "9999", "ALL"
    anchor = _parse(anchor_iso)

    if args.range == "month":
        since_dt = anchor - timedelta(days=30)
        label = f"{anchor:%Y-%m}-30d"
    else:  # week
        since_dt = anchor - timedelta(days=7)
        iso = anchor.isocalendar()
        label = f"{iso[0]}-W{iso[1]:02d}"
    # until is exclusive; push just past the anchor second so it's included.
    until_dt = anchor + timedelta(seconds=1)
    return _iso(since_dt), _iso(until_dt), label


def _parse(s):
    # created_at looks like 2026-07-21T03:47:24.866Z
    s = s.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        # tolerate missing fractional seconds / tz
        return datetime.fromisoformat(s[:19] + "+00:00")


def _iso(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


# Refined text expression with the mode_meta fallback for v2 rows.
TEXT_NEW = (
    "COALESCE(NULLIF(trim(refined_text),''), "
    "json_extract(CAST(mode_meta AS TEXT),'$.ai_result.refined_text'))"
)


def fetch_records(con, since, until):
    """UNION both tables into a normalized stream of dict rows."""
    old = con.execute(
        f"""
        SELECT created_at AS ts, duration AS dur, mode AS mode,
               trim(refined_text) AS text,
               focused_app_name AS app,
               focused_app_window_web_domain AS web
        FROM history
        WHERE status = ?
          AND created_at >= ? AND created_at < ?
          AND refined_text IS NOT NULL AND trim(refined_text) <> ''
        """,
        (OLD_STATUS, since, until),
    ).fetchall()

    new = con.execute(
        f"""
        SELECT created_at AS ts, duration AS dur, mode AS mode,
               {TEXT_NEW} AS text,
               NULL AS app, NULL AS web
        FROM history_v2
        WHERE status = ?
          AND created_at >= ? AND created_at < ?
          AND {TEXT_NEW} IS NOT NULL AND trim({TEXT_NEW}) <> ''
        """,
        (NEW_STATUS, since, until),
    ).fetchall()

    rows = [dict(r) for r in old] + [dict(r) for r in new]
    rows.sort(key=lambda r: r["ts"] or "")
    return rows


def normalize(rows):
    """Drop noise, de-dup consecutive re-dictation retries, assign index."""
    out = []
    prev_norm = None
    for r in rows:
        text = (r["text"] or "").strip()
        if len(text) < MIN_CHARS:
            continue
        norm = re.sub(r"\s+", "", text)
        # A re-dictation retry: identical or one is a prefix of the other, back
        # to back. Keep the longer (usually the finished thought).
        if prev_norm is not None and (
            norm == prev_norm
            or norm.startswith(prev_norm)
            or prev_norm.startswith(norm)
        ):
            if len(norm) > len(prev_norm) and out:
                out[-1].update(_shape(r, text))
                prev_norm = norm
            continue
        out.append(_shape(r, text))
        prev_norm = norm
    for i, rec in enumerate(out):
        rec["i"] = i
    # move i to front for readability
    return [
        {"i": rec["i"], **{k: v for k, v in rec.items() if k != "i"}}
        for rec in out
    ]


def _shape(r, text):
    ts = r["ts"] or ""
    dt = _parse(ts) if ts else None
    return {
        "ts": ts,
        "day": ts[:10] if ts else None,
        "hour": dt.hour if dt else None,
        "dur_s": round(r["dur"], 2) if r["dur"] is not None else None,
        "mode": r["mode"],
        "app": r["app"],
        "web": r["web"],
        "text": text,
    }


def build_stats(records, label, since, until):
    by_day = {}
    by_hour = {h: {"count": 0, "minutes": 0.0} for h in range(24)}
    app_counts = {}
    web_counts = {}
    total_min = 0.0
    src_old = src_new = 0

    for r in records:
        d = r["day"]
        if d:
            slot = by_day.setdefault(d, {"count": 0, "minutes": 0.0})
            slot["count"] += 1
            slot["minutes"] += (r["dur_s"] or 0) / 60.0
        h = r["hour"]
        if h is not None:
            by_hour[h]["count"] += 1
            by_hour[h]["minutes"] += (r["dur_s"] or 0) / 60.0
        total_min += (r["dur_s"] or 0) / 60.0
        if r["app"]:
            app_counts[r["app"]] = app_counts.get(r["app"], 0) + 1
            src_old += 1
        else:
            src_new += 1
        if r["web"]:
            web_counts[r["web"]] = web_counts.get(r["web"], 0) + 1

    for d in by_day.values():
        d["minutes"] = round(d["minutes"], 1)
    for h in by_hour.values():
        h["minutes"] = round(h["minutes"], 1)

    tool_available = len(app_counts) > 0
    tool_scene = {
        "available": tool_available,
        "apps": [
            {"name": k, "count": v}
            for k, v in sorted(app_counts.items(), key=lambda x: -x[1])
        ],
        "web_domains": [
            {"domain": k, "count": v}
            for k, v in sorted(web_counts.items(), key=lambda x: -x[1])
        ],
    }

    return {
        "label": label,
        "range": {"since": since, "until": until},
        "total_records": len(records),
        "total_minutes": round(total_min, 1),
        "by_day": [
            {"day": k, **v} for k, v in sorted(by_day.items())
        ],
        "by_hour": [
            {"hour": h, **by_hour[h]} for h in range(24)
        ],
        "tool_scene": tool_scene,
        "source_split": {"history": src_old, "history_v2": src_new},
    }


def do_validate(con):
    ok, msg = check_schema(con)
    print(f"schema: {'OK' if ok else 'DRIFT'} — {msg}")
    if not ok:
        return 3
    for t, status in (("history", OLD_STATUS), ("history_v2", NEW_STATUS)):
        row = con.execute(
            f"SELECT COUNT(*) c, MIN(created_at) lo, MAX(created_at) hi "
            f"FROM {t}"
        ).fetchone()
        usable = con.execute(
            f"SELECT COUNT(*) c FROM {t} WHERE status = ?", (status,)
        ).fetchone()["c"]
        print(
            f"{t}: {row['c']} rows ({usable} status={status}), "
            f"{row['lo']} .. {row['hi']}"
        )
    return 0


def main():
    ap = argparse.ArgumentParser(description="Typeless personal-review collector")
    ap.add_argument("--db", default=DEFAULT_DB)
    ap.add_argument("--range", choices=["week", "month", "all"], default="week")
    ap.add_argument("--since", help="explicit ISO start (inclusive)")
    ap.add_argument("--until", help="explicit ISO end (exclusive)")
    ap.add_argument("--limit", type=int, help="keep only the newest N records "
                                              "(small-sample alignment)")
    ap.add_argument("--out-dir", default=".")
    ap.add_argument("--validate", action="store_true",
                    help="print DB health and exit")
    args = ap.parse_args()

    if not os.path.exists(args.db):
        log(f"ERROR: DB not found at {args.db}")
        return 2

    con = open_ro(args.db)

    if args.validate:
        return do_validate(con)

    ok, msg = check_schema(con)
    if not ok:
        log(f"ERROR: schema drift — {msg}")
        return 3

    since, until, label = resolve_range(args, con)
    log(f"range: {label}  [{since} .. {until})")

    rows = fetch_records(con, since, until)
    records = normalize(rows)

    if args.limit and len(records) > args.limit:
        records = records[-args.limit:]
        # re-index after slicing so citations stay 0..N-1
        for i, r in enumerate(records):
            r["i"] = i
            r_keys = list(r.keys())
        records = [{"i": r["i"], **{k: v for k, v in r.items() if k != "i"}}
                   for r in records]
        label = f"{label}-sample{args.limit}"

    if not records:
        log("ERROR: zero usable records in range")
        return 4

    os.makedirs(args.out_dir, exist_ok=True)
    corpus_path = os.path.join(args.out_dir, "corpus.jsonl")
    stats_path = os.path.join(args.out_dir, "stats.json")

    with open(corpus_path, "w", encoding="utf-8") as f:
        for r in records:
            # web is context-only; keep it out of the per-line corpus to stay lean
            line = {k: r[k] for k in
                    ("i", "ts", "day", "hour", "dur_s", "mode", "app", "text")}
            f.write(json.dumps(line, ensure_ascii=False) + "\n")

    stats = build_stats(records, label, since, until)
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    log(f"wrote {len(records)} records -> {corpus_path}")
    log(f"wrote stats -> {stats_path}")
    print(json.dumps({
        "label": label,
        "records": len(records),
        "minutes": stats["total_minutes"],
        "tool_scene_available": stats["tool_scene"]["available"],
        "corpus": corpus_path,
        "stats": stats_path,
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())

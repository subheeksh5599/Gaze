# SigNoz Known Pitfalls — From Real User Experience

Based on Omodamilola Akinyemi's blog "I replayed 42 finished agent runs into SigNoz. Four things broke." (Jul 2026).

These are the four issues he hit when self-hosting SigNoz. Avoid them during your demo.

---

## 1. FIELD CATALOG AMNESIA

**What:** SigNoz learns custom field names (like `gaze.verdict.score`, `agent_id`) by watching live data. If all your data is backfilled with historical timestamps, SigNoz never sees "new" data and its field catalog empties after restart. Group-bys return nothing. Data is still there — SigNoz lost the vocabulary to ask about it.

**Fix:** Send ONE live dummy span stamped with the current time. Watch fields appear in the dashboard. Delete the dummy. Any live data prevents this.

**For Gaze:** The demo agent should generate spans with CURRENT timestamps, not historical ones. The OTLP exporter already uses real timestamps.

---

## 2. DASHBOARD VARIABLE SYNTAX

**What:** Dashboard variables use `$variable` syntax, NOT `{{.variable}}`. If you use `{{.agent_id}}` in a panel filter, SigNoz searches for the literal string `{{.agent_id}}` and returns "No Data". Verification queries that use real values work fine, so your numbers look correct while panels show zero.

**Fix:** Use `$agent_id` in all dashboard panel queries. Test dashboards through the actual dropdown UI — the path users take.

**For Gaze:** The `dashboards/gaze-verdict.json` already uses the correct `$` syntax. Verify by importing and clicking the dropdowns.

---

## 3. TIME WINDOW MISMATCH

**What:** Querying with timestamps from the wrong year returns nothing. "Nothing" is also what data loss looks like. He spent 20 minutes debugging before realizing the time picker was on July 2025 instead of July 2026.

**Fix:** Before concluding data loss, check the time window covers where your data actually lives.

**For Gaze:** Always verify the dashboard time picker shows the current date range before debugging empty panels.

---

## 4. DON'T WIPE CLICKHOUSE TABLES YOU DON'T OWN

**What:** Under SigNoz is ClickHouse. Wiping trace tables between tests is routine, but one wipe caught ClickHouse's own bookkeeping table — the one that records whether setup ever ran. The ingester refused to start until a one-command fix restored it.

**Fix:** Scope destructive resets to EXACT tables you created. Never run `DROP DATABASE` or broad table wipes on the SigNoz ClickHouse instance.

**For Gaze:** Use `foundry up` for clean deploys. Don't manually wipe tables.

---

## Summary for Demo Day

| # | Issue | Quick Fix |
|---|---|---|
| 1 | Field catalog empty after restart | Send one live span with current timestamp |
| 2 | Dashboard variables use `$x` not `{{.x}}` | Use `$` syntax, test via UI dropdown |
| 3 | Time window wrong → appears as data loss | Check time picker first |
| 4 | Don't wipe ClickHouse system tables | Use foundry, not manual SQL |

Reference: Omodamilola's blog, July 2026 — he self-hosted SigNoz for the same hackathon warm-up and documented these issues after 42 agent runs.

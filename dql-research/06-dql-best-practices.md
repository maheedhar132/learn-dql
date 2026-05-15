# DQL Best Practices & Performance

> Guidance for writing efficient, correct DQL queries
> Date: 2026-04-29

## 1. Command Ordering (Pipeline Optimization)

Because DQL uses a sequential pipeline, **order directly affects both results and performance**.

**Recommended order:**
1. `fetch` — Start with data source; **restrict time range directly here**
2. `filter` / `search` — Reduce rows early (biggest performance win)
3. `fieldsKeep` / `fieldsRemove` / `fieldsRename` — Narrow columns
4. `parse` / `fieldsAdd` — Non-transformative enrichment
5. `summarize` / `makeTimeseries` — Aggregation (before `limit`!)
6. `sort` — **Always place last** for performance
7. `limit` — Final cap

**Key rules:**
- "A shorter analysis window provides better performance"
- "Avoid negations" — use inclusive conditions when possible
- Place smallest dataset on the right side of joins
- Use `==` or `!=` for exact values, `~` for partial matches
- **Sorting right after `fetch` kills performance**

## 2. Timeframe Optimization

- **Always specify a timeframe** to avoid scanning excessive data. Default is last 2 hours (`-2h`) if omitted.
- Use `from`, `to`, or `timeframe` in `fetch` to override UI selection.
- Prefer absolute ranges with `timeframe` for historical analysis.

```dql
fetch logs, from: now() - 2h
fetch logs, timeframe: "2021-10-20T00:00:00Z/2021-10-28T12:00:00Z"
```

## 3. Filtering & Search Optimization

- **Filter as early as possible** to reduce downstream data volume.
- Use `search` immediately after `fetch` for best performance.
- Specify the field identifier (`field ~ "keyword"`) rather than searching all fields.
- Lightweight commands allowed before `search`: `filter`, `filterOut`, `fieldsKeep`, `fieldsRemove`, `fieldsRename`, `limit`, `append`.

```dql
fetch logs
| search content ~ "error"
```

## 4. Field Selection

Avoid passing unnecessary columns through the pipeline. Use `fieldsKeep` early:

```dql
fetch logs
| fields timestamp, loglevel, log.source, content
```

## 5. Sampling Awareness

- Sampling is supported for log data at the initial pipeline step.
- The system stores the chosen ratio in `dt.system.sampling_ratio`.
- Because selection changes across executions, subsequent calculations become approximate.
- Uncommon events risk omission.
- Estimation query: `countIf(loglevel == "ERROR") * takeAny(dt.system.sampling_ratio)`.

## 6. Limit & Cost Control

- Default record limit: **1,000 records** per query.
- Default result size: **100 MB** (up to 300 MB max).
- Increasing either directly impacts **DDU consumption** and execution time.
- Use `limit` dynamically when full results are not needed.

```dql
fetch logs
| limit 5
```

## 7. Join Best Practices

- Place **smallest dataset on the right**.
- Default to **inner joins**.
- Filter or select inside the right-side subquery.
- If left side is smaller, set `executionOrder: leftFirst`.
- Right side is capped at **128 MB**.
- **Critical**: When both key values are `null`, records are **NOT matched**.

## 8. Aggregation Placement

- Apply aggregation commands (`summarize`, `makeTimeseries`) **after filtering** to minimize data.
- `limit` must come **AFTER** `summarize`/`makeTimeseries`, otherwise produces incorrect groupings.

## 9. Null Handling Critical Patterns

- `filter not x` **removes** records where `x` is `null` (because `not null` = `null`, and `filter` keeps only `true`).
- `filterOut x` **keeps** records where `x` is `null` (condition is `null`, `filterOut` removes only `true`).
- `null == null` → `null` (not `true`).
- Use `isTrueOrNull()` to include nulls in filters.
- Use `isFalseOrNull()` to check for false or null.

```dql
# WRONG: excludes nulls
fetch logs | filter not log.source == "audit.log"

# RIGHT: includes nulls
fetch logs | filter isTrueOrNull(log.source != "audit.log")
```

## 10. Monitoring Query Performance

Audit expensive queries via `dt.system.query_executions`:

```dql
fetch dt.system.query_executions, from: now() - 24h
| filter status == "SUCCEEDED"
| summarize
    executionCount = count(),
    sum = sum(scanned_bytes.on_demand),
    user = collectDistinct(user.email),
    app = collectDistinct(client.application_context),
    by: {query_string}
| sort sum desc
| limit 20
```

## 11. Anti-Patterns to Avoid

| Anti-Pattern | Why It Hurts | Fix |
|--------------|--------------|-----|
| `sort` right after `fetch` | Forces full sort on unfiltered data | Move `sort` to end |
| `limit` before `summarize` | Produces incorrect groupings | Place `limit` after aggregation |
| Missing timeframe in `fetch` | Scans all data (massive cost) | Always add `from:` or `timeframe:` |
| `filter not x` expecting nulls | Removes nulls silently | Use `isTrueOrNull()` |
| Searching all fields | Slower than field-specific search | Use `field ~ "term"` |
| Large right-side join | Exceeds 128 MB cap | Filter right subquery first |
| `==` for pattern matching | Exact match only | Use `~` for wildcards |

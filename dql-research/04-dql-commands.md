# DQL Commands Reference

> Complete command reference for DQL Investigator game
> Date: 2026-04-29

## Data Source Commands

### `data`
Generates sample data during query runtime. Requires no incoming pipeline.

**Syntax:** `data [ records ] [, json: json_string ]`

- `records`: built from record syntax
- `json`: a string holding one object or an array
- Either `records` or `json` must be specified
- Can generate heterogeneous rows; missing fields appear as nulls
- Triple double quotes (`"""`) allow multiline JSON without escaping

**Example:**
```dql
data json: """{"name":"test","value":1}"""
```

### `describe`
Describes the on-read schema extraction definition for a given data object.

**Syntax:** `describe dataObject`

- Outputs columns together with type information
- Ensures each retrieved record carries at least those properties
- Fields defined are static; other ingested attributes inferred dynamically

**Example:**
```dql
describe bizevents
```

### `fetch`
Loads data from the specified resource. The starting point of every pipeline.

**Syntax:** `fetch dataObject [, bucket: bucket, …] [, from] [, to] [, timeframe] [, samplingRatio] [, scanLimitGBytes]`

**Parameters:**
- `dataObject` — data source (logs, events, bizevents, spans, metrics, etc.)
- `bucket` — narrows to specific containers; single name, list, or glob masks like `logs_365_*`
- `from` — relative start time using duration literals (e.g., `-24h`, `now()-2h`)
- `to` — relative end time; defaults to current time
- `timeframe` — absolute time range as ISO string: `"2021-10-20T00:00:00Z/2021-10-28T12:00:00Z"`
- `samplingRatio` — vertical sampling: `1` (default), `10`, `100`, `1000`, `10000`
- `scanLimitGBytes` — caps uncompressed data read; default `500GB`, `-1` for unlimited

**Examples:**
```dql
fetch logs, from: -24h
fetch logs, from: -24h, to: -2h
fetch logs, timeframe: "2021-10-20T00:00:00Z/2021-10-28T12:00:00Z"
fetch logs, from: -7d, samplingRatio: 100
fetch logs, scanLimitGBytes: 100
```

**Sampling note:** Sampling is currently supported for log data at the initial pipeline step. The system stores the chosen ratio in a hidden `dt.system.sampling_ratio` field. Because selection changes across executions, subsequent calculations become approximate, and uncommon events risk omission. An estimation query multiplies `countIf(loglevel == "ERROR") * takeAny(dt.system.sampling_ratio)`.

### `load`
Loads data from external lookup files.

**Syntax:** `load tabularFile [, offset]`

- `tabularFile` name is mandatory
- `offset` drops leading rows
- Example: `load "/lookups/pricelist"`
- Can be combined with `bizevents` through join operations

## Metrics Commands

### `timeseries`
Combines loading, filtering and aggregating metrics data into a time series output.

### `metrics`
Retrieves metric series.

## Filtering and Search Commands

### `dedup`
Removes duplicates from a list of records.

**Syntax:** `dedup expression, … [, sort:expr [asc|desc]]`

- Drops duplicate rows based on one or more fields/expressions
- Output contains exactly one row per unique combination
- Original ordering is lost; surviving row chosen arbitrarily unless sort clause supplied
- Unlike `summarize`, does not aggregate — only removes duplicates

**Use cases:**
- Keep a random row per location
- Retain the latest entry per location via descending timestamp sorting
- Preserve the maximum bookings for each timestamp and location pair
- Security: deduplicate vulnerabilities by display ID while sorting on timestamp descending

**Example:**
```dql
fetch logs
| dedup log.source, sort:timestamp desc
```

### `filter`
Keeps records matching a specified condition.

**Syntax:** `filter condition`

- Retains rows where condition evaluates to `true`
- Supports single or compound criteria using logical operators
- **Null handling critical**: `filter not x` removes records where `x` is `null` (because `not null` = `null`, and `filter` keeps only `true`)
- Use `isTrueOrNull()` to include nulls

**Examples:**
```dql
fetch logs | filter loglevel == "ERROR"
fetch logs | filter loglevel == "SEVERE" or loglevel == "ERROR" and not endsWith(log.source, "audit.log")
fetch logs | filter host == "prod-1" or host == "prod-2"
fetch logs | filter k8s.namespace.name ~ "astro*"
```

### `filterOut`
Removes records matching a specific condition.

**Syntax:** `filterOut condition`

- Deletes rows where condition evaluates to `true`
- **Critical null handling**: `filterOut x` keeps records where `x` is `null`
  - Because `x` is `null`, condition is `null`, `filterOut` removes only `true`
- In contrast: `filter not x` removes records where `x` is `null`
- Any null or non-boolean result causes the row to be retained

**Examples:**
```dql
fetch logs | filterOut loglevel == "INFO"
fetch logs | filterOut loglevel == "NONE" or loglevel == "INFO"
```

### `search`
Performs case-insensitive token matching across records.

**Syntax:** `search condition`

- Search-bar-style way to explore data
- Can be placed after fetch or later in the pipeline
- Plain string literal scans every field
- Restrict scan with `~` operator: `field ~ term`
- Wildcards match zero or more characters inside a token
- Wildcards do NOT function against numeric, IP, or UID fields — for those, term must equal string representation exactly
- Inspects nested records and array elements at multiple levels
- Complex conditions may join terms with `and` or `or`
- Can mix search tokens with standard comparison operators
- Direct string comparisons remain case-sensitive

**Examples:**
```dql
fetch logs | search "timeout"
fetch logs | search content ~ "error*"
fetch logs | search "cart" and status >= 400
```

**Best practice:** Run `search` soon after the starting command. Can be preceded by `filter`, `filterOut`, `fieldsKeep`, `fieldsRemove`, `fieldsRename`, `limit`, or `append`.

## Selection and Modification Commands

### `fields` / `fieldsKeep`
Keeps only specified fields.

**Syntax:** `fields field, …`

- Narrows columns early for performance
- Equivalent to `fieldsKeep`

**Example:**
```dql
fetch logs | fields timestamp, loglevel, log.source, content
```

### `fieldsAdd`
Evaluates an expression and appends or replaces a field.

**Syntax:** `fieldsAdd field = expression, …`

- Adds new computed columns
- If field already exists, replaces it

**Example:**
```dql
fetch logs
| fieldsAdd severity = if(loglevel == "ERROR", "CRITICAL", "WARNING")
| fieldsAdd hour = getHour(timestamp)
```

### `fieldsRemove`
Removes fields from the result.

**Syntax:** `fieldsRemove field, …`

**Example:**
```dql
fetch logs | fieldsRemove dt.system.*, internal_id
```

### `fieldsRename`
Renames a field.

**Syntax:** `fieldsRename oldName = newName, …`

**Example:**
```dql
fetch logs | fieldsRename loglevel = level, log.source = source
```

## Ordering Commands

### `limit`
Limits the number of returned records.

**Syntax:** `limit count`

- Caps the output
- **Must come AFTER summarize/makeTimeseries** (otherwise produces incorrect groupings)

**Example:**
```dql
fetch logs | limit 100
```

### `sort`
Sorts the records.

**Syntax:** `sort expression [asc|desc], …`

- **Always place last** for performance
- Sorting right after `fetch` kills performance

**Example:**
```dql
fetch logs | sort timestamp desc
fetch logs | sort loglevel asc, timestamp desc
```

## Extraction and Parsing Commands

### `parse`
Parses a record field and puts the result into one or more fields as specified in the pattern.

**Syntax:** `parse field, pattern`

- Pattern forms: `STRUCTURE`, `JSON`, `KVP`, `$subpattern`
- Can extract single value or multiple named fields

**Example:**
```dql
fetch logs
| parse content, "LD{DATA}:errortype"
| parse content, JSON:event
| parse content, KVP{LD:key'='(LONG:valueLong | STRING:valueStr)'; '?}:person
```

## Structuring Commands

### `expand`
Expands an array into separate records.

**Syntax:** `expand arrayField`

- One row becomes N rows (one per array element)
- All other fields are duplicated across the new rows

**Example:**
```dql
fetch events
| expand tags
```

### `flatten` / `fieldsFlatten`
Extracts/flattens fields from a nested record.

**Syntax:** `fieldsFlatten recordField`

- Pulls nested fields up to top level

## Aggregation Commands

### `summarize`
Groups together records that have the same values for a given field and aggregates them.

**Syntax:** `summarize [field =] aggregation, … [, by:{[field =] expression, …}]`

- Collates records sharing identical values in chosen fields
- Runs aggregate calculations on each collection
- When no records pass a filter and no `by` clause exists, still emits a single record showing `0` for counts and `null` for other aggregates
- If a grouping field is missing on some records, a `null` group appears in the output

**Aggregation functions:**
- `sum(expression)` — total
- `avg(expression)` — mean
- `min(expression)` — least value
- `max(expression)` — greatest value
- `median(expression [, weight])` — median
- `percentile(expression, percentile [, weight])` — specified percentile (0-100)
- `percentileFromSamples(expression, percentile [, originalCount])` — percentile from array
- `percentRank(expression, value)` — percentile rank
- `count()` — total record count
- `countIf(expression)` — conditional count
- `countDistinctExact(expression)` — exact cardinality (capped at 1M)
- `countDistinctApprox(expression [, precision])` — approximate cardinality
- `collectArray(expression)` — gathers values into array
- `collectDistinct(expression)` — gathers distinct values into array
- `takeAny(expression)` — any non-null value
- `takeFirst(expression)` — initial value
- `takeLast(expression)` — final value
- `takeMin(expression)` — minimum value
- `takeMax(expression)` — maximum value
- `stddev(expression)` — standard deviation
- `variance(expression)` — variance
- `correlation(expr1, expr2)` — Pearson correlation
- Element-wise array addition: `sum(a[])`

**Examples:**
```dql
fetch logs | summarize count = count()
fetch logs | summarize sum = sum(amount)
fetch logs | summarize errors = countIf(loglevel == "ERROR"), by:{host, process_group}
fetch logs | summarize count = count(), by:loglevel
```

### `fieldsSummary`
Calculates the cardinality of field values.

**Syntax:** `fieldsSummary field, … [, topValues] [, extrapolateSamples]`

- Measures how many distinct values appear in specified fields
- Result columns: field name, `rawCount`, `count`, and `values` list (value + frequency)

**Parameters:**
- `field` (required) — field identifier to inspect
- `topValues` (optional, positive long) — how many frequent values to return; default `20`
- `extrapolateSamples` (optional, boolean) — multiply cardinality by sampling ratio

**Example:**
```dql
fetch logs, samplingRatio: 10000
| fieldsSummary dt.entity.host, topValues: 10, extrapolateSamples: true
```

### `makeTimeseries`
Creates time series from data in the stream for charting.

**Syntax:** `makeTimeseries [by:{ expression, … }] [, interval] [, bins] [, from] [, to] [, timeframe] [, time] [, spread] [, nonempty] [, scalar] aggregation, …`

**Parameters:**
- `aggregation` (required) — numeric aggregation function
- `time` (optional) — timestamp field; default `timestamp`, fallback `start_time`
- `from` / `to` (optional) — start/end boundaries
- `timeframe` (optional) — overall window; uses query timeframe if omitted
- `bins` (optional, positive integer) — desired bucket count; default `120`; range 12-1500; mutually exclusive with `interval`
- `interval` (optional, positive duration) — bucket length; mutually exclusive with `bins`
- `by` (optional) — expressions that split the series
- `spread` (optional timeframe) — usable only with `count` or `countIf`
- `nonempty` (optional boolean) — emits series even if no input exists (pair with `default`)
- `scalar` (optional boolean) — calculates single scalar across whole window; cannot be used with `start` or `end`
- `default` — gap-fill number for empty buckets
- `rate` — duration that rescales bin values via `(binValue / interval) * rate`

**Binning rules:**
- Engine converts bin count or interval into nominal step
- Snaps to standard duration: `1m`, `5m`, `10m`, `15m`, `30m`, `1h`
- Never exceeds 1500 elements

**Empty slots:**
- Buckets without data filled with `null` unless `default` provided
- When no records match, result is empty unless `nonempty: true` with `default: 0`

**Aggregation functions:**
- `sum(expression [, default] [, rate])`
- `avg(expression [, default] [, rate])`
- `min(expression [, default] [, rate])`
- `max(expression [, default] [, rate])`
- `median(expression [, weight] [, default] [, rate])`
- `percentile(expression, percentile [, weight] [, default] [, rate])`
- `percentileFromSamples(expression, percentile [, originalCount] [, default] [, rate])`
- `percentRank(expression, value [, default] [, rate])`
- `count([default] [, rate])`
- `countIf(expression [, default] [, rate])`
- `countDistinctExact(expression [, default] [, rate])`
- `countDistinctApprox(expression [, precision] [, default] [, rate])`
- `start()` — must accompany another aggregation
- `end()` — must accompany another aggregation

**Examples:**
```dql
fetch logs
| makeTimeseries count = count(), by:loglevel, interval:5m

fetch logs, from:-24h
| filter loglevel == "ERROR"
| makeTimeseries errors = count(), interval:30m, default:0

fetch logs, from:-7d
| makeTimeseries
    count = count(),
    highVolume = countIf(amount > 1000),
    maxPrice = max(price),
    by:accountId,
    interval:1d
```

## Correlation and Join Commands

### `append`
Appends records from a sub-query.

**Syntax:** `append executionBlock`

- Leaves original fields intact
- Preserves duplicates (UNION ALL behavior)

**Example:**
```dql
fetch logs
| append [fetch events | filter event.type == "error"]
```

### `join`
Joins records from source and sub-query based on a condition.

**Syntax:** `join joinTable [, kind], on: condition, … [, prefix] [, fields:{ [field, …] }] [, executionOrder]`

**Join kinds:**
- `inner` (default) — output record whenever left matches right
- `leftOuter` — all left records, matching right records; unmatched left rows have nulls on right
- `outer` — matched and unmatched records from either or both sides

**Join conditions:**
- Equality-based
- Same names: `on:{field}`
- Different names: `on:left[field] == right[field]`
- Multiple criteria comma-separated (AND logic)
- **Critical**: When both key values are `null`, records are NOT matched

**Parameters:**
- `joinTable` (required) — subquery
- `on` (required) — join condition
- `kind` (optional) — `inner`, `leftOuter`, `outer`
- `prefix` (optional) — defaults to `right`
- `fields` (optional) — project specific fields from subquery
- `executionOrder` (optional) — `auto`, `leftFirst`, `rightFirst`

**Best practices:**
- Place smallest dataset on the right
- Default to inner joins
- Filter or select inside the right-side subquery
- If left side is smaller, set `executionOrder: leftFirst`

**Limit:** Right side capped at 128 MB

**Examples:**
```dql
fetch logs
| join kind:leftOuter,
    on:{host},
    [fetch events | filter event.type == "error"]

fetch bizevents
| join kind:inner,
    on:{dt.entity.host},
    [fetch dt.entity.host]
| summarize count = count(), by:host.name
```

### `joinNested`
Adds matching results as an array of nested records.

**Syntax:** `joinNested alias = joinTable [, on: condition, …] [, fields:{ [field, …] }] [, executionOrder]`

- Functions as `leftOuter` variant
- Instead of replicating matching records, incorporates list of matching records into newly added field on left side
- New field holds an array of nested records
- Same 128 MB limit as `join`

**Example:**
```dql
fetch dt.entity.process_group
| joinNested services = [fetch dt.entity.service], on:{dt.entity.process_group}
```

### `lookup`
Adds fields from a subquery by matching fields between tables.

**Syntax:** `lookup lookupTable [, sourceField] [, lookupField] [, prefix] [, fields:{ [field, …] }] [, executionOrder]`

- Joins fields from subquery by matching `sourceField` (left) to `lookupField` (right)
- If several right-side rows match, only the top result is retrieved
- Default prefix: `lookup.`
- Null values on both sides do not match
- Can also be called as a function (nests returned fields into a single record)
- Same 128 MB limit as `join`

**Parameters:**
- `sourceField` (required)
- `lookupField` (required)
- `prefix` (optional) — default `lookup.`
- `fields` (optional)
- `executionOrder` (optional)

**Examples:**
```dql
fetch logs
| lookup sourceField:host, lookupField:dt.entity.host,
    [fetch dt.entity.host],
    prefix:host.

fetch logs
| lookup sourceField:k8s.cluster.id, lookupField:id,
    [fetch dt.entity.kubernetes_cluster],
    fields:{name}
```

## Smartscape Commands

### `smartscapeNodes`
Loads Smartscape nodes using a type pattern.

### `smartscapeEdges`
Loads Smartscape edges using an edge type pattern.

### `traverse`
Traverses source nodes to target nodes following edge types.

## Visual Signatures Summary

| Command | Visual Effect |
|---------|---------------|
| `fetch` | Full dataset appears, record count bar at 100% |
| `filter` | Bar shrinks. Dropped rows flash red and slide off |
| `filterOut` | Same as filter but flash color is orange |
| `fields` / `fieldsKeep` | Columns visibly disappear from inline sample |
| `fieldsAdd` | New column slides in from right |
| `fieldsRemove` | Specified columns fade out |
| `fieldsRename` | Column header morphs with a flash |
| `summarize` | Sample table morphs into horizontal bar chart |
| `sort` | Sample rows physically reorder with swap animation |
| `limit` | Bar gets cut off with vertical wall |
| `dedup` | Duplicate rows highlight, then merge |
| `parse` | Raw text shows regex highlight, extracted fields appear |
| `lookup` | Second mini-table slides in from right, then merges |
| `join` | Two streams converge into one |
| `expand` | One row visibly multiplies into N rows |
| `makeTimeseries` | Sample table morphs into time-bucketed chart |
| `search` | Matching fields briefly glow, non-matching fade |

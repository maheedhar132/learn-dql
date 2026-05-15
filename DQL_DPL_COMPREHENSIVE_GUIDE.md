# Dynatrace Query Language (DQL) & Pattern Language (DPL) - Comprehensive Guide

**Created**: May 15, 2026  
**Based on**: Official Dynatrace GRAIL Research  
**Purpose**: End-to-end understanding of DQL and DPL for building Dynatrace Apps

---

## Table of Contents

1. [Dynatrace GRAIL Overview](#dynatrace-grail-overview)
2. [DQL Fundamentals](#dql-fundamentals)
3. [DQL Pipeline Architecture](#dql-pipeline-architecture)
4. [Data Types](#data-types)
5. [DQL Commands Reference](#dql-commands-reference)
6. [DQL Functions Reference](#dql-functions-reference)
7. [DQL Best Practices](#dql-best-practices)
8. [Real-World Examples](#real-world-examples)
9. [Dynatrace Pattern Language (DPL)](#dynatrace-pattern-language-dpl)
10. [Building Dynatrace Apps](#building-dynatrace-apps)

---

## Dynatrace GRAIL Overview

### What is GRAIL?

Dynatrace Grail is "The Grail™ data lakehouse at the heart of the Dynatrace platform," engineered for digital service telemetry at enormous scale.

### Key Characteristics

**Data Lakehouse Architecture**
- Combines cost efficiency of data lakes with analytics capabilities of data warehouses
- Speed via distributing queries across many parallel workers
- Preserves connections across telemetry, risk signals, and business datasets
- Maintains "a graph context with causal dependencies among data"

**Storage Model**
- **Immutable data storage**: once written, data stays frozen
- Stored as atomic, unchangeable records
- Bundled into chronologically ordered parcels (~1GB each)
- Resides in distributed cloud object stores
- **Always-hydrated zero-latency cold/hot storage** — no reloading delays
- Datawarping technique fetches content without conventional indexes

**Schema**
- **Schemaless read-time model** — no upfront schema definition required
- Tagging and schema definition become unnecessary
- Context emerges automatically during intake
- Blends graph connections, event streams, chronological metrics, and flexible NoSQL structures

---

## DQL Fundamentals

### What is DQL?

DQL (Dynatrace Query Language) is built for processing **arbitrary event data**, requiring **no up-front description of the input data's schema**.

It serves as an instrument for:
- Investigating information
- Recognizing trends
- Spotting irregularities
- Building statistical models
- Other analytical tasks using material held within the Grail data layer

### Pipeline Syntax

```
command | command | command ...
```

Commands are separated by the pipe character `|`. Each command transforms the data stream.

### Recommended Command Ordering (Best Practices)

1. **fetch / timeseries** — Start with data source, restrict time range directly here
2. **filter / filterOut / search** — Reduce rows early (biggest performance win)
3. **fieldsKeep / fieldsRemove / fieldsRename** — Narrow columns
4. **parse / fieldsAdd** — Non-transformative enrichment
5. **summarize / makeTimeseries** — Aggregation (before limit!)
6. **sort** — Always place LAST for performance
7. **limit** — Final cap

**Critical Rules:**
- "A shorter analysis window provides better performance"
- "Avoid negations" — use inclusive conditions
- Place smallest dataset on the right side of joins
- Use `==` or `!=` for exact values, `~` for partial matches
- **Sorting right after fetch kills performance**

---

## DQL Pipeline Architecture

### Field Naming Rules

- Unicode characters supported
- Must use backticks for names that conflict with keywords: `true`, `false`, `null`, `mod`, `and`, `or`, `xor`, `not`
- Backtick escaping supported for problematic names: `` `and` ``

### Parameter Types

- **Required parameters** appear without brackets
- **Optional parameters** appear in brackets `[ ]`
- **Parameter groups** use curly braces `{ }`
- **Multiple parameters** of the same type separated by commas

---

## Data Types

### Primitive Types

| Type | Description | Literals | Casting |
|------|-------------|----------|---------|
| **Boolean** | True/false values | `true`, `false` | `toBoolean()`, `asBoolean()` |
| **Long** | 64-bit signed integer | `-2^63` to `2^63-1`, hex: `0xFF` | `toLong()`, `asLong()` |
| **Double** | 64-bit float (IEEE 754) | `2.34`, `2.4e2` | `toDouble()`, `asDouble()` |
| **String** | Text values | `"text"`, `"""multiline"""` | `toString()`, `asString()` |
| **Timestamp** | Instant with nanosecond precision | ISO 8601 format | `toTimestamp()`, `asTimestamp()` |
| **Duration** | Time interval | `1s`, `1m`, `1h`, `1d`, `1w`, `1M`, `1q`, `1y` | `toDuration()`, `asDuration()` |
| **Timeframe** | Start and end timestamps | Pair of timestamps | `toTimeframe()`, `asTimeframe()` |
| **IpAddress** | IPv4 or IPv6 address | `ip("192.168.1.1")` | `toIp()`, `asIp()` |
| **UID** | 64/128-bit identifiers | `uid64()`, `uid128()` | `toUid()`, `asUid()` |

### Complex Types

| Type | Description | Example |
|------|-------------|---------|
| **Array** | Ordered collection | `array(1,2,3)`, access via `arr[0]` |
| **Record** | Key-value pairs | `record(a=1, b="x")`, access via `r[key]` |
| **Null** | Absence of value | Returned from failed casts/operations |

### Type Checking

```dql
type(value)          # Returns type as text
isNull(value)        # Is null?
isNotNull(value)     # Is not null?
isTrue(expr)         # Is true?
isFalseOrNull(expr)  # Is false or null?
isTrueOrNull(expr)   # Is true or null?
```

---

## DQL Commands Reference

### Data Source Commands

#### `fetch` — Load data

Loads data from the specified resource. The starting point of every log/event/span pipeline.

**Syntax:**
```dql
fetch dataObject [, bucket: bucket, …] [, from] [, to] [, timeframe] [, samplingRatio] [, scanLimitGBytes]
```

**Parameters:**
- `dataObject` — data source: `logs`, `events`, `bizevents`, `spans`, `metrics`, `dt.entity.*`
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
fetch events, timeframe: "2021-10-20T00:00:00Z/2021-10-28T12:00:00Z"
fetch bizevents, from: -7d, samplingRatio: 100
fetch spans, scanLimitGBytes: 100
```

#### `timeseries` — Load, filter, and aggregate metrics

**CRITICAL:** This is how you work with metrics, NOT `fetch metrics`!

Combines loading, filtering and aggregating metrics data into a time series output.

**Syntax:**
```dql
timeseries [by:{ expression, … }] [, interval] [, bins] [, from] [, to] [, timeframe] [, time] [, spread] [, nonempty] [, scalar] [, filter] aggregation, …
```

**Key Parameters:**
- `aggregation` (required) — numeric aggregation function
- `time` (optional) — timestamp field; default `timestamp`, fallback `start_time`
- `from` / `to` (optional) — start/end boundaries
- `timeframe` (optional) — overall window; uses query timeframe if omitted
- `bins` (optional, positive integer) — desired bucket count; default `120`; range 12-1500
- `interval` (optional, positive duration) — bucket length; mutually exclusive with `bins`
- `by` (optional) — expressions that split the series
- `nonempty` (optional) — emits series even if no input exists
- `scalar` (optional) — calculates single scalar across whole window
- `filter` (optional) — filter condition for metric selection

**Aggregation functions for timeseries:**
- `sum(expression [, default] [, rate])`
- `avg(expression [, default] [, rate])`
- `min(expression [, default] [, rate])`
- `max(expression [, default] [, rate])`
- `median(expression [, weight] [, default] [, rate])`
- `percentile(expression, percentile [, weight] [, default] [, rate])`
- `count([default] [, rate])`
- `countIf(expression [, default] [, rate])`
- `countDistinctExact(expression [, default] [, rate])`
- `countDistinctApprox(expression [, precision] [, default] [, rate])`

**Examples:**
```dql
# Average CPU usage across all hosts
timeseries usage = avg(dt.host.cpu.usage)

# Average CPU by host (top 3)
timeseries usage = avg(dt.host.cpu.usage, scalar:true), by:{dt.entity.host}

# Per-second failure rate
timeseries sum(dt.service.request.failure_count, rate:1s),
    filter:{startsWith(endpoint.name, "/api/accounts")}

# Host availability with default gap-fill
timeseries availability = sum(dt.host.availability, default:0),
    nonempty:true,
    filter:{availability.state == "up"}

# Multi-host disk availability
timeseries avail = avg(dt.host.disk.avail), by:{dt.entity.host}, from:-24h
```

#### `metrics` — Retrieve metric series

Retrieves metric series.

#### `describe` — Describe schema

Describes the on-read schema extraction definition for a given data object.

**Syntax:** `describe dataObject`

**Example:**
```dql
describe bizevents
```

#### `data` — Generate sample data

Generates sample data during query runtime. Requires no incoming pipeline.

**Syntax:** `data [ records ] [, json: json_string ]`

**Examples:**
```dql
data record(name = "test", value = 1),
     record(name = "demo", value = 2)
| fieldsAdd doubled = value * 2

data json: """{"name":"test","value":1}"""
```

#### `load` — Load external lookup files

Loads data from external lookup files.

**Syntax:** `load tabularFile [, offset]`

**Example:**
```dql
load "/lookups/pricelist"
```

---

### Filtering Commands

#### `filter` — Keep matching records

Keeps records matching a specified condition.

**Syntax:** `filter condition`

**Critical null handling:**
- `filter not x` removes records where `x` is `null` (because `not null` = `null`, and filter keeps only `true`)
- Use `isTrueOrNull()` to include nulls

**Examples:**
```dql
fetch logs | filter loglevel == "ERROR"
fetch logs | filter (loglevel == "SEVERE" or loglevel == "ERROR") and not endsWith(log.source, "audit.log")
fetch logs | filter host == "prod-1" or host == "prod-2"
fetch logs | filter k8s.namespace.name ~ "astro*"
```

#### `filterOut` — Remove matching records

Removes records matching a specific condition.

**Syntax:** `filterOut condition`

**Critical null handling:**
- `filterOut x` keeps records where `x` is `null`
- Any null or non-boolean result causes the row to be retained

**Examples:**
```dql
fetch logs | filterOut loglevel == "INFO"
fetch logs | filterOut (loglevel == "NONE" or loglevel == "INFO")
```

#### `search` — Case-insensitive token matching

Performs case-insensitive token matching across records.

**Syntax:** `search condition`

**Features:**
- Search-bar-style exploration
- Plain string literal scans every field
- Restrict scan with `~` operator: `field ~ term`
- Wildcards match zero or more characters inside a token
- Wildcards do NOT function against numeric, IP, or UID fields
- Inspects nested records and array elements
- Can mix search tokens with standard comparison operators

**Examples:**
```dql
fetch logs | search "timeout"
fetch logs | search content ~ "error*"
fetch logs | search "cart" and status >= 400
```

#### `dedup` — Remove duplicates

Removes duplicates from a list of records.

**Syntax:** `dedup expression, … [, sort:expr [asc|desc]]`

**Examples:**
```dql
fetch logs | dedup log.source, sort:timestamp desc
```

---

### Selection Commands

#### `fields` / `fieldsKeep` — Keep only specified fields

**Syntax:** `fields field, …`

**Example:**
```dql
fetch logs | fields timestamp, loglevel, log.source, content
```

#### `fieldsAdd` — Add computed fields

Evaluates an expression and appends or replaces a field.

**Syntax:** `fieldsAdd field = expression, …`

**Examples:**
```dql
fetch logs | fieldsAdd severity = if(loglevel == "ERROR", "CRITICAL", "WARNING")
fetch logs | fieldsAdd hour = getHour(timestamp)
```

#### `fieldsRemove` — Remove fields

**Syntax:** `fieldsRemove field, …`

**Example:**
```dql
fetch logs | fieldsRemove dt.system.*, internal_id
```

#### `fieldsRename` — Rename fields

**Syntax:** `fieldsRename oldName = newName, …`

**Example:**
```dql
fetch logs | fieldsRename loglevel = level, log.source = source
```

---

### Aggregation Commands

#### `summarize` — Group and aggregate

Groups together records that have the same values for a given field and aggregates them.

**Syntax:** `summarize [field =] aggregation, … [, by:{[field =] expression, …}]`

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

**Examples:**
```dql
fetch logs | summarize count = count()
fetch logs | summarize sum = sum(amount)
fetch logs | summarize errors = countIf(loglevel == "ERROR"), by:{host, process_group}
fetch logs | summarize count = count(), by:loglevel
```

#### `makeTimeseries` — Create time series

Creates time series from data in the stream for charting.

**Syntax:** 
```dql
makeTimeseries [by:{ expression, … }] [, interval] [, bins] [, from] [, to] [, timeframe] [, time] [, spread] [, nonempty] [, scalar] aggregation, …
```

**Key differences from `timeseries`:**
- `timeseries` is for metrics data directly
- `makeTimeseries` is for aggregating logs/events/spans into time buckets

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

#### `fieldsSummary` — Field cardinality

Calculates the cardinality of field values.

**Syntax:** `fieldsSummary field, … [, topValues] [, extrapolateSamples]`

**Example:**
```dql
fetch logs, samplingRatio: 10000
| fieldsSummary dt.entity.host, topValues: 10, extrapolateSamples: true
```

---

### Ordering Commands

#### `sort` — Sort results

Sorts the records.

**Syntax:** `sort expression [asc|desc], …`

**Critical:** Always place LAST for performance. Sorting right after `fetch` kills performance.

**Examples:**
```dql
fetch logs | sort timestamp desc
fetch logs | sort loglevel asc, timestamp desc
```

#### `limit` — Cap result count

Limits the number of returned records.

**Syntax:** `limit count`

**Critical:** Must come AFTER summarize/makeTimeseries (otherwise produces incorrect groupings)

**Example:**
```dql
fetch logs | sort timestamp desc | limit 100
```

---

### Extraction and Parsing Commands

#### `parse` — Extract structured data

Parses a record field and puts the result into one or more fields as specified in the pattern.

**Syntax:** `parse field, pattern`

**Pattern forms:**
- `STRUCTURE{...}:fieldname`
- `JSON{...}:fieldname`
- `KVP{...}:fieldname`
- `$subpattern:fieldname`

**Examples:**
```dql
fetch logs
| parse content, "LD{DATA}:errortype"

fetch logs
| parse content, JSON:event

fetch logs
| parse content, KVP{LD:key'='(LONG:valueLong | STRING:valueStr)'; '?}:person
```

---

### Structuring Commands

#### `expand` — Expand arrays into rows

Expands an array into separate records.

**Syntax:** `expand arrayField`

**Example:**
```dql
fetch events
| expand tags
```

#### `flatten` / `fieldsFlatten` — Flatten nested fields

Extracts/flattens fields from a nested record.

**Syntax:** `fieldsFlatten recordField`

---

### Join Commands

#### `append` — Union with subquery

Appends records from a sub-query.

**Syntax:** `append executionBlock`

**Example:**
```dql
fetch logs
| append [fetch events | filter event.type == "error"]
```

#### `join` — Join two data sources

Joins records from source and sub-query based on a condition.

**Syntax:** `join joinTable [, kind], on: condition, … [, prefix] [, fields:{ [field, …] }] [, executionOrder]`

**Join kinds:**
- `inner` (default) — output record whenever left matches right
- `leftOuter` — all left records, matching right records; unmatched left rows have nulls on right
- `outer` — matched and unmatched records from either or both sides

**Best practices:**
- Place smallest dataset on the right
- Default to inner joins
- Filter or select inside the right-side subquery
- Right side capped at 128 MB
- When both key values are `null`, records are NOT matched

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

#### `joinNested` — Join as nested array

Adds matching results as an array of nested records.

**Syntax:** `joinNested alias = joinTable [, on: condition, …] [, fields:{ [field, …] }] [, executionOrder]`

**Example:**
```dql
fetch dt.entity.process_group
| joinNested services = [fetch dt.entity.service], on:{dt.entity.process_group}
```

#### `lookup` — Add fields by matching

Adds fields from a subquery by matching fields between tables.

**Syntax:** `lookup lookupTable [, sourceField] [, lookupField] [, prefix] [, fields:{ [field, …] }] [, executionOrder]`

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

---

### Smartscape Commands

#### `smartscapeNodes` — Load topology nodes

Loads Smartscape nodes using a type pattern.

#### `smartscapeEdges` — Load topology edges

Loads Smartscape edges using an edge type pattern.

#### `traverse` — Traverse graph

Traverses source nodes to target nodes following edge types.

---

## DQL Functions Reference

### Aggregation Functions (24)

Used with `summarize`, `makeTimeseries`, or `timeseries`:

| Function | Description |
|----------|-------------|
| `avg(expr)` | Mean |
| `collectArray(expr)` | Gather into array |
| `collectDistinct(expr)` | Gather distinct |
| `correlation(e1, e2)` | Pearson correlation |
| `count()` | Record count |
| `countDistinctExact(expr)` | Exact cardinality (capped 1M) |
| `countDistinctApprox(expr [, precision])` | Approximate cardinality |
| `countIf(expr)` | Conditional count |
| `max(expr)` | Maximum |
| `median(expr [, weight])` | Median |
| `min(expr)` | Minimum |
| `percentile(expr, p [, weight])` | Percentile (0-100) |
| `percentiles(expr, ...)` | Multiple percentiles |
| `percentileFromSamples(expr, p)` | Percentile from array |
| `percentRank(expr, value)` | Percentile rank |
| `stddev(expr)` | Standard deviation |
| `sum(expr)` | Sum |
| `takeAny(expr)` | Any non-null value |
| `takeFirst(expr)` | First value |
| `takeLast(expr)` | Last value |
| `takeMax(expr)` | Maximum value |
| `takeMin(expr)` | Minimum value |
| `variance(expr)` | Variance |

### String Functions (24)

| Function | Example |
|----------|---------|
| `concat(expr, ...)` | `concat(host, ":", port)` |
| `contains(string, substring)` | `contains(content, "error")` |
| `decodeUrl(string)` | `decodeUrl(url)` |
| `encodeUrl(string)` | `encodeUrl(path)` |
| `endsWith(string, suffix)` | `endsWith(log.source, ".log")` |
| `escape(string)` | `escape(raw)` |
| `getCharacter(string, index)` | `getCharacter(code, 0)` |
| `indexOf(string, substring)` | `indexOf(content, "fail")` |
| `jsonField(string, fieldName)` | `jsonField(content, "status")` |
| `jsonPath(string, path)` | `jsonPath(content, "$.user.id")` |
| `lastIndexOf(string, substring)` | `lastIndexOf(path, "/")` |
| `levenshteinDistance(s1, s2)` | `levenshteinDistance(a, b)` |
| `like(string, pattern)` | `like(name, "prod_%")` |
| `lower(string)` | `lower(loglevel)` |
| `matchesPattern(string, dplPattern)` | `matchesPattern(content, "INT:code")` |
| `matchesPhrase(string, phrase)` | `matchesPhrase(content, "connection refused")` |
| `parse(string, pattern)` | `parse(content, "INT:status")` |
| `replaceString(string, old, new)` | `replaceString(host, "-", "_")` |
| `splitString(string, delimiter)` | `splitString(tags, ",")` |
| `startsWith(string, prefix)` | `startsWith(endpoint, "/api/")` |
| `stringLength(string)` | `stringLength(content)` |
| `substring(string, start [, end])` | `substring(content, 0, 100)` |
| `trim(string)` | `trim(log.source)` |
| `upper(string)` | `upper(loglevel)` |

### Conversion/Casting Functions (31)

| Function | Example |
|----------|---------|
| `asArray(value)` | Yields array or null |
| `asBoolean(value)` | Yields boolean or null |
| `asDouble(value)` | Yields double or null |
| `asLong(value)` | Yields long or null |
| `asString(value)` | Yields string or null |
| `asTimestamp(value)` | Yields timestamp or null |
| `toArray(value)` | Cast to array |
| `toBoolean(value)` | Cast to boolean |
| `toDouble(value)` | `toDouble("3.14")` |
| `toDuration(value)` | `toDuration("1h")` |
| `toIp(value)` | `toIp("192.168.1.1")` |
| `toLong(value)` | `toLong("42")` |
| `toString(value)` | `toString(42)` |
| `toTimestamp(value)` | `toTimestamp("2023-01-01")` |
| `type(value)` | Returns data type as text |

### Time Functions (20)

| Function | Example |
|----------|---------|
| `duration(value, unit)` | `duration(60, "s")` |
| `formatTimestamp(ts [, ...])` | `formatTimestamp(ts, format:"yyyy-MM-dd")` |
| `getDayOfMonth(ts [, tz])` | `getDayOfMonth(timestamp)` |
| `getDayOfWeek(ts [, tz])` | `getDayOfWeek(timestamp)` |
| `getDayOfYear(ts [, tz])` | `getDayOfYear(timestamp)` |
| `getHour(ts [, tz])` | `getHour(timestamp)` |
| `getMinute(ts [, tz])` | `getMinute(timestamp)` |
| `getMonth(ts [, tz])` | `getMonth(timestamp)` |
| `getSecond(ts [, tz])` | `getSecond(timestamp)` |
| `getWeekOfYear(ts [, tz])` | `getWeekOfYear(timestamp)` |
| `getYear(ts [, tz])` | `getYear(timestamp)` |
| `now()` | Current timestamp |
| `timeframe(from [, to])` | `timeframe(from:now()-2h)` |
| `timestamp(year, month, ...)` | `timestamp(2023, 1, 1, 0, 0, 0)` |
| `timestampFromUnixMillis(millis)` | Convert epoch ms |
| `timestampFromUnixSeconds(secs)` | Convert epoch s |
| `unixMillisFromTimestamp(ts)` | Convert to epoch ms |
| `unixSecondsFromTimestamp(ts)` | Convert to epoch s |

### Array Functions (29)

| Function | Example |
|----------|---------|
| `array(...)` | `array(1, 2, 3)` |
| `arrayAvg(array)` | Average of elements |
| `arrayConcat(array, ...)` | Join arrays |
| `arrayDistinct(array)` | Remove duplicates |
| `arrayElement(array, index)` | `arrayElement(tags, 0)` |
| `arrayFirst(array)` | First non-null |
| `arrayFlatten(array)` | Flatten nested |
| `arrayIndexOf(array, value)` | Find index |
| `arrayMax(array)` | Largest number |
| `arrayMin(array)` | Smallest number |
| `arraySize(array)` | Count items |
| `arraySort(array)` | Sort ascending |
| `arraySum(array)` | Sum elements |

### Conditional Functions

| Function | Example |
|----------|---------|
| `coalesce(expr, ...)` | First non-null |
| `if(condition, then, else)` | `if(x > 0, "pos", "neg")` |

### Boolean Functions

| Function | Example |
|----------|---------|
| `isNull(value)` | Is null? |
| `isNotNull(value)` | Is not null? |
| `isTrue(expr)` | Is true? |
| `isTrueOrNull(expr)` | Is true or null? |
| `isFalseOrNull(expr)` | Is false or null? |

### Network/IP Functions (10)

| Function | Example |
|----------|---------|
| `ip(string)` | `ip("10.0.0.1")` |
| `ipIn(ip, network)` | `ipIn(addr, "10.0.0.0/8")` |
| `ipIsPrivate(ip)` | Is private? |
| `ipIsPublic(ip)` | Is public? |
| `ipMask(ip, bits)` | Mask address |
| `isIp(value)` | Is IPv4/v6? |
| `isIpV4(value)` | Is IPv4? |
| `isIpV6(value)` | Is IPv6? |

### Hash Functions (7)

| Function | Example |
|----------|---------|
| `hashCrc32(string)` | CRC32 hash |
| `hashMd5(string)` | MD5 hash |
| `hashSha1(string)` | SHA-1 hash |
| `hashSha256(expr)` | SHA-256 hash |
| `hashSha512(expr)` | SHA-512 hash |

### Mathematical Functions (32)

| Function | Example |
|----------|---------|
| `abs(value)` | `abs(-5)` |
| `ceil(value)` | `ceil(2.3)` |
| `cos(angle)` | `cos(pi())` |
| `exp(value)` | e^x |
| `floor(value)` | `floor(2.9)` |
| `log(value)` | Natural log |
| `log10(value)` | Base-10 log |
| `max(n1, n2, ...)` | Maximum |
| `min(n1, n2, ...)` | Minimum |
| `pi()` | π constant |
| `power(base, exp)` | `power(2, 10)` |
| `round(value [, decimals])` | `round(3.1415, 2)` |
| `sin(angle)` | `sin(pi()/2)` |
| `sqrt(value)` | `sqrt(16)` |
| `tan(angle)` | `tan(pi()/4)` |

---

## DQL Best Practices

### Performance Optimization

**Filter Early and Often**
```dql
# Good - filter early
fetch logs, from: -1h
| filter loglevel == "ERROR"
| parse content as fields

# Avoid - parsing all then filtering
fetch logs
| parse content as fields
| filter loglevel == "ERROR"
```

**Use Specific Time Ranges**
```dql
# Good - explicit time range
fetch logs, from: -24h, to: now()

# Avoid - unbounded or very large time ranges
fetch logs
```

**Limit Results Early**
```dql
fetch logs
| filter loglevel == "ERROR"
| sort timestamp desc
| limit 100
```

**Avoid Negations**
```dql
# Good - inclusive
fetch logs | filter loglevel == "ERROR" or loglevel == "CRITICAL"

# Avoid - negation
fetch logs | filterOut loglevel != "ERROR"
```

**Place Smallest Dataset on Right of Joins**
```dql
fetch logs
| join [fetch events | filter event.type == "error"]
```

**Sort at the End**
```dql
# Good - sort after aggregation
fetch logs
| summarize count = count(), by:host
| sort count desc

# Avoid - sort early kills performance
fetch logs
| sort timestamp desc
| summarize count = count(), by:host
```

### Data Quality

**Handle Null Values**
```dql
fetch logs
| filter response_time != null
| fields host, coalesce(severity, "UNKNOWN") as severity
```

**Type Safety**
```dql
fetch logs
| fieldsAdd response_time_ms = toLong(response_time)
| filter response_time_ms != null
```

---

## Real-World Examples

### Logs

**Basic error filtering**
```dql
fetch logs, from: -24h
| filter loglevel == "ERROR"
| fields timestamp, loglevel, log.source, content
| sort timestamp desc
| limit 100
```

**Parse HTTP status codes**
```dql
fetch logs
| filter dt.entity.process_group == "PROCESS_GROUP-123F4A56BCDA0EA9"
| parse content, "LD 'HTTP_STATUS ' INT:httpstatus"
| filter httpstatus >= 400
| summarize count = count(), by:{httpstatus}
```

**Track user changes from audit logs**
```dql
fetch logs, from:now()-5m
| filter endsWith(log.source, "change.log")
| parse content, "TIMESTAMP('yyyy-MM-dd HH:mm:ss'):ts LD JSON:settings"
| fieldsAdd type = settings[eventType], user = settings[userId]
| filter in(type, array("UPDATE", "DELETE"))
| summarize count = count(), by:{user, type}
```

### Metrics

**Average CPU usage across hosts**
```dql
timeseries usage = avg(dt.host.cpu.usage)
```

**Average CPU by host (top 3)**
```dql
timeseries usage = avg(dt.host.cpu.usage, scalar:true), by:{dt.entity.host}
| sort usage desc
| limit 3
```

**Per-second failure rate**
```dql
timeseries sum(dt.service.request.failure_count, rate:1s),
    filter:{startsWith(endpoint.name, "/api/accounts")}
```

**Host availability with gap-fill**
```dql
timeseries availability = sum(dt.host.availability, default:0),
    nonempty:true,
    filter:{availability.state == "up"}
```

### Business Events

**Average trading dollar volume**
```dql
fetch bizevents, from:now()-24h
| filter event.type == "com.easytrade.quick-buy" or event.type == "com.easytrade.long-buy"
| summarize dollar_volume = avg(amount * price)
```

**Trading volume over time**
```dql
fetch bizevents, from:now()-24h
| filter event.type == "com.easytrade.nginx.quick-sell"
| makeTimeseries dollar_volume = sum(amount * price), interval:5m
```

### Events

**Count actions per user**
```dql
fetch events, from:-24h
| summarize
    creates = countIf(event.type == "CREATE"),
    updates = countIf(event.type == "UPDATE"),
    deletes = countIf(event.type == "DELETE"),
    by:{user, tenant}
```

### Spans

**Error rate by service**
```dql
fetch spans, from:-1h
| filter status.code == "ERROR"
| summarize error_count = count(), by:{service.name}
| sort error_count desc
```

**Latency percentiles by endpoint**
```dql
fetch spans, from:-1h
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99),
    by:{endpoint.name}
| sort p95 desc
```

### Joins & Lookups

**Join logs with host entity**
```dql
fetch logs
| join kind:leftOuter,
    on:{host},
    [fetch dt.entity.host]
```

**Lookup host name from entities**
```dql
fetch logs
| lookup sourceField:host, lookupField:dt.entity.host,
    [fetch dt.entity.host],
    prefix:host.
```

---

## Dynatrace Pattern Language (DPL)

### What is DPL?

Dynatrace Pattern Language (DPL) is a specialized language for extracting and parsing structured information from unstructured log data. It's used within DQL's `parse` command.

### Core Pattern Elements

#### String Patterns

Match exact strings:
```dql
fetch logs | parse content, "ERROR: " string message
```

#### Numeric Patterns

```dpl
INT name        # Match integer
LONG name       # Match long integer
FLOAT name      # Match floating-point number
DOUBLE name     # Match double
NUMBER name     # Match any number
```

#### Positional Matchers

```dpl
SPACE           # One space
ws              # Whitespace
digit           # Single digit (0-9)
letter          # Single letter (a-z, A-Z)
CHAR name       # Any single character
```

#### Time and Date Patterns

```dpl
DATE('format') name
TIME('format') name
TIMESTAMP('format') name
hhmmss name
```

#### Network Patterns

```dpl
IPADDRESS name
IPADDR name
EMAIL name
URL name
```

### Pattern Modifiers

```dpl
LD              # Left delimiter - match to word boundary
RD              # Right delimiter - match from word boundary
GREEDY          # Longest match
SPACE           # Treat as space
NOCASE          # Case-insensitive
```

### Sequences and Alternatives

**Sequences:**
```dql
fetch logs
| parse content, {
    STRING app,
    "-",
    INT version,
    "-",
    STRING environment
  }
```

**Alternatives (OR):**
```dql
fetch logs
| parse content, {
    STRING app,
    ("ERROR" | "WARN" | "INFO") as level,
    STRING message
  }
```

**Optional groups:**
```dql
fetch logs
| parse content, {
    STRING service,
    {
        "running" | "stopped"
    }?
  }
```

### JSON Patterns

```dql
fetch logs
| parse content, "JSON:event"
| fields event[status], event[code]
```

### Key-Value Patterns

```dql
fetch logs
| parse content, "KVP:kvpairs"
| fields kvpairs[error], kvpairs[code]
```

---

## Building Dynatrace Apps

### App Architecture

A Dynatrace App consists of:

1. **Dashboard** — UI components and layouts
2. **Data Layer** — DQL queries
3. **Business Logic** — Processing and transformations
4. **Configuration** — App settings and parameters

### Query Organization

```
queries/
├── system_health.dql
├── error_analysis.dql
├── performance_metrics.dql
└── dependency_tracking.dql
```

### Example: Monitoring Dashboard

**Query 1: Error Overview**
```dql
fetch logs, from: -1h
| filter severity == "ERROR"
| summarize {
    count() as total_errors,
    countDistinctExact(host) as affected_hosts
  }
```

**Query 2: Error Trend**
```dql
fetch logs, from: -24h
| filter severity == "ERROR"
| makeTimeseries error_count = count(), interval:1h
```

**Query 3: Top Error Types**
```dql
fetch logs, from: -1h
| filter severity == "ERROR"
| parse content, "ERROR:{error_type}"
| summarize count = count(), by:{error_type}
| sort count desc
| limit 10
```

### Performance Considerations

1. **Query Optimization**
   - Filter by timestamp early
   - Use specific field names
   - Limit aggregation dimensions
   - Avoid expensive operations in filter conditions

2. **Sampling**
   - Use `samplingRatio` for large datasets
   - Account for sampling in aggregations
   - Store ratio in `dt.system.sampling_ratio`

3. **Scalability**
   - Design queries for large datasets
   - Use windowing for real-time data
   - Implement caching where appropriate

---

## Quick Reference

**Fetch data:**
```dql
fetch logs, from: -24h
fetch events, from: -7d
fetch bizevents, from: -1h
fetch spans, from: -1h
```

**Query metrics:**
```dql
timeseries usage = avg(dt.host.cpu.usage)
timeseries sum(metric_name, rate:1s), by:{dimension}
```

**Filter:**
```dql
| filter loglevel == "ERROR"
| filterOut loglevel == "DEBUG"
| search "keyword"
```

**Transform:**
```dql
| fields timestamp, host, content
| fieldsAdd severity = if(loglevel == "ERROR", "HIGH", "LOW")
| parse content, "INT:code"
```

**Aggregate:**
```dql
| summarize count = count(), avg = avg(value), by:{host}
| makeTimeseries count = count(), interval:5m
```

**Order & Limit:**
```dql
| sort timestamp desc
| limit 100
```

**Join:**
```dql
| join [fetch events] on:{host}
```

---

## Learning Path

1. **Basics** → Master fetch, filter, select, limit
2. **Data Handling** → Learn parsing and field transformations
3. **Aggregations** → Master summarize and grouping
4. **Time Series** → Understand makeTimeseries and timeseries
5. **Advanced** → Joins, complex parsing, window operations
6. **App Design** → Combine multiple queries into apps
7. **Optimization** → Performance tuning and best practices

---

**Last Updated**: May 15, 2026  
**Source**: Official Dynatrace GRAIL Research  
**Status**: Corrected and Complete

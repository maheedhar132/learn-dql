# Dynatrace Query Language (DQL) & Pattern Language (DPL) - Comprehensive Guide

**Created**: May 15, 2026  
**Purpose**: End-to-end understanding of DQL and DPL for building Dynatrace Apps

---

## Table of Contents

1. [DQL Overview](#dql-overview)
2. [DQL Fundamentals](#dql-fundamentals)
3. [DQL Data Types](#dql-data-types)
4. [DQL Commands](#dql-commands)
5. [DQL Functions](#dql-functions)
6. [DQL Operators](#dql-operators)
7. [DQL Best Practices](#dql-best-practices)
8. [DQL Use Cases](#dql-use-cases)
9. [Dynatrace Pattern Language (DPL)](#dynatrace-pattern-language-dpl)
10. [Building Dynatrace Apps](#building-dynatrace-apps)

---

## DQL Overview

### What is DQL?

Dynatrace Query Language (DQL) is a powerful, purpose-built query language designed to analyze and explore Dynatrace's extensive data platform (GRAIL - Dynatrace's data lakehouse).

**Key Characteristics:**
- **Declarative syntax** - Specify what you want, not how to get it
- **Distributed & parallel processing** - Handles massive datasets efficiently
- **SQL-like syntax** - Familiar to those with SQL experience, but optimized for observability
- **Real-time capabilities** - Query live and historical data
- **Composable queries** - Build complex queries from simpler components

### Core Capabilities

- Query metrics, logs, events, and traces
- Perform advanced analytics and aggregations
- Extract and parse unstructured data
- Join and correlate multiple data sources
- Build custom dashboards and alerts

---

## DQL Fundamentals

### Basic Query Structure

```dql
data_source
| filter condition
| select fields
| aggregate
```

### Query Anatomy

A DQL query consists of:

1. **Data Source** - Where you get data from
   ```dql
   fetch events
   fetch logs
   fetch metrics
   fetch spans
   fetch relationships
   ```

2. **Pipe (`|`)** - Chains operations together

3. **Commands** - Operations on the data
   - Filtering
   - Selection
   - Aggregation
   - Transformation
   - Ordering
   - Limiting

4. **Functions** - Used within commands for data manipulation

### Example Query

```dql
fetch logs
| filter severity == "ERROR"
| fields timestamp, content, host
| sort timestamp desc
| limit 100
```

### Key Concepts

#### Data Source Types

- **Metrics** - Time-series numeric data (CPU, memory, response time, etc.)
- **Logs** - Unstructured text entries with timestamps
- **Events** - Point-in-time occurrences (deployments, alerts, etc.)
- **Spans** - Individual operation traces
- **Relationships** - Entity relationships and topology

#### Filtering

Filter data based on conditions:

```dql
fetch logs
| filter severity == "ERROR" and host == "prod-01"
| filter response_time > 1000
| filter timestamp > now() - 1h
```

#### Selection

Choose which fields to return:

```dql
fetch metrics "builtin:host.cpu.usage"
| select timestamp, host, value
```

#### Aggregation

Combine data:

```dql
fetch metrics "builtin:host.cpu.usage"
| summarize avg(value) by host
```

#### Transformation

Modify or enrich data:

```dql
fetch logs
| fields timestamp, content, severity
| parse content as {string host}
```

---

## DQL Data Types

### Primitive Types

| Type | Description | Examples |
|------|-------------|----------|
| `number` | Integers and floats | `42`, `3.14`, `-100` |
| `string` | Text values | `"error"`, `'warning'` |
| `bool` | Boolean values | `true`, `false` |
| `timestamp` | Date and time | `2024-01-15T10:30:00Z` |
| `duration` | Time intervals | `1h`, `30m`, `45s` |

### Complex Types

| Type | Description |
|------|-------------|
| `record` | Structured data with named fields |
| `array` | Ordered collection of values |
| `null` | Absence of value |

### Type Conversion Functions

```dql
toString(number)     # number -> string
toNumber(string)     # string -> number
toInt(string)        # string -> int
toFloat(string)      # string -> float
toBool(string)       # string -> bool
toString(timestamp)  # timestamp -> string
```

### Working with Types

```dql
fetch logs
| filter toNumber(response_time) > 1000
| fields host, toString(timestamp) as time_str
```

---

## DQL Commands

### 1. Data Source Commands

#### fetch

Load data from the platform:

```dql
fetch events
fetch logs
fetch metrics "builtin:host.cpu.usage"
fetch spans
fetch relationships
```

#### fetchEvents

Get events with specific entity types:

```dql
fetchEvents("type(\"APPLICATION\")")
```

### 2. Filtering Commands

#### filter

Basic conditional filtering:

```dql
fetch logs
| filter severity == "ERROR"
| filter response_time > 1000
```

#### filterOut

Inverse filtering (exclude):

```dql
fetch logs
| filterOut severity == "DEBUG"
```

### 3. Selection Commands

#### select / fields

Choose columns:

```dql
fetch logs | select timestamp, host, content
fetch logs | fields timestamp, host, content
```

#### rename

Rename fields:

```dql
fetch logs
| fields timestamp, content
| rename content -> message
```

### 4. Aggregation Commands

#### summarize / stats

Group and aggregate:

```dql
fetch metrics "builtin:host.cpu.usage"
| summarize {
    avg(value),
    max(value),
    count()
  } by {host}
```

#### topK / bottomK

Get top/bottom values:

```dql
fetch metrics "builtin:host.cpu.usage"
| summarize avg(value) by host
| topK(10, "avg(value)")
```

### 5. Ordering Commands

#### sort / order

Sort results:

```dql
fetch logs
| sort timestamp desc
| sort severity asc, timestamp desc
```

### 6. Limiting Commands

#### limit

Restrict number of rows:

```dql
fetch logs
| sort timestamp desc
| limit 100
```

#### head / tail

Get first/last N rows:

```dql
fetch logs | head 50
fetch logs | tail 20
```

### 7. Extraction & Parsing Commands

#### parse

Extract structured data from strings:

```dql
fetch logs
| parse content as {
    string method,
    string path,
    int status_code
  }
```

#### parseJson

Extract JSON data:

```dql
fetch logs
| parseJson content as payload
| fields payload.user_id, payload.action
```

### 8. Transformation Commands

#### fields (with expressions)

Add computed fields:

```dql
fetch metrics "builtin:host.cpu.usage"
| fields 
    timestamp,
    host,
    value,
    value * 2 as doubled_value
```

#### dedup

Remove duplicates:

```dql
fetch logs
| dedup host, content
```

### 9. Joining Commands

#### join

Combine multiple data sources:

```dql
fetch logs | join [
  fetch events on host == entity.name
]
```

#### append

Combine results vertically:

```dql
fetch logs on host == "prod-01"
| append [
  fetch events on host == "prod-01"
]
```

### 10. Structuring Commands

#### expand

Flatten nested arrays:

```dql
fetch logs
| parseJson content as payload
| expand payload.items
```

#### window / timeWindow

Time-based operations:

```dql
fetch metrics "builtin:host.cpu.usage"
| timeWindow 1m
```

---

## DQL Functions

### Aggregation Functions

Used with `summarize`:

```dql
count()              # Number of records
sum(field)          # Sum of values
avg(field)          # Average value
min(field)          # Minimum value
max(field)          # Maximum value
stdDev(field)       # Standard deviation
percentile(field,p) # Percentile (0-100)
```

Example:
```dql
fetch metrics "builtin:host.cpu.usage"
| summarize {
    count(),
    avg(value),
    percentile(value, 95) as p95
  } by host
```

### Array Functions

Manipulate arrays:

```dql
arraySize(array)
arrayConcat(arr1, arr2)
arrayFlat(array)
arrayJoin(array, separator)
arrayContains(array, element)
arrayIndexOf(array, element)
```

Example:
```dql
fetch logs
| parseJson content as payload
| fields arraySize(payload.items) as item_count
```

### String Functions

Work with text:

```dql
strlen(string)
substring(string, start, length)
toLower(string)
toUpper(string)
trim(string)
replace(string, find, replace)
contains(string, substring)
startsWith(string, prefix)
endsWith(string, suffix)
split(string, delimiter)
concat(str1, str2, ...)
printf(format, args...)
```

Example:
```dql
fetch logs
| filter contains(content, "error")
| fields 
    host,
    toUpper(severity) as severity_upper,
    substring(content, 0, 100) as content_preview
```

### Mathematical Functions

Numeric operations:

```dql
abs(number)
round(number)
ceil(number)
floor(number)
sqrt(number)
pow(number, exponent)
log(number)
log10(number)
exp(number)
min(n1, n2, ...)
max(n1, n2, ...)
```

Example:
```dql
fetch metrics "builtin:host.memory.usage"
| fields host, sqrt(value) as sqrt_value
```

### Time Functions

Handle timestamps and durations:

```dql
now()                          # Current timestamp
ago(duration)                  # Timestamp in the past
dateAdd(timestamp, duration)   # Add duration to timestamp
dateDiff(ts1, ts2)            # Difference between timestamps
formatTime(timestamp, format)  # Format timestamp
timestamp()                    # Current epoch time
```

Example:
```dql
fetch logs
| filter timestamp > ago(1h)
| fields timestamp, formatTime(timestamp, "yyyy-MM-dd HH:mm:ss") as formatted_time
```

### Conditional Functions

Control flow:

```dql
if(condition, true_value, false_value)
case when cond1 then val1 when cond2 then val2 else val3 end
coalesce(val1, val2, val3, ...)
```

Example:
```dql
fetch logs
| fields 
    host,
    severity,
    if(severity == "ERROR", "high", "low") as priority
```

### Conversion Functions

Convert between types:

```dql
toString(value)
toNumber(string)
toInt(string)
toFloat(string)
toBool(string)
toTimestamp(string)
```

### Hash Functions

Generate hashes:

```dql
md5(string)
sha1(string)
sha256(string)
```

### Network Functions

Process network data:

```dql
ipAddr(string)
ipVersion(ipaddr)
ipInSubnet(ipaddr, subnet)
```

### Boolean Functions

Logical operations:

```dql
and(cond1, cond2)
or(cond1, cond2)
not(cond)
```

---

## DQL Operators

### Comparison Operators

```dql
==    # Equal
!=    # Not equal
<     # Less than
<=    # Less than or equal
>     # Greater than
>=    # Greater than or equal
in    # Value in list
```

Example:
```dql
fetch logs
| filter severity in ["ERROR", "CRITICAL"]
| filter response_time >= 1000
```

### Logical Operators

```dql
and    # Both conditions true
or     # Either condition true
not    # Negate condition
```

Example:
```dql
fetch logs
| filter (severity == "ERROR" or severity == "CRITICAL") and host == "prod-01"
```

### Arithmetic Operators

```dql
+      # Addition
-      # Subtraction
*      # Multiplication
/      # Division
%      # Modulo
```

Example:
```dql
fetch metrics "builtin:host.cpu.usage"
| fields timestamp, host, value, value * 100 as percentage
```

### String Operators

```dql
+           # Concatenation
contains    # Substring check
matches     # Regex matching
```

Example:
```dql
fetch logs
| fields message, message + " - from " + host as full_message
| filter message matches "^ERROR.*"
```

---

## DQL Best Practices

### 1. Performance Optimization

**Filter Early and Often**
```dql
# Good - filter early
fetch logs
| filter timestamp > ago(1h)
| filter severity == "ERROR"
| parse content

# Avoid - parsing all logs then filtering
fetch logs
| parse content
| filter timestamp > ago(1h)
| filter severity == "ERROR"
```

**Use Specific Time Ranges**
```dql
# Good - specific time range
fetch metrics "builtin:host.cpu.usage"
| filter timestamp > ago(24h) and timestamp < now()

# Avoid - unbounded or very large time ranges
fetch metrics "builtin:host.cpu.usage"
```

**Limit Results Early**
```dql
fetch logs
| sort timestamp desc
| limit 1000
| parse content
```

### 2. Data Quality

**Handle Null Values**
```dql
fetch logs
| filter response_time != null
| fields host, coalesce(severity, "UNKNOWN") as severity
```

**Validate Data Types**
```dql
fetch logs
| filter response_time != null
| fields host, toNumber(response_time) as response_time_ms
```

### 3. Query Clarity

**Use Meaningful Field Names**
```dql
fetch metrics "builtin:host.cpu.usage"
| summarize avg(value) as avg_cpu_usage by host
| rename host -> hostname
```

**Document Complex Logic**
```dql
fetch logs
| filter severity == "ERROR"
| summarize {
    count() as error_count,
    count() / 1000 as errors_per_thousand
  } by host
```

### 4. Composition

**Build Reusable Queries**
```dql
# Base query
fetch logs
| filter timestamp > ago(1h)
| filter severity == "ERROR"

# Then extend it
fetch logs
| filter timestamp > ago(1h)
| filter severity == "ERROR"
| summarize count() by host
```

---

## DQL Use Cases

### 1. Error Analysis

```dql
fetch logs
| filter severity == "ERROR"
| parse content as {
    string error_code,
    string stack_trace
  }
| summarize {
    count() as error_count,
    arrayJoin(arrayDistinct(host), ", ") as affected_hosts
  } by error_code
| sort error_count desc
```

### 2. Performance Monitoring

```dql
fetch metrics "builtin:service.requestCount.server"
| filter timestamp > ago(1h)
| summarize {
    avg(value) as avg_requests,
    percentile(value, 95) as p95_requests,
    max(value) as peak_requests
  } by {service.name, host}
```

### 3. User Activity Tracking

```dql
fetch logs
| filter contains(content, "user_action")
| parseJson content as event_data
| summarize count() as action_count by {
    event_data.user_id,
    event_data.action_type
  }
| topK(100, "action_count")
```

### 4. Anomaly Detection

```dql
fetch metrics "builtin:host.cpu.usage"
| filter timestamp > ago(24h)
| summarize {
    avg(value) as avg_cpu,
    stdDev(value) as std_cpu
  } by host
| fields host, avg_cpu, std_cpu, avg_cpu + (std_cpu * 2) as anomaly_threshold
```

### 5. Dependency Analysis

```dql
fetch spans
| filter timestamp > ago(1h)
| summarize {
    count() as call_count,
    percentile(duration, 95) as p95_duration
  } by {
    service_name,
    called_service_name
  }
| filter call_count > 100
```

---

## Dynatrace Pattern Language (DPL)

### What is DPL?

Dynatrace Pattern Language (DPL) is a specialized language for extracting and parsing structured information from unstructured log data. It's used within DQL's `parse` command.

### DPL Architecture

DPL patterns define rules for matching and extracting data:

1. **Literals** - Fixed strings to match
2. **Matchers** - Pattern elements to capture data
3. **Modifiers** - Control matching behavior
4. **Sequences & Groups** - Combine patterns
5. **Expressions** - Complex matching logic

### Basic Pattern Structure

```dpl
matcher1 matcher2 matcher3 ...
```

### Core Pattern Elements

#### 1. String Literals

Match exact strings:

```dql
fetch logs
| parse content as {
    "ERROR: " string message
  }
```

#### 2. String Matchers

```dpl
string name        # Match any string, capture to 'name'
GREEDY string name # Match greedily (longest match)
```

#### 3. Numeric Matchers

```dpl
int count          # Match integer
float value        # Match floating-point number
number num         # Match any number
```

#### 4. Positional Matchers

```dpl
ws       # Whitespace
digit    # Single digit (0-9)
letter   # Single letter (a-z, A-Z)
char     # Any single character
```

#### 5. Time and Date Patterns

```dpl
date date_var
time time_var
timestamp ts_var
hhmmss time_var
```

#### 6. Network Patterns

```dpl
ipaddr ip_var        # IP address
ipv4 ipv4_var        # IPv4 specifically
ipv6 ipv6_var        # IPv6 specifically
email email_var      # Email address
url url_var          # URL
```

### Modifiers

Control matching behavior:

```dpl
LD              # Left delimiter - match to word boundary
RD              # Right delimiter - match from word boundary
GREEDY          # Longest match
SPACE           # Treat as space
NOCASE          # Case-insensitive
```

Example:
```dql
fetch logs
| parse content as {
    "[" string level:LD:RD "]",
    string message
  }
```

### Sequences and Groups

#### Sequences

Match patterns in order:

```dql
fetch logs
| parse content as {
    string app,
    "-",
    int version,
    "-",
    string environment
  }
```

#### Optional Groups

```dql
fetch logs
| parse content as {
    string service,
    ("running" | "stopped") as status,
    {
        "since" timestamp start_time
    }?
  }
```

#### Alternatives (OR)

```dql
fetch logs
| parse content as {
    string app,
    ("ERROR" | "WARN" | "INFO") as level,
    string message
  }
```

### JSON Patterns

Extract from JSON:

```dql
fetch logs
| parseJson content as {
    string level,
    string message,
    object {
        string user_id,
        string action
    } as context
  }
```

### Array Patterns

Match array elements:

```dql
fetch logs
| parseJson content as {
    array[object] items
  }
| expand items
| fields items.id, items.name
```

### Key-Value Patterns

Extract from key-value pairs:

```dql
fetch logs
| parse content as {
    kv kvpairs
  }
| fields kvpairs["error"], kvpairs["code"]
```

### Smartscape Integration

Parse Dynatrace entity references:

```dql
fetch logs
| parse content as {
    entity host_entity,
    string message
  }
```

---

## Building Dynatrace Apps

### App Architecture

A Dynatrace App consists of:

1. **Dashboard** - UI components and layouts
2. **Data Layer** - DQL queries
3. **Business Logic** - Processing and transformations
4. **Configuration** - App settings and parameters

### Example: Simple Monitoring App

```dql
# Query 1: System Health Overview
fetch metrics "builtin:host.cpu.usage", 
             "builtin:host.memory.usage"
| filter timestamp > ago(1h)
| summarize {
    avg(value) as avg_value
  } by {metric.name, host.name}

# Query 2: Error Rate Trend
fetch logs
| filter timestamp > ago(24h)
| filter severity == "ERROR"
| summarize count() as error_count by {
    bin(timestamp, 1h) as time_bucket,
    host
  }
| sort time_bucket asc

# Query 3: Top Affected Services
fetch logs
| filter timestamp > ago(1h)
| filter severity in ["ERROR", "CRITICAL"]
| parse content as {string service}
| summarize count() as incident_count by service
| topK(10, "incident_count")
```

### Query Organization

```
queries/
├── system_health.dql
├── error_analysis.dql
├── performance_metrics.dql
└── dependency_tracking.dql
```

### Caching Strategy

```dql
# Pre-calculate frequently accessed metrics
fetch metrics "builtin:host.cpu.usage"
| filter timestamp > ago(1h)
| summarize avg(value) as cached_avg by host
| every 5m
```

### Performance Considerations

1. **Query Optimization**
   - Filter by timestamp early
   - Use specific metrics names
   - Limit aggregation dimensions

2. **Data Retention**
   - Know your data retention policies
   - Plan for historical data access
   - Consider archival needs

3. **Scalability**
   - Design queries for large datasets
   - Use windowing for real-time data
   - Implement caching where appropriate

---

## Key Learning Path for Building Apps

1. **Basics** → Learn fetch, filter, select
2. **Data Handling** → Understand parsing and transformations
3. **Aggregations** → Master summarize and grouping
4. **Advanced** → Joins, complex parsing, time windows
5. **App Design** → Combine multiple queries into cohesive apps
6. **Optimization** → Performance tuning and caching

---

## Quick Reference

### Common Patterns

**Last 1 hour of data:**
```dql
fetch logs | filter timestamp > ago(1h)
```

**Group by time window:**
```dql
fetch metrics
| summarize avg(value) by bin(timestamp, 5m) as time_bucket
```

**Top N by metric:**
```dql
fetch logs
| summarize count() by host
| topK(10, "count()")
```

**Parse and extract:**
```dql
fetch logs
| parse content as {
    string field1,
    int field2,
    string field3
  }
```

**Join multiple sources:**
```dql
fetch logs
| join [fetch events on host == entity.name]
```

---

## Resources & Next Steps

1. **Practice with Sample Data** - Use your Dynatrace environment
2. **Build Simple Queries First** - Start with basic filters and selections
3. **Gradually Add Complexity** - Master parsing, aggregations, then joins
4. **Create Reusable Query Library** - Document common patterns
5. **Test Performance** - Understand query behavior on your data

---

**Last Updated**: 2026-05-15  
**Status**: Comprehensive Guide Complete

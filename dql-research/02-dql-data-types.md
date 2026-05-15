# DQL Data Types

> Complete reference for game implementation
> Date: 2026-04-29

## Primitive Types

### Boolean
- Literals: `true`, `false` (case-insensitive: "true", "TRUE", "false", "FALSE")
- Cast via `toBoolean`
- Strings matching "true" or "TRUE" yield true; all other strings → false
- Numeric zero → false; non-zero → true
- Supports AND, OR, XOR, NOT
- Example: `toBoolean("true"), toBoolean(1), toBoolean(0)`

### Long
- Signed integers from -2^63 through 2^63-1
- Decimal literals: `-9223372036854775808` to `9223372036854775807`
- Hexadecimal literals: `0x0` to `0xFFFFFFFFFFFFFFFF`
- Cast via `toLong`
- Example: `toLong("83457264009472472"), toLong(30), toLong(25.34)`

### Double
- 64-bit IEEE 754 floating-point values
- Decimal form: `2.34`
- Scientific form: `2.4e2`
- Cast via `toDouble`
- Example: `toDouble("1234.5"), toDouble(4+3/2)`

### Timestamp
- Instant with nanosecond exactness
- Used in query windows: `fetch logs, from:-2h, to:-20m`
- Cast via `toTimestamp`
- Example: `toTimestamp("2022-08-01T12:00:00+01:00")`
- Supports comparisons and arithmetic: `time == now(), time > now()-10d, newTime = time + 3d`

### Timeframe
- Interval defined by start and end timestamps
- Example: `data record(tf = timeframe(from:now()-2h, to:now()))`
- Access endpoints: `tf[start], tf[end]`

### Duration
- Amount paired with a time unit
- Literal: `1s`
- Supported units: `ns`, `ms`, `s`, `m`, `h`, `d`, `w`, `M`, `q`, `y`
- Calendar units (d, w, M, q, y) in expressions like `now()-1M+2w`
- Build via `duration(dur, unit:"ms")`
- Cast via `toDuration`
- Subtracting timestamps yields duration: `now()-timestamp`
- Comparison: `dur > 60d`

### String
- Text delimited by double quotes, using `\"` escapes
- Triple-quote wrappers (`"""someString"""`) require no escaping but cannot contain triple-quote delimiter
- Cast via `toString`

### IpAddress
- Stores IPv4 or IPv6 addresses

### UID
- 64-bit or 128-bit identifiers
- Created or cast via `uid64`, `uid128`, `toUid`

## Complex Types

### Array
- Ordered values accessed by index
- Element access: `int_array[0]`, `int_array[4]`
- Direct comparison limited to equality (`==`)
- Example: `array(1,2,2,3,4,5)`, `arraySize(b) > arraySize(c)`

### Record
- Grouping of key-value pairs where values can be any DQL kind
- Access nested members: `person[name]`, `person[address][pcode]`
- Construct via `record()`:
```dql
record({name="john", age=33, address=record({city="Atlanta", pcode="30308"})})
record(a=1+2, b=3, c=toString(timestamp))
```
- JSON and key-value text parse into this type

## Pattern Forms for Parsing

- `STRUCTURE{matcher_expr, ...}:fieldname`
- `JSON{matcher_expr, ...}:fieldname`
- `KVP{matcher_expr, ...}:fieldname`
- `$subpattern:fieldname`

Example KVP pattern:
```dql
KVP{LD:key'='(LONG:valueLong | STRING:valueStr)'; '?}:person
```

Example JSON shorthand:
```dql
JSON:event
```

# DQL Functions Reference

> Complete function catalog for DQL Investigator game
> Date: 2026-04-29
> Total functions documented: 217

## Aggregation Functions (24)

Aggregation functions operate on groups of records produced by `summarize` or `makeTimeseries`.

| Function | Description | Example |
|----------|-------------|---------|
| `avg(expression)` | Computes the mean of a field across records | `avg(cpu.usage)` |
| `collectArray(expression)` | Gathers all values from a field into an array | `collectArray(error.type)` |
| `collectDistinct(expression)` | Gathers unique values from a field into an array | `collectDistinct(host.name)` |
| `correlation(expr1, expr2)` | Computes the Pearson correlation for two numeric fields | `correlation(cpu, mem)` |
| `count()` | Tallies the complete set of records | `count()` |
| `countDistinct(expression)` | Estimates cardinality of unique values | `countDistinct(user.id)` |
| `countDistinctApprox(expression [, precision])` | Approximate cardinality via stochastic methods | `countDistinctApprox(ip)` |
| `countDistinctExact(expression)` | Exact cardinality (capped at 1M) | `countDistinctExact(session)` |
| `countIf(expression)` | Tallies records satisfying a condition | `countIf(loglevel == "ERROR")` |
| `max(expression)` | Finds the highest value | `max(response.time)` |
| `median(expression [, weight])` | Finds the middle value | `median(latency)` |
| `min(expression)` | Finds the lowest value | `min(disk.free)` |
| `percentile(expression, percentile [, weight])` | Computes a specified percentile (0-100) | `percentile(latency, 95)` |
| `percentiles(expression, ...)` | Computes multiple percentiles | `percentiles(latency, 50, 95, 99)` |
| `percentileFromSamples(expression, percentile [, originalCount])` | Percentile from array expression | `percentileFromSamples(samples, 90)` |
| `percentRank(expression, value)` | Computes the percentile rank for a value | `percentRank(latency, 1000)` |
| `stddev(expression)` | Computes the standard deviation | `stddev(cpu.usage)` |
| `sum(expression)` | Adds up all values | `sum(bytes)` |
| `takeAny(expression)` | Retrieves any non-null value | `takeAny(dt.system.sampling_ratio)` |
| `takeFirst(expression)` | Retrieves the initial value | `takeFirst(timestamp)` |
| `takeLast(expression)` | Retrieves the final value | `takeLast(timestamp)` |
| `takeMax(expression)` | Retrieves the largest value | `takeMax(disk.used)` |
| `takeMin(expression)` | Retrieves the smallest value | `takeMin(disk.free)` |
| `variance(expression)` | Computes the variance | `variance(cpu.usage)` |

## String Functions (24)

| Function | Description | Example |
|----------|-------------|---------|
| `concat(expr, ...)` | Joins expressions into one string | `concat(host, ":", port)` |
| `contains(string, substring)` | Looks for a substring | `contains(content, "error")` |
| `decodeUrl(string)` | URL-decodes a string | `decodeUrl(url)` |
| `encodeUrl(string)` | URL-encodes a string | `encodeUrl(path)` |
| `endsWith(string, suffix)` | Checks suffix | `endsWith(log.source, "audit.log")` |
| `escape(string)` | Escapes a string | `escape(raw)` |
| `getCharacter(string, index)` | Character at position | `getCharacter(code, 0)` |
| `indexOf(string, substring)` | First position of substring | `indexOf(content, "fail")` |
| `jsonField(string, fieldName)` | Parses JSON and extracts single value | `jsonField(content, "status")` |
| `jsonPath(string, path)` | Parses JSON via JSONPath | `jsonPath(content, "$.user.id")` |
| `lastIndexOf(string, substring)` | Last position of substring | `lastIndexOf(path, "/")` |
| `levenshteinDistance(s1, s2)` | Edit distance between strings | `levenshteinDistance(a, b)` |
| `like(string, pattern)` | Pattern match with wildcards | `like(name, "prod_%")` |
| `lower(string)` | Lowercase transformation | `lower(loglevel)` |
| `matchesPattern(string, dplPattern)` | DPL pattern match | `matchesPattern(content, "INT:code")` |
| `matchesPhrase(string, phrase)` | Phrase token match | `matchesPhrase(content, "connection refused")` |
| `matchesValue(string, value)` | Exact value match in attribute | `matchesValue(status, "404")` |
| `parse(string, pattern)` | Extract value(s) via pattern | `parse(content, "INT:status")` |
| `parseAll(string, pattern)` | Extract multiple values | `parseAll(content, "INT:code")` |
| `punctuation(string)` | Extracts punctuation characters | `punctuation(content)` |
| `replacePattern(string, dplPattern, replacement)` | Replace by DPL pattern | `replacePattern(content, "OLD", "NEW")` |
| `replaceString(string, old, new)` | Simple string replacement | `replaceString(host, "-", "_")` |
| `splitByPattern(string, dplPattern)` | Split by DPL pattern | `splitByPattern(path, "\"")` |
| `splitString(string, delimiter)` | Split by delimiter | `splitString(tags, ",")` |
| `startsWith(string, prefix)` | Checks prefix | `startsWith(endpoint, "/api/")` |
| `stringLength(string)` | Length of string | `stringLength(content)` |
| `substring(string, start [, end])` | Range by indexes | `substring(content, 0, 100)` |
| `trim(string)` | Strips whitespace | `trim(log.source)` |
| `unescape(string)` | Unescapes a string | `unescape(escaped)` |
| `unescapeHtml(string)` | Unescapes HTML entities | `unescapeHtml(html)` |
| `upper(string)` | Uppercase transformation | `upper(loglevel)` |

## Conversion / Casting Functions (31)

| Function | Description | Example |
|----------|-------------|---------|
| `asArray(value)` | Yields array or null | `asArray(tags)` |
| `asBinary(value)` | Yields binary or null | `asBinary(payload)` |
| `asBoolean(value)` | Yields boolean or null | `asBoolean(flag)` |
| `asDouble(value)` | Yields double or null | `asDouble(score)` |
| `asDuration(value)` | Yields duration or null | `asDuration(age)` |
| `asIp(value)` | Yields IP or null | `asIp(source)` |
| `asLong(value)` | Yields long or null | `asLong(count)` |
| `asNumber(value)` | Yields numeric or null | `asNumber(x)` |
| `asRecord(value)` | Yields record or null | `asRecord(meta)` |
| `asSmartscapeId(value)` | Yields smartscapeId or null | `asSmartscapeId(id)` |
| `asString(value)` | Yields string or null | `asString(code)` |
| `asTimeframe(value)` | Yields timeframe or null | `asTimeframe(tf)` |
| `asTimestamp(value)` | Yields timestamp or null | `asTimestamp(ts)` |
| `asUid(value)` | Yields uid or null | `asUid(entity)` |
| `decode(string, encoding)` | Decodes encoded string | `decode(base64, "base64")` |
| `encode(data, encoding)` | Encodes to representation | `encode(text, "base64")` |
| `getHighBits(value)` | Most significant bits | `getHighBits(uid)` |
| `getLowBits(value)` | Least significant bits | `getLowBits(uid)` |
| `hexStringToNumber(string)` | Hex string to number | `hexStringToNumber("FF")` |
| `isUid128(value)` | Checks uid128 subtype | `isUid128(id)` |
| `isUid64(value)` | Checks uid64 subtype | `isUid64(id)` |
| `isUuid(value)` | Checks uuid subtype | `isUuid(id)` |
| `numberToHexString(number)` | Number to hex string | `numberToHexString(255)` |
| `smartscapeId(string, long)` | Builds smartscapeId | `smartscapeId("type", 123)` |
| `toArray(value)` | Cast to array | `toArray(x)` |
| `toBoolean(value)` | Cast to boolean | `toBoolean("true")` |
| `toDouble(value)` | Cast to double | `toDouble("3.14")` |
| `toDuration(value)` | Cast to duration | `toDuration("1h")` |
| `toIp(value)` | Cast to IP address | `toIp("192.168.1.1")` |
| `toLong(value)` | Cast to long | `toLong("42")` |
| `toSmartscapeId(value)` | Cast to smartscapeId | `toSmartscapeId(x)` |
| `toString(value)` | Cast to string | `toString(42)` |
| `toTimeframe(value)` | Cast to timeframe | `toTimeframe(tf)` |
| `toTimestamp(value)` | Cast to timestamp | `toTimestamp("2023-01-01")` |
| `toUid(value)` | Cast to uid | `toUid("abc")` |
| `type(value)` | Returns data type as text | `type(42)` |
| `uid128(high, low)` | Builds uid128 | `uid128(a, b)` |
| `uid64(long)` | Builds uid64 | `uid64(123)` |
| `uuid(high, low)` | Builds uuid | `uuid(a, b)` |

## Conditional Functions (2)

| Function | Description | Example |
|----------|-------------|---------|
| `coalesce(expr, ...)` | First non-null argument | `coalesce(name, "unknown")` |
| `if(condition, then, else)` | Conditional evaluation | `if(x > 0, "pos", "neg")` |

## Boolean Functions (5)

| Function | Description | Example |
|----------|-------------|---------|
| `isFalseOrNull(expression)` | Is false or null? | `isFalseOrNull(enabled)` |
| `isNotNull(value)` | Is not null? | `isNotNull(name)` |
| `isNull(value)` | Is null? | `isNull(deleted_at)` |
| `isTrueOrNull(expression)` | Is true or null? | `isTrueOrNull(active)` |
| `isTrue(expression)` | Is true? | `isTrue(success)` |

## Time Functions (20)

| Function | Description | Example |
|----------|-------------|---------|
| `duration(value, unit)` | Builds duration from amount + unit | `duration(60, "s")` |
| `formatTimestamp(ts [, interval] [, format] [, timezone] [, locale])` | Formats timestamp | `formatTimestamp(ts, format:"yyyy-MM-dd")` |
| `getDayOfMonth(ts [, timezone])` | Day of month (1-31) | `getDayOfMonth(timestamp)` |
| `getDayOfWeek(ts [, timezone])` | Weekday (1=Mon..7=Sun) | `getDayOfWeek(timestamp)` |
| `getDayOfYear(ts [, timezone])` | Day number in year | `getDayOfYear(timestamp)` |
| `getEnd(timeframe)` | Ending timestamp from timeframe | `getEnd(tf)` |
| `getHour(ts [, timezone])` | Hour (0-23) | `getHour(timestamp)` |
| `getMinute(ts [, timezone])` | Minute (0-59) | `getMinute(timestamp)` |
| `getMonth(ts [, timezone])` | Month (1-12) | `getMonth(timestamp)` |
| `getSecond(ts [, timezone])` | Second (0-59) | `getSecond(timestamp)` |
| `getStart(timeframe)` | Starting timestamp from timeframe | `getStart(tf)` |
| `getWeekOfYear(ts [, timezone])` | Week number | `getWeekOfYear(timestamp)` |
| `getYear(ts [, timezone])` | Year | `getYear(timestamp)` |
| `now()` | Current timestamp (fixed at query start) | `now()` |
| `timeframe(from [, to])` | Builds timeframe | `timeframe(from:now()-2h)` |
| `timestamp(year, month, day, hour, minute, second [, ...])` | Builds timestamp from parts | `timestamp(2023, 1, 1, 0, 0, 0)` |
| `timestampFromUnixMillis(millis)` | Epoch millis to timestamp | `timestampFromUnixMillis(1564666200000)` |
| `timestampFromUnixNanos(nanos)` | Epoch nanos to timestamp | `timestampFromUnixNanos(1564666200000000000)` |
| `timestampFromUnixSeconds(seconds)` | Epoch seconds to timestamp | `timestampFromUnixSeconds(1564666200)` |
| `unixMillisFromTimestamp(ts)` | Timestamp to epoch millis | `unixMillisFromTimestamp(ts)` |
| `unixNanosFromTimestamp(ts)` | Timestamp to epoch nanos | `unixNanosFromTimestamp(ts)` |
| `unixSecondsFromTimestamp(ts)` | Timestamp to epoch seconds | `unixSecondsFromTimestamp(ts)` |

## Array Functions (29)

| Function | Description | Example |
|----------|-------------|---------|
| `array(...)` | Constructs an array | `array(1, 2, 3)` |
| `arrayAvg(array)` | Average of array elements | `arrayAvg(values)` |
| `arrayConcat(array, ...)` | Joins arrays | `arrayConcat(a, b)` |
| `arrayCumulativeSum(array)` | Running total | `arrayCumulativeSum(values)` |
| `arrayDelta(array)` | Gap from prior non-null | `arrayDelta(values)` |
| `arrayDiff(array)` | Per-element gap | `arrayDiff(values)` |
| `arrayDistinct(array)` | Remove duplicates | `arrayDistinct(tags)` |
| `arrayElement(array, index)` | Item at index | `arrayElement(tags, 0)` |
| `arrayFirst(array)` | First non-null element | `arrayFirst(values)` |
| `arrayFlatten(array)` | Flatten nested arrays | `arrayFlatten(nested)` |
| `arrayIndexOf(array, value)` | First matching position | `arrayIndexOf(tags, "prod")` |
| `arrayLast(array)` | Last non-null element | `arrayLast(values)` |
| `arrayLastIndexOf(array, value)` | Last matching position | `arrayLastIndexOf(tags, "prod")` |
| `arrayMax(array)` | Largest number | `arrayMax(values)` |
| `arrayMedian(array)` | Median of members | `arrayMedian(values)` |
| `arrayMin(array)` | Smallest number | `arrayMin(values)` |
| `arrayMovingAvg(array, window)` | Moving average | `arrayMovingAvg(values, 5)` |
| `arrayMovingMax(array, window)` | Moving maximum | `arrayMovingMax(values, 5)` |
| `arrayMovingMin(array, window)` | Moving minimum | `arrayMovingMin(values, 5)` |
| `arrayMovingSum(array, window)` | Moving sum | `arrayMovingSum(values, 5)` |
| `arrayPercentile(array, p)` | Percentile of array | `arrayPercentile(values, 95)` |
| `arrayRemoveNulls(array)` | Strip null entries | `arrayRemoveNulls(values)` |
| `arrayReverse(array)` | Reverse order | `arrayReverse(values)` |
| `arraySize(array)` | Count of items | `arraySize(tags)` |
| `arraySlice(array, from, to)` | Subarray by indexes | `arraySlice(tags, 0, 5)` |
| `arraySort(array)` | Sort ascending | `arraySort(values)` |
| `arraySum(array)` | Sum of elements | `arraySum(values)` |
| `arrayToString(array)` | Text representation | `arrayToString(tags)` |

## Vector Distance Functions (4)

| Function | Description | Example |
|----------|-------------|---------|
| `vectorL1Distance(a, b)` | Taxicab / Manhattan distance | `vectorL1Distance(v1, v2)` |
| `vectorL2Distance(a, b)` | Euclidean distance | `vectorL2Distance(v1, v2)` |
| `vectorCosineDistance(a, b)` | Cosine distance | `vectorCosineDistance(v1, v2)` |
| `vectorInnerProductDistance(a, b)` | Negative dot product | `vectorInnerProductDistance(v1, v2)` |

## Network / IP Functions (9)

| Function | Description | Example |
|----------|-------------|---------|
| `ip(string)` | Constructs IP address | `ip("10.0.0.1")` |
| `ipIn(ip, network)` | Is IP in network? | `ipIn(addr, "10.0.0.0/8")` |
| `ipIsLinkLocal(ip)` | Is link-local? | `ipIsLinkLocal(addr)` |
| `ipIsLoopback(ip)` | Is loopback? | `ipIsLoopback(addr)` |
| `ipIsPrivate(ip)` | Is private? | `ipIsPrivate(addr)` |
| `ipIsPublic(ip)` | Is public? | `ipIsPublic(addr)` |
| `ipMask(ip, bits)` | Masks IP address | `ipMask(addr, 24)` |
| `isIp(value)` | Is IPv4 or IPv6? | `isIp(addr)` |
| `isIpV4(value)` | Is IPv4? | `isIpV4(addr)` |
| `isIpV6(value)` | Is IPv6? | `isIpV6(addr)` |

## Hash Functions (7)

| Function | Description | Example |
|----------|-------------|---------|
| `hashCrc32(string)` | CRC32 hash | `hashCrc32(content)` |
| `hashMd5(string)` | MD5 hash | `hashMd5(content)` |
| `hashSha1(string)` | SHA-1 hash | `hashSha1(content)` |
| `hashSha256(expr)` | SHA-256 hash | `hashSha256(content)` |
| `hashSha512(expr)` | SHA-512 hash | `hashSha512(content)` |
| `hashXxHash32(string)` | xxHash32 | `hashXxHash32(content)` |
| `hashXxHash64(string)` | xxHash64 | `hashXxHash64(content)` |

## Bitwise Functions (7)

| Function | Description | Example |
|----------|-------------|---------|
| `bitwiseAnd(a, b)` | Bitwise AND | `bitwiseAnd(flags, mask)` |
| `bitwiseCountOnes(value)` | Count set bits | `bitwiseCountOnes(flags)` |
| `bitwiseNot(value)` | Bitwise NOT | `bitwiseNot(flags)` |
| `bitwiseOr(a, b)` | Bitwise OR | `bitwiseOr(a, b)` |
| `bitwiseShiftLeft(value, n)` | Shift left | `bitwiseShiftLeft(x, 2)` |
| `bitwiseShiftRight(value, n)` | Shift right | `bitwiseShiftRight(x, 2)` |
| `bitwiseXor(a, b)` | Bitwise XOR | `bitwiseXor(a, b)` |

## Mathematical Functions (32)

| Function | Description | Example |
|----------|-------------|---------|
| `abs(value)` | Absolute value | `abs(-5)` |
| `acos(value)` | Arc cosine | `acos(0.5)` |
| `asin(value)` | Arc sine | `asin(0.5)` |
| `atan(value)` | Arc tangent | `atan(1)` |
| `atan2(y, x)` | Polar angle theta | `atan2(1, 1)` |
| `bin(value, size)` | Round down to multiple | `bin(timestamp, 1h)` |
| `cbrt(value)` | Cubic root | `cbrt(27)` |
| `ceil(value)` | Ceiling | `ceil(2.3)` |
| `cos(angle)` | Cosine (radians) | `cos(pi())` |
| `cosh(value)` | Hyperbolic cosine | `cosh(1)` |
| `degreeToRadian(deg)` | Degrees to radians | `degreeToRadian(180)` |
| `e()` | Euler's number | `e()` |
| `exp(value)` | e raised to power | `exp(1)` |
| `floor(value)` | Floor | `floor(2.9)` |
| `hypotenuse(a, b)` | sqrt(a^2 + b^2) | `hypotenuse(3, 4)` |
| `log(value)` | Natural logarithm | `log(10)` |
| `log1p(value)` | ln(1 + x) | `log1p(9)` |
| `log10(value)` | Base-10 logarithm | `log10(100)` |
| `pi()` | Constant PI | `pi()` |
| `power(base, exp)` | Exponentiation | `power(2, 10)` |
| `radianToDegree(rad)` | Radians to degrees | `radianToDegree(pi())` |
| `random()` | Random double [0,1) | `random()` |
| `range(value, alignment)` | Align to range | `range(ts, 1h)` |
| `round(value [, decimals])` | Round to decimals | `round(3.1415, 2)` |
| `signum(value)` | Sign of argument (-1, 0, 1) | `signum(-5)` |
| `sin(angle)` | Sine (radians) | `sin(pi()/2)` |
| `sinh(value)` | Hyperbolic sine | `sinh(1)` |
| `sqrt(value)` | Positive square root | `sqrt(16)` |
| `tan(angle)` | Tangent (radians) | `tan(pi()/4)` |
| `tanh(value)` | Hyperbolic tangent | `tanh(1)` |

## Join / Smartscape Functions (3)

| Function | Description | Example |
|----------|-------------|---------|
| `lookup(...)` | Retrieves record from subquery by match | See `lookup` command |
| `getNodeName(node)` | Smartscape node name | `getNodeName(node)` |
| `getNodeField(node, field)` | Smartscape node field | `getNodeField(node, "name")` |

## General / Utility Functions (6)

| Function | Description | Example |
|----------|-------------|---------|
| `classicEntitySelector(string)` | Entities matching selector | `classicEntitySelector("type(HOST)")` |
| `entityAttr(entity, attr)` | Entity attribute value | `entityAttr(host, "name")` |
| `entityName(entity)` | Entity name | `entityName(dt.entity.host)` |
| `exists(field)` | Is field present? | `exists(custom.field)` |
| `in(value, array)` | Is value in array? | `in(status, array(200, 201))` |
| `record(key=value, ...)` | Constructs a record | `record(a=1, b="x")` |

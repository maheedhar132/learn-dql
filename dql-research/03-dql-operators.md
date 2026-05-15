# DQL Operators

> Complete reference for game implementation
> Date: 2026-04-29

## Operator Precedence (strongest to weakest)

1. Unary `-`
2. `* / %`
3. `@` (time alignment)
4. `+ -`
5. `~` (search)
6. `== != > >= < <=`
7. `in`
8. `not`
9. `and`
10. `xor`
11. `or`

## Arithmetic Operators

### `+` (Addition)
- Examples: `"2 + 2.5"`
- Type matrices: `(long)`, `(double)`, `(IP)`

### `-` (Subtraction / Unary Negation)
- Binary: `"0.2 - 0.11"`
- Unary negation accepts `long`, `double`, `duration`
- Example: `"-1"`

### `*` (Multiplication)
- Examples: `"4 * 5"`, `"60 * 1s"`
- Multiplying `duration` by `double` is rounded to full nanos

### `/` (Division)
- Examples: `"10 / 2"`, `"1h / 60"`
- **Critical**: `long / long` = `long` (fractions discarded)
- Cast an operand to `double` to retain fractions
- `duration / number` = `duration`
- `duration / duration` = `double`

### `%` (Modulo)
- Example: `"4 % 2"`
- Defined for numeric pairs and `duration % duration`

## Comparison Operators (`<`, `<=`, `>`, `>=`)

- Examples: `"8 < 9"`, `"now()-1m < now()"`, `"4 <= 5"`, `"5 > 4"`, `"\"a\" > \"A\""`, `"4 >= 4"`
- Supported between matching numeric types, `string`, `timestamp`, `duration`, `ip`
- Incompatible comparisons yield `null`

## Equality Operators (`==`, `!=`)

- Examples: `"2 == 2"`, `"1 != 2"`
- Uses **tri-state boolean algebra** (`true`, `false`, `null`)
- **Critical null handling**:
  - If any side is `null`, the result is `null`
  - `null == null` → `null`
  - Non-comparable types return `false` for `==` and `true` for `!=`
- Filtering note: `!=` "does not provide records where `log.source` is null or missing"
  - Use `isTrueOrNull(log.source != "logsourcename")` to include them

## Logical Operators

### `not`
- Negation

### `and`
- Logical AND

### `or`
- Logical OR

### `xor`
- Exclusive OR

All logical operators handle `null` according to tri-state boolean algebra.

## Iterative Operators

### `iAny`
- For array element evaluation

### `iCollectArray`
- For array element evaluation

### `iIndex`
- For array element evaluation

## Subquery Operator

### `in`
- Subquery comparison
- Example: `field in (subquery)`

## Time Alignment Operator

### `@`
- Aligns timestamps/durations to time units

## Search Operator

### `~`
- Case-insensitive token/pattern matching
- Includes wildcard support
- Example: `k8s.namespace.name ~ "astro*"`

# DQL Overview

> Dynatrace Query Language — complete reference for game design
> Date: 2026-04-29

## What is DQL?

DQL (Dynatrace Query Language) is built for processing **arbitrary event data**, requiring **no up-front description of the input data's schema**.

It serves as an instrument for:
- Investigating information
- Recognizing trends
- Spotting irregularities
- Building statistical models
- Other analytical tasks using material held within the Grail data layer

## Pipeline Syntax

```
command | command | command ...
```

Commands are separated by the pipe character `|`. Each command transforms the data stream.

## Mandatory vs Optional Parameters

- Required parameters appear without brackets
- Optional parameters appear in brackets `[ ]`
- Parameter groups use curly braces `{ }`
- Multiple parameters of the same type are separated by commas

## Field Naming Rules

- Unicode characters supported
- Must use backticks for names that conflict with keywords: `true`, `false`, `null`, `mod`, `and`, `or`, `xor`, `not`
- Backtick escaping supported for problematic names

## Query Structure Example

```dql
fetch logs, from:now()-2h
| filter loglevel == "ERROR"
| parse content, "LD{DATA}:errortype"
| summarize count = count(), by:{errortype}
| fieldsAdd severity = if(errortype == "Timeout", "CRITICAL", "WARNING")
| sort count desc
| limit 10
```

This shows the sequential nature: each stage feeds into the next.

## Recommended Command Ordering (Best Practices)

1. **fetch** — Start with data source, restrict time range directly here
2. **filter / search** — Reduce rows early (biggest performance win)
3. **fieldsKeep / fieldsRemove / fieldsRename** — Narrow columns
4. **parse / fieldsAdd** — Non-transformative enrichment
5. **summarize / makeTimeseries** — Aggregation (before limit!)
6. **sort** — Always place last for performance
7. **limit** — Final cap

Key rules:
- "A shorter analysis window provides better performance"
- "Avoid negations" — use inclusive conditions
- Place smallest dataset on the right side of joins
- Use `==` or `!=` for exact values, `~` for partial matches
- Sorting right after `fetch` kills performance

import type { Scenario } from "../types/dql";
import { generateAppLogs, generateAuthLogs } from "./log-generator";

/**
 * Onboarding track — 6 scenarios for users with ZERO Dynatrace experience.
 * Each scenario uses a deliberate "observe → act" step structure:
 *   Step N: run a simpler query, look at the data, notice something specific
 *   Step N+1: now that you've seen X, use Y command to transform it
 */
export const onboardingScenarios: Scenario[] = [
  {
    id: "onboard-001",
    track: "onboarding",
    tier: "free",
    title: "Welcome, Detective",
    company: "Dynatrace Academy",
    briefing:
      "Before we hunt incidents, you need to know what a log is and how Dynatrace stores them. A log is a single line a computer wrote down to remember what just happened — the timestamp, who did it, and what the result was. We'll start by asking the system to hand us those lines.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Ask for the logs",
        narration:
          "Every DQL query begins with a `fetch` command — it tells the engine which data source to open. Think of it as opening a filing cabinet drawer. Run `fetch logs` and look at the result table: you'll see columns like `timestamp`, `loglevel`, `content`, and `host`. These are the raw fields Dynatrace captured for every log line. In the next step you'll learn to control how many of these rows you see at once.",
        lesson: "Opening a Data Source with fetch",
        goal: "Run fetch logs and observe the columns that come back — notice timestamp, loglevel, content, and host.",
        hint: "fetch <data-source>. Our data source here is logs.",
        sampleData: generateAppLogs(2200, 1),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Just show me the first few",
        narration:
          "You just saw over 2000 records land in the result table — that's typical for a real system. Reading through all of them is impractical. The `limit` command cuts the output to the first N rows. This is exactly what engineers do when exploring unfamiliar data: get a small sample first, understand the shape of it, then widen the query once you know what you're looking for.",
        lesson: "Limiting Results with limit",
        goal: "Add a limit command to keep only the first 5 rows.",
        hint: "Add ' | limit 5' after fetch logs. The pipe '|' chains commands together.",
        sampleData: generateAppLogs(2200, 1),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "limit", args: { count: 5 }, raw: "limit 5" },
        ],
      },
    ],
  },
  {
    id: "onboard-002",
    track: "onboarding",
    tier: "free",
    title: "Filtering — keeping only what matters",
    company: "Dynatrace Academy",
    briefing:
      "Real systems write thousands of log lines per second. 99% of them are boring 'everything is fine' messages. The 'filter' command throws away rows you don't care about. It's the single most-used command in DQL.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Look at the loglevel column",
        narration:
          "Run `fetch logs` and look at the `loglevel` column in the result table. You'll see three values mixed together: `INFO`, `WARN`, and `ERROR`. The vast majority are `INFO` — routine messages confirming everything is working normally. They're noise during an investigation. In the next step you'll use `filter` to drop everything except the `ERROR` rows.",
        lesson: "Every Query Starts with fetch",
        goal: "Fetch the logs and observe the loglevel column — notice the mix of INFO, WARN, and ERROR values.",
        hint: "Just 'fetch logs'.",
        sampleData: generateAppLogs(2200, 2),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Keep only errors",
        narration:
          "You saw that `loglevel` holds INFO, WARN, and ERROR — mostly INFO noise. The `filter` command evaluates a condition for every row and drops any row where the condition is false. Use `==` for equality comparison (a single `=` will cause a syntax error). Strings need double quotes. After filtering, your result should show only rows where something actually went wrong.",
        lesson: "Filter Records with filter",
        goal: "Add a filter to keep only rows where loglevel equals \"ERROR\".",
        hint: 'filter <field> == "<value>". Strings go in double quotes.',
        sampleData: generateAppLogs(2200, 2),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
        ],
      },
    ],
  },
  {
    id: "onboard-003",
    track: "onboarding",
    tier: "free",
    title: "Counting things — your first summary",
    company: "Dynatrace Academy",
    briefing:
      "When you're investigating an incident, you usually don't want to read every log line. You want a count: 'how many errors in the last hour?'. The 'summarize' command crunches many rows down to a small report.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Chain fetch and filter",
        narration:
          "DQL commands are chained with the pipe operator `|`. Each command receives the output of the previous one, transforms it, and passes it on. Chain `fetch logs` and `filter loglevel == \"ERROR\"` together. Run it and look at the row count — you'll have a long list of individual error events. That list is useful for reading error messages, but can't answer 'how many total?' In the next step you'll collapse it into one number.",
        lesson: "Chaining Commands with Pipes",
        goal: "Chain fetch and filter with a pipe — observe how many ERROR rows come back.",
        hint: 'fetch logs | filter loglevel == "ERROR"',
        sampleData: generateAppLogs(2200, 3),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
        ],
      },
      {
        id: "step-2",
        title: "How many errors total?",
        narration:
          "You just saw a table full of individual ERROR records — maybe hundreds of rows. The `summarize` command collapses all of those rows into a single aggregate result. `count()` simply counts how many rows there were. Give it an alias with `= total` so the output column has a meaningful name. After running this, your result table will have exactly one row and one column: the total number of errors in the sample.",
        lesson: "Count Records with summarize",
        goal: "Add summarize to produce a single 'total' count of all ERROR records.",
        hint: "summarize <alias> = count(). Don't forget the equals sign.",
        sampleData: generateAppLogs(2200, 3),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          {
            id: "e3",
            command: "summarize",
            args: { aggregation: "count", alias: "total" },
            raw: "summarize total = count()",
          },
        ],
      },
    ],
  },
  {
    id: "onboard-004",
    track: "onboarding",
    tier: "free",
    title: "Grouping — counting per category",
    company: "Dynatrace Academy",
    briefing:
      "A single number is useful, but 'how many errors per host?' is far more useful. Adding 'by:{...}' to summarize groups rows before counting — like sorting laundry into piles before counting each pile.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Look at the host column",
        narration:
          "Run the ERROR filter and look at the `host` column. You'll see several different hostnames — things like `host-01`, `host-02`, `host-03`. Each row belongs to a specific host. Right now you have one row per error event, which makes it impossible to see which host is generating the most errors at a glance. In the next step you'll group these rows by host and count them separately.",
        lesson: "Explore the host Field",
        goal: "Fetch ERROR logs and look at the host column — notice how many different hosts appear.",
        hint: 'fetch logs | filter loglevel == "ERROR"',
        sampleData: generateAppLogs(2200, 4),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
        ],
      },
      {
        id: "step-2",
        title: "Count errors per host",
        narration:
          "You saw that many different hosts appear in the ERROR logs — but you couldn't tell which one was loudest. Adding `by: {host}` to `summarize` splits the records into groups — one group per unique host value — before counting. The result is one row per host with a `count` column showing how many errors each one produced. This single query tells you which host to look at first.",
        lesson: "Group Counts by a Field",
        goal: "Add summarize count(), by:{host} to count ERROR records grouped by host.",
        hint: "summarize count = count(), by:{host}",
        sampleData: generateAppLogs(2200, 4),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          {
            id: "e3",
            command: "summarize",
            args: { aggregation: "count", alias: "count", by: "host" },
            raw: "summarize count = count(), by:{host}",
          },
        ],
      },
    ],
  },
  {
    id: "onboard-005",
    track: "onboarding",
    tier: "free",
    title: "Sorting — putting the worst first",
    company: "Dynatrace Academy",
    briefing:
      "Once you have counts per host, you want the noisiest host at the top. The 'sort' command orders rows. Use 'desc' (descending) to put the biggest number first — almost always what you want during an incident.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "See the unsorted result",
        narration:
          "Run the grouped count query and look at the result. You have one row per host with error counts — but the rows appear in an arbitrary order. The host with the most errors might be buried at the bottom. During an incident you need the worst offender at the top immediately, without scanning. In the next step you'll add `sort` to put the highest count first.",
        lesson: "Group Counts by a Field",
        goal: "Run the grouped error count and observe that rows appear in no particular order.",
        hint: 'fetch logs | filter loglevel == "ERROR" | summarize count = count(), by:{host}',
        sampleData: generateAppLogs(2200, 5),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          {
            id: "e3",
            command: "summarize",
            args: { aggregation: "count", alias: "count", by: "host" },
            raw: "summarize count = count(), by:{host}",
          },
        ],
      },
      {
        id: "step-2",
        title: "Sort hosts by error count, worst first",
        narration:
          "You saw the unsorted result — hosts in no particular order. Now add `| sort count desc` to the end. `sort` takes a field name; `desc` means largest-to-smallest. Run it and watch the rows reorder: the noisiest host jumps to the top. This single addition turns a confusing table into an actionable ranked list — the foundation of every error-rate investigation you'll ever run.",
        lesson: "Sort Results in Descending Order",
        goal: "Add sort count desc to put the host with the most errors at the top.",
        hint: "| sort <field> desc",
        sampleData: generateAppLogs(2200, 5),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
          {
            id: "e3",
            command: "summarize",
            args: { aggregation: "count", alias: "count", by: "host" },
            raw: "summarize count = count(), by:{host}",
          },
          {
            id: "e4",
            command: "sort",
            args: { field: "count", direction: "desc" },
            raw: "sort count desc",
          },
        ],
      },
    ],
  },
  {
    id: "onboard-006",
    track: "onboarding",
    tier: "free",
    title: "Parsing — pulling fields out of text",
    company: "Dynatrace Academy",
    briefing:
      "Important information is often buried inside the raw 'content' field of a log line — like an IP address, an error code, or a user ID. The 'parse' command extracts it into its own named field so you can filter, group, and aggregate by it just like any other field.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "See the IP buried in the content field",
        narration:
          "Fetch the auth logs and look at the `content` column. You'll see entries like `Failed login from IP:192.168.1.45 for user:admin`. The IP address is buried inside that text string — it's not in its own column. Because of that, you can't write `filter attacker_ip == \"1.2.3.4\"`, you can't group by IP, and you can't count attacks per source. The data is there, but it's trapped. In the next step you'll use `parse` to free it into its own queryable field.",
        lesson: "Explore Raw Log Content",
        goal: "Fetch auth logs and look at the content column — find the IP address embedded in the text.",
        hint: "fetch logs",
        sampleData: generateAuthLogs(2200, 6),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
        ],
      },
      {
        id: "step-2",
        title: "Extract the attacker IP with parse",
        narration:
          "You saw the IP embedded in `content` as `IP:192.168.1.x`. Now extract it. The `parse` command takes a field name and a pattern string. In the pattern, `IP:` is literal text that DQL scans for — it's the anchor. `attacker_ip` is the name DQL gives to whatever text follows that anchor. After running this query, your result table will have a new `attacker_ip` column — a clean, queryable field you can now filter, count, or group just like `loglevel` or `host`.",
        lesson: "Extract Fields from Text with parse",
        goal: "Use parse to pull the IP address out of content into a new field called attacker_ip.",
        hint: 'parse <field>, "<literal_anchor:new_field_name>"',
        sampleData: generateAuthLogs(2200, 6),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          {
            id: "e2",
            command: "parse",
            args: { field: "content", pattern: "IP:attacker_ip" },
            raw: 'parse content, "IP:attacker_ip"',
          },
        ],
      },
    ],
  },
];

import type { Scenario } from "../types/dql";
import { generateAppLogs, generateAuthLogs } from "./log-generator";

/**
 * Onboarding track — 6 scenarios for users with ZERO Dynatrace experience.
 * All free. Designed to ramp from "what is a log?" to "your first parse" so
 * the player is comfortable before entering the main DQL track or DPL track.
 *
 * Each scenario is intentionally short (2–3 steps) and the narration uses
 * everyday language with no Dynatrace jargon until it's been introduced.
 */
export const onboardingScenarios: Scenario[] = [
  {
    id: "onboard-001",
    track: "onboarding",
    tier: "free",
    title: "Welcome, Detective",
    company: "Day One",
    briefing:
      "Before we hunt incidents, you need to know what a log is and how Dynatrace stores them. A log is a single line a computer wrote down to remember what just happened — the timestamp, who did it, and what the result was. We'll start by asking the system to hand us those lines.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Ask for the logs",
        narration:
          "Every DQL query begins with a 'fetch' command. Think of fetch as opening a filing cabinet. We're going to open the 'logs' drawer.",
        lesson: "Opening a Data Source with fetch",
        goal: "Type 'fetch logs' to load the log records.",
        hint: "fetch <data-source>. Our data source here is logs.",
        sampleData: generateAppLogs(2200, 1),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Just show me the first few",
        narration:
          "2200 records is a lot. The 'limit' command keeps only the first N. Engineers use limit constantly while exploring data — it's like flipping to the first page of a book before reading the whole thing.",
        lesson: "Limiting Results with limit",
        goal: "Limit the result to 5 rows.",
        hint: "Add ' | limit 5' to the end. The pipe '|' chains commands together.",
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
    company: "Day One",
    briefing:
      "Real systems write thousands of log lines per second. 99% of them are boring 'everything is fine' messages. The 'filter' command throws away rows you don't care about. It's the single most-used command in DQL.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Open the cabinet",
        narration: "Every DQL pipeline starts with a `fetch` command that tells the engine which data store to open. You will write this line at the start of every query you build — it is the entry point into Grail. In this scenario we are working with application logs, so we open the `logs` source. Without a valid `fetch`, DQL has nothing to work with and will return an error.",
        lesson: "Every Query Starts with fetch",
        goal: "Start the pipeline by fetching application logs.",
        hint: "Just 'fetch logs'.",
        sampleData: generateAppLogs(2200, 2),
        expectedPipeline: [{ id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" }],
      },
      {
        id: "step-2",
        title: "Keep only errors",
        narration:
          "Each log has a 'loglevel' field — INFO, WARN, or ERROR. We only care about the ERRORs (something actually went wrong). Filter is like a sieve: only rows that match the condition fall through.",
        lesson: "Filter Records with filter",
        goal: "Keep only rows where loglevel equals \"ERROR\".",
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
    company: "Day One",
    briefing:
      "When you're investigating an incident, you usually don't want to read every log line. You want a count: 'how many errors in the last hour?'. The 'summarize' command crunches many rows down to a small report.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Errors only",
        narration: "DQL commands are chained with the pipe operator `|`. Each command in the chain receives the output of the previous one, transforms it, and passes it on. You have already used `fetch` and `filter` individually — now combine them: `fetch logs | filter loglevel == \"ERROR\"`. The pipe is what makes DQL composable: you can layer as many commands as you need, and each one narrows, enriches, or reshapes the data.",
        lesson: "Chaining Commands with Pipes",
        goal: "Chain fetch and filter with a pipe to keep only ERROR records.",
        hint: "Combine fetch + filter with a pipe.",
        sampleData: generateAppLogs(2200, 3),
        expectedPipeline: [
          { id: "e1", command: "fetch", args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'loglevel == "ERROR"' }, raw: 'filter loglevel == "ERROR"' },
        ],
      },
      {
        id: "step-2",
        title: "How many?",
        narration:
          "Now collapse those rows into a single number with summarize and the count() function. The result will be one row with one column: 'total'.",
        lesson: "Count Records with summarize",
        goal: "Add a summarize that produces a 'total' column equal to count().",
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
    company: "Day One",
    briefing:
      "A single number is useful, but 'how many errors per host?' is way more useful. Adding 'by:{...}' to summarize groups rows together before counting — like sorting laundry into piles before counting each pile.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Count errors per host",
        narration:
          "Adding `by: {field}` to a `summarize` command splits the records into groups before aggregating. Instead of one total count across all records, you get one row per unique value of the field — in this case, one row per host. This is called a grouped aggregation or a dimensional breakdown. For incident investigation, this is the most useful form of summarize: it immediately shows you which host, service, or region is generating the most noise.",
        lesson: "Group Counts by a Field",
        goal: "Group the count by the host field.",
        hint: "summarize count = count(), by:{<field>}",
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
    company: "Day One",
    briefing:
      "Once you have counts per host, you want the noisiest host at the top. The 'sort' command orders rows. Use 'desc' (descending) to put the biggest number first — almost always what you want during an incident.",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Sort hosts by error count, worst first",
        narration:
          "After a grouped summarize you have one row per host with a count, but they appear in arbitrary order. The `sort` command reorders them. Adding `desc` (descending) puts the largest values first — the noisiest host at the top, the quietest at the bottom. This is almost always what you want during an incident: you need to see the worst offender immediately, not scroll to find it.",
        lesson: "Sort Results in Descending Order",
        goal: "Sort the summarized result by 'count' in descending order.",
        hint: "sort <field> desc",
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
    company: "Day One",
    briefing:
      "Sometimes important info is buried inside the raw 'content' field of a log line — like an IP address or an error code. The 'parse' command extracts it into its own field so you can filter and group by it. (This is your bridge into DPL — the next track teaches the pattern grammar in depth.)",
    difficulty: "Beginner",
    steps: [
      {
        id: "step-1",
        title: "Extract the attacker IP",
        narration:
          "The auth log content looks like 'Failed login from IP:192.168.1.45 for user:admin'. The pattern 'IP:attacker_ip' tells DQL: find the literal text 'IP:', then capture what follows into a new field called attacker_ip.",
        lesson: "Extract Fields from Text with parse",
        goal: "Use parse to pull the IP into a new field 'attacker_ip'.",
        hint: 'parse <field>, "<pattern>"',
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

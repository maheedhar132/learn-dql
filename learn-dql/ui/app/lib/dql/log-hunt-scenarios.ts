import type { DQLRecord } from "../types/dql";
import type { PipelineStage } from "../types/dql";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogHuntTask {
  id: string;
  question: string;
  hint: string;
  expectedPipeline: PipelineStage[];
  sampleData: DQLRecord[];
}

export interface LogHuntScenario {
  id: string;
  title: string;
  emoji: string;
  story: string;
  investigation: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tasks: LogHuntTask[];
}

// ─── Seeded RNG helpers ───────────────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function randItem<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pad2(n: number) { return n.toString().padStart(2, "0"); }
function ts(base: Date, offsetSeconds: number) {
  const d = new Date(base.getTime() + offsetSeconds * 1000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;
}

// ─── Santa's Missing Gifts — warehouse logs ───────────────────────────────────

function generateSantaWarehouseLogs(): DQLRecord[] {
  const rng = seededRandom(1225);
  const base = new Date("2024-12-24T20:00:00Z");

  const elves = ["Hermey", "Bushy", "Pepper", "Shinny", "Wunorse", "Alabaster", "Jingle", "Sugarplum"];
  const giftIds = Array.from({ length: 60 }, (_, i) => `GIFT-${String(i + 1).padStart(4, "0")}`);
  // Hermey is the culprit — many entries, few exits
  const suspects = ["Hermey", "Hermey", "Hermey", "Hermey", "Hermey", "Bushy", "Bushy", "Pepper"];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  // Normal load/unload pairs for most elves
  for (let i = 0; i < 200; i++) {
    elapsed += randInt(rng, 5, 40);
    const elf = randItem(rng, elves);
    const gift = randItem(rng, giftIds);
    const weight = randInt(rng, 1, 15) * 100; // grams
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      elf,
      gift_id: gift,
      action: "LOADED",
      weight_g: weight,
      station: `STATION-${randInt(rng, 1, 6)}`,
      content: `Elf ${elf} loaded ${gift} (${weight}g) onto sleigh`,
    });
    // Most gifts get unloaded (EXIT) too
    if (rng() > 0.25) {
      elapsed += randInt(rng, 10, 60);
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: "INFO",
        elf,
        gift_id: gift,
        action: "SLEIGH_EXIT",
        weight_g: weight,
        station: `STATION-${randInt(rng, 1, 6)}`,
        content: `Gift ${gift} confirmed on sleigh manifest`,
      });
    }
  }

  // Hermey loads many heavy gifts but they never appear in SLEIGH_EXIT — they vanish
  const missingGifts = ["GIFT-0042", "GIFT-0007", "GIFT-0019", "GIFT-0055", "GIFT-0031", "GIFT-0003"];
  for (const gift of missingGifts) {
    elapsed += randInt(rng, 5, 20);
    const weight = randInt(rng, 8, 15) * 100 + 500;
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      elf: "Hermey",
      gift_id: gift,
      action: "LOADED",
      weight_g: weight,
      station: "STATION-4",
      content: `Elf Hermey loaded ${gift} (${weight}g) onto sleigh`,
    });
    // No SLEIGH_EXIT for these — they're missing
    records.push({
      timestamp: ts(base, elapsed + 120),
      loglevel: "WARN",
      elf: "Hermey",
      gift_id: gift,
      action: "RESTOCK",
      weight_g: weight,
      station: "STATION-4",
      content: `Gift ${gift} returned to restock shelf by Hermey — reason: quality_check`,
    });
  }

  // Shuffle by timestamp
  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── The Riddler's Cipher — API logs with hidden messages ────────────────────

function generateRiddlerLogs(): DQLRecord[] {
  const rng = seededRandom(4242);
  const base = new Date("2024-11-05T00:00:00Z");

  const endpoints = ["/api/users", "/api/orders", "/api/products", "/api/health", "/api/auth/login"];
  const normalIps = Array.from({ length: 30 }, () => {
    const a = randInt(rng, 10, 200);
    const b = randInt(rng, 0, 255);
    return `${a}.${b}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`;
  });
  const riddlerIp = "10.13.37.42";
  const riddlerUserAgent = "RiddlerBot/3.0 (why-so-serious)";

  // Riddle messages encoded as base64-ish strings hidden in a custom header field
  const riddles = [
    { encoded: "UklERExFUjogSSBhbSB0aGUgcXVlc3Rpb24gbWFya.", decoded: "RIDDLER: I am the question mark." },
    { encoded: "UklEREwzUjogQ2hhb3MgaXMgYSBsYWRkZXIu",      decoded: "RIDDL3R: Chaos is a ladder." },
    { encoded: "UklEREwzUjogTm8gcXVlc3Rpb24gdW5hc2tlZC4=",  decoded: "RIDDL3R: No question unasked." },
    { encoded: "UklEREwzUjogVGhlIG5ldHdvcmsgaXMgbWluZS4=",  decoded: "RIDDL3R: The network is mine." },
    { encoded: "UklEREwzUjogWW91IHdpbGwgbm90IHNvbHZlIG1lLg==", decoded: "RIDDL3R: You will not solve me." },
  ];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < 300; i++) {
    elapsed += randInt(rng, 1, 60);
    const isRiddler = i > 0 && i % 47 === 0;
    const ip = isRiddler ? riddlerIp : randItem(rng, normalIps);
    const endpoint = randItem(rng, endpoints);
    const status = isRiddler ? 418 : randItem(rng, [200, 200, 200, 200, 201, 204, 400, 500]);
    const riddle = isRiddler ? randItem(rng, riddles) : null;

    records.push({
      timestamp: ts(base, elapsed),
      loglevel: isRiddler ? "WARN" : status >= 500 ? "ERROR" : "INFO",
      ip,
      endpoint,
      method: randItem(rng, ["GET", "POST", "GET", "GET"]),
      http_status: status,
      response_ms: isRiddler ? 13 : randInt(rng, 5, 800),
      user_agent: isRiddler ? riddlerUserAgent : `Mozilla/5.0 (client-${randInt(rng, 1, 999)})`,
      x_cipher: isRiddler && riddle ? riddle.encoded : null,
      content: isRiddler && riddle
        ? `Suspicious request to ${endpoint} — cipher payload detected: ${riddle.encoded}`
        : `${endpoint} responded ${status}`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── The Phantom Train — cargo container tracking ────────────────────────────

function generateTrainCargoLogs(): DQLRecord[] {
  const rng = seededRandom(7777);
  const base = new Date("2024-10-15T06:00:00Z");

  const containers = Array.from({ length: 40 }, (_, i) => `CTR-${String(i + 1).padStart(3, "0")}`);
  const stations = ["NORTHPORT", "JUNCTION-7", "EASTBRIDGE", "SOUTHGATE", "WESTEND"];
  const couriers = ["Volkov", "Chen", "Okafor", "Reyes", "Patel", "Novak", "Volkov", "Volkov"];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  // Normal containers: CHECK_IN at origin, CHECK_OUT at destination
  for (let i = 0; i < containers.length; i++) {
    elapsed += randInt(rng, 20, 120);
    const container = containers[i];
    const courier = randItem(rng, couriers);
    const origin = randItem(rng, stations);
    const cargo = randItem(rng, ["electronics", "pharmaceuticals", "textiles", "machinery", "food"]);
    const weight = randInt(rng, 500, 8000);

    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      container_id: container,
      courier,
      station: origin,
      action: "CHECK_IN",
      cargo_type: cargo,
      weight_kg: weight,
      content: `Container ${container} checked in at ${origin} by ${courier}`,
    });

    // Most get checked out — but Volkov's containers often don't
    const isVolkov = courier === "Volkov";
    const misses = isVolkov && rng() < 0.65;
    if (!misses) {
      elapsed += randInt(rng, 200, 600);
      const dest = stations.find((s) => s !== origin) ?? stations[0];
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: "INFO",
        container_id: container,
        courier,
        station: dest,
        action: "CHECK_OUT",
        cargo_type: cargo,
        weight_kg: weight,
        content: `Container ${container} checked out at ${dest} — delivery confirmed`,
      });
    } else {
      // Volkov's ghost containers: CHECK_IN at intermediate with no CHECK_OUT
      elapsed += randInt(rng, 100, 300);
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: "WARN",
        container_id: container,
        courier,
        station: "JUNCTION-7",
        action: "CHECK_IN",
        cargo_type: cargo,
        weight_kg: weight,
        content: `Container ${container} re-scanned at JUNCTION-7 — unexpected route`,
      });
    }
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

const santaData = generateSantaWarehouseLogs();
const riddlerData = generateRiddlerLogs();
const trainData = generateTrainCargoLogs();

export const logHuntScenarios: LogHuntScenario[] = [
  {
    id: "hunt-001",
    title: "Santa's Missing Gifts",
    emoji: "🎅",
    difficulty: "Beginner",
    story:
      "It's Christmas Eve, 20:00 UTC — T-minus four hours until Santa departs from the North Pole. " +
      "The workshop's warehouse management system has been logging every gift movement: which elf loaded each package onto the sleigh, " +
      "the package weight in grams, and a final confirmation scan (SLEIGH_EXIT) when the gift clears the loading dock. " +
      "Five minutes ago the sleigh's manifest system flagged a weight discrepancy: the sum of LOADED packages does not match the sum of SLEIGH_EXIT packages. " +
      "Someone is pulling gifts back off the sleigh under cover of the loading frenzy. " +
      "Santa has authorised a full log audit. Every second counts.",
    investigation:
      "Start by fetching all warehouse logs and confirming the two action types present (LOADED and SLEIGH_EXIT). " +
      "Then find which gift IDs were LOADED but never received a SLEIGH_EXIT confirmation — those are your missing packages. " +
      "Finally, summarise total weight loaded per elf to see whose numbers look suspicious. " +
      "The elf with heavy loads but matching RESTOCK entries against the missing gift IDs is your culprit.",
    tasks: [
      {
        id: "t1",
        question: "Fetch all warehouse logs and count how many LOADED vs SLEIGH_EXIT actions exist.",
        hint: "fetch logs | summarize count(), by:{action}",
        sampleData: santaData,
        expectedPipeline: [
          { id: "e1", command: "fetch",     args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { aggregations: ["count()"], by: ["action"] }, raw: "summarize count(), by:{action}" },
        ],
      },
      {
        id: "t2",
        question: "Which gifts were LOADED by Hermey but then appeared in a RESTOCK action? Filter to show only Hermey's RESTOCK entries.",
        hint: "fetch logs | filter elf == \"Hermey\" | filter action == \"RESTOCK\"",
        sampleData: santaData,
        expectedPipeline: [
          { id: "e1", command: "fetch",  args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'elf == "Hermey"' }, raw: 'filter elf == "Hermey"' },
          { id: "e3", command: "filter", args: { condition: 'action == "RESTOCK"' }, raw: 'filter action == "RESTOCK"' },
        ],
      },
      {
        id: "t3",
        question: "Which elf loaded the most total weight? Summarise sum of weight_g by elf, sort descending.",
        hint: "fetch logs | filter action == \"LOADED\" | summarize total_weight = sum(weight_g), by:{elf} | sort total_weight desc",
        sampleData: santaData,
        expectedPipeline: [
          { id: "e1", command: "fetch",     args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter",    args: { condition: 'action == "LOADED"' }, raw: 'filter action == "LOADED"' },
          { id: "e3", command: "summarize", args: { aggregations: ["total_weight = sum(weight_g)"], by: ["elf"] }, raw: "summarize total_weight = sum(weight_g), by:{elf}" },
          { id: "e4", command: "sort",      args: { fields: ["total_weight"], direction: "desc" }, raw: "sort total_weight desc" },
        ],
      },
    ],
  },

  {
    id: "hunt-002",
    title: "The Riddler's Cipher",
    emoji: "❓",
    difficulty: "Intermediate",
    story:
      "Gotham City Bank's API gateway has been logging unusually shaped requests since midnight. " +
      "The security team noticed a pattern: every 47th-ish request returns HTTP 418 (I'm a Teapot) — " +
      "a status code that should never appear in production. " +
      "Deeper inspection of the access logs reveals a custom field 'x_cipher' that is non-null only on these requests, " +
      "and the user_agent string reads 'RiddlerBot/3.0 (why-so-serious)'. " +
      "Someone calling themselves The Riddler has been planting encoded messages inside the API traffic, " +
      "hiding them in plain sight inside a flood of normal requests. " +
      "The SOC team needs to isolate every Riddler request, count how many cipher drops occurred, " +
      "and identify exactly which IP is responsible.",
    investigation:
      "First, filter the logs for HTTP 418 responses — that's The Riddler's signature status code. " +
      "Count how many cipher messages were planted in total. " +
      "Then narrow down to records where x_cipher is not null and list the distinct source IPs. " +
      "Finally, summarise request counts by ip to confirm that a single IP is responsible for all the Riddler traffic " +
      "while the rest of the IPs look like normal users.",
    tasks: [
      {
        id: "t1",
        question: "Filter logs to only HTTP 418 responses and count them.",
        hint: "fetch logs | filter http_status == 418 | summarize count()",
        sampleData: riddlerData,
        expectedPipeline: [
          { id: "e1", command: "fetch",     args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter",    args: { condition: "http_status == 418" }, raw: "filter http_status == 418" },
          { id: "e3", command: "summarize", args: { aggregations: ["count()"], by: [] }, raw: "summarize count()" },
        ],
      },
      {
        id: "t2",
        question: "Show all requests from the Riddler's IP. Filter by user_agent containing \"RiddlerBot\".",
        hint: "fetch logs | filter contains(user_agent, \"RiddlerBot\")",
        sampleData: riddlerData,
        expectedPipeline: [
          { id: "e1", command: "fetch",  args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'contains(user_agent, "RiddlerBot")' }, raw: 'filter contains(user_agent, "RiddlerBot")' },
        ],
      },
      {
        id: "t3",
        question: "How many requests did each IP make? Summarise count by ip and sort descending to find the top attacker.",
        hint: "fetch logs | summarize requests = count(), by:{ip} | sort requests desc",
        sampleData: riddlerData,
        expectedPipeline: [
          { id: "e1", command: "fetch",     args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { aggregations: ["requests = count()"], by: ["ip"] }, raw: "summarize requests = count(), by:{ip}" },
          { id: "e3", command: "sort",      args: { fields: ["requests"], direction: "desc" }, raw: "sort requests desc" },
        ],
      },
    ],
  },

  {
    id: "hunt-003",
    title: "The Phantom Train",
    emoji: "🚂",
    difficulty: "Intermediate",
    story:
      "InterRail Logistics runs a real-time cargo tracking system across five stations — NORTHPORT, JUNCTION-7, EASTBRIDGE, SOUTHGATE, and WESTEND. " +
      "Each container is scanned when it arrives at a station (CHECK_IN) and again when it leaves for its destination (CHECK_OUT). " +
      "Overnight, the cargo reconciliation job failed: it cannot match 11 containers that have CHECK_IN records but no corresponding CHECK_OUT. " +
      "These containers — worth an estimated €2.3 million in mixed cargo — have vanished somewhere between stations. " +
      "One courier name keeps appearing in the anomaly report: Volkov. " +
      "The logistics director needs hard evidence from the logs before escalating to law enforcement.",
    investigation:
      "Begin by fetching all cargo logs and summarising how many CHECK_IN versus CHECK_OUT events exist per courier — " +
      "you're looking for an imbalance. " +
      "Then filter to only CHECK_IN records at JUNCTION-7 (the hub where the trail goes cold) and see which couriers appear. " +
      "Finally, isolate Volkov's activity: show all of his container movements sorted by timestamp so you can trace the exact sequence — " +
      "CHECK_IN at origin, ghost scan at JUNCTION-7, and then silence where a CHECK_OUT should be.",
    tasks: [
      {
        id: "t1",
        question: "Summarise count of each action type per courier. Which courier has far more CHECK_INs than CHECK_OUTs?",
        hint: "fetch logs | summarize count(), by:{courier, action} | sort courier asc",
        sampleData: trainData,
        expectedPipeline: [
          { id: "e1", command: "fetch",     args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "summarize", args: { aggregations: ["count()"], by: ["courier", "action"] }, raw: "summarize count(), by:{courier, action}" },
          { id: "e3", command: "sort",      args: { fields: ["courier"], direction: "asc" }, raw: "sort courier asc" },
        ],
      },
      {
        id: "t2",
        question: "Filter to Volkov's records only, sorted by timestamp. Map his full movement timeline.",
        hint: "fetch logs | filter courier == \"Volkov\" | sort timestamp asc",
        sampleData: trainData,
        expectedPipeline: [
          { id: "e1", command: "fetch",  args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'courier == "Volkov"' }, raw: 'filter courier == "Volkov"' },
          { id: "e3", command: "sort",   args: { fields: ["timestamp"], direction: "asc" }, raw: "sort timestamp asc" },
        ],
      },
      {
        id: "t3",
        question: "Show only the containers that ended at JUNCTION-7 with no onward movement. Filter action == CHECK_IN and station == JUNCTION-7.",
        hint: "fetch logs | filter action == \"CHECK_IN\" | filter station == \"JUNCTION-7\"",
        sampleData: trainData,
        expectedPipeline: [
          { id: "e1", command: "fetch",  args: { source: "logs" }, raw: "fetch logs" },
          { id: "e2", command: "filter", args: { condition: 'action == "CHECK_IN"' }, raw: 'filter action == "CHECK_IN"' },
          { id: "e3", command: "filter", args: { condition: 'station == "JUNCTION-7"' }, raw: 'filter station == "JUNCTION-7"' },
        ],
      },
    ],
  },
];

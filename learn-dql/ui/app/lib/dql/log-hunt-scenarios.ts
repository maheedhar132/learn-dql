import type { DQLRecord } from "../types/dql";
import type { PipelineStage } from "../types/dql";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogHuntTask {
  id: string;
  question: string;
  solution: string;           // shown verbatim on "Show solution"
  sampleData: DQLRecord[];
}

export interface LogHuntMCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface LogHuntScenario {
  id: string;
  title: string;
  emoji: string;
  story: string;
  investigation: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tasks: LogHuntTask[];
  mcq: LogHuntMCQ;
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
      "Start by fetching all warehouse logs and seeing what action types exist. " +
      "Then look at which elves have RESTOCK entries — those are gifts that were loaded and then quietly put back. " +
      "Finally, see who loaded the most total weight across all their LOADED actions. " +
      "The numbers will tell you who to name.",
    tasks: [
      {
        id: "t1",
        question: "What action types are in the logs, and how many of each?",
        solution: 'fetch logs | summarize count(), by:{action}',
        sampleData: santaData,
      },
      {
        id: "t2",
        question: "Which elves have RESTOCK entries, and for which gift IDs?",
        solution: 'fetch logs | filter action == "RESTOCK" | fields elf, gift_id, weight_g',
        sampleData: santaData,
      },
      {
        id: "t3",
        question: "Who loaded the most total weight? Summarise weight loaded per elf, sort heaviest first.",
        solution: 'fetch logs | filter action == "LOADED" | summarize total = sum(weight_g), by:{elf} | sort total desc',
        sampleData: santaData,
      },
    ],
    mcq: {
      question: "Based on your investigation — which elf stole the gifts?",
      options: ["Bushy", "Hermey", "Pepper", "Sugarplum"],
      correctAnswer: "Hermey",
      explanation:
        "Hermey had the highest total loaded weight AND is the only elf with RESTOCK entries for 6 specific gift IDs. " +
        "He loaded them onto the sleigh, then logged a 'quality_check' RESTOCK to quietly remove them before SLEIGH_EXIT was recorded.",
    },
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
      "Filter for HTTP 418 responses — that's the Riddler's signature. " +
      "Then look at requests where x_cipher is not null, and find which user_agent stands out. " +
      "Finally summarise request counts by IP to confirm which single address is responsible for all the noise.",
    tasks: [
      {
        id: "t1",
        question: "How many requests returned HTTP 418? What does the breakdown by status code look like?",
        solution: "fetch logs | summarize count(), by:{http_status} | sort count() desc",
        sampleData: riddlerData,
      },
      {
        id: "t2",
        question: "Show all requests where x_cipher is not null. What user_agent do they share?",
        solution: "fetch logs | filter isNotNull(x_cipher) | fields timestamp, ip, user_agent, x_cipher",
        sampleData: riddlerData,
      },
      {
        id: "t3",
        question: "How many requests did each IP make? Find the outlier.",
        solution: "fetch logs | summarize requests = count(), by:{ip} | sort requests desc",
        sampleData: riddlerData,
      },
    ],
    mcq: {
      question: "Which IP address planted the cipher messages?",
      options: ["10.13.37.42", "192.168.0.1", "172.16.0.55", "10.0.0.1"],
      correctAnswer: "10.13.37.42",
      explanation:
        "IP 10.13.37.42 using user_agent 'RiddlerBot/3.0 (why-so-serious)' was responsible for all HTTP 418 requests " +
        "and every non-null x_cipher field. All other IPs show normal traffic patterns.",
    },
  },

  {
    id: "hunt-003",
    title: "The Phantom Train",
    emoji: "🚂",
    difficulty: "Intermediate",
    story:
      "InterRail Logistics runs a real-time cargo tracking system across five stations — NORTHPORT, JUNCTION-7, EASTBRIDGE, SOUTHGATE, and WESTEND. " +
      "Each container is scanned when it arrives at a station (CHECK_IN) and again when it leaves for its destination (CHECK_OUT). " +
      "Overnight, the cargo reconciliation job failed: it cannot match containers that have CHECK_IN records but no corresponding CHECK_OUT. " +
      "These containers — worth an estimated €2.3 million in mixed cargo — have vanished somewhere between stations. " +
      "One courier name keeps appearing in the anomaly report. " +
      "The logistics director needs hard evidence from the logs before escalating to law enforcement.",
    investigation:
      "Summarise CHECK_IN vs CHECK_OUT counts per courier — you are looking for a courier whose CHECK_INs far outnumber CHECK_OUTs. " +
      "Then filter to only CHECK_IN records at JUNCTION-7 (the hub where the trail goes cold) and see which couriers appear there. " +
      "Finally pull all movements for the suspect courier, sorted by timestamp, to see the full picture.",
    tasks: [
      {
        id: "t1",
        question: "How many CHECK_IN vs CHECK_OUT events does each courier have?",
        solution: "fetch logs | summarize count(), by:{courier, action} | sort courier asc",
        sampleData: trainData,
      },
      {
        id: "t2",
        question: "Which couriers appear in CHECK_IN events specifically at JUNCTION-7?",
        solution: 'fetch logs | filter action == "CHECK_IN" | filter station == "JUNCTION-7" | summarize count(), by:{courier}',
        sampleData: trainData,
      },
      {
        id: "t3",
        question: "Show all of the suspect courier's movements in chronological order.",
        solution: 'fetch logs | filter courier == "Volkov" | sort timestamp asc',
        sampleData: trainData,
      },
    ],
    mcq: {
      question: "Which courier is responsible for the missing containers?",
      options: ["Chen", "Okafor", "Reyes", "Volkov"],
      correctAnswer: "Volkov",
      explanation:
        "Volkov has significantly more CHECK_IN records than CHECK_OUT records. " +
        "His containers repeatedly appear at JUNCTION-7 with a second CHECK_IN scan but never reach a final CHECK_OUT at the destination — " +
        "the containers disappear at the junction under his watch.",
    },
  },
];

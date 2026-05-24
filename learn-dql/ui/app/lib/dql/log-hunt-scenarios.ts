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
  hints?: string[];
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

// ─── Coffee Shop Order Fraud — barista voids ─────────────────────────────────

function generateCoffeeShopLogs(): DQLRecord[] {
  const rng = seededRandom(1001);
  const base = new Date("2025-03-10T07:00:00Z");

  const baristas = ["Marco", "Leila", "Sam", "Priya", "Marco", "Marco", "Marco"];
  const items = ["Latte", "Espresso", "Cappuccino", "Cold Brew", "Flat White", "Mocha", "Americano"];
  const terminals = ["TERM-A", "TERM-B", "TERM-C", "TERM-D"];

  const records: DQLRecord[] = [];
  let elapsed = 0;
  let orderSeq = 1;

  // Normal order/payment cycles for all baristas
  for (let i = 0; i < 220; i++) {
    elapsed += randInt(rng, 30, 180);
    const barista = randItem(rng, baristas);
    const orderId = `ORD-${String(orderSeq++).padStart(5, "0")}`;
    const item = randItem(rng, items);
    const amount = randInt(rng, 350, 800);
    const terminal = randItem(rng, terminals);

    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      order_id: orderId,
      barista,
      action: "ORDER",
      amount_cents: amount,
      item,
      terminal_id: terminal,
      content: `${barista} placed order ${orderId} for ${item} — $${(amount / 100).toFixed(2)}`,
    });

    elapsed += randInt(rng, 30, 120);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      order_id: orderId,
      barista,
      action: "PAYMENT",
      amount_cents: amount,
      item,
      terminal_id: terminal,
      content: `Payment received for ${orderId} — $${(amount / 100).toFixed(2)}`,
    });

    // Marco voids far more than others
    const voidChance = barista === "Marco" ? 0.55 : 0.05;
    if (rng() < voidChance) {
      elapsed += randInt(rng, 5, 30);
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: "WARN",
        order_id: orderId,
        barista,
        action: "VOID",
        amount_cents: amount,
        item,
        terminal_id: terminal,
        content: `Order ${orderId} voided by ${barista} after payment — reason: customer_complaint`,
      });
    }
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── Hospital Med Dispensary Audit — unauthorized dispensing ─────────────────

function generateHospitalMedLogs(): DQLRecord[] {
  const rng = seededRandom(2002);
  const base = new Date("2025-01-15T00:00:00Z");

  const staff = ["Nurse_Briggs", "Nurse_Santos", "Nurse_Kim", "Pharmacist_West", "Nurse_Briggs", "Nurse_Briggs"];
  const drugs = ["Morphine", "Oxycodone", "Fentanyl", "Midazolam", "Lorazepam", "Hydromorphone"];
  const wards = ["ICU", "Oncology", "ER", "Surgery", "Cardiology"];
  const validPatients = Array.from({ length: 30 }, (_, i) => `PT-${String(i + 1).padStart(4, "0")}`);
  const fakePatients = ["PT-9999", "PT-0000", "PT-8888", "PT-7777"];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < 240; i++) {
    elapsed += randInt(rng, 60, 600);
    const dispensedBy = randItem(rng, staff);
    const drug = randItem(rng, drugs);
    const ward = randItem(rng, wards);
    const quantity = randInt(rng, 1, 10);

    // Nurse_Briggs frequently uses fake patient IDs without authorization
    const isBriggsSuspect = dispensedBy === "Nurse_Briggs" && rng() < 0.6;
    const patientId = isBriggsSuspect
      ? randItem(rng, fakePatients)
      : randItem(rng, validPatients);
    const authorized = isBriggsSuspect ? false : true;

    records.push({
      timestamp: ts(base, elapsed),
      loglevel: authorized ? "INFO" : "ERROR",
      drug_name: drug,
      dispensed_by: dispensedBy,
      patient_id: patientId,
      quantity,
      authorized,
      ward,
      content: authorized
        ? `${dispensedBy} dispensed ${quantity}x ${drug} to ${patientId} in ${ward}`
        : `UNAUTHORIZED dispense: ${dispensedBy} issued ${quantity}x ${drug} — patient ${patientId} not on active registry`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── Airport Baggage Handlers — disappearing bags ────────────────────────────

function generateAirportBaggageLogs(): DQLRecord[] {
  const rng = seededRandom(3003);
  const base = new Date("2025-02-20T04:00:00Z");

  const handlers = ["Torres", "Mwangi", "Dubois", "Kovalenko", "Torres", "Torres", "Torres"];
  const flights = ["AA-101", "BA-202", "LH-303", "EK-404", "QF-505", "UA-606"];
  const terminals = ["T1", "T2", "T3"];
  const bagIds = Array.from({ length: 80 }, (_, i) => `BAG-${String(i + 1).padStart(5, "0")}`);

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < 260; i++) {
    elapsed += randInt(rng, 20, 90);
    const handler = randItem(rng, handlers);
    const bag = randItem(rng, bagIds);
    const flight = randItem(rng, flights);
    const terminal = randItem(rng, terminals);
    const weight = randInt(rng, 8, 32);

    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      bag_id: bag,
      handler,
      flight_id: flight,
      action: "SCAN",
      terminal,
      weight_kg: weight,
      content: `Bag ${bag} scanned at check-in by ${handler} — flight ${flight}`,
    });

    // Torres offloads many bags instead of loading them
    const isTorres = handler === "Torres";
    const offloadChance = isTorres ? 0.65 : 0.05;

    if (rng() < offloadChance) {
      elapsed += randInt(rng, 5, 25);
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: "WARN",
        bag_id: bag,
        handler,
        flight_id: flight,
        action: "OFFLOAD",
        terminal,
        weight_kg: weight,
        content: `Bag ${bag} offloaded from ${flight} by ${handler} — reason: oversized_check`,
      });
    } else {
      elapsed += randInt(rng, 30, 120);
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: "INFO",
        bag_id: bag,
        handler,
        flight_id: flight,
        action: "LOAD",
        terminal,
        weight_kg: weight,
        content: `Bag ${bag} loaded onto ${flight} by ${handler}`,
      });
    }
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── E-commerce Refund Ring — warehouse worker refund fraud ──────────────────

function generateRefundRingLogs(): DQLRecord[] {
  const rng = seededRandom(4004);
  const base = new Date("2025-04-01T08:00:00Z");

  const workers = ["Osei", "Petrov", "Diaz", "Nakamura", "Osei", "Osei", "Osei"];
  const warehouses = ["WH-EAST", "WH-WEST", "WH-NORTH"];
  const fakeCustomers = ["CUST-00001", "CUST-00002", "CUST-00003"];
  const realCustomers = Array.from({ length: 40 }, (_, i) => `CUST-${String(i + 100).padStart(5, "0")}`);
  let orderSeq = 1;

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < 250; i++) {
    elapsed += randInt(rng, 45, 300);
    const worker = randItem(rng, workers);
    const orderId = `EORD-${String(orderSeq++).padStart(6, "0")}`;
    const warehouse = randItem(rng, warehouses);

    // Osei frequently refunds to a small set of fake customer IDs
    const isOseiScam = worker === "Osei" && rng() < 0.6;
    const customerId = isOseiScam ? randItem(rng, fakeCustomers) : randItem(rng, realCustomers);
    const refundAmount = isOseiScam ? randInt(rng, 4000, 15000) : randInt(rng, 500, 8000);

    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      order_id: orderId,
      worker,
      customer_id: customerId,
      action: "RECEIVE",
      refund_amount: 0,
      warehouse,
      content: `${worker} received return ${orderId} from ${customerId} at ${warehouse}`,
    });

    elapsed += randInt(rng, 10, 60);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      order_id: orderId,
      worker,
      customer_id: customerId,
      action: "INSPECT",
      refund_amount: 0,
      warehouse,
      content: `${worker} inspected return ${orderId}`,
    });

    if (isOseiScam || rng() < 0.3) {
      elapsed += randInt(rng, 5, 30);
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: isOseiScam ? "WARN" : "INFO",
        order_id: orderId,
        worker,
        customer_id: customerId,
        action: "REFUND",
        refund_amount: refundAmount,
        warehouse,
        content: `Refund $${(refundAmount / 100).toFixed(2)} issued to ${customerId} for ${orderId} by ${worker}`,
      });
    }
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── Bank ATM Skimmer — technician tamper events ─────────────────────────────

function generateAtmSkimmerLogs(): DQLRecord[] {
  const rng = seededRandom(5005);
  const base = new Date("2025-05-01T00:00:00Z");

  const technicians = ["Holt", "Ferreira", "Yamamoto", "Gruber", "Holt", "Holt"];
  const locations = ["DOWNTOWN", "AIRPORT", "MALL", "SUBURB-EAST", "SUBURB-WEST", "STATION"];
  const atmIds = Array.from({ length: 20 }, (_, i) => `ATM-${String(i + 1).padStart(3, "0")}`);
  const normalActions: string[] = ["MAINTENANCE", "REPLENISH", "AUDIT"];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < 230; i++) {
    elapsed += randInt(rng, 120, 900);
    const technician = randItem(rng, technicians);
    const atmId = randItem(rng, atmIds);
    const location = randItem(rng, locations);
    const durationMin = randInt(rng, 5, 90);

    // Holt has TAMPER_SUSPECTED entries that others don't
    const isHoltTamper = technician === "Holt" && rng() < 0.45;
    const action = isHoltTamper ? "TAMPER_SUSPECTED" : randItem(rng, normalActions);

    records.push({
      timestamp: ts(base, elapsed),
      loglevel: isHoltTamper ? "ERROR" : "INFO",
      atm_id: atmId,
      technician,
      action,
      location,
      duration_min: durationMin,
      content: isHoltTamper
        ? `ALERT: Tamper-evident seal broken on ${atmId} at ${location} — last access by ${technician}`
        : `${technician} performed ${action} on ${atmId} at ${location} (${durationMin} min)`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── Hotel Minibar Theft — staff voiding guest charges ───────────────────────

function generateHotelMinibarLogs(): DQLRecord[] {
  const rng = seededRandom(6006);
  const base = new Date("2025-06-01T14:00:00Z");

  const staffMembers = ["Kowalski", "Adeyemi", "Brennan", "Svensson", "Kowalski", "Kowalski", "Kowalski"];
  const items = ["Whiskey", "Beer", "Sparkling Water", "Nuts", "Chocolate", "Wine", "Soda", "Juice"];
  const floors = ["Floor-3", "Floor-4", "Floor-5", "Floor-6", "Floor-7"];
  const shifts = ["Morning", "Afternoon", "Night"];
  const roomIds = Array.from({ length: 50 }, (_, i) => `ROOM-${String(i + 301).padStart(3, "0")}`);

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < 260; i++) {
    elapsed += randInt(rng, 60, 600);
    const staffMember = randItem(rng, staffMembers);
    const item = randItem(rng, items);
    const floor = randItem(rng, floors);
    const shift = randItem(rng, shifts);
    const roomId = randItem(rng, roomIds);

    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      room_id: roomId,
      staff_member: staffMember,
      item,
      action: "RESTOCK",
      floor,
      shift,
      content: `${staffMember} restocked ${item} in ${roomId} (${floor})`,
    });

    // Kowalski voids items far more than logging them as guest consumption
    const isKowalskiVoid = staffMember === "Kowalski" && rng() < 0.65;

    if (isKowalskiVoid) {
      elapsed += randInt(rng, 5, 20);
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: "WARN",
        room_id: roomId,
        staff_member: staffMember,
        item,
        action: "VOID",
        floor,
        shift,
        content: `Item ${item} in ${roomId} voided by ${staffMember} — reason: damaged_stock`,
      });
    } else if (rng() < 0.5) {
      elapsed += randInt(rng, 300, 3600);
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: "INFO",
        room_id: roomId,
        staff_member: staffMember,
        item,
        action: "GUEST_CONSUME",
        floor,
        shift,
        content: `Guest consumed ${item} from ${roomId} minibar — charge logged`,
      });
    }
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── Power Grid Tampering — false meter readings ──────────────────────────────

function generatePowerGridLogs(): DQLRecord[] {
  const rng = seededRandom(7007);
  const base = new Date("2025-07-01T00:00:00Z");

  const operators = ["Chandra", "Muller", "Okonkwo", "Bauer", "Chandra", "Chandra", "Chandra"];
  const regions = ["NORTH-GRID", "SOUTH-GRID", "EAST-GRID", "WEST-GRID"];
  const substationIds = Array.from({ length: 15 }, (_, i) => `SUB-${String(i + 1).padStart(3, "0")}`);
  const meterIds = Array.from({ length: 30 }, (_, i) => `MTR-${String(i + 1).padStart(4, "0")}`);

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < 270; i++) {
    elapsed += randInt(rng, 300, 1800);
    const operator = randItem(rng, operators);
    const substationId = randItem(rng, substationIds);
    const meterId = randItem(rng, meterIds);
    const region = randItem(rng, regions);

    const expectedKwh = randInt(rng, 800, 5000);

    // Chandra submits falsely low readings and gets ADJUSTED/TAMPER_FLAG entries
    const isChandraScam = operator === "Chandra" && rng() < 0.55;
    const readingKwh = isChandraScam
      ? Math.floor(expectedKwh * (0.4 + rng() * 0.3))  // 40–70% of expected
      : Math.floor(expectedKwh * (0.9 + rng() * 0.2)); // 90–110% of expected

    const deviation = Math.abs(readingKwh - expectedKwh) / expectedKwh;
    const action = isChandraScam
      ? (deviation > 0.4 ? "TAMPER_FLAG" : "ADJUSTED")
      : "NORMAL";

    records.push({
      timestamp: ts(base, elapsed),
      loglevel: isChandraScam ? (action === "TAMPER_FLAG" ? "ERROR" : "WARN") : "INFO",
      substation_id: substationId,
      operator,
      meter_id: meterId,
      reading_kwh: readingKwh,
      expected_kwh: expectedKwh,
      action,
      region,
      content: isChandraScam
        ? `${action}: Meter ${meterId} reading ${readingKwh} kWh deviates from expected ${expectedKwh} kWh — submitted by ${operator}`
        : `Meter ${meterId} reading ${readingKwh} kWh (expected ${expectedKwh}) — NORMAL — operator ${operator}`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

const santaData = generateSantaWarehouseLogs();
const riddlerData = generateRiddlerLogs();
const trainData = generateTrainCargoLogs();
const coffeeData = generateCoffeeShopLogs();
const hospitalData = generateHospitalMedLogs();
const airportData = generateAirportBaggageLogs();
const refundData = generateRefundRingLogs();
const atmData = generateAtmSkimmerLogs();
const minibarData = generateHotelMinibarLogs();
const gridData = generatePowerGridLogs();

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
    hints: [
      "Start by running: fetch logs | summarize count(), by:{action} — this shows what action types exist.",
      'Filter for action == "RESTOCK" and look at the elf field — only one elf has these entries.',
      'Confirm with: fetch logs | filter action == "LOADED" | summarize total = sum(weight_g), by:{elf} | sort total desc',
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
    hints: [
      "Run: fetch logs | summarize count(), by:{http_status} and look for any HTTP status code that should never appear in production.",
      "Filter for that unusual status code and check the user_agent field — it has a distinctive value.",
      "Confirm with: fetch logs | filter isNotNull(x_cipher) | fields timestamp, ip, user_agent, x_cipher",
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
    hints: [
      "Run: fetch logs | summarize count(), by:{courier, action} to compare CHECK_IN vs CHECK_OUT counts per courier.",
      "Filter for action == \"CHECK_IN\" and station == \"JUNCTION-7\" to see which couriers appear at this hub.",
      "Pull all movements for the suspect courier and sort by timestamp to see the full pattern.",
    ],
  },

  {
    id: "hunt-004",
    title: "The Void Barista",
    emoji: "☕",
    difficulty: "Beginner",
    story:
      "Brew & Co.'s POS system logs every order, payment, and void at each of its four terminals. " +
      "The end-of-week cash reconciliation is $400 short, but all orders show as paid. " +
      "The store manager noticed a pattern: some orders are voided immediately after payment, " +
      "which should be impossible under normal procedure. Someone is taking cash and wiping the record.",
    investigation:
      "Start by counting how many of each action type (ORDER, PAYMENT, VOID) exist in the logs. " +
      "Then filter to VOID entries and break them down by barista. " +
      "Finally, compare each barista's VOID count against their ORDER count to find the outlier.",
    tasks: [
      {
        id: "t1",
        question: "How many ORDER, PAYMENT, and VOID events are there overall?",
        solution: "fetch logs | summarize count(), by:{action}",
        sampleData: coffeeData,
      },
      {
        id: "t2",
        question: "How many VOID events does each barista have? Sort most voids first.",
        solution: 'fetch logs | filter action == "VOID" | summarize voids = count(), by:{barista} | sort voids desc',
        sampleData: coffeeData,
      },
      {
        id: "t3",
        question: "Show the VOID-to-ORDER ratio per barista — who stands out?",
        solution: 'fetch logs | summarize orders = countIf(action == "ORDER"), voids = countIf(action == "VOID"), by:{barista} | sort voids desc',
        sampleData: coffeeData,
      },
    ],
    mcq: {
      question: "Which barista is voiding orders after payment to pocket the cash?",
      options: ["Leila", "Sam", "Priya", "Marco"],
      correctAnswer: "Marco",
      explanation:
        "Marco has a dramatically higher VOID count than any other barista, and his VOIDs consistently appear " +
        "immediately after PAYMENT events for the same order ID. The other baristas' void rates are under 5%.",
    },
  },

  {
    id: "hunt-005",
    title: "Phantom Scripts",
    emoji: "💊",
    difficulty: "Intermediate",
    story:
      "St. Agatha's Hospital pharmacy system logs every dispensing event for controlled substances. " +
      "An internal audit flagged 23 dispenses with no matching active patient on record. " +
      "Controlled substances are only authorized when `authorized` is true and the patient ID exists in the registry. " +
      "Someone with dispense credentials is circumventing the check — and the quantities suggest personal diversion.",
    investigation:
      "Filter to records where authorized is false and see how many there are by staff member. " +
      "Then look at the patient IDs associated with unauthorized dispenses — a small set of recurring fake IDs is a red flag. " +
      "Finally, count total quantities dispensed per staff member across all unauthorized events.",
    tasks: [
      {
        id: "t1",
        question: "How many unauthorized dispenses (authorized == false) does each staff member have?",
        solution: "fetch logs | filter authorized == false | summarize count(), by:{dispensed_by} | sort count() desc",
        sampleData: hospitalData,
      },
      {
        id: "t2",
        question: "For unauthorized dispenses, which patient IDs appear and how often?",
        solution: "fetch logs | filter authorized == false | summarize count(), by:{patient_id} | sort count() desc",
        sampleData: hospitalData,
      },
      {
        id: "t3",
        question: "What is the total quantity of controlled substances dispensed without authorization, per staff member?",
        solution: "fetch logs | filter authorized == false | summarize total_qty = sum(quantity), by:{dispensed_by} | sort total_qty desc",
        sampleData: hospitalData,
      },
    ],
    mcq: {
      question: "Which staff member is dispensing controlled substances without valid patient authorization?",
      options: ["Nurse_Santos", "Nurse_Kim", "Pharmacist_West", "Nurse_Briggs"],
      correctAnswer: "Nurse_Briggs",
      explanation:
        "Nurse_Briggs accounts for the vast majority of unauthorized dispenses and consistently uses a small set of " +
        "fake patient IDs (PT-9999, PT-0000, PT-8888, PT-7777) that do not appear in authorized transactions. " +
        "The total quantity diverted is far above what any accidental error would explain.",
    },
  },

  {
    id: "hunt-006",
    title: "Terminal Diversion",
    emoji: "✈️",
    difficulty: "Intermediate",
    story:
      "GlobalAir's baggage tracking system logs every bag through three events: SCAN at check-in, LOAD onto the aircraft, " +
      "and OFFLOAD when a bag is legitimately removed. Bags that are SCANNed but never LOADed and never officially OFFLOADed " +
      "are simply missing. This week, 47 bags are unaccounted for across three terminals. " +
      "The investigation points to one handler who appears at the scene of every disappearance.",
    investigation:
      "Count SCAN, LOAD, and OFFLOAD events per handler to find whose LOADs are suspiciously low relative to SCANs. " +
      "Then look at OFFLOAD events specifically — a high OFFLOAD rate with no matching LOAD is the smoking gun. " +
      "Pull all events for the suspect handler sorted by time to see the pattern.",
    tasks: [
      {
        id: "t1",
        question: "How many SCAN, LOAD, and OFFLOAD events does each handler have?",
        solution: "fetch logs | summarize count(), by:{handler, action} | sort handler asc",
        sampleData: airportData,
      },
      {
        id: "t2",
        question: "Which handler has the most OFFLOAD events? Show OFFLOAD counts per handler, highest first.",
        solution: 'fetch logs | filter action == "OFFLOAD" | summarize offloads = count(), by:{handler} | sort offloads desc',
        sampleData: airportData,
      },
      {
        id: "t3",
        question: "Show all events for the suspect handler in chronological order.",
        solution: 'fetch logs | filter handler == "Torres" | sort timestamp asc',
        sampleData: airportData,
      },
    ],
    mcq: {
      question: "Which baggage handler is responsible for the disappearing bags?",
      options: ["Mwangi", "Dubois", "Kovalenko", "Torres"],
      correctAnswer: "Torres",
      explanation:
        "Torres has by far the highest OFFLOAD count while his LOAD count is disproportionately low. " +
        "He scans bags at check-in then offloads them citing 'oversized_check' — but the bags never reappear on any manifest. " +
        "Other handlers show SCAN and LOAD counts that are roughly equal.",
    },
  },

  {
    id: "hunt-007",
    title: "The Refund Ring",
    emoji: "📦",
    difficulty: "Advanced",
    story:
      "QuickShip's warehouse system has been logging a steady stream of returns — RECEIVE, INSPECT, and sometimes REFUND events. " +
      "Finance spotted that refund totals in the EAST warehouse have exceeded return receipts by $12,000 this quarter. " +
      "Someone is issuing refunds for returns that were never actually received, and routing the money to a small cluster of accounts. " +
      "The evidence is buried in hundreds of legitimate returns.",
    investigation:
      "Summarize the total refund amounts per worker to find who is issuing the most money. " +
      "Then look at the customer IDs receiving those refunds — a legitimate refund operation will show many different customers. " +
      "Finally, filter to REFUND events for the top worker and count distinct customer_id values to confirm the pattern.",
    tasks: [
      {
        id: "t1",
        question: "What is the total refund amount issued per worker? Sort largest total first.",
        solution: 'fetch logs | filter action == "REFUND" | summarize total_refunded = sum(refund_amount), by:{worker} | sort total_refunded desc',
        sampleData: refundData,
      },
      {
        id: "t2",
        question: "For the top worker by refund amount, how many distinct customer IDs received refunds?",
        solution: 'fetch logs | filter action == "REFUND" | filter worker == "Osei" | summarize customers = count(), by:{customer_id} | sort customers desc',
        sampleData: refundData,
      },
      {
        id: "t3",
        question: "Show the REFUND events where customer_id is one of the suspicious accounts (CUST-00001, CUST-00002, CUST-00003), with worker and amount.",
        solution: 'fetch logs | filter action == "REFUND" | filter customer_id == "CUST-00001" or customer_id == "CUST-00002" or customer_id == "CUST-00003" | fields timestamp, worker, customer_id, refund_amount | sort timestamp asc',
        sampleData: refundData,
      },
    ],
    mcq: {
      question: "Which warehouse worker is running the refund fraud scheme?",
      options: ["Petrov", "Diaz", "Nakamura", "Osei"],
      correctAnswer: "Osei",
      explanation:
        "Osei issued far more refund value than any other worker, and the vast majority of his refunds went to just three " +
        "customer IDs (CUST-00001, CUST-00002, CUST-00003) that appear on no other worker's records. " +
        "Legitimate refund patterns show a wide spread of customer IDs.",
    },
  },

  {
    id: "hunt-008",
    title: "The ATM Phantom",
    emoji: "🏧",
    difficulty: "Beginner",
    story:
      "First National Bank's ATM maintenance logs record every visit by a field technician — routine MAINTENANCE, cash REPLENISH, " +
      "compliance AUDIT, or the dreaded TAMPER_SUSPECTED flag when a seal is broken. " +
      "Over the past month, card fraud complaints have spiked at machines in three locations. " +
      "All of those machines recently received an unscheduled visit. " +
      "One technician's name keeps appearing next to TAMPER_SUSPECTED events.",
    investigation:
      "Start by counting TAMPER_SUSPECTED events per technician. " +
      "Then see which ATM IDs were flagged and what actions each technician performed on those machines. " +
      "Sort by technician to see who has the most suspicious activity.",
    tasks: [
      {
        id: "t1",
        question: "How many TAMPER_SUSPECTED events are there per technician?",
        solution: 'fetch logs | filter action == "TAMPER_SUSPECTED" | summarize tamper_count = count(), by:{technician} | sort tamper_count desc',
        sampleData: atmData,
      },
      {
        id: "t2",
        question: "Which ATMs (atm_id) have TAMPER_SUSPECTED events, and who was the technician?",
        solution: 'fetch logs | filter action == "TAMPER_SUSPECTED" | fields timestamp, atm_id, technician, location | sort timestamp asc',
        sampleData: atmData,
      },
      {
        id: "t3",
        question: "Show a breakdown of all action types per technician to see the full activity pattern.",
        solution: "fetch logs | summarize count(), by:{technician, action} | sort technician asc",
        sampleData: atmData,
      },
    ],
    mcq: {
      question: "Which ATM technician is suspected of installing skimming devices?",
      options: ["Ferreira", "Yamamoto", "Gruber", "Holt"],
      correctAnswer: "Holt",
      explanation:
        "Holt is the only technician with multiple TAMPER_SUSPECTED log entries. " +
        "The other technicians show only MAINTENANCE, REPLENISH, and AUDIT events. " +
        "Holt's visits to affected machines directly preceded the fraud complaints.",
    },
  },

  {
    id: "hunt-009",
    title: "The Empty Minibar",
    emoji: "🍫",
    difficulty: "Intermediate",
    story:
      "Grand Vista Hotel's housekeeping system tracks minibar inventory through RESTOCK events (staff fills the bar), " +
      "GUEST_CONSUME events (item charged to the room), and VOID events (item removed without charging, e.g. damaged stock). " +
      "The revenue manager noticed that minibar income is 35% below forecast despite high occupancy. " +
      "A suspicious number of VOID entries are being logged instead of GUEST_CONSUME — and guests aren't being charged.",
    investigation:
      "Count RESTOCK, GUEST_CONSUME, and VOID events by staff member to find who is logging the most VOIDs. " +
      "Then compare each staff member's VOID count to their GUEST_CONSUME count — the ratio reveals who is consistently avoiding billing guests. " +
      "Finally, look at which floors and shifts the VOID events are concentrated on.",
    tasks: [
      {
        id: "t1",
        question: "How many RESTOCK, GUEST_CONSUME, and VOID events does each staff member have?",
        solution: "fetch logs | summarize count(), by:{staff_member, action} | sort staff_member asc",
        sampleData: minibarData,
      },
      {
        id: "t2",
        question: "Which staff member has the highest number of VOID events? Sort by void count descending.",
        solution: 'fetch logs | filter action == "VOID" | summarize voids = count(), by:{staff_member} | sort voids desc',
        sampleData: minibarData,
      },
      {
        id: "t3",
        question: "For VOID events only, what is the breakdown by floor and shift?",
        solution: 'fetch logs | filter action == "VOID" | summarize count(), by:{floor, shift} | sort count() desc',
        sampleData: minibarData,
      },
    ],
    mcq: {
      question: "Which hotel staff member is systematically voiding minibar items to avoid charging guests?",
      options: ["Adeyemi", "Brennan", "Svensson", "Kowalski"],
      correctAnswer: "Kowalski",
      explanation:
        "Kowalski has a VOID count many times higher than any other staff member, while his GUEST_CONSUME count is " +
        "comparatively low. The other staff members show a normal pattern of mostly RESTOCK and GUEST_CONSUME events with rare VOIDs.",
    },
  },

  {
    id: "hunt-010",
    title: "Stolen Kilowatts",
    emoji: "⚡",
    difficulty: "Advanced",
    story:
      "RegionPower's SCADA logging system records every meter reading submitted by substation operators — the actual reading in kWh, " +
      "the system-expected value based on load modeling, and an automated action flag (NORMAL, ADJUSTED, or TAMPER_FLAG). " +
      "ADJUSTED means the reading was more than 20% below expected; TAMPER_FLAG means it exceeded 40% deviation. " +
      "An energy theft ring is suspected: someone is systematically under-reporting meter readings to hide consumption. " +
      "The cumulative gap across flagged entries represents an estimated 180,000 kWh of stolen power.",
    investigation:
      "Count ADJUSTED and TAMPER_FLAG events per operator — the culprit will dominate both categories. " +
      "Then calculate the total discrepancy (expected_kwh minus reading_kwh) per operator for flagged entries to quantify the theft. " +
      "Finally, filter to TAMPER_FLAG entries for the top operator and list the affected meters and substations.",
    tasks: [
      {
        id: "t1",
        question: "How many ADJUSTED and TAMPER_FLAG events does each operator have? Show both counts side by side.",
        solution: 'fetch logs | summarize adjusted = countIf(action == "ADJUSTED"), tamper = countIf(action == "TAMPER_FLAG"), by:{operator} | sort tamper desc',
        sampleData: gridData,
      },
      {
        id: "t2",
        question: "For flagged entries (action != NORMAL), what is the total kWh discrepancy per operator?",
        solution: 'fetch logs | filter action != "NORMAL" | summarize total_gap = sum(expected_kwh), total_read = sum(reading_kwh), by:{operator} | sort total_gap desc',
        sampleData: gridData,
      },
      {
        id: "t3",
        question: "Show all TAMPER_FLAG events for the suspect operator — list substation_id, meter_id, reading_kwh, and expected_kwh.",
        solution: 'fetch logs | filter action == "TAMPER_FLAG" | filter operator == "Chandra" | fields timestamp, substation_id, meter_id, reading_kwh, expected_kwh | sort timestamp asc',
        sampleData: gridData,
      },
    ],
    mcq: {
      question: "Which substation operator is falsifying meter readings to cover energy theft?",
      options: ["Muller", "Okonkwo", "Bauer", "Chandra"],
      correctAnswer: "Chandra",
      explanation:
        "Chandra has by far the most ADJUSTED and TAMPER_FLAG entries. His readings consistently fall 40–70% below " +
        "expected values, creating a large cumulative kWh gap. The other operators show normal deviations within 10% " +
        "of expected, with almost no ADJUSTED or TAMPER_FLAG events.",
    },
  },
];

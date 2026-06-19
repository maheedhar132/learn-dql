import type { DQLRecord } from "../types/dql";

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
    // eslint-disable-next-line noSecrets/no-secrets
    { encoded: "UklERExFUjogSSBhbSB0aGUgcXVlc3Rpb24gbWFya.", decoded: "RIDDLER: I am the question mark." },
    // eslint-disable-next-line noSecrets/no-secrets
    { encoded: "UklEREwzUjogQ2hhb3MgaXMgYSBsYWRkZXIu",      decoded: "RIDDL3R: Chaos is a ladder." },
    // eslint-disable-next-line noSecrets/no-secrets
    { encoded: "UklEREwzUjogTm8gcXVlc3Rpb24gdW5hc2tlZC4=",  decoded: "RIDDL3R: No question unasked." },
    // eslint-disable-next-line noSecrets/no-secrets
    { encoded: "UklEREwzUjogVGhlIG5ldHdvcmsgaXMgbWluZS4=",  decoded: "RIDDL3R: The network is mine." },
    // eslint-disable-next-line noSecrets/no-secrets
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

// ─── lh-11: The Midnight Cookie Thief — bakery POS ───────────────────────────

function generateMidnightCookieThiefLogs(): DQLRecord[] {
  const rng = seededRandom(1101);
  const base = new Date("2024-03-15T00:00:00Z");
  const cashiers = ["Alice", "Bob", "Carol", "Dave", "Eve"];
  const terminals = ["TERM-01", "TERM-02", "TERM-03"];
  const records: DQLRecord[] = [];
  let elapsed = 0;

  // Normal daytime traffic for all cashiers
  for (let i = 0; i < 180; i++) {
    elapsed += randInt(rng, 60, 600);
    const cashier = randItem(rng, cashiers);
    const action = i % 8 === 0 ? "RETURN" : (i % 12 === 0 ? "VOID" : "SALE");
    const amount = randInt(rng, 5, 120);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: action === "SALE" ? "INFO" : "WARN",
      cashier_id: cashier,
      action,
      amount,
      terminal_id: randItem(rng, terminals),
      content: `cashier=${cashier} action=${action} amount=${amount}`,
    });
  }

  // Dave processes 14 midnight RETURN actions (00:00–05:00) spread over 14 days
  for (let i = 0; i < 14; i++) {
    const hourOffset = randInt(rng, 0, 4) * 3600 + randInt(rng, 0, 3599);
    const dayOffset = i * 86400;
    const amount = randInt(rng, 15, 95);
    records.push({
      timestamp: ts(base, dayOffset + hourOffset),
      loglevel: "WARN",
      cashier_id: "Dave",
      action: "RETURN",
      amount,
      terminal_id: "TERM-02",
      content: `cashier=Dave action=RETURN amount=${amount} terminal=TERM-02`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-12: The Silent Reboot — production server reboots ────────────────────

function generateSilentRebootLogs(): DQLRecord[] {
  const rng = seededRandom(1102);
  const base = new Date("2024-04-10T00:00:00Z");
  const hosts = ["server-01", "server-02", "server-03", "server-04", "server-05", "server-06"];
  const normalEvents = ["HEARTBEAT", "MEMORY_WARNING"];
  const records: DQLRecord[] = [];
  let elapsed = 0;

  // Normal heartbeats for all servers
  for (let i = 0; i < 150; i++) {
    elapsed += randInt(rng, 30, 300);
    const host = randItem(rng, hosts);
    const event = randItem(rng, normalEvents);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      host,
      event,
      uptime_seconds: randInt(rng, 3600, 86400),
      content: `host=${host} event=${event}`,
    });
  }

  // server-04: 9 SHUTDOWN + BOOT cycles, preceded by DISK_ERROR
  for (let i = 0; i < 9; i++) {
    const baseOffset = 1000 + i * 9000;
    records.push({
      timestamp: ts(base, baseOffset),
      loglevel: "ERROR",
      host: "server-04",
      event: "DISK_ERROR",
      uptime_seconds: randInt(rng, 1200, 7200),
      content: "host=server-04 event=DISK_ERROR message=read_error_sector_42",
    });
    records.push({
      timestamp: ts(base, baseOffset + 30),
      loglevel: "ERROR",
      host: "server-04",
      event: "SHUTDOWN",
      uptime_seconds: 0,
      content: "host=server-04 event=SHUTDOWN reason=kernel_panic",
    });
    records.push({
      timestamp: ts(base, baseOffset + 90),
      loglevel: "INFO",
      host: "server-04",
      event: "BOOT",
      uptime_seconds: 0,
      content: "host=server-04 event=BOOT",
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-13: The Phantom Approver — self-approving PRs ────────────────────────

function generatePhantomApproverLogs(): DQLRecord[] {
  const rng = seededRandom(1103);
  const base = new Date("2024-05-01T08:00:00Z");
  const devs = ["alice", "bob", "charlie", "diana", "mallory"];
  const repos = ["backend-api", "frontend-app", "infra-config", "data-pipeline", "auth-service"];
  const actions = ["OPENED", "APPROVED", "MERGED", "REJECTED"];
  const records: DQLRecord[] = [];
  let elapsed = 0;
  let prSeq = 1;

  // Normal PR flow: author != reviewer
  for (let i = 0; i < 120; i++) {
    elapsed += randInt(rng, 120, 1800);
    const author = randItem(rng, devs.filter(d => d !== "mallory"));
    const reviewer = devs.find(d => d !== author) ?? devs[0];
    const pr_id = `PR-${String(prSeq++).padStart(4, "0")}`;
    const repo = randItem(rng, repos);
    const action = randItem(rng, actions);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      author,
      reviewer,
      pr_id,
      repo,
      action,
      content: `pr=${pr_id} author=${author} reviewer=${reviewer} action=${action} repo=${repo}`,
    });
  }

  // mallory self-approves and self-merges 16 PRs
  for (let i = 0; i < 16; i++) {
    elapsed += randInt(rng, 60, 600);
    const pr_id = `PR-${String(prSeq++).padStart(4, "0")}`;
    const repo = randItem(rng, repos);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "WARN",
      author: "mallory",
      reviewer: "mallory",
      pr_id,
      repo,
      action: "APPROVED",
      content: `pr=${pr_id} author=mallory reviewer=mallory action=APPROVED repo=${repo}`,
    });
    elapsed += randInt(rng, 30, 120);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "WARN",
      author: "mallory",
      reviewer: "mallory",
      pr_id,
      repo,
      action: "MERGED",
      content: `pr=${pr_id} author=mallory reviewer=mallory action=MERGED repo=${repo}`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-14: The Invisible Upgrade — hotel front desk unauthorized upgrades ────

function generateInvisibleUpgradeLogs(): DQLRecord[] {
  const rng = seededRandom(1104);
  const base = new Date("2024-06-01T06:00:00Z");
  const agents = ["chen", "obi", "rivera", "smith", "tanaka"];
  const roomClasses = ["STANDARD", "DELUXE", "SUITE"];
  const upgradedTos = ["DELUXE", "SUITE"];
  const records: DQLRecord[] = [];
  let elapsed = 0;
  let guestSeq = 1;

  // Normal check-ins for all agents with occasional legitimate upgrades
  for (let i = 0; i < 170; i++) {
    elapsed += randInt(rng, 120, 900);
    const agent_id = randItem(rng, agents.filter(a => a !== "rivera"));
    const guest_id = `GUEST-${String(guestSeq++).padStart(5, "0")}`;
    const room_class = randItem(rng, roomClasses);
    const upgrade_flag = rng() < 0.04;
    const upgraded_to = upgrade_flag ? randItem(rng, upgradedTos) : null;
    const nightly_rate = room_class === "SUITE" ? randInt(rng, 350, 500) :
                         room_class === "DELUXE" ? randInt(rng, 200, 350) :
                         randInt(rng, 100, 200);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      agent_id,
      guest_id,
      room_class,
      upgraded_to,
      upgrade_flag,
      nightly_rate,
      content: `agent=${agent_id} guest=${guest_id} room=${room_class} upgrade=${upgrade_flag}`,
    });
  }

  // rivera gives 22 unauthorized upgrades
  for (let i = 0; i < 22; i++) {
    elapsed += randInt(rng, 60, 600);
    const guest_id = `GUEST-${String(guestSeq++).padStart(5, "0")}`;
    const upgraded_to = randItem(rng, upgradedTos);
    const nightly_rate = upgraded_to === "SUITE" ? randInt(rng, 350, 500) : randInt(rng, 200, 350);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "WARN",
      agent_id: "rivera",
      guest_id,
      room_class: "STANDARD",
      upgraded_to,
      upgrade_flag: true,
      nightly_rate,
      content: `agent=rivera guest=${guest_id} room=STANDARD upgraded_to=${upgraded_to} upgrade_flag=true`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-15: The Ghost Session — impossible session durations ──────────────────

function generateGhostSessionLogs(): DQLRecord[] {
  const rng = seededRandom(1105);
  const base = new Date("2024-07-01T00:00:00Z");
  const normalUsers = ["alice_w", "bob_c", "carol_d", "eve_m"];
  const sessionEvents = ["LOGIN", "ACTIVITY", "SESSION_EXPIRED"];
  const ips = Array.from({ length: 20 }, (_, i) => `192.168.${Math.floor(i / 10) + 1}.${(i % 10) + 10}`);
  const records: DQLRecord[] = [];
  let elapsed = 0;
  let sessionSeq = 1;

  // Normal users: sessions under 480 min
  for (let i = 0; i < 130; i++) {
    elapsed += randInt(rng, 60, 1800);
    const user_id = randItem(rng, normalUsers);
    const session_id = `SES-${String(sessionSeq++).padStart(6, "0")}`;
    const event = randItem(rng, sessionEvents);
    const duration_minutes = (event === "SESSION_EXPIRED") ? randInt(rng, 5, 480) : null;
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      user_id,
      session_id,
      event,
      duration_minutes,
      ip_address: randItem(rng, ips),
      content: `user=${user_id} session=${session_id} event=${event}`,
    });
  }

  // phantom_user: 10 LOGOUT events with duration > 2000 minutes
  for (let i = 0; i < 10; i++) {
    elapsed += randInt(rng, 300, 3600);
    const session_id = `SES-${String(sessionSeq++).padStart(6, "0")}`;
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      user_id: "phantom_user",
      session_id,
      event: "LOGIN",
      duration_minutes: null,
      ip_address: "10.99.0.1",
      content: `user=phantom_user session=${session_id} event=LOGIN`,
    });
    elapsed += randInt(rng, 10, 60);
    const duration_minutes = randInt(rng, 2160, 4320);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "WARN",
      user_id: "phantom_user",
      session_id,
      event: "LOGOUT",
      duration_minutes,
      ip_address: "10.99.0.1",
      content: `user=phantom_user session=${session_id} event=LOGOUT duration_minutes=${duration_minutes}`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-16: The Slow Checkout — e-commerce latency investigation ──────────────

function generateSlowCheckoutLogs(): DQLRecord[] {
  const rng = seededRandom(1106);
  const base = new Date("2024-08-05T09:00:00Z");
  const services = ["payment-svc", "cart-svc", "inventory-svc", "auth-svc", "shipping-svc"];
  const endpointMap: Record<string, string[]> = {
    "payment-svc": ["/charge", "/refund", "/validate"],
    "cart-svc": ["/add", "/remove", "/checkout"],
    "inventory-svc": ["/check", "/reserve", "/release"],
    "auth-svc": ["/login", "/verify", "/refresh"],
    "shipping-svc": ["/estimate", "/book", "/track"],
  };
  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < 220; i++) {
    elapsed += randInt(rng, 5, 120);
    const service = randItem(rng, services);
    const endpoint = randItem(rng, endpointMap[service]);
    const isPayment = service === "payment-svc";
    const duration_ms = isPayment ? randInt(rng, 2000, 6000) : randInt(rng, 20, 500);
    const status = isPayment && rng() < 0.3 ? "ERROR" : (rng() < 0.05 ? "ERROR" : "OK");
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: status === "ERROR" ? "ERROR" : "INFO",
      service,
      endpoint,
      duration_ms,
      status,
      content: `service=${service} endpoint=${endpoint} duration_ms=${duration_ms} status=${status}`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-17: The Log Flood — one service emitting 10x more logs ───────────────

function generateLogFloodLogs(): DQLRecord[] {
  const rng = seededRandom(1107);
  const base = new Date("2024-09-12T00:00:00Z");
  const normalServices = ["api-gateway", "user-service", "order-service", "notification-svc", "search-svc", "auth-svc", "cache-svc"];
  const records: DQLRecord[] = [];
  let elapsed = 0;

  // Normal services: ~10-15 records each
  for (const svc of normalServices) {
    const count = randInt(rng, 10, 16);
    for (let i = 0; i < count; i++) {
      elapsed += randInt(rng, 60, 600);
      const loglevel = randItem(rng, ["INFO", "INFO", "INFO", "WARN", "ERROR"]);
      const log_bytes = randInt(rng, 100, 800);
      records.push({
        timestamp: ts(base, elapsed),
        loglevel,
        service: svc,
        log_bytes,
        content: `service=${svc} level=${loglevel} msg=routine_operation`,
      });
    }
  }

  // data-exporter: 185 records, mostly DEBUG, high log_bytes
  for (let i = 0; i < 185; i++) {
    elapsed += randInt(rng, 2, 30);
    const loglevel = rng() < 0.75 ? "DEBUG" : randItem(rng, ["INFO", "WARN"]);
    const log_bytes = randInt(rng, 800, 8000);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel,
      service: "data-exporter",
      log_bytes,
      content: `service=data-exporter level=${loglevel} msg=export_batch bytes=${log_bytes}`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-18: The API Key Leak — JSON content with leaked key abuse ─────────────

function generateApiKeyLeakLogs(): DQLRecord[] {
  const rng = seededRandom(1108);
  const base = new Date("2024-10-03T12:00:00Z");
  const normalKeys = ["sk-prod-aabb1", "sk-prod-ccdd2", "sk-prod-eeff3", "sk-prod-gghh4", "sk-prod-iijj5"];
  const leakedKey = "sk-prod-leak-9x7k";
  const endpoints = ["/v1/query", "/v1/ingest", "/v1/export", "/v1/metrics"];
  const internalIps: string[] = [];
  for (let i = 0; i < 5; i++) {
    internalIps.push(`10.0.${i}.${randInt(rng, 10, 50)}`);
  }
  const externalIps: string[] = [];
  for (let i = 0; i < 20; i++) {
    externalIps.push(`${randInt(rng, 20, 200)}.${randInt(rng, 1, 254)}.${randInt(rng, 1, 254)}.${randInt(rng, 1, 254)}`);
  }
  const records: DQLRecord[] = [];
  let elapsed = 0;

  // Normal key usage from internal IPs
  for (let i = 0; i < 140; i++) {
    elapsed += randInt(rng, 10, 300);
    const api_key = randItem(rng, normalKeys);
    const client_ip = randItem(rng, internalIps);
    const endpoint = randItem(rng, endpoints);
    const status_code = rng() < 0.05 ? 401 : 200;
    const bytes = randInt(rng, 200, 5000);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: status_code >= 400 ? "WARN" : "INFO",
      host: "api-gateway-01",
      content: JSON.stringify({ api_key, client_ip, endpoint, status_code, bytes }),
    });
  }

  // Leaked key used from 10 different external IPs
  const abusiveIps = externalIps.slice(0, 10);
  for (let i = 0; i < 40; i++) {
    elapsed += randInt(rng, 5, 120);
    const client_ip = randItem(rng, abusiveIps);
    const endpoint = randItem(rng, endpoints);
    const bytes = randInt(rng, 1000, 50000);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "WARN",
      host: "api-gateway-01",
      content: JSON.stringify({ api_key: leakedKey, client_ip, endpoint, status_code: 200, bytes }),
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-19: The Exception Trace — span exception analysis ────────────────────

function generateExceptionTraceLogs(): DQLRecord[] {
  const rng = seededRandom(1109);
  const base = new Date("2024-11-08T10:00:00Z");
  const serviceSpans: Array<[string, string[]]> = [
    ["api-gateway", ["handle_request", "auth_check", "rate_limit"]],
    ["order-service", ["create_order", "validate_cart", "apply_coupon"]],
    ["payment-service", ["charge_card", "tokenize", "notify_bank"]],
    ["inventory-service", ["check_stock", "reserve_item", "decrement"]],
    ["user-service", ["get_profile", "update_session", "log_event"]],
  ];
  const exceptionTypes = ["NullPointerException", "TimeoutException", "DatabaseException", "OutOfMemoryError"];
  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (const [svcName, spans] of serviceSpans) {
    const count = svcName === "payment-service" ? 70 : randInt(rng, 15, 25);
    for (let i = 0; i < count; i++) {
      elapsed += randInt(rng, 5, 120);
      const hasException = svcName === "payment-service" ? rng() < 0.75 : rng() < 0.1;
      const exType = hasException
        ? (svcName === "payment-service" ? "OutOfMemoryError" : randItem(rng, exceptionTypes))
        : null;
      const rec: DQLRecord = {
        timestamp: ts(base, elapsed),
        loglevel: hasException ? "ERROR" : "INFO",
        "service.name": svcName,
        "span.name": randItem(rng, spans),
        duration_ms: randInt(rng, 10, 2000),
        "status.code": hasException ? "ERROR" : "OK",
        exception_count: hasException ? randInt(rng, 1, 3) : 0,
        exception_type: exType,
        content: hasException
          ? `service=${svcName} exception=${exType}`
          : `service=${svcName} status=OK`,
      };
      records.push(rec);
    }
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-20: The Double-Spend — duplicate completed transactions ───────────────

function generateDoubleSpendLogs(): DQLRecord[] {
  const rng = seededRandom(1110);
  const base = new Date("2024-12-01T08:00:00Z");
  const customers = ["cust-0001", "cust-0042", "cust-0077", "cust-0099", "cust-0123"];
  const merchants = ["merch-A", "merch-B", "merch-C"];
  const methods = ["VISA", "MASTERCARD", "AMEX", "PAYPAL"];
  const statuses = ["PENDING", "COMPLETED", "FAILED"];
  const records: DQLRecord[] = [];
  let elapsed = 0;
  let txnSeq = 1;

  // Normal single transactions
  for (let i = 0; i < 170; i++) {
    elapsed += randInt(rng, 30, 600);
    const customer_id = randItem(rng, customers);
    const transaction_id = `TXN-${String(txnSeq++).padStart(7, "0")}`;
    const amount = randInt(rng, 10, 500);
    const status = randItem(rng, statuses);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: status === "FAILED" ? "ERROR" : "INFO",
      transaction_id,
      customer_id,
      merchant_id: randItem(rng, merchants),
      amount,
      status,
      payment_method: randItem(rng, methods),
      content: `txn=${transaction_id} customer=${customer_id} amount=${amount} status=${status}`,
    });
  }

  // 15 duplicate COMPLETED transactions for cust-0042 (9) and cust-0077 (6)
  for (let i = 0; i < 15; i++) {
    elapsed += randInt(rng, 10, 200);
    const customer_id = i < 9 ? "cust-0042" : "cust-0077";
    const transaction_id = i === 0 ? "TXN-0042001" : `TXN-DUP-${String(i).padStart(4, "0")}`;
    const amount = randInt(rng, 50, 300);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      transaction_id,
      customer_id,
      merchant_id: "merch-A",
      amount,
      status: "COMPLETED",
      payment_method: "VISA",
      content: `txn=${transaction_id} customer=${customer_id} amount=${amount} status=COMPLETED`,
    });
    elapsed += randInt(rng, 1, 10);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "WARN",
      transaction_id,
      customer_id,
      merchant_id: "merch-A",
      amount,
      status: "COMPLETED",
      payment_method: "VISA",
      content: `txn=${transaction_id} customer=${customer_id} amount=${amount} status=COMPLETED DUPLICATE`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-21: The Missing Heartbeat — 4-hour service outage ────────────────────

function generateMissingHeartbeatLogs(): DQLRecord[] {
  const rng = seededRandom(1111);
  const base = new Date("2024-09-20T00:00:00Z");
  const services = ["api-gateway", "user-service", "order-service", "inventory-api", "payment-svc", "notification-svc"];
  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < 220; i++) {
    elapsed += randInt(rng, 60, 360);
    const service = randItem(rng, services);
    const currentSec = elapsed % 86400;
    // inventory-api has no heartbeat between 02:00-06:00 (7200-21600 seconds from midnight)
    if (service === "inventory-api" && currentSec >= 7200 && currentSec < 21600) {
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: "ERROR",
        service: "inventory-api",
        event: "ERROR",
        content: "inventory-api: connection refused during gap window",
      });
      continue;
    }
    const event = rng() < 0.92 ? "HEARTBEAT" : (rng() < 0.5 ? "ALERT" : "ERROR");
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: event === "HEARTBEAT" ? "INFO" : "WARN",
      service,
      event,
      content: `service=${service} event=${event}`,
    });
  }

  // Ensure inventory-api has heartbeats outside the gap
  for (let i = 0; i < 8; i++) {
    const safeSec = i < 4 ? randInt(rng, 100, 7000) : randInt(rng, 21700, 86000);
    records.push({
      timestamp: ts(base, safeSec),
      loglevel: "INFO",
      service: "inventory-api",
      event: "HEARTBEAT",
      content: "service=inventory-api event=HEARTBEAT",
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-22: The Config Drift — unauthorized config changes ───────────────────

function generateConfigDriftLogs(): DQLRecord[] {
  const rng = seededRandom(1112);
  const base = new Date("2024-10-20T00:00:00Z");
  const operators = ["admin_ann", "ops_omar", "bishop", "sysadmin_su", "devops_dev"];
  const actions = ["CONFIG_READ", "CONFIG_WRITE", "CONFIG_DELETE", "CONFIG_AUDIT"];
  const systems = ["prod-db-01", "prod-lb-01", "prod-k8s-cluster", "prod-fw-01", "prod-mq-01"];
  const changeTypes = ["network_policy", "resource_limit", "tls_cert", "user_permissions", "firewall_rule"];
  const records: DQLRecord[] = [];
  let elapsed = 0;

  // Normal operators: changes within maintenance window only
  for (let i = 0; i < 140; i++) {
    elapsed += randInt(rng, 120, 1800);
    const operator = randItem(rng, operators.filter(o => o !== "bishop"));
    const action = randItem(rng, actions);
    const system_id = randItem(rng, systems);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      operator,
      action,
      system_id,
      change_type: randItem(rng, changeTypes),
      approved: true,
      content: `operator=${operator} action=${action} system=${system_id} approved=true`,
    });
  }

  // bishop: 20 CONFIG_WRITE + 3 CONFIG_DELETE outside maintenance window (hour 14-22)
  for (let i = 0; i < 23; i++) {
    const hourOffset = (14 + randInt(rng, 0, 7)) * 3600 + randInt(rng, 0, 3599);
    const dayOffset = Math.floor(i / 2) * 86400;
    const system_id = randItem(rng, systems);
    const isDelete = i >= 20;
    records.push({
      timestamp: ts(base, dayOffset + hourOffset),
      loglevel: "ERROR",
      operator: "bishop",
      action: isDelete ? "CONFIG_DELETE" : "CONFIG_WRITE",
      system_id,
      change_type: randItem(rng, changeTypes),
      approved: false,
      content: `UNAUTHORIZED operator=bishop action=${isDelete ? "CONFIG_DELETE" : "CONFIG_WRITE"} system=${system_id} approved=false`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-23: The Stale Token — OAuth tokens never expiring ────────────────────

function generateStaleTokenLogs(): DQLRecord[] {
  const rng = seededRandom(1113);
  const base = new Date("2024-08-01T00:00:00Z");
  const normalUsers = ["user_alpha", "user_beta", "user_gamma", "user_delta"];
  const apps = ["mobile-app", "web-client", "ci-pipeline", "data-tool"];
  const records: DQLRecord[] = [];
  let elapsed = 0;
  let tokenSeq = 1;

  // Normal tokens: issued and expired within 1 hour
  for (let i = 0; i < 120; i++) {
    elapsed += randInt(rng, 60, 1800);
    const user_id = randItem(rng, normalUsers);
    const token_id = `tok-${String(tokenSeq++).padStart(6, "0")}`;
    const issued_at = ts(base, elapsed);
    const client_app = randItem(rng, apps);
    records.push({
      timestamp: issued_at,
      loglevel: "INFO",
      token_id,
      user_id,
      action: "TOKEN_ISSUED",
      client_app,
      issued_at,
      // eslint-disable-next-line noSecrets/no-secrets
      content: `token=${token_id} user=${user_id} action=TOKEN_ISSUED app=${client_app}`,
    });
    elapsed += randInt(rng, 600, 3600);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "INFO",
      token_id,
      user_id,
      action: "TOKEN_EXPIRED",
      client_app,
      issued_at,
      // eslint-disable-next-line noSecrets/no-secrets
      content: `token=${token_id} user=${user_id} action=TOKEN_EXPIRED`,
    });
  }

  // tok-eternal-999: issued at day 1, used every 6h for 72+ hours, never expired
  const eternalIssuedAt = ts(base, 3600);
  records.push({
    timestamp: eternalIssuedAt,
    loglevel: "INFO",
    token_id: "tok-eternal-999",
    user_id: "phantom_svc",
    action: "TOKEN_ISSUED",
    client_app: "data-tool",
    issued_at: eternalIssuedAt,
    // eslint-disable-next-line noSecrets/no-secrets
    content: "token=tok-eternal-999 user=phantom_svc action=TOKEN_ISSUED app=data-tool",
  });
  for (let i = 0; i < 14; i++) {
    const useOffset = 3600 + i * 6 * 3600;
    records.push({
      timestamp: ts(base, useOffset),
      loglevel: "WARN",
      token_id: "tok-eternal-999",
      user_id: "phantom_svc",
      action: "TOKEN_USED",
      client_app: "data-tool",
      issued_at: eternalIssuedAt,
      content: `token=tok-eternal-999 user=phantom_svc action=TOKEN_USED hours_active=${i * 6}`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-24: The Deploy Disaster — deployment causing error spike ──────────────

function generateDeployDisasterLogs(): DQLRecord[] {
  const rng = seededRandom(1114);
  const base = new Date("2024-11-15T10:00:00Z");
  const services = ["checkout-service", "cart-service", "user-service", "payment-service", "inventory-service"];
  const versions: Record<string, string> = {
    "checkout-service": "checkout-v2.1.0",
    "cart-service": "cart-v1.3.2",
    "user-service": "user-v4.0.1",
    "payment-service": "payment-v3.1.0",
    "inventory-service": "inventory-v2.0.5",
  };
  const records: DQLRecord[] = [];
  let elapsed = 0;

  // Normal low error rate before deployment
  for (let i = 0; i < 80; i++) {
    elapsed += randInt(rng, 30, 300);
    const service = randItem(rng, services);
    const isError = rng() < 0.03;
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: isError ? "ERROR" : "INFO",
      source: "logs",
      service,
      event_type: null,
      version: null,
      error_count: isError ? 1 : 0,
      content: `service=${service} level=${isError ? "ERROR" : "INFO"}`,
    });
  }

  // Deployment events at ~4 hours in
  for (const svc of services) {
    records.push({
      timestamp: ts(base, 14400),
      loglevel: "INFO",
      source: "events",
      service: svc,
      event_type: "DEPLOY_START",
      version: versions[svc],
      error_count: null,
      content: `DEPLOY_START service=${svc} version=${versions[svc]}`,
    });
    records.push({
      timestamp: ts(base, 14700),
      loglevel: "INFO",
      source: "events",
      service: svc,
      event_type: "DEPLOY_END",
      version: versions[svc],
      error_count: null,
      content: `DEPLOY_END service=${svc} version=${versions[svc]}`,
    });
  }

  // High error rate for checkout-service AFTER deployment
  for (let i = 0; i < 120; i++) {
    const offsetSec = 14800 + i * 60;
    const service = i % 5 === 0 ? randItem(rng, services.slice(1)) : "checkout-service";
    const isError = service === "checkout-service" ? rng() < 0.75 : rng() < 0.03;
    records.push({
      timestamp: ts(base, offsetSec),
      loglevel: isError ? "ERROR" : "INFO",
      source: "logs",
      service,
      event_type: null,
      version: null,
      error_count: isError ? 1 : 0,
      content: `service=${service} level=${isError ? "ERROR" : "INFO"}`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-25: The Noisy Neighbor — multi-tenant platform abuse ─────────────────

function generateNoisyNeighborLogs(): DQLRecord[] {
  const rng = seededRandom(1115);
  const base = new Date("2024-12-10T08:00:00Z");
  const tenants = [
    "tenant-alpha", "tenant-beta", "tenant-gamma", "tenant-delta", "tenant-epsilon",
    "tenant-zeta", "tenant-eta", "tenant-theta", "tenant-iota", "tenant-kappa",
  ];
  const requestTypes = ["READ", "WRITE", "BULK", "ADMIN"];
  const spanNames = ["api_call", "db_query", "cache_lookup", "background_job"];
  const records: DQLRecord[] = [];
  let elapsed = 0;

  // Normal tenants: 5-8 spans each
  for (const tenant of tenants.filter(t => t !== "tenant-alpha")) {
    for (let i = 0; i < randInt(rng, 5, 8); i++) {
      elapsed += randInt(rng, 30, 300);
      const rec: DQLRecord = {
        timestamp: ts(base, elapsed),
        loglevel: "INFO",
        "span.name": randItem(rng, spanNames),
        "service.name": "platform-api",
        tenant_id: tenant,
        duration_ms: randInt(rng, 50, 500),
        "status.code": rng() < 0.05 ? "ERROR" : "OK",
        request_type: randItem(rng, requestTypes.slice(0, 3)),
        content: `tenant=${tenant} request=${randItem(rng, requestTypes.slice(0, 3))}`,
      };
      records.push(rec);
    }
  }

  // tenant-alpha: 145 spans, mostly BULK, high duration
  for (let i = 0; i < 145; i++) {
    elapsed += randInt(rng, 5, 60);
    const requestType = rng() < 0.7 ? "BULK" : randItem(rng, requestTypes);
    const statusCode = rng() < 0.15 ? "ERROR" : "OK";
    const rec: DQLRecord = {
      timestamp: ts(base, elapsed),
      loglevel: statusCode === "ERROR" ? "ERROR" : "INFO",
      "span.name": randItem(rng, spanNames),
      "service.name": "platform-api",
      tenant_id: "tenant-alpha",
      duration_ms: randInt(rng, 800, 5000),
      "status.code": statusCode,
      request_type: requestType,
      content: `tenant=tenant-alpha request=${requestType}`,
    };
    records.push(rec);
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-26: The Exception Storm — span exception clustering ──────────────────

function generateExceptionStormLogs(): DQLRecord[] {
  const rng = seededRandom(1116);
  const base = new Date("2024-07-22T08:00:00Z");
  const serviceConfig: Array<[string, string[]]> = [
    ["order-processor", ["process_order", "allocate_stock", "compute_total"]],
    ["api-gateway", ["route_request", "auth_check", "rate_limit"]],
    ["user-service", ["get_user", "update_profile", "send_email"]],
    ["shipping-svc", ["book_shipment", "track_package", "cancel_order"]],
    ["notification-svc", ["send_sms", "send_push", "send_email_notif"]],
  ];
  const exceptionTypes = ["OutOfMemoryError", "NullPointerException", "TimeoutException", "DatabaseException"];
  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (const [svc, spans] of serviceConfig) {
    const total = svc === "order-processor" ? 80 : randInt(rng, 20, 35);
    for (let i = 0; i < total; i++) {
      elapsed += randInt(rng, 10, 180);
      const isOrderProc = svc === "order-processor";
      // order-processor exceptions cluster between 14:00-16:00 (21600 sec after 08:00 base)
      const adjustedElapsed = isOrderProc && i < 60 ? 21600 + (i * 120) + randInt(rng, 0, 60) : elapsed;
      const hasException = isOrderProc ? i < 65 : rng() < 0.08;
      const exType = hasException
        ? (isOrderProc ? "OutOfMemoryError" : randItem(rng, exceptionTypes))
        : null;
      const rec: DQLRecord = {
        timestamp: ts(base, adjustedElapsed),
        loglevel: hasException ? "ERROR" : "INFO",
        "service.name": svc,
        "span.name": randItem(rng, spans),
        duration_ms: randInt(rng, 10, 3000),
        "status.code": hasException ? "ERROR" : "OK",
        exception_type: exType,
        exception_message: exType ? `${exType}: heap space exhausted` : null,
        span_event_count: hasException ? randInt(rng, 1, 3) : 0,
        content: `service=${svc} exception=${exType ?? "none"}`,
      };
      records.push(rec);
    }
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-27: The Cascade Failure — trace-based root cause analysis ─────────────

function generateCascadeFailureLogs(): DQLRecord[] {
  const rng = seededRandom(1117);
  const base = new Date("2024-06-18T14:00:00Z");
  const traceIds = Array.from({ length: 30 }, (_, i) => `trace-${String(i + 1).padStart(5, "0")}`);
  const downstreamServices = ["order-service", "user-service", "payment-service", "cart-service", "api-gateway"];
  const spanNames = ["handle_request", "process_order", "charge_payment", "get_user", "route_call"];
  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (const traceId of traceIds) {
    elapsed += randInt(rng, 10, 120);
    const rootFails = rng() < 0.8;
    const rootStatus = rootFails ? "ERROR" : "OK";
    const rec: DQLRecord = {
      timestamp: ts(base, elapsed),
      loglevel: rootFails ? "ERROR" : "INFO",
      trace_id: traceId,
      "service.name": "db-connection-pool",
      "span.name": "get_connection",
      duration_ms: rootFails ? randInt(rng, 5000, 10000) : randInt(rng, 5, 50),
      "status.code": rootStatus,
      error_message: rootFails ? "connection refused: max pool size exceeded" : null,
      parent_service: null,
      hop_count: 0,
      content: `trace=${traceId} service=db-connection-pool hop=0 status=${rootStatus}`,
    };
    records.push(rec);

    const numHops = randInt(rng, 1, 4);
    for (let h = 1; h <= numHops; h++) {
      elapsed += randInt(rng, 1, 20);
      const downSvc = randItem(rng, downstreamServices);
      const childStatus = rootFails ? "ERROR" : "OK";
      const childRec: DQLRecord = {
        timestamp: ts(base, elapsed),
        loglevel: childStatus === "ERROR" ? "ERROR" : "INFO",
        trace_id: traceId,
        "service.name": downSvc,
        "span.name": randItem(rng, spanNames),
        duration_ms: rootFails ? randInt(rng, 100, 3000) : randInt(rng, 10, 500),
        "status.code": childStatus,
        error_message: rootFails ? "upstream dependency failed" : null,
        parent_service: h === 1 ? "db-connection-pool" : downstreamServices[h - 2],
        hop_count: h,
        content: `trace=${traceId} service=${downSvc} hop=${h} status=${childStatus}`,
      };
      records.push(childRec);
    }
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-28: The Insider Threat — data exfiltration by department ──────────────

function generateInsiderThreatLogs(): DQLRecord[] {
  const rng = seededRandom(1118);
  const base = new Date("2024-05-12T07:00:00Z");
  const staff: Array<{ user_id: string; department: string }> = [
    { user_id: "johnson_hr", department: "HR" },
    { user_id: "smith_eng", department: "Engineering" },
    { user_id: "morrison", department: "Finance" },
    { user_id: "davis_fin", department: "Finance" },
    { user_id: "wilson_ops", department: "Operations" },
    { user_id: "taylor_it", department: "IT" },
    { user_id: "brown_hr", department: "HR" },
    { user_id: "jones_eng", department: "Engineering" },
  ];
  const actions = ["DATA_READ", "DATA_EXPORT", "ADMIN_ACCESS", "LOGIN", "LOGOUT"];
  const resources = ["customer_records", "financial_reports", "employee_data", "system_config"];
  const records: DQLRecord[] = [];
  let elapsed = 0;

  // Normal activity for all staff except morrison
  for (let i = 0; i < 155; i++) {
    elapsed += randInt(rng, 60, 1800);
    const staffMember = randItem(rng, staff.filter(s => s.user_id !== "morrison"));
    const action = randItem(rng, actions);
    const resource = randItem(rng, resources);
    const bytes_accessed = randInt(rng, 1000, 50000);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: action === "ADMIN_ACCESS" ? "WARN" : "INFO",
      user_id: staffMember.user_id,
      department: staffMember.department,
      action,
      resource,
      bytes_accessed,
      content: `user=${staffMember.user_id} dept=${staffMember.department} action=${action} resource=${resource}`,
    });
  }

  // morrison: 17 DATA_EXPORT on customer_records with huge bytes
  for (let i = 0; i < 17; i++) {
    elapsed += randInt(rng, 60, 600);
    const bytes_accessed = randInt(rng, 500000, 5000000);
    records.push({
      timestamp: ts(base, elapsed),
      loglevel: "WARN",
      user_id: "morrison",
      department: "Finance",
      action: "DATA_EXPORT",
      resource: "customer_records",
      bytes_accessed,
      content: `user=morrison dept=Finance action=DATA_EXPORT resource=customer_records bytes=${bytes_accessed}`,
    });
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-29: The Revenue Black Hole — funnel drop-off analysis ────────────────

function generateRevenueBlackHoleLogs(): DQLRecord[] {
  const rng = seededRandom(1119);
  const base = new Date("2024-10-28T00:00:00Z");
  const funnelSteps = [
    "com.shop.cart_created",
    "com.shop.checkout_started",
    "com.shop.payment_initiated",
    "com.shop.order_confirmed",
    "com.shop.fulfillment_started",
  ];
  const stepCounts = [120, 100, 80, 28, 25];
  const tiers = ["standard", "premium", "vip"];
  const methods = ["CARD", "PAYPAL", "CRYPTO", "BANK_TRANSFER"];
  const regions = ["US", "EU", "APAC", "LATAM"];
  const records: DQLRecord[] = [];
  let elapsed = 0;
  let orderSeq = 1;

  for (let stepIdx = 0; stepIdx < funnelSteps.length; stepIdx++) {
    const eventType = funnelSteps[stepIdx];
    const count = stepCounts[stepIdx];
    for (let i = 0; i < count; i++) {
      elapsed += randInt(rng, 10, 600);
      const order_id = `ORD-${String(orderSeq + i).padStart(6, "0")}`;
      const amount = randInt(rng, 20, 500);
      const rec: DQLRecord = {
        timestamp: ts(base, elapsed),
        loglevel: "INFO",
        "event.type": eventType,
        order_id,
        amount,
        customer_tier: randItem(rng, tiers),
        payment_method: randItem(rng, methods),
        region: randItem(rng, regions),
        content: `event=${eventType} order=${order_id} amount=${amount}`,
      };
      records.push(rec);
    }
    orderSeq += count;
  }

  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return records;
}

// ─── lh-30: The Phantom Metric — CPU trending toward saturation ───────────────

function generatePhantomMetricLogs(): DQLRecord[] {
  const rng = seededRandom(1120);
  const base = new Date("2024-11-25T00:00:00Z");
  const hosts = [
    "prod-app-01", "prod-db-02", "prod-k8s-03", "prod-cache-01",
    "prod-app-02", "prod-lb-01", "prod-mq-01", "prod-search-01",
  ];
  const baselineCpu: Record<string, number> = {
    "prod-app-01": 42, "prod-db-02": 45, "prod-k8s-03": 60, "prod-cache-01": 25,
    "prod-app-02": 38, "prod-lb-01": 35, "prod-mq-01": 55, "prod-search-01": 48,
  };
  const records: DQLRecord[] = [];
  let elapsed = 0;
  const samplesPerHost = Math.floor(300 / hosts.length);

  for (const host of hosts) {
    for (let i = 0; i < samplesPerHost; i++) {
      elapsed += randInt(rng, 60, 900);
      const isTrending = host === "prod-db-02";
      const baseCpu = baselineCpu[host];
      const cpu_pct = isTrending
        ? Math.min(85, baseCpu + i * (40 / samplesPerHost) + (rng() - 0.5) * 3)
        : baseCpu + (rng() - 0.5) * 10;
      const mem_pct = 20 + randInt(rng, 0, 50) + (rng() - 0.5) * 5;
      const disk_pct = 30 + randInt(rng, 0, 40);
      const load_avg = cpu_pct / 100 * randInt(rng, 2, 8);
      records.push({
        timestamp: ts(base, elapsed),
        loglevel: cpu_pct > 80 ? "WARN" : "INFO",
        host,
        cpu_pct: Math.round(cpu_pct * 10) / 10,
        mem_pct: Math.round(mem_pct * 10) / 10,
        disk_pct: Math.round(disk_pct),
        load_avg: Math.round(load_avg * 100) / 100,
        content: `host=${host} cpu=${Math.round(cpu_pct)}% mem=${Math.round(mem_pct)}% disk=${Math.round(disk_pct)}%`,
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
const coffeeData = generateCoffeeShopLogs();
const hospitalData = generateHospitalMedLogs();
const airportData = generateAirportBaggageLogs();
const refundData = generateRefundRingLogs();
const atmData = generateAtmSkimmerLogs();
const minibarData = generateHotelMinibarLogs();
const gridData = generatePowerGridLogs();
const cookieThiefData = generateMidnightCookieThiefLogs();
const silentRebootData = generateSilentRebootLogs();
const phantomApproverData = generatePhantomApproverLogs();
const invisibleUpgradeData = generateInvisibleUpgradeLogs();
const ghostSessionData = generateGhostSessionLogs();
const slowCheckoutData = generateSlowCheckoutLogs();
const logFloodData = generateLogFloodLogs();
const apiKeyLeakData = generateApiKeyLeakLogs();
const exceptionTraceData = generateExceptionTraceLogs();
const doubleSpendData = generateDoubleSpendLogs();
const missingHeartbeatData = generateMissingHeartbeatLogs();
const configDriftData = generateConfigDriftLogs();
const staleTokenData = generateStaleTokenLogs();
const deployDisasterData = generateDeployDisasterLogs();
const noisyNeighborData = generateNoisyNeighborLogs();
const exceptionStormData = generateExceptionStormLogs();
const cascadeFailureData = generateCascadeFailureLogs();
const insiderThreatData = generateInsiderThreatLogs();
const revenueBlackHoleData = generateRevenueBlackHoleLogs();
const phantomMetricData = generatePhantomMetricLogs();

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
        solution: "fetch logs | summarize count(), by:{http_status} | sort count desc",
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
    hints: [
      'Run: fetch logs | summarize count(), by:{action} — note how many ORDER, PAYMENT, and VOID events exist.',
      'Filter for VOIDs per barista: fetch logs | filter action == "VOID" | summarize voids = count(), by:{barista} | sort voids desc',
      'Compare ORDER vs VOID counts side-by-side: fetch logs | summarize orders = countIf(action == "ORDER"), voids = countIf(action == "VOID"), by:{barista}',
    ],
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
        solution: "fetch logs | filter authorized == false | summarize count(), by:{dispensed_by} | sort count desc",
        sampleData: hospitalData,
      },
      {
        id: "t2",
        question: "For unauthorized dispenses, which patient IDs appear and how often?",
        solution: "fetch logs | filter authorized == false | summarize count(), by:{patient_id} | sort count desc",
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
    hints: [
      'Run: fetch logs | filter authorized == false | summarize count(), by:{dispensed_by} | sort count desc — who has the most unauthorized dispenses?',
      'Check patient IDs in unauthorized events: fetch logs | filter authorized == false | summarize count(), by:{patient_id} — a small repeating set is a red flag.',
      'Quantify the diversion: fetch logs | filter authorized == false | summarize total_qty = sum(quantity), by:{dispensed_by} | sort total_qty desc',
    ],
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
    hints: [
      'Run: fetch logs | summarize count(), by:{handler, action} to see SCAN, LOAD, and OFFLOAD counts for every handler.',
      'Filter to OFFLOAD events: fetch logs | filter action == "OFFLOAD" | summarize offloads = count(), by:{handler} | sort offloads desc — who has the most?',
      'Pull all events for the handler with the highest OFFLOAD count, sorted by timestamp, to see the full sequence.',
    ],
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
    hints: [
      'Start with: fetch logs | filter action == "REFUND" | summarize total_refunded = sum(refund_amount), by:{worker} | sort total_refunded desc',
      'For the top worker by refund total, check how many distinct customer IDs received refunds — a low count means the money is going to a few accounts.',
      'Filter to REFUND events for the top worker and list customer_id values to find the repeating cluster.',
    ],
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
    hints: [
      'Start with: fetch logs | filter action == "TAMPER_SUSPECTED" | summarize tamper_count = count(), by:{technician} | sort tamper_count desc',
      'Check which ATM IDs and locations have TAMPER_SUSPECTED events: fetch logs | filter action == "TAMPER_SUSPECTED" | fields atm_id, technician, location',
      'See the full action breakdown per technician: fetch logs | summarize count(), by:{technician, action} | sort technician asc',
    ],
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
        solution: 'fetch logs | filter action == "VOID" | summarize count(), by:{floor, shift} | sort count desc',
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
    hints: [
      'Run: fetch logs | summarize count(), by:{staff_member, action} to compare RESTOCK, GUEST_CONSUME, and VOID counts per person.',
      'Filter to VOIDs only: fetch logs | filter action == "VOID" | summarize voids = count(), by:{staff_member} | sort voids desc',
      'Look at VOID distribution by floor and shift: fetch logs | filter action == "VOID" | summarize count(), by:{floor, shift} | sort count desc',
    ],
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
    hints: [
      'Count flagged events per operator: fetch logs | summarize adjusted = countIf(action == "ADJUSTED"), tamper = countIf(action == "TAMPER_FLAG"), by:{operator} | sort tamper desc',
      'Quantify the theft: fetch logs | filter action != "NORMAL" | summarize total_gap = sum(expected_kwh), total_read = sum(reading_kwh), by:{operator} | sort total_gap desc',
      'Drill into the top operator\'s TAMPER_FLAG entries: fetch logs | filter action == "TAMPER_FLAG" | filter operator == "<top_name>" | fields substation_id, meter_id, reading_kwh, expected_kwh',
    ],
  },

  // ── lh-11 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-11",
    title: "The Midnight Cookie Thief",
    emoji: "🍪",
    difficulty: "Beginner",
    story:
      "Sweetbread Bakery's POS system logs every SALE, RETURN, and VOID at the register. " +
      "The weekend cash reconciliation is $800 short and finance suspects fraudulent after-hours returns. " +
      "One cashier appears to be processing cash RETURN transactions long after the store closes. " +
      "Midnight returns let an employee pocket the cash refund without a real customer present.",
    investigation:
      "Start by counting RETURN events per cashier to find who has the most. " +
      "Then narrow to RETURN events between midnight and 6 AM to confirm the after-hours pattern. " +
      "Finally, sum the total refunded amount for the suspect to quantify the loss.",
    tasks: [
      {
        id: "t1",
        question: "Count RETURN events per cashier — who has the most?",
        solution: 'fetch logs | filter action == "RETURN" | summarize returns = count(), by:{cashier_id} | sort returns desc',
        sampleData: cookieThiefData,
      },
      {
        id: "t2",
        question: "Filter to RETURN events between midnight and 6 AM (hour 0–5). Which cashier has midnight returns?",
        solution: 'fetch logs | filter action == "RETURN" | fieldsAdd hour = toLong(substr(timestamp, 11, 2)) | filter hour >= 0 and hour < 6 | summarize midnight_returns = count(), by:{cashier_id} | sort midnight_returns desc',
        sampleData: cookieThiefData,
      },
      {
        id: "t3",
        question: "What is the total amount refunded by Dave across all RETURN transactions?",
        solution: 'fetch logs | filter action == "RETURN" | filter cashier_id == "Dave" | summarize total_refunded = sum(amount) | fields total_refunded',
        sampleData: cookieThiefData,
      },
    ],
    mcq: {
      question: "Which cashier is processing fraudulent midnight returns to pocket cash?",
      options: ["Alice", "Bob", "Carol", "Dave"],
      correctAnswer: "Dave",
      explanation:
        "Dave has 14 RETURN transactions, all processed between midnight and 5 AM — periods when no real customer " +
        "should be making returns. Other cashiers have zero or one after-hours RETURN event.",
    },
    hints: [
      "Count RETURN events per cashier to identify who stands out.",
      "Use substr(timestamp, 11, 2) to extract the hour and filter for hour < 6 to isolate midnight returns.",
      "Sum Dave's RETURN amounts to quantify the total fraudulent refunds.",
    ],
  },

  // ── lh-12 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-12",
    title: "The Silent Reboot",
    emoji: "🔄",
    difficulty: "Beginner",
    story:
      "A production cluster of six servers is supposed to run continuously. " +
      "The on-call engineer got woken up three nights running by mystery reboots, " +
      "but the automated alert only says 'unexpected restart detected'. " +
      "The server logs capture BOOT, SHUTDOWN, HEARTBEAT, DISK_ERROR, and MEMORY_WARNING events. " +
      "Find the server that's rebooting most often and understand why.",
    investigation:
      "Count SHUTDOWN events per host to find the reboot champion. " +
      "Then look at all event types for that host to see what precedes each SHUTDOWN. " +
      "Finally, look at the DISK_ERROR records to understand the root cause.",
    tasks: [
      {
        id: "t1",
        question: "Count SHUTDOWN events per host — which server reboots most often?",
        solution: 'fetch logs | filter event == "SHUTDOWN" | summarize reboots = count(), by:{host} | sort reboots desc',
        sampleData: silentRebootData,
      },
      {
        id: "t2",
        question: "For server-04, summarize all event types and their counts.",
        solution: 'fetch logs | filter host == "server-04" | summarize events = count(), by:{event} | sort events desc',
        sampleData: silentRebootData,
      },
      {
        id: "t3",
        question: "Show server-04 DISK_ERROR records in chronological order to understand the root cause.",
        solution: 'fetch logs | filter host == "server-04" | filter event == "DISK_ERROR" | fields timestamp, content | sort timestamp asc | limit 10',
        sampleData: silentRebootData,
      },
    ],
    mcq: {
      question: "Which server is causing the most unexpected reboots, and what is the likely root cause?",
      options: [
        "server-01, high CPU usage",
        "server-04, recurring disk errors",
        "server-03, memory exhaustion",
        "server-06, network timeouts",
      ],
      correctAnswer: "server-04, recurring disk errors",
      explanation:
        "server-04 has 9 SHUTDOWN events, each preceded by a DISK_ERROR. " +
        "The kernel panic triggered by read errors on sector 42 is causing the repeated reboots. " +
        "All other servers show only HEARTBEAT and MEMORY_WARNING events with no SHUTDOWNs.",
    },
    hints: [
      "Count SHUTDOWN events per host — the server with the most is your suspect.",
      "Filter to that host and summarize by event to see what event types surround the reboots.",
      "Look at DISK_ERROR records to find the root cause of each kernel panic.",
    ],
  },

  // ── lh-13 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-13",
    title: "The Phantom Approver",
    emoji: "👻",
    difficulty: "Beginner",
    story:
      "Your engineering org requires two-person review for all pull requests — no self-approvals. " +
      "The security team noticed that several PRs merged with no external reviewer in the author field. " +
      "The code review system logs OPENED, APPROVED, MERGED, and REJECTED events with both author and reviewer. " +
      "One developer is systematically bypassing the peer-review policy.",
    investigation:
      "Filter APPROVED events where author == reviewer — that's self-approval. " +
      "Summarize by author to find who does this most. " +
      "Then see which repos are affected and look at their MERGED records.",
    tasks: [
      {
        id: "t1",
        question: "Find APPROVED events where the author equals the reviewer — count by author.",
        solution: 'fetch logs | filter action == "APPROVED" | filter author == reviewer | summarize self_approvals = count(), by:{author} | sort self_approvals desc',
        sampleData: phantomApproverData,
      },
      {
        id: "t2",
        question: "For mallory's self-approvals, how many occurred per repo?",
        solution: 'fetch logs | filter author == "mallory" | filter action == "APPROVED" | summarize count(), by:{repo} | sort count() desc',
        sampleData: phantomApproverData,
      },
      {
        id: "t3",
        question: "Show mallory's self-approved MERGED records: timestamp, pr_id, and repo.",
        solution: 'fetch logs | filter author == "mallory" | filter reviewer == "mallory" | filter action == "MERGED" | fields timestamp, pr_id, repo | sort timestamp desc',
        sampleData: phantomApproverData,
      },
    ],
    mcq: {
      question: "Which developer violated the peer review policy by self-approving pull requests?",
      options: ["alice", "bob", "charlie", "mallory"],
      correctAnswer: "mallory",
      explanation:
        "mallory has 16 APPROVED events where author == reviewer == 'mallory'. " +
        "No other developer has any self-approvals — all other PRs show distinct author and reviewer values.",
    },
    hints: [
      "Filter APPROVED events where author == reviewer to detect self-approvals.",
      "Summarize by author — the developer with the most self-approvals is the culprit.",
      "Check their MERGED records to see how many self-approved PRs actually landed.",
    ],
  },

  // ── lh-14 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-14",
    title: "The Invisible Upgrade",
    emoji: "🏨",
    difficulty: "Beginner",
    story:
      "Grand Elm Hotel's front-desk system logs every check-in with the room class assigned, " +
      "whether an upgrade was applied (upgrade_flag), and the nightly rate charged. " +
      "Authorized upgrades are rare — only loyalty managers can grant them. " +
      "The revenue director flagged that suite and deluxe occupancy is up, but revenue is flat. " +
      "Someone is giving free upgrades and the guests are paying standard rates.",
    investigation:
      "Count records where upgrade_flag is true per agent to find who upgrades the most. " +
      "Then look at the distribution of upgraded_to room classes for the suspect. " +
      "Finally, sum the nightly rates for their upgrades to quantify the revenue at risk.",
    tasks: [
      {
        id: "t1",
        question: "Count free upgrades (upgrade_flag == true) per agent — who has the most?",
        solution: 'fetch logs | filter upgrade_flag == true | summarize free_upgrades = count(), by:{agent_id} | sort free_upgrades desc',
        sampleData: invisibleUpgradeData,
      },
      {
        id: "t2",
        question: "For agent rivera, what is the average nightly rate by upgraded_to room class?",
        solution: 'fetch logs | filter agent_id == "rivera" | summarize rate_avg = avg(nightly_rate), by:{upgraded_to} | sort rate_avg desc',
        sampleData: invisibleUpgradeData,
      },
      {
        id: "t3",
        question: "What is the total nightly revenue at risk from rivera's unauthorized upgrades?",
        solution: 'fetch logs | filter agent_id == "rivera" | filter upgrade_flag == true | summarize revenue_at_risk = sum(nightly_rate) | fields revenue_at_risk',
        sampleData: invisibleUpgradeData,
      },
    ],
    mcq: {
      question: "Which front desk agent is giving unauthorized room upgrades?",
      options: ["chen", "obi", "smith", "rivera"],
      correctAnswer: "rivera",
      explanation:
        "rivera has 22 records with upgrade_flag == true, far more than any other agent. " +
        "Other agents have at most 2–3 legitimate upgrades. All of rivera's upgrades are from STANDARD " +
        "to DELUXE or SUITE without authorization.",
    },
    hints: [
      "Count upgrade_flag == true per agent — the outlier has 10× more upgrades than colleagues.",
      "Filter to that agent and break down by upgraded_to to see which room classes they're gifting.",
      "Sum nightly_rate for their upgrades to calculate the total revenue impact.",
    ],
  },

  // ── lh-15 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-15",
    title: "The Ghost Session",
    emoji: "👤",
    difficulty: "Beginner",
    story:
      "The auth service enforces a maximum session lifetime of 8 hours (480 minutes). " +
      "Sessions should expire automatically after that. " +
      "But the security team found sessions still showing ACTIVITY events days after they were created. " +
      "Impossible session durations are a classic sign of a compromised persistent session token — " +
      "someone has found a way to keep a session alive indefinitely.",
    investigation:
      "Find LOGOUT events where duration_minutes > 480 — those are sessions that lived past the limit. " +
      "Count them by user_id to find who has the most. " +
      "Then look at the max and average duration for that user.",
    tasks: [
      {
        id: "t1",
        question: "Find LOGOUT events with duration_minutes > 480, count by user_id.",
        solution: 'fetch logs | filter event == "LOGOUT" | filter duration_minutes > 480 | summarize long_sessions = count(), by:{user_id} | sort long_sessions desc',
        sampleData: ghostSessionData,
      },
      {
        id: "t2",
        question: "For phantom_user, count all events by event type.",
        solution: 'fetch logs | filter user_id == "phantom_user" | summarize count(), by:{event}',
        sampleData: ghostSessionData,
      },
      {
        id: "t3",
        question: "For phantom_user LOGOUT events, what is the max and average duration_minutes?",
        solution: 'fetch logs | filter user_id == "phantom_user" | filter event == "LOGOUT" | summarize max_duration = max(duration_minutes), avg_duration = avg(duration_minutes) | fields max_duration, avg_duration',
        sampleData: ghostSessionData,
      },
    ],
    mcq: {
      question: "Which user has impossible session durations indicating a compromised persistent session?",
      options: ["alice_w", "bob_c", "carol_d", "phantom_user"],
      correctAnswer: "phantom_user",
      explanation:
        "phantom_user has LOGOUT events with duration_minutes ranging from 2160 to 4320 minutes (36–72 hours), " +
        "far exceeding the 480-minute limit. Normal users all show durations well under 480 minutes.",
    },
    hints: [
      "Filter LOGOUT events where duration_minutes > 480 — sessions past the 8-hour limit are suspicious.",
      "Count by user_id to find who has the most long-lived sessions.",
      "Check max and average duration for the suspect to see just how long these sessions ran.",
    ],
  },

  // ── lh-16 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-16",
    title: "The Slow Checkout",
    emoji: "🐢",
    difficulty: "Beginner",
    story:
      "Customer support is flooded with complaints: the checkout flow takes 5–10 seconds. " +
      "Five microservices participate in every checkout: payment-svc, cart-svc, inventory-svc, auth-svc, and shipping-svc. " +
      "Each request is logged with service, endpoint, duration_ms, and status. " +
      "Engineering needs to know exactly which service is the bottleneck and its 95th-percentile latency.",
    investigation:
      "Use percentile() to compute p95 latency per service — the outlier will stand out immediately. " +
      "Then drill into that service's endpoints to find which call is slowest. " +
      "Finally, list the individual slowest requests.",
    tasks: [
      {
        id: "t1",
        question: "Compute avg_ms and p95 latency per service, sorted by p95 descending.",
        solution: 'fetch logs | summarize avg_ms = avg(duration_ms), p95 = percentile(duration_ms, 95), by:{service} | sort p95 desc',
        sampleData: slowCheckoutData,
      },
      {
        id: "t2",
        question: "For payment-svc, count errors and total requests per endpoint.",
        solution: 'fetch logs | filter service == "payment-svc" | summarize errors = countIf(status == "ERROR"), total = count(), by:{endpoint} | sort errors desc',
        sampleData: slowCheckoutData,
      },
      {
        id: "t3",
        question: "Show the 10 slowest individual payment-svc requests (duration_ms > 3000).",
        solution: 'fetch logs | filter service == "payment-svc" | filter duration_ms > 3000 | fields timestamp, endpoint, duration_ms, status | sort duration_ms desc | limit 10',
        sampleData: slowCheckoutData,
      },
    ],
    mcq: {
      question: "Which service is causing checkout latency spikes above 4 seconds at the 95th percentile?",
      options: ["cart-svc", "inventory-svc", "payment-svc", "auth-svc"],
      correctAnswer: "payment-svc",
      explanation:
        "payment-svc has a p95 latency between 4000–6000ms, while all other services are under 500ms. " +
        "It also has a 30% error rate, far higher than the 5% background rate for other services.",
    },
    hints: [
      "Use percentile(duration_ms, 95) grouped by service — the outlier's p95 will be 10× higher.",
      "Drill into that service's endpoints to see which call accounts for most errors.",
      "Filter duration_ms > 3000 to see the worst individual requests.",
    ],
  },

  // ── lh-17 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-17",
    title: "The Log Flood",
    emoji: "🌊",
    difficulty: "Beginner",
    story:
      "Your log ingestion quota is 95% consumed and the month is only half over. " +
      "Eight services share the pipeline: api-gateway, user-service, order-service, notification-svc, " +
      "search-svc, auth-svc, cache-svc, and data-exporter. " +
      "One service is emitting an order-of-magnitude more records than all the others combined. " +
      "Find it, understand what log level is flooding the pipeline, and quantify the byte cost.",
    investigation:
      "Count total logs per service to find the outlier. " +
      "Then break down by service and loglevel to see if it's a debug-log flood. " +
      "Finally, sum and average log_bytes for the top offender.",
    tasks: [
      {
        id: "t1",
        question: "Count total log records per service — which one dominates?",
        solution: 'fetch logs | summarize total_logs = count(), by:{service} | sort total_logs desc',
        sampleData: logFloodData,
      },
      {
        id: "t2",
        question: "Break down log count by service and loglevel — show top 20 rows.",
        solution: 'fetch logs | summarize count(), by:{service, loglevel} | sort count() desc | limit 20',
        sampleData: logFloodData,
      },
      {
        id: "t3",
        question: "For data-exporter, compute total_bytes and avg_bytes ingested.",
        solution: 'fetch logs | filter service == "data-exporter" | summarize total_bytes = sum(log_bytes), avg_bytes = avg(log_bytes) | fields total_bytes, avg_bytes',
        sampleData: logFloodData,
      },
    ],
    mcq: {
      question: "Which service is responsible for the log volume flood?",
      options: ["api-gateway", "order-service", "cache-svc", "data-exporter"],
      correctAnswer: "data-exporter",
      explanation:
        "data-exporter emits 185 records while every other service emits 10–16. " +
        "75% of its records are DEBUG level with log_bytes 8–80× higher than normal services. " +
        "The DEBUG flood from a single service is consuming the majority of the quota.",
    },
    hints: [
      "Count logs per service — the ratio between top and second place will be obvious.",
      "Break down by service + loglevel to confirm it's a DEBUG-level flood.",
      "Sum log_bytes for the top service to show the finance impact.",
    ],
  },

  // ── lh-18 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-18",
    title: "The API Key Leak",
    emoji: "🔑",
    difficulty: "Intermediate",
    story:
      "The API gateway stores access logs as JSON strings in the content field — " +
      "each record encodes api_key, client_ip, endpoint, status_code, and bytes. " +
      "A developer accidentally committed a production API key to a public repo. " +
      "It was revoked two hours ago but not before being scraped by bots. " +
      "The security team needs to identify the leaked key and understand the blast radius.",
    investigation:
      "Parse the JSON content field to extract api_key and client_ip. " +
      "Count unique client IPs per key — a leaked key will be called from many different external IPs. " +
      "Then drill into the suspect key to see the source IPs and total bytes exfiltrated.",
    tasks: [
      {
        id: "t1",
        question: "Parse JSON content to extract api_key and client_ip. Count calls and unique IPs per api_key.",
        solution: 'fetch logs | parse content, "JSON:j" | fieldsAdd api_key = j[api_key], client_ip = j[client_ip] | summarize calls = count(), unique_ips = countDistinct(client_ip), by:{api_key} | sort unique_ips desc',
        sampleData: apiKeyLeakData,
      },
      {
        id: "t2",
        question: "For the leaked key sk-prod-leak-9x7k, count calls per client_ip.",
        solution: 'fetch logs | parse content, "JSON:j" | fieldsAdd api_key = j[api_key], client_ip = j[client_ip] | filter api_key == "sk-prod-leak-9x7k" | summarize count(), by:{client_ip} | sort count() desc',
        sampleData: apiKeyLeakData,
      },
      {
        id: "t3",
        question: "For the leaked key, sum total bytes transferred and count total requests.",
        solution: 'fetch logs | parse content, "JSON:j" | fieldsAdd api_key = j[api_key], bytes = toLong(j[bytes]) | filter api_key == "sk-prod-leak-9x7k" | summarize total_bytes = sum(bytes), requests = count() | fields total_bytes, requests',
        sampleData: apiKeyLeakData,
      },
    ],
    mcq: {
      question: "Which API key was leaked and is being called from multiple external IPs?",
      options: ["sk-prod-aabb1", "sk-prod-ccdd2", "sk-prod-leak-9x7k", "sk-prod-iijj5"],
      correctAnswer: "sk-prod-leak-9x7k",
      explanation:
        "sk-prod-leak-9x7k is called from 10 distinct external IPs (non-10.x.x.x addresses), " +
        "while all other keys are used from 1–2 internal IPs only. " +
        "The leaked key also generates significantly higher byte volumes per request.",
    },
    hints: [
      "Use parse content, \"JSON:j\" then fieldsAdd to extract api_key and client_ip from the JSON.",
      "Count countDistinct(client_ip) per api_key — the leaked key will have 10× more unique IPs.",
      "Filter to that key and sum bytes to quantify the data exposure.",
    ],
  },

  // ── lh-19 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-19",
    title: "The Exception Trace",
    emoji: "💥",
    difficulty: "Intermediate",
    story:
      "Five microservices are generating spans logged with exception details pre-extracted as flat fields: " +
      "exception_type and exception_count. " +
      "The on-call SRE is seeing OOM kill alerts for one service. " +
      "The exception data shows which type dominates and which service is the source. " +
      "In real Dynatrace, you'd use iAny() and expand/fieldsFlatten on span.events — " +
      "here the data is already flattened for you to practice the analysis.",
    investigation:
      "Filter exception_count > 0 to find spans that threw exceptions. " +
      "Group by exception_type to find the most frequent exception. " +
      "Then break down by service.name and exception_type to identify the culprit service.",
    tasks: [
      {
        id: "t1",
        question: "Count spans where exception_count > 0, grouped by exception_type.",
        solution: 'fetch spans | filter exception_count > 0 | summarize exceptions = count(), by:{exception_type} | sort exceptions desc',
        sampleData: exceptionTraceData,
      },
      {
        id: "t2",
        question: "Break down exception counts by service.name and exception_type — sort highest first.",
        solution: 'fetch spans | filter exception_count > 0 | summarize count(), by:{service.name, exception_type} | sort count() desc | limit 10',
        sampleData: exceptionTraceData,
      },
      {
        id: "t3",
        question: "Using real Dynatrace spans (with nested span.events), how would you expand and flatten exception events by service?",
        solution: 'fetch spans\n| filter iAny(span.events[][span_event.name] == "exception")\n| expand span.events\n| fieldsFlatten span.events, fields: {exception.type, exception.message}\n| summarize count(), by: {service.name, exception.type}\n| sort count() desc',
        sampleData: exceptionTraceData,
      },
    ],
    mcq: {
      question: "Which exception type appears most frequently, and in which service?",
      options: [
        "NullPointerException in api-gateway",
        "TimeoutException in order-service",
        "OutOfMemoryError in payment-service",
        "DatabaseException in inventory-service",
      ],
      correctAnswer: "OutOfMemoryError in payment-service",
      explanation:
        "payment-service has 70 spans with 75% exception rate, almost all OutOfMemoryError. " +
        "Other services have exception rates under 10% and mixed exception types.",
    },
    hints: [
      "Filter exception_count > 0 to isolate spans that threw exceptions.",
      "Group by exception_type to see which type dominates.",
      "Add service.name to the grouping to pinpoint the culprit service.",
    ],
  },

  // ── lh-20 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-20",
    title: "The Double-Spend",
    emoji: "💳",
    difficulty: "Intermediate",
    story:
      "A payment processor audit found that certain customers were charged twice for the same transaction. " +
      "The transaction log records every charge event with transaction_id, customer_id, amount, and status. " +
      "Legitimate COMPLETED transactions appear exactly once. " +
      "Duplicate COMPLETED entries for the same transaction_id indicate a double-charge bug (or fraud). " +
      "Find the duplicate transactions and the most-affected customers.",
    investigation:
      "Count COMPLETED charges per transaction_id — any transaction_id with count > 1 is a duplicate. " +
      "Then group by customer_id to find who was double-charged most often. " +
      "Finally, drill into a specific duplicated transaction to see the full record.",
    tasks: [
      {
        id: "t1",
        question: "Count COMPLETED charges per transaction_id — find those charged more than once.",
        solution: 'fetch logs | filter status == "COMPLETED" | summarize charge_count = count(), total = sum(amount), by:{transaction_id} | filter charge_count > 1 | sort charge_count desc',
        sampleData: doubleSpendData,
      },
      {
        id: "t2",
        question: "For customers with duplicate COMPLETED charges, how many double-charges does each customer have?",
        solution: 'fetch logs | filter status == "COMPLETED" | summarize charges = count(), by:{customer_id, transaction_id} | filter charges > 1 | summarize double_charged = count(), by:{customer_id} | sort double_charged desc',
        sampleData: doubleSpendData,
      },
      {
        id: "t3",
        question: "Show all records for transaction TXN-0042001 in chronological order.",
        solution: 'fetch logs | filter transaction_id == "TXN-0042001" | fields timestamp, transaction_id, customer_id, amount, status | sort timestamp asc',
        sampleData: doubleSpendData,
      },
    ],
    mcq: {
      question: "Which customer was most frequently double-charged?",
      options: ["cust-0001", "cust-0042", "cust-0077", "cust-0099"],
      correctAnswer: "cust-0042",
      explanation:
        "cust-0042 has 9 duplicate COMPLETED transactions out of 15 total duplicates. " +
        "cust-0077 has 6. Both customers show two COMPLETED records for the same transaction_id " +
        "with identical amounts, confirming double-charging.",
    },
    hints: [
      "Count COMPLETED records per transaction_id — any with count > 1 is a duplicate charge.",
      "Group by customer_id to find who was affected most often.",
      "Drill into a specific transaction_id to see the two identical COMPLETED records side by side.",
    ],
  },

  // ── lh-21 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-21",
    title: "The Missing Heartbeat",
    emoji: "💓",
    difficulty: "Intermediate",
    story:
      "Six services send HEARTBEAT events every few minutes to the monitoring bus. " +
      "Overnight, one service stopped heartbeating for over four hours — " +
      "but no alert fired because the alert threshold was misconfigured. " +
      "The incident was only discovered when downstream services started timing out. " +
      "Find which service had the heartbeat gap and when it started.",
    investigation:
      "Compare total heartbeat counts per service — the lowest count indicates the longest gap. " +
      "Then look at all event types for the suspect service to see what happened during the gap. " +
      "Finally, examine the first and last heartbeat timestamps to measure the outage window.",
    tasks: [
      {
        id: "t1",
        question: "Count HEARTBEAT events per service — which service has the fewest?",
        solution: 'fetch logs | filter event == "HEARTBEAT" | summarize last_heartbeat = max(timestamp), first_heartbeat = min(timestamp), count = count(), by:{service} | sort count asc',
        sampleData: missingHeartbeatData,
      },
      {
        id: "t2",
        question: "For inventory-api, summarize all event types and their counts.",
        solution: 'fetch logs | filter service == "inventory-api" | summarize count(), by:{event} | sort count() desc',
        sampleData: missingHeartbeatData,
      },
      {
        id: "t3",
        question: "Show inventory-api HEARTBEAT records in chronological order — look for the gap.",
        solution: 'fetch logs | filter service == "inventory-api" | filter event == "HEARTBEAT" | sort timestamp asc | limit 5',
        sampleData: missingHeartbeatData,
      },
    ],
    mcq: {
      question: "Which service had a 4-hour heartbeat gap?",
      options: ["api-gateway", "order-service", "inventory-api", "payment-svc"],
      correctAnswer: "inventory-api",
      explanation:
        "inventory-api has the fewest HEARTBEAT events and shows ERROR records during the 02:00–06:00 UTC window " +
        "when heartbeats are absent. Other services maintain regular heartbeats throughout the time range.",
    },
    hints: [
      "Count HEARTBEAT events per service — the service with the fewest has the longest gap.",
      "Check what event types inventory-api emits during the gap window.",
      "Look at first and last heartbeat timestamps to measure the outage duration.",
    ],
  },

  // ── lh-22 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-22",
    title: "The Config Drift",
    emoji: "⚙️",
    difficulty: "Intermediate",
    story:
      "Production configuration changes are only permitted during the approved maintenance window: " +
      "02:00–04:00 UTC daily. All other changes require an explicit ticket and must have approved=true. " +
      "Change audit logs record operator, action, system_id, change_type, and approved flag. " +
      "The compliance team flagged a surge of unauthorized changes — approved=false — " +
      "in the afternoon and evening hours.",
    investigation:
      "Count CONFIG_WRITE events with approved=false per operator — the offender will dominate. " +
      "Then confirm by looking at the hours of day when their changes occur. " +
      "Finally, look at any CONFIG_DELETE actions from that operator.",
    tasks: [
      {
        id: "t1",
        question: "Count CONFIG_WRITE events with approved=false per operator — sort highest first.",
        solution: 'fetch logs | filter action == "CONFIG_WRITE" | filter approved == false | summarize unauthorized = count(), by:{operator} | sort unauthorized desc',
        sampleData: configDriftData,
      },
      {
        id: "t2",
        question: "For bishop's CONFIG_WRITE events, show off-hours changes (hour < 2 or hour > 4) by system.",
        solution: 'fetch logs | filter operator == "bishop" | filter action == "CONFIG_WRITE" | fieldsAdd hour = toLong(substr(timestamp, 11, 2)) | filter hour < 2 or hour > 4 | summarize off_hours_changes = count(), by:{system_id} | sort off_hours_changes desc',
        sampleData: configDriftData,
      },
      {
        id: "t3",
        question: "Show bishop's CONFIG_DELETE events — timestamp, system_id, and change_type.",
        solution: 'fetch logs | filter operator == "bishop" | filter action == "CONFIG_DELETE" | fields timestamp, system_id, change_type | sort timestamp desc',
        sampleData: configDriftData,
      },
    ],
    mcq: {
      question: "Which operator is making unauthorized config changes outside maintenance windows?",
      options: ["admin_ann", "ops_omar", "sysadmin_su", "bishop"],
      correctAnswer: "bishop",
      explanation:
        "bishop has 20 CONFIG_WRITE and 3 CONFIG_DELETE events, all with approved=false and all occurring " +
        "between 14:00–22:00 UTC — hours outside the 02:00–04:00 maintenance window. " +
        "Other operators show only approved=true changes within the window.",
    },
    hints: [
      "Filter CONFIG_WRITE with approved==false and count per operator.",
      "Use substr(timestamp, 11, 2) to extract the hour and filter outside the 02:00-04:00 window.",
      "Check CONFIG_DELETE events for the operator — deletion outside windows is the most serious violation.",
    ],
  },

  // ── lh-23 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-23",
    title: "The Stale Token",
    emoji: "🔐",
    difficulty: "Intermediate",
    story:
      "OAuth tokens in this system are supposed to expire after 1 hour (token TTL = 3600 seconds). " +
      "The token lifecycle is logged: TOKEN_ISSUED, TOKEN_USED, TOKEN_EXPIRED, TOKEN_REVOKED. " +
      "Security scanning detected a service account token being used 72+ hours after issuance " +
      "with no TOKEN_EXPIRED event in the logs. " +
      "A persistent token is a serious risk — it can be used long after the original session should have ended.",
    investigation:
      "Find all TOKEN_ISSUED events to understand how many tokens were created. " +
      "Use dedup to find the latest TOKEN_USED per token. " +
      "Then drill into the eternal token to see its full lifecycle.",
    tasks: [
      {
        id: "t1",
        question: "Count TOKEN_ISSUED events per user_id to see who has the most active tokens.",
        solution: 'fetch logs | filter action == "TOKEN_ISSUED" | summarize issued = count(), by:{user_id} | sort issued desc',
        sampleData: staleTokenData,
      },
      {
        id: "t2",
        question: "Dedup TOKEN_USED events by token_id (keeping the latest) to see the last-used timestamp per token.",
        solution: 'fetch logs | filter action == "TOKEN_USED" | dedup token_id, sort: timestamp desc | fields token_id, user_id, timestamp | sort timestamp asc | limit 10',
        sampleData: staleTokenData,
      },
      {
        id: "t3",
        question: "Show the full event timeline for token tok-eternal-999 in chronological order.",
        solution: 'fetch logs | filter token_id == "tok-eternal-999" | sort timestamp asc | fields timestamp, action, client_app',
        sampleData: staleTokenData,
      },
    ],
    mcq: {
      question: "Which token is being reused well beyond its 1-hour expiry?",
      options: ["tok-000001", "tok-eternal-999", "tok-000050", "tok-000100"],
      correctAnswer: "tok-eternal-999",
      explanation:
        "tok-eternal-999 was issued once and then used every 6 hours for 72+ hours with no TOKEN_EXPIRED event. " +
        "All other tokens show a TOKEN_EXPIRED record within 1 hour of TOKEN_ISSUED.",
    },
    hints: [
      "Count TOKEN_ISSUED per user — phantom_svc is the service account with the stale token.",
      "Dedup TOKEN_USED by token_id to get the last-used timestamp per token.",
      "Filter to tok-eternal-999 and sort by timestamp to see the full lifecycle without an expiry.",
    ],
  },

  // ── lh-24 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-24",
    title: "The Deploy Disaster",
    emoji: "🚀",
    difficulty: "Intermediate",
    story:
      "At 10:00 UTC, five services were deployed simultaneously. " +
      "Within minutes, the error rate for one service spiked from under 3% to over 70%. " +
      "The logging pipeline captures both application logs (source=logs) and deployment events (source=events) " +
      "in the same dataset. " +
      "The on-call team needs to identify which version caused the spike before rolling back.",
    investigation:
      "Find the service with the most ERROR-level log records. " +
      "Then look at the DEPLOY_END events to see which version was deployed for that service. " +
      "Correlate the deployment timestamp with the error spike.",
    tasks: [
      {
        id: "t1",
        question: "Count ERROR-level records per service in the logs (source=logs).",
        solution: 'fetch logs | filter loglevel == "ERROR" | summarize errors = count(), by:{service} | sort errors desc',
        sampleData: deployDisasterData,
      },
      {
        id: "t2",
        question: "Show all DEPLOY_END events from source=events — list timestamp, service, and version.",
        solution: 'fetch logs | filter source == "events" | filter event_type == "DEPLOY_END" | fields timestamp, service, version | sort timestamp asc',
        sampleData: deployDisasterData,
      },
      {
        id: "t3",
        question: "Show combined deployment events and error logs sorted by time to correlate the spike.",
        solution: 'fetch logs | filter source == "events" and event_type == "DEPLOY_END" or loglevel == "ERROR" | sort timestamp asc | limit 30',
        sampleData: deployDisasterData,
      },
    ],
    mcq: {
      question: "Which deployment version caused the error spike in checkout-service?",
      options: ["cart-v1.3.2", "user-v4.0.1", "checkout-v2.1.0", "payment-v3.1.0"],
      correctAnswer: "checkout-v2.1.0",
      explanation:
        "checkout-service has the highest error count and its DEPLOY_END event shows version checkout-v2.1.0 " +
        "deployed at the same timestamp after which ERROR records jump from ~3% to ~75%.",
    },
    hints: [
      "Count ERROR logs per service to find which one spiked post-deployment.",
      "Filter source=events and event_type=DEPLOY_END to see what version was just deployed for that service.",
      "Sort a combined view of deployment events and errors by timestamp to see the correlation.",
    ],
  },

  // ── lh-25 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-25",
    title: "The Noisy Neighbor",
    emoji: "📢",
    difficulty: "Intermediate",
    story:
      "A multi-tenant platform is experiencing slowdowns for all tenants. " +
      "The platform engineering team suspects one tenant is consuming a disproportionate " +
      "share of request slots, causing others to be throttled. " +
      "Each span is tagged with tenant_id, request_type, duration_ms, and status.code. " +
      "Ten tenants share the platform — one of them is abusing BULK endpoints.",
    investigation:
      "Count requests per tenant and compare average durations — the noisy neighbor will be obvious. " +
      "Then look at that tenant's request_type distribution to confirm BULK abuse. " +
      "Finally, check their error rate and p95 latency.",
    tasks: [
      {
        id: "t1",
        question: "Count requests and compute avg_duration per tenant_id — sort by requests descending.",
        solution: 'fetch spans | summarize requests = count(), avg_duration = avg(duration_ms), by:{tenant_id} | sort requests desc',
        sampleData: noisyNeighborData,
      },
      {
        id: "t2",
        question: "Break down request counts by tenant_id and request_type — show top 15 rows.",
        solution: 'fetch spans | summarize count(), by:{tenant_id, request_type} | sort count() desc | limit 15',
        sampleData: noisyNeighborData,
      },
      {
        id: "t3",
        question: "For tenant-alpha, compute error count and p95 latency.",
        solution: 'fetch spans | filter tenant_id == "tenant-alpha" | summarize errors = countIf(status.code == "ERROR"), p95 = percentile(duration_ms, 95) | fields errors, p95',
        sampleData: noisyNeighborData,
      },
    ],
    mcq: {
      question: "Which tenant is consuming the most platform resources and throttling others?",
      options: ["tenant-beta", "tenant-gamma", "tenant-alpha", "tenant-delta"],
      correctAnswer: "tenant-alpha",
      explanation:
        "tenant-alpha has 145 spans while others have 5–8 each. " +
        "70% of tenant-alpha's requests are BULK type with average duration 800–5000ms. " +
        "Their 15% error rate and high p95 latency confirm platform resource exhaustion.",
    },
    hints: [
      "Count requests per tenant — the noisy neighbor has 10–20× more than all others.",
      "Break down by request_type to confirm BULK abuse.",
      "Check errors and p95 for the top tenant to see the full impact.",
    ],
  },

  // ── lh-26 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-26",
    title: "The Exception Storm",
    emoji: "⛈️",
    difficulty: "Advanced",
    story:
      "An alert fired at 14:00 UTC: 'exception rate exceeded threshold'. " +
      "Five services run on the platform, each emitting spans with exception metadata pre-extracted " +
      "as exception_type and exception_message fields. " +
      "The storm is concentrated in one service and one exception type. " +
      "After finding the culprit, the solution shows how to use makeTimeseries in real Dynatrace " +
      "to find the peak hour using arrayMovingAvg.",
    investigation:
      "Filter to spans with non-null exception_type to find the exception storm. " +
      "Group by service.name and exception_type to identify the culprit. " +
      "The advanced solution demonstrates real-DQL makeTimeseries on span.events.",
    tasks: [
      {
        id: "t1",
        question: "Count spans where exception_type is not null, grouped by service.name and exception_type.",
        solution: 'fetch spans | filter isNotNull(exception_type) | summarize exception_count = count(), by:{service.name, exception_type} | sort exception_count desc',
        sampleData: exceptionStormData,
      },
      {
        id: "t2",
        question: "For order-processor, count by exception_type and exception_message.",
        solution: 'fetch spans | filter service.name == "order-processor" | filter isNotNull(exception_type) | summarize count(), by:{exception_type, exception_message} | sort count() desc',
        sampleData: exceptionStormData,
      },
      {
        id: "t3",
        question: "Using real Dynatrace span.events, how would you build a timeseries of exceptions per type at 30-minute intervals?",
        solution: 'fetch spans\n| filter iAny(span.events[][span_event.name] == "exception")\n| expand span.events\n| fieldsFlatten span.events, fields: {exception.type, span_event.name}\n| filter span_event.name == "exception"\n| makeTimeseries count(), by: {exception.type}, time: start_time, interval: 30m',
        sampleData: exceptionStormData,
      },
    ],
    mcq: {
      question: "Between which hours did the exception storm peak, and which service caused it?",
      options: [
        "08:00–10:00 in api-gateway",
        "14:00–16:00 in order-processor",
        "20:00–22:00 in user-service",
        "02:00–04:00 in payment-service",
      ],
      correctAnswer: "14:00–16:00 in order-processor",
      explanation:
        "order-processor has 65 OutOfMemoryError exceptions, with timestamps clustered between 14:00–16:00 UTC. " +
        "Other services have under 10% exception rates with no single exception type dominating.",
    },
    hints: [
      "Filter isNotNull(exception_type) to isolate spans that threw exceptions.",
      "Group by service.name and exception_type — the culprit will have 10× more than others.",
      "Look at timestamps for order-processor exceptions to identify the 2-hour peak window.",
    ],
  },

  // ── lh-27 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-27",
    title: "The Cascade Failure",
    emoji: "🌊",
    difficulty: "Advanced",
    story:
      "A wave of errors swept through five services simultaneously. " +
      "Distributed traces show spans from db-connection-pool, order-service, user-service, " +
      "payment-service, cart-service, and api-gateway. " +
      "Each span has a hop_count (0 = root span) and parent_service. " +
      "The cascade always starts at the same root service — but downstream services " +
      "are generating 80% of the visible errors, making the true origin hard to spot.",
    investigation:
      "Count errors per service to see the total blast radius. " +
      "Then filter to root spans (hop_count == 0) to find where failures originate. " +
      "The advanced solution shows how joinNested can correlate failed children back to healthy roots.",
    tasks: [
      {
        id: "t1",
        question: "Count ERROR spans per service.name — sort highest first.",
        solution: 'fetch spans | filter status.code == "ERROR" | summarize errors = count(), by:{service.name} | sort errors desc',
        sampleData: cascadeFailureData,
      },
      {
        id: "t2",
        question: "Filter to root spans (hop_count == 0) with ERROR status — count by service.name.",
        solution: 'fetch spans | filter status.code == "ERROR" | filter hop_count == 0 | summarize root_failures = count(), by:{service.name} | sort root_failures desc',
        sampleData: cascadeFailureData,
      },
      {
        id: "t3",
        question: "Show the first 10 root-level ERROR spans — timestamp, service.name, and error_message.",
        solution: 'fetch spans | filter status.code == "ERROR" | filter hop_count == 0 | fields timestamp, service.name, error_message | sort timestamp asc | limit 10',
        sampleData: cascadeFailureData,
      },
    ],
    mcq: {
      question: "Which root-level service initiated the cascade failure?",
      options: ["order-service", "api-gateway", "payment-service", "db-connection-pool"],
      correctAnswer: "db-connection-pool",
      explanation:
        "db-connection-pool is the only service appearing in root spans (hop_count == 0) with ERROR status. " +
        "Its error_message 'connection refused: max pool size exceeded' is the single root cause. " +
        "All downstream service errors are caused by this upstream failure propagating through traces.",
    },
    hints: [
      "Count all ERROR spans per service — downstream services will appear to have many errors.",
      "Filter to hop_count == 0 (root spans) to find where failures originate — this bypasses the cascade noise.",
      "Read the error_message on root failures to understand the single underlying cause.",
    ],
  },

  // ── lh-28 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-28",
    title: "The Insider Threat",
    emoji: "🕵️",
    difficulty: "Advanced",
    story:
      "An audit of customer data access shows someone in the Finance department " +
      "is bulk-exporting customer records — thousands of times more data than their role requires. " +
      "Access logs capture user_id, department, action (DATA_READ, DATA_EXPORT, ADMIN_ACCESS, LOGIN, LOGOUT), " +
      "resource, and bytes_accessed. " +
      "Finance staff legitimately access financial_reports, not customer_records. " +
      "The mismatch between department and resource is the smoking gun.",
    investigation:
      "Count DATA_EXPORT events per user with total bytes to find the largest exporter. " +
      "Filter to Finance department to narrow the suspect list. " +
      "Drill into the top exporter to see which resources they accessed and how much data they took.",
    tasks: [
      {
        id: "t1",
        question: "Count DATA_EXPORT events per user_id and department — show total bytes and sort highest.",
        solution: 'fetch logs | filter action == "DATA_EXPORT" | summarize exports = count(), total_bytes = sum(bytes_accessed), by:{user_id, department} | sort exports desc',
        sampleData: insiderThreatData,
      },
      {
        id: "t2",
        question: "In Finance department, break down DATA_EXPORT by user_id and resource — sort by bytes.",
        solution: 'fetch logs | filter department == "Finance" | filter action == "DATA_EXPORT" | summarize count(), bytes = sum(bytes_accessed), by:{user_id, resource} | sort bytes desc',
        sampleData: insiderThreatData,
      },
      {
        id: "t3",
        question: "Show morrison's DATA_EXPORT records — resource and bytes_accessed, sorted by bytes descending.",
        solution: 'fetch logs | filter action == "DATA_EXPORT" | filter user_id == "morrison" | fields timestamp, resource, bytes_accessed | sort bytes_accessed desc | limit 10',
        sampleData: insiderThreatData,
      },
    ],
    mcq: {
      question: "Which Finance department employee is exfiltrating customer data?",
      options: ["davis_fin", "morrison", "johnson_hr", "wilson_ops"],
      correctAnswer: "morrison",
      explanation:
        "morrison (Finance) has 17 DATA_EXPORT events on customer_records with bytes_accessed " +
        "ranging from 500K to 5MB per export — a resource Finance staff should never access. " +
        "Their colleague davis_fin shows only financial_reports access within normal byte ranges.",
    },
    hints: [
      "Count DATA_EXPORT per user — morrison will have 8× more than their Finance colleagues.",
      "Filter to Finance and group by resource — accessing customer_records from Finance is the red flag.",
      "Sum bytes_accessed for morrison to quantify the total data exfiltrated.",
    ],
  },

  // ── lh-29 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-29",
    title: "The Revenue Black Hole",
    emoji: "🕳️",
    difficulty: "Advanced",
    story:
      "Business events track a five-step e-commerce funnel: " +
      "cart_created → checkout_started → payment_initiated → order_confirmed → fulfillment_started. " +
      "Revenue forecasts assume 85% conversion from payment_initiated to order_confirmed. " +
      "But actual revenue is 40% below forecast. " +
      "Somewhere between those two steps, orders are disappearing without a trace. " +
      "The CFO needs to know exactly where the money is going.",
    investigation:
      "Count events and sum amounts per event.type to see the funnel shape. " +
      "Find where the biggest count drop occurs between consecutive steps. " +
      "Quantify the confirmed revenue vs the initiated revenue to measure the gap.",
    tasks: [
      {
        id: "t1",
        question: "Count events and sum amount per event.type across the funnel — sort by count descending.",
        solution: 'fetch bizevents | summarize count = count(), total = sum(amount), by:{event.type} | sort count desc',
        sampleData: revenueBlackHoleData,
      },
      {
        id: "t2",
        question: "Break down event counts by event.type and payment_method — show top 20 rows.",
        solution: 'fetch bizevents | summarize count(), by:{event.type, payment_method} | sort count() desc | limit 20',
        sampleData: revenueBlackHoleData,
      },
      {
        id: "t3",
        question: "What is the total confirmed revenue (order_confirmed events only)?",
        solution: 'fetch bizevents | filter event.type == "com.shop.order_confirmed" | summarize confirmed_revenue = sum(amount) | fields confirmed_revenue',
        sampleData: revenueBlackHoleData,
      },
    ],
    mcq: {
      question: "At which funnel step is revenue dropping by ~65%?",
      options: [
        "Between cart_created and checkout_started",
        "Between checkout_started and payment_initiated",
        "Between payment_initiated and order_confirmed",
        "Between order_confirmed and fulfillment_started",
      ],
      correctAnswer: "Between payment_initiated and order_confirmed",
      explanation:
        "payment_initiated has 80 events but order_confirmed has only 28 — a 65% drop. " +
        "All other funnel step transitions have drops under 25%. " +
        "This points to a bug or fraud at the payment confirmation stage.",
    },
    hints: [
      "Count events per event.type to see the funnel volume at each step.",
      "Look for the biggest percentage drop between consecutive steps.",
      "Compare the total amounts at payment_initiated vs order_confirmed to measure the financial gap.",
    ],
  },

  // ── lh-30 ──────────────────────────────────────────────────────────────────
  {
    id: "lh-30",
    title: "The Phantom Metric",
    emoji: "📈",
    difficulty: "Advanced",
    story:
      "Infrastructure monitoring shows 8 production hosts emitting CPU, memory, and disk metrics every few minutes. " +
      "One host is on a slow but relentless upward trend — CPU started at 45% and is now at 85%. " +
      "If it reaches 100%, the host will start throttling and likely trigger an outage. " +
      "The team needs to identify the trending host and quantify how much CPU has increased " +
      "before escalating to capacity planning. " +
      "The advanced solution demonstrates makeTimeseries + arrayMovingAvg for trend detection.",
    investigation:
      "Find avg and max CPU per host to spot the outlier. " +
      "Then look at the time series of CPU readings for that host to see the trend. " +
      "Calculate the start-to-end increase to quantify how severe the trend is.",
    tasks: [
      {
        id: "t1",
        question: "Compute avg_cpu and max_cpu per host — sort by max_cpu descending.",
        solution: 'fetch logs | summarize avg_cpu = avg(cpu_pct), max_cpu = max(cpu_pct), by:{host} | sort max_cpu desc',
        sampleData: phantomMetricData,
      },
      {
        id: "t2",
        question: "For prod-db-02, show the first 20 samples in chronological order — timestamp, cpu_pct, mem_pct, disk_pct.",
        solution: 'fetch logs | filter host == "prod-db-02" | sort timestamp asc | fields timestamp, cpu_pct, mem_pct, disk_pct | limit 20',
        sampleData: phantomMetricData,
      },
      {
        id: "t3",
        question: "For prod-db-02, compute sample count, min CPU (cpu_start), max CPU (cpu_end), and the increase (cpu_end - cpu_start).",
        solution: 'fetch logs | filter host == "prod-db-02" | summarize samples = count(), cpu_start = min(cpu_pct), cpu_end = max(cpu_pct) | fieldsAdd cpu_increase = cpu_end - cpu_start | fields samples, cpu_start, cpu_end, cpu_increase',
        sampleData: phantomMetricData,
      },
    ],
    mcq: {
      question: "Which host is trending towards CPU saturation (>80%), and by approximately how many percentage points has its CPU increased?",
      options: [
        "prod-app-01, ~15 percentage points",
        "prod-db-02, ~40 percentage points",
        "prod-k8s-03, ~25 percentage points",
        "prod-cache-01, ~20 percentage points",
      ],
      correctAnswer: "prod-db-02, ~40 percentage points",
      explanation:
        "prod-db-02 started at ~45% CPU and has climbed to ~85% — a ~40 percentage point increase. " +
        "All other hosts fluctuate within ±10% of their baseline values with no directional trend.",
    },
    hints: [
      "Compare avg_cpu vs max_cpu per host — a large gap indicates a host that started low and climbed high.",
      "Look at prod-db-02 samples in time order to see the steady upward slope.",
      "Use min(cpu_pct) as cpu_start and max(cpu_pct) as cpu_end, then subtract to measure the total increase.",
    ],
  },
];

import type { DQLRecord } from "@/lib/types/dql";

// Simple seeded LCG for deterministic output
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

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randHex(rng: () => number, len: number): string {
  const chars = "0123456789ABCDEF";
  return Array.from({ length: len }, () => chars[Math.floor(rng() * 16)]).join("");
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTimestamp(base: Date, offsetSeconds: number) {
  const d = new Date(base.getTime() + offsetSeconds * 1000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;
}

// ─── Auth Logs (case-001) ───
export function generateAuthLogs(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T08:30:00Z");
  const users = [
    "alice", "bob", "charlie", "dave", "eve", "frank", "grace", "heidi",
    "ivan", "judy", "admin", "root", "guest", "support", "ops", "dev",
    "testuser", "api-client", "service-account", "backup",
  ];
  const ips = Array.from({ length: 80 }, (_, i) => {
    const a = randInt(rng, 10, 223);
    const b = randInt(rng, 0, 255);
    const c = randInt(rng, 0, 255);
    const d = randInt(rng, 1, 254);
    return `${a}.${b}.${c}.${d}`;
  });
  // Ensure a few "signal" IPs appear for the attacker pattern
  const signalIps = ["192.168.1.45", "192.168.1.99", "10.0.0.77", "172.16.0.5"];
  const hosts = ["prod-01", "prod-02", "prod-03", "prod-04", "prod-05"];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 1, 25);
    const isSignal = i < signalIps.length * 15; // embed signal records
    const isError = isSignal ? true : rng() < 0.3;
    const isWarn = !isError && rng() < 0.1;
    const level = isError ? "ERROR" : isWarn ? "WARN" : "INFO";

    const user = isSignal && isError ? "admin" : randItem(rng, users);
    const ip = isSignal && isError ? signalIps[i % signalIps.length] : randItem(rng, ips);
    const host = randItem(rng, hosts);

    let content: string;
    if (level === "INFO") {
      content = `Login success for user=${user} from ip=${ip}`;
    } else if (level === "WARN") {
      content = `Suspicious login attempt for user=${user} from ip=${ip}`;
    } else {
      // ERROR — use attacker_ip= so parse command can extract it
      content = `Login failed for user=${user} from attacker_ip=${ip}`;
    }

    records.push({
      timestamp: formatTimestamp(baseTime, elapsed),
      loglevel: level,
      "log.source": "auth-service",
      content,
      host,
    });
  }

  return records;
}

// ─── Database Logs (case-002) ───
export function generateDbLogs(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T12:00:00Z");
  const queries = [
    "SELECT * FROM orders WHERE created_at > now() - 1h",
    "SELECT COUNT(*) FROM users",
    "SELECT * FROM inventory",
    "UPDATE users SET last_login = now()",
    "INSERT INTO audit_log VALUES (...)",
    "DELETE FROM sessions WHERE expiry < now()",
    "SELECT * FROM products WHERE status = 'active'",
    "SELECT id, name FROM customers",
    "ALTER TABLE orders ADD COLUMN tracking_id",
    "VACUUM ANALYZE",
  ];
  const hosts = ["db-01", "db-02", "db-03", "db-replica-01", "db-replica-02"];

  // Fixed entity IDs — stable across records so they reflect real entity topology
  const rdsInstanceIds = [
    `AWS_RDS_DB_INSTANCE-${randHex(rng, 16)}`,
    `AWS_RDS_DB_INSTANCE-${randHex(rng, 16)}`,
  ];
  const rdsSmartscapeIds = rdsInstanceIds.map(id => id.replace("AWS_RDS_DB_INSTANCE-", "AWS_RDS_DBINSTANCE-"));
  const rdsServiceIds = [
    `RELATIONAL_DATABASE_SERVICE-${randHex(rng, 16)}`,
    `RELATIONAL_DATABASE_SERVICE-${randHex(rng, 16)}`,
  ];
  const customDeviceIds = [
    `CUSTOM_DEVICE-${randHex(rng, 16)}`,
    `CUSTOM_DEVICE-${randHex(rng, 16)}`,
  ];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 2, 40);
    const isSlow = rng() < 0.35;
    const isInfo = !isSlow && rng() < 0.6;
    const level = isSlow ? "WARN" : isInfo ? "INFO" : "ERROR";
    const host = randItem(rng, hosts);
    const query = randItem(rng, queries);
    const duration_ms = isSlow
      ? randInt(rng, 3000, 12000)
      : level === "ERROR"
      ? randInt(rng, 500, 3000)
      : randInt(rng, 20, 300);

    const queryType = query.startsWith("SELECT") ? "SELECT" : query.startsWith("INSERT") ? "INSERT" : query.startsWith("UPDATE") ? "UPDATE" : query.startsWith("DELETE") ? "DELETE" : "ALTER";

    let content: string;
    if (level === "WARN") {
      content = `Slow query detected: query_type=${queryType} ${query}`;
    } else if (level === "ERROR") {
      content = `Query failed: query_type=${queryType} ${query}`;
    } else {
      content = `Query completed in ${duration_ms}ms: query_type=${queryType} ${query}`;
    }

    const rec: DQLRecord = {
      timestamp: formatTimestamp(baseTime, elapsed),
      loglevel: level,
      "log.source": "database",
      content,
      host,
      duration_ms,
    };

    // ~20% of records carry RDS entity enrichment (matches Dynatrace OneAgent topology)
    if (rng() < 0.2) {
      const idx = Math.floor(rng() * 2);
      rec["dt.entity.relational_database_service"] = rdsServiceIds[idx];
      rec["dt.entity.custom_device"] = customDeviceIds[idx];
      rec["dt.smartscape.aws_rds_dbinstance"] = rdsSmartscapeIds[idx];
      rec["dt.source_entity"] = [rdsServiceIds[idx], customDeviceIds[idx]];
    }

    if (level === "ERROR") {
      rec["error.message"] = content;
    }

    records.push(rec);
  }

  return records;
}

// ─── Events (case-002) ───
export function generateEvents(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T09:00:00Z");
  const services = [
    "checkout", "cart", "catalog", "payment", "shipping",
    "inventory", "auth", "notifications", "user-service",
  ];
  const eventTypes = [
    "deployment", "alert", "scale-up", "restart", "config-change",
  ];
  const hosts = Array.from({ length: 20 }, (_, i) => `prod-${String(i + 1).padStart(2, "0")}`);

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 10, 120);
    const service = randItem(rng, services);
    const eventType = randItem(rng, eventTypes);
    const host = randItem(rng, hosts);

    const rec: DQLRecord = {
      timestamp: formatTimestamp(baseTime, elapsed),
      "event.type": eventType,
      service,
      host,
    };

    if (eventType === "deployment") {
      rec.version = `v${randInt(rng, 1, 5)}.${randInt(rng, 0, 9)}.${randInt(rng, 0, 9)}`;
      rec.status = rng() < 0.8 ? "success" : "failure";
    }
    if (eventType === "alert") {
      const severity = randItem(rng, ["critical", "warning", "info"]);
      rec.severity = severity;
      rec.message = severity === "critical"
        ? "CPU > 90%"
        : severity === "warning"
        ? "Memory pressure detected"
        : "Health check passed";
    }
    if (eventType === "scale-up") {
      rec.instances = randInt(rng, 1, 5);
    }

    records.push(rec);
  }

  return records;
}

// ─── Business Events (case-003) ───
export function generateBizEvents(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T10:00:00Z");
  const products = ["widget", "gadget", "thingamajig", "doohickey", "gizmo", "sprocket"];
  const methods = ["card", "paypal", "stripe", "applepay", "googlepay"];
  const eventTypes = [
    "com.easytrade.order_confirmed",
    "com.easytrade.payment_confirmed",
    "com.easytrade.close_order",
    "com.easytrade.shipping_label_created",
    "com.easytrade.order_cancelled",
  ];
  const accounts = Array.from({ length: 50 }, (_, i) => `ACC-${100 + i}`);

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 5, 90);
    const orderId = `ORD-${String(i).padStart(4, "0")}`;
    const amount = parseFloat((rng() * 500 + 10).toFixed(2));
    const product = randItem(rng, products);
    const accountId = randItem(rng, accounts);
    const eventType = randItem(rng, eventTypes);

    const rec: DQLRecord = {
      timestamp: formatTimestamp(baseTime, elapsed),
      "event.type": eventType,
      order_id: orderId,
      amount,
      product,
      accountId,
    };

    if (eventType === "com.easytrade.payment_confirmed") {
      rec.method = randItem(rng, methods);
    }
    if (eventType === "com.easytrade.close_order") {
      rec.status = rng() < 0.8 ? "fulfilled" : "returned";
    }
    if (eventType === "com.easytrade.order_cancelled") {
      rec.reason = rng() < 0.5 ? "customer_request" : "payment_failed";
    }

    records.push(rec);
  }

  return records;
}

// ─── Spans (case-004) ───
export function generateSpans(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T11:00:00Z");
  const endpoints = [
    "/api/users", "/api/orders", "/api/products", "/api/payment",
    "/api/shipping", "/api/inventory", "/api/reports", "/api/search",
    "/api/auth", "/api/notifications", "/api/cart", "/api/checkout",
  ];
  const services = [
    "user-service", "order-service", "catalog-service", "payment-service",
    "shipping-service", "inventory-service", "reporting-service", "search-service",
    "auth-service", "notification-service", "cart-service", "checkout-service",
  ];
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 1, 20);
    const endpoint = randItem(rng, endpoints);
    const service = randItem(rng, services);
    const method = randItem(rng, methods);
    const isError = rng() < 0.15;
    const status = isError ? "ERROR" : "OK";
    const duration = isError
      ? randInt(rng, 50000, 400000)
      : randInt(rng, 5000, 150000);

    records.push({
      timestamp: formatTimestamp(baseTime, elapsed),
      "span.name": `${method} ${endpoint}`,
      duration,
      "status.code": status,
      "service.name": service,
      endpoint,
    });
  }

  return records;
}

// ─── Events with Tags (case-022) ───
export function generateEventsWithTags(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T09:00:00Z");
  const services = [
    "checkout", "cart", "catalog", "payment", "shipping",
    "inventory", "auth", "notifications", "user-service",
  ];
  const eventTypes = [
    "deployment", "alert", "scale-up", "restart", "config-change",
  ];
  const hosts = Array.from({ length: 20 }, (_, i) => `prod-${String(i + 1).padStart(2, "0")}`);

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 10, 120);
    const service = randItem(rng, services);
    const eventType = randItem(rng, eventTypes);
    const host = randItem(rng, hosts);

    const rec: DQLRecord = {
      timestamp: formatTimestamp(baseTime, elapsed),
      "event.type": eventType,
      service,
      host,
    };

    if (eventType === "deployment") {
      rec.version = `v${randInt(rng, 1, 5)}.${randInt(rng, 0, 9)}.${randInt(rng, 0, 9)}`;
      rec.status = rng() < 0.8 ? "success" : "failure";
    }
    if (eventType === "alert") {
      const severity = randItem(rng, ["critical", "warning", "info"]);
      rec.severity = severity;
      rec.message = severity === "critical"
        ? "CPU > 90%"
        : severity === "warning"
        ? "Memory pressure detected"
        : "Health check passed";
    }
    if (eventType === "scale-up") {
      rec.instances = randInt(rng, 1, 5);
    }

    // Embed tags array on ~15% of records, with signal patterns for case-022
    const isSignal = i < 30;
    if (isSignal) {
      rec.tags = ["critical", "deployment"];
    } else if (rng() < 0.15) {
      rec.tags = rng() < 0.5 ? ["warning"] : ["info", "scheduled"];
    }

    records.push(rec);
  }

  return records;
}

// ─── Application Logs (case-005) ───
export function generateAppLogs(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T08:00:00Z");
  const errorMessages = [
    "Database connection timeout",
    "Out of memory",
    "NullPointerException in CartController",
    "Connection refused to redis-cache:6379",
    "SSL handshake failed",
    "Rate limit exceeded",
    "Thread pool exhausted",
    "Disk quota exceeded",
    "Failed to serialize response",
    "Circuit breaker open",
  ];
  const infoMessages = [
    "Request processed",
    "Cache hit for key: user_prefs",
    "Scheduled job started: cleanup-temp-files",
    "Health check passed",
    "Webhook delivered successfully",
    "User session refreshed",
    "Background sync completed",
  ];
  const warnMessages = [
    "High memory usage detected",
    "Retrying failed message delivery",
    "Deprecated API endpoint called",
    "Slow response time on /api/reports",
    "Queue depth exceeds threshold",
  ];
  const hosts = ["app-01", "app-02", "app-03", "app-04", "app-05", "app-06"];
  const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  const endpoints = [
    "/api/users", "/api/orders", "/api/products", "/api/payment",
    "/api/shipping", "/api/inventory", "/api/reports", "/api/search",
  ];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 3, 35);
    const isError = rng() < 0.25;
    const isWarn = !isError && rng() < 0.15;
    const level = isError ? "ERROR" : isWarn ? "WARN" : "INFO";
    const host = randItem(rng, hosts);
    const endpoint = randItem(rng, endpoints);
    const httpMethod = randItem(rng, httpMethods);
    const isHttpRequest = rng() < 0.7;

    let content: string;
    let httpStatus: number | undefined;
    let errorMessage: string | undefined;

    if (level === "ERROR") {
      errorMessage = randItem(rng, errorMessages);
      httpStatus = isHttpRequest ? (rng() < 0.5 ? 500 : rng() < 0.5 ? 502 : 503) : undefined;
      content = isHttpRequest
        ? `Request failed on endpoint=${endpoint} - ${errorMessage}`
        : errorMessage;
    } else if (level === "WARN") {
      content = randItem(rng, warnMessages);
      httpStatus = isHttpRequest ? (rng() < 0.5 ? 429 : 400) : undefined;
      if (isHttpRequest && rng() < 0.3) {
        content = `Slow response on endpoint=${endpoint} - ${content}`;
      }
    } else {
      content = randItem(rng, infoMessages);
      httpStatus = isHttpRequest ? 200 : undefined;
      if (isHttpRequest && rng() < 0.2) {
        content = `Request completed on endpoint=${endpoint} - ${content}`;
      }
    }

    const rec: DQLRecord = {
      timestamp: formatTimestamp(baseTime, elapsed),
      loglevel: level,
      content,
      host,
    };

    if (isHttpRequest) {
      rec["http.method"] = httpMethod;
      rec["http.status"] = httpStatus!;
    }
    if (errorMessage) {
      rec["error.message"] = errorMessage;
    }

    records.push(rec);
  }

  return records;
}

// ─── Nginx Access Logs (DPL cases) ───
export function generateNginxLogs(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T08:00:00Z");
  const ips = Array.from({ length: 50 }, (_, i) => {
    const a = randInt(rng, 10, 223);
    const b = randInt(rng, 0, 255);
    const c = randInt(rng, 0, 255);
    const d = randInt(rng, 1, 254);
    return `${a}.${b}.${c}.${d}`;
  });
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  const paths = ["/api/users", "/api/orders", "/api/products", "/api/payment", "/api/shipping", "/api/cart", "/api/checkout", "/health", "/login", "/dashboard"];
  const statuses = [200, 201, 204, 301, 304, 400, 401, 403, 404, 500, 502, 503];
  const userAgents = ["Mozilla/5.0", "curl/7.68.0", "PostmanRuntime/7.28.4", "Go-http-client/1.1"];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 1, 15);
    const ip = randItem(rng, ips);
    const method = randItem(rng, methods);
    const path = randItem(rng, paths);
    const status = randItem(rng, statuses);
    const bytes = randInt(rng, 128, 65536);
    const ua = randItem(rng, userAgents);
    const ts = formatTimestamp(baseTime, elapsed);

    records.push({
      timestamp: ts,
      content: `${ip} - - [${ts.replace("T", ":").replace("Z", "")} +0000] "${method} ${path} HTTP/1.1" ${status} ${bytes} "-" "${ua}"`,
      host: `web-${randInt(rng, 1, 5)}`,
      loglevel: status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO",
    });
  }
  return records;
}

// ─── Syslog Lines (DPL cases) ───
export function generateSyslogLines(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T08:00:00Z");
  const hosts = ["prod-01", "prod-02", "prod-03", "db-01", "db-02", "app-01", "app-02"];
  const apps = ["sshd", "nginx", "kernel", "cron", "systemd", "docker", "postgres"];
  const messages = [
    "Accepted publickey for root",
    "Failed password for admin",
    "Connection closed by authenticating user",
    "session opened for user deploy",
    "service restarted successfully",
    "Out of memory: Kill process",
    "CPU temperature above threshold",
    "Disk space warning",
    "Backup completed",
    "Sync started",
  ];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 1, 20);
    const host = randItem(rng, hosts);
    const app = randItem(rng, apps);
    const pid = randInt(rng, 1000, 9999);
    const msg = randItem(rng, messages);
    const ts = formatTimestamp(baseTime, elapsed);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = new Date(baseTime.getTime() + elapsed * 1000);
    const syslogTs = `${monthNames[d.getUTCMonth()]} ${d.getUTCDate().toString().padStart(2, " ")} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;

    records.push({
      timestamp: ts,
      content: `${syslogTs} ${host} ${app}[${pid}]: ${msg}`,
      host,
      loglevel: msg.includes("Failed") || msg.includes("Out of memory") || msg.includes("Kill process") ? "ERROR" : msg.includes("warning") || msg.includes("temperature") ? "WARN" : "INFO",
    });
  }
  return records;
}

// ─── Firewall Logs (DPL cases) ───
export function generateFirewallLogs(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T08:00:00Z");
  const actions = ["ALLOW", "DENY", "DROP"];
  const protocols = ["TCP", "UDP", "ICMP"];
  const srcIps = Array.from({ length: 30 }, (_, i) => `${randInt(rng, 10, 223)}.${randInt(rng, 0, 255)}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`);
  const dstIps = Array.from({ length: 20 }, (_, i) => `${randInt(rng, 10, 223)}.${randInt(rng, 0, 255)}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`);

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 1, 10);
    const action = randItem(rng, actions);
    const proto = randItem(rng, protocols);
    const srcIp = randItem(rng, srcIps);
    const dstIp = randItem(rng, dstIps);
    const srcPort = randInt(rng, 1024, 65535);
    const dstPort = randInt(rng, 1, 65535);
    const ts = formatTimestamp(baseTime, elapsed);

    records.push({
      timestamp: ts,
      content: `action=${action} proto=${proto} src=${srcIp}:${srcPort} dst=${dstIp}:${dstPort}`,
      host: `fw-${randInt(rng, 1, 3)}`,
      loglevel: action === "DENY" || action === "DROP" ? "WARN" : "INFO",
    });
  }
  return records;
}

// ─── JSON Logs (DPL cases) ───
export function generateJsonLogs(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T08:00:00Z");
  const services = ["user-service", "order-service", "payment-service", "catalog-service"];
  const levels = ["INFO", "WARN", "ERROR"];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 1, 15);
    const level = randItem(rng, levels);
    const service = randItem(rng, services);
    const ts = formatTimestamp(baseTime, elapsed);
    const latency = randInt(rng, 10, 500);
    const status = level === "ERROR" ? 500 : level === "WARN" ? 400 : 200;

    records.push({
      timestamp: ts,
      content: JSON.stringify({ level, service, latency_ms: latency, status_code: status, trace_id: `trace-${randInt(rng, 1000, 9999)}` }),
      host: `${service}-01`,
      loglevel: level,
    });
  }
  return records;
}

// ─── Apache Access Logs (DPL cases) ───
export function generateApacheLogs(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T08:00:00Z");
  const ips = Array.from({ length: 40 }, (_, i) => `${randInt(rng, 10, 223)}.${randInt(rng, 0, 255)}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`);
  const methods = ["GET", "POST", "HEAD"];
  const paths = ["/index.html", "/api/data", "/static/style.css", "/login", "/admin", "/health", "/metrics"];
  const codes = [200, 301, 404, 500, 403];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 1, 20);
    const ip = randItem(rng, ips);
    const method = randItem(rng, methods);
    const path = randItem(rng, paths);
    const code = randItem(rng, codes);
    const bytes = randInt(rng, 200, 50000);
    const ts = formatTimestamp(baseTime, elapsed);
    const d = new Date(baseTime.getTime() + elapsed * 1000);
    const apacheTs = `${d.getUTCDate()}/${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}/${d.getUTCFullYear()}:${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} +0000`;

    records.push({
      timestamp: ts,
      content: `${ip} - frank [${apacheTs}] "${method} ${path} HTTP/1.0" ${code} ${bytes}`,
      host: `apache-${randInt(rng, 1, 3)}`,
      loglevel: code >= 500 ? "ERROR" : code >= 400 ? "WARN" : "INFO",
    });
  }
  return records;
}

// ─── Payment Gateway Logs (premium cases) ───
export function generatePaymentLogs(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T08:00:00Z");
  const currencies = ["USD", "EUR", "GBP", "INR", "JPY"];
  const methods = ["card", "paypal", "stripe", "applepay", "crypto"];
  const merchants = ["shopify-store-01", "woocommerce-02", "bigcommerce-03", "magento-04"];
  const statuses = ["approved", "declined", "pending", "refunded", "charged_back"];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 1, 8);
    const txId = `TXN-${randInt(rng, 100000, 999999)}`;
    const amount = parseFloat((rng() * 1200 + 5).toFixed(2));
    const currency = randItem(rng, currencies);
    const method = randItem(rng, methods);
    const merchant = randItem(rng, merchants);
    const status = randItem(rng, statuses);
    const isFraudSignal = i < 80;
    const finalStatus = isFraudSignal && amount > 600 ? "declined" : status;
    const riskFlag = isFraudSignal && amount > 600 ? "fraud_alert" : "normal";

    records.push({
      timestamp: formatTimestamp(baseTime, elapsed),
      loglevel: finalStatus === "declined" || finalStatus === "charged_back" ? "WARN" : "INFO",
      content: `txn_id=${txId} amount=${amount} currency=${currency} method=${method} merchant=${merchant} status=${finalStatus} risk=${riskFlag}`,
      host: `payment-${randInt(rng, 1, 4)}`,
    });
  }
  return records;
}

// ─── Kubernetes Pod Logs (premium cases) ───
export function generateK8sLogs(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T08:00:00Z");
  const namespaces = ["production", "staging", "monitoring", "data-pipeline", "ingress-nginx"];
  const pods = ["api-gateway", "user-service", "order-processor", "notification-worker", "cache-redis", "db-postgres", "log-aggregator"];
  const containers = ["app", "sidecar", "init", "exporter"];
  const errorMessages = [
    "OOMKilled: container exceeded memory limit",
    "CrashLoopBackOff: pod restarting too frequently",
    "ImagePullBackOff: failed to pull image",
    "FailedMount: volume mount timed out",
    "Liveness probe failed after 3 attempts",
  ];
  const infoMessages = [
    "Pod scheduled successfully",
    "Container started",
    "Health check passed",
    "Scaling replica set to 3",
    "Ingress rule updated",
  ];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 1, 12);
    const ns = randItem(rng, namespaces);
    const pod = randItem(rng, pods);
    const container = randItem(rng, containers);
    const isError = rng() < 0.2;
    const level = isError ? "ERROR" : rng() < 0.1 ? "WARN" : "INFO";
    const msg = isError ? randItem(rng, errorMessages) : randItem(rng, infoMessages);

    records.push({
      timestamp: formatTimestamp(baseTime, elapsed),
      loglevel: level,
      content: `namespace=${ns} pod=${pod} container=${container} message="${msg}"`,
      host: `k8s-worker-${randInt(rng, 1, 6)}`,
    });
  }
  return records;
}

// ─── API Gateway Logs (premium cases) ───
export function generateApiGatewayLogs(count: number, seed: number): DQLRecord[] {
  const rng = seededRandom(seed);
  const baseTime = new Date("2024-01-15T08:00:00Z");
  const apis = ["/v1/users", "/v1/orders", "/v1/payments", "/v1/inventory", "/v1/reports", "/v1/search", "/v1/webhooks"];
  const keys = Array.from({ length: 20 }, (_, i) => `key_${randInt(rng, 1000, 9999)}`);
  const httpMethods = ["GET", "POST", "PUT", "DELETE"];

  // Stable entity IDs — represent the AWS API Gateway topology as seen by Dynatrace
  const apiv2Ids = Array.from({ length: 3 }, () => `AWS_API_GATEWAY_APIGATEWAYV2_API-${randHex(rng, 16)}`);
  const restApiIds = Array.from({ length: 2 }, () => `AWS_API_GATEWAY_RESTAPI-${randHex(rng, 16)}`);
  const errorMessages = [
    "upstream connect error or disconnect/reset before headers",
    "timeout awaiting response headers",
    "rate limit quota exceeded for api key",
    "backend target unhealthy",
    "integration response timed out after 29000ms",
  ];

  const records: DQLRecord[] = [];
  let elapsed = 0;

  for (let i = 0; i < count; i++) {
    elapsed += randInt(rng, 1, 5);
    const api = randItem(rng, apis);
    const key = randItem(rng, keys);
    const httpMethod = randItem(rng, httpMethods);
    const latency = randInt(rng, 20, 800);
    const httpStatus: number = latency > 500 ? 503 : latency > 300 ? 429 : 200;
    const quotaRemaining = randInt(rng, 0, 1000);
    const level = httpStatus >= 500 ? "ERROR" : httpStatus >= 400 ? "WARN" : "INFO";

    const rec: DQLRecord = {
      timestamp: formatTimestamp(baseTime, elapsed),
      loglevel: level,
      content: `api_key=${key} endpoint=${httpMethod} ${api} latency_ms=${latency} status=${httpStatus} quota_remaining=${quotaRemaining}`,
      host: `gateway-${randInt(rng, 1, 3)}`,
      "http.method": httpMethod,
      "http.status": httpStatus,
    };

    // ~96% carry the v2 API entity (matches sample distribution 24/25)
    if (rng() < 0.96) {
      rec["dt.smartscape.aws_api_gateway_apigatewayv2_api"] = randItem(rng, apiv2Ids);
    }

    // ~40% also have a REST API entity (older gateway config alongside v2)
    if (rng() < 0.4) {
      rec["dt.smartscape.aws_api_gateway_restapi"] = randItem(rng, restApiIds);
    }

    // ~36% carry an AWS request ID (matches sample distribution 9/25)
    if (rng() < 0.36) {
      rec["aws.request_id"] = `${randHex(rng, 8)}-${randHex(rng, 4)}-${randHex(rng, 4)}-${randHex(rng, 4)}-${randHex(rng, 12)}`.toLowerCase();
    }

    if (level === "ERROR") {
      rec["error.message"] = randItem(rng, errorMessages);
    }

    records.push(rec);
  }
  return records;
}

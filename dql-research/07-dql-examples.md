# DQL Practical Examples

> Real-world query patterns for logs, metrics, events, business events, and spans
> Date: 2026-04-29

## Logs

### Basic log filtering
```dql
fetch logs, from: -24h
| filter loglevel == "ERROR"
| fields timestamp, loglevel, log.source, content
| sort timestamp desc
| limit 100
```

### Parse HTTP status codes from HAProxy logs
```dql
fetch logs
| filter dt.entity.process_group == "PROCESS_GROUP-123F4A56BCDA0EA9"
| parse content, "LD 'HTTP_STATUS ' INT:httpstatus"
| filter httpstatus >= 400
| summarize count(), by:{httpstatus}
```

### Average cart size from structured application logs
```dql
fetch logs, from:now()-3h
| filter dt.process.name == "cartservice cartservice-*"
| filter contains(content, "AddItemAsync")
| parse content, "LD 'userId=' LD:userId ', productId=' LD:productId ', quantity=' INT:productQuantity"
| fields productId, productQuantity
| summarize averageProductQuantity = avg(productQuantity), by:{productId}
| sort averageProductQuantity desc
| limit 5
```

### Track user changes from audit logs
```dql
fetch logs, from:now()-5m
| filter endsWith(log.source, "change.log")
| parse content, "TIMESTAMP('yyyy-MM-dd HH:mm:ss'):ts LD JSON:settings"
| fieldsAdd type = settings[eventType], tenant = settings[tenantId], user = settings[userId]
| filter in(type, array("UPDATE", "DELETE"))
| summarize count(), by:{user, type}
```

### Parse JSON and aggregate by payment provider
```dql
fetch logs
| parse content, "JSON:json"
| fields payment = json[payment_provider]
| summarize
    bank_card = countIf(payment == "bank_card"),
    bank_cardPerc = toDouble(countIf(payment == "bank_card")) / toDouble(count()),
    paypal = countIf(payment == "paypal"),
    paypalPerc = toDouble(countIf(payment == "paypal")) / toDouble(count()),
    total = count()
```

## Metrics

### Average CPU usage across all hosts
```dql
timeseries usage = avg(dt.host.cpu.usage)
```

### Average CPU usage by host (top 3)
```dql
timeseries usage = avg(dt.host.cpu.usage, scalar:true), by:{dt.entity.host}
| fieldsAdd entityName(dt.entity.host)
| sort usage desc
| limit 3
| fields dt.entity.host, dt.entity.host.name, usage
```

### Per-second failure rate for an endpoint
```dql
timeseries sum(dt.service.request.failure_count, rate:1s),
    filter:{startsWith(endpoint.name, "/api/accounts")}
```

### Host availability (count hosts that are "up")
```dql
timeseries availability = sum(dt.host.availability, default:0),
    nonempty:true,
    filter:{availability.state == "up"}
```

### Capacity planning (compare today vs. 7 days ago)
```dql
timeseries avail = avg(dt.host.disk.avail), by:{dt.entity.host}, from:-24h
| append [
    timeseries avail.yesterday = avg(dt.host.disk.avail), by:{dt.entity.host}, shift:-168h
  ]
| filter startsWith(entityName(dt.entity.host), "prod-")
```

## Business Events

### Average trading dollar volume
```dql
fetch bizevents, from:now()-24h, to:now()
| filter event.type == "com.easytrade.quick-buy" or event.type == "com.easytrade.long-buy"
| summarize dollar_volume = avg(amount * price)
```

### Trading volume over time (line chart)
```dql
fetch bizevents, from:now()-24h, to:now()
| filter event.type == "com.easytrade.nginx.quick-sell"
| makeTimeseries dollar_volume = sum(amount * price), interval:5m
```

### Daily deposits over 30 days
```dql
fetch bizevents, from:now()-30d, to:now()-1d
| filter event.type == "com.easytrade.deposit"
| makeTimeseries moneyTransfered = sum(amount), interval:1d
```

### Time elapsed between related events
```dql
fetch bizevents, from:now()-30d, to:now()
| filter event.provider == "www.easytrade.com"
| sort timestamp, direction:"descending"
| filter event.type == "com.easytrade.deposit" or event.type == "com.easytrade.withdraw"
| fieldsAdd deposit_ts = if(event.type == "com.easytrade.deposit", timestamp)
| fieldsAdd withdraw_ts = if(event.type == "com.easytrade.withdraw", timestamp)
| summarize
    first_deposit_ts = takeFirst(deposit_ts),
    first_withdraw_ts = takeFirst(withdraw_ts),
    by:{accountId}
| fieldsAdd timeDepositToDeposit = (first_withdraw_ts - first_deposit_ts) / 1000000000.0
| filter timeDepositToDeposit > duration(0, unit:"ns")
```

### Missing transaction anomaly detection
```dql
fetch bizevents, from:now()-24h, to:now()
| filter event.provider == "www.acme.com"
| summarize
    A_place_order = countIf(event.type == "com.acme.order_confirmed"),
    B_payment_confirmed = countIf(event.type == "com.acme.payment_confirmed"),
    C_order_confirmed = countIf(event.type == "com.acme.close_order"),
    by:{order_id}
| fieldsAdd fulfilled = (A_place_order == B_payment_confirmed and A_place_order == C_order_confirmed)
| filter A_place_order == 1
```

### Business events during office hours
```dql
fetch bizevents
| filter event.provider == "www.easytrade.com"
| filter isNotNull(cardType)
| fieldsAdd hour = getHour(timestamp), day_of_week = getDayOfWeek(timestamp)
| filterOut day_of_week == "Sat" or day_of_week == "Sun"
| filterOut hour <= 6 or hour >= 17
| fields AccountID, event.type, amount, cardType, event.kind
```

## Events

### Count actions per user
```dql
fetch events, from:-24h
| summarize
    creates = countIf(event.type == "CREATE"),
    updates = countIf(event.type == "UPDATE"),
    deletes = countIf(event.type == "DELETE"),
    by:{user, tenant}
```

## Spans

### Error rate by service
```dql
fetch spans, from:-1h
| filter status.code == "ERROR"
| summarize error_count = count(), by:{service.name}
| sort error_count desc
```

### Latency percentile by endpoint
```dql
fetch spans, from:-1h
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99),
    by:{endpoint.name}
| sort p95 desc
```

## Time Series

### Error count over time by log level
```dql
fetch logs, from:-24h
| filter loglevel == "ERROR"
| makeTimeseries errors = count(), by:loglevel, interval:5m
```

### Multi-metric timeseries with default gap-fill
```dql
fetch logs, from:-7d
| makeTimeseries
    count = count(),
    highVolume = countIf(amount > 1000),
    maxPrice = max(price),
    by:accountId,
    interval:1d,
    default:0
```

## Joins

### Join logs with host entity data
```dql
fetch logs
| join kind:leftOuter,
    on:{host},
    [fetch dt.entity.host]
```

### Lookup host name from entity table
```dql
fetch logs
| lookup sourceField:host, lookupField:dt.entity.host,
    [fetch dt.entity.host],
    prefix:host.
```

## Data Generation

### Generate sample records inline
```dql
data record(name = "test", value = 1),
     record(name = "demo", value = 2)
| fieldsAdd doubled = value * 2
```

### Generate from JSON string
```dql
data json: """{"name":"test","value":1}"""
```

## Smartscape

### Load Smartscape nodes
```dql
smartscapeNodes "dt.entity.process_group"
```

### Traverse from services to hosts
```dql
fetch dt.entity.service
| traverse type:runs_on
| fields dt.entity.host.name
```

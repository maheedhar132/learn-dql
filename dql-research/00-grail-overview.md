# Dynatrace Grail Overview

> Research for DQL Investigator game design
> Date: 2026-04-29

## What is Grail?

Dynatrace Grail is "The Grail™ data lakehouse at the heart of the Dynatrace platform," engineered for digital service telemetry at enormous scale.

## Key Characteristics

### Data Lakehouse Architecture
- Combines **cost efficiency of data lakes** with **analytics capabilities of data warehouses**
- Speed via distributing queries across many parallel workers
- Preserves connections across telemetry, risk signals, and business datasets
- Maintains "a graph context with causal dependencies among data"

### Storage Model
- **Immutable data storage**: once written, data stays frozen
- Stored as **atomic, unchangeable records**
- Bundled into chronologically ordered parcels (~1GB each)
- Resides in distributed cloud object stores
- **Always-hydrated zero-latency cold/hot storage** — no reloading delays
- Datawarping technique fetches content without conventional indexes

### Query Processing
- Users cannot touch raw storage directly
- A **Query Processing layer** acts as a secure gateway
- All access is through DQL queries
- True hard deletion is possible through audited APIs that rewrite entire packets

### Schema
- **Schemaless read-time model** — no upfront schema definition required
- Tagging and schema definition become unnecessary because context emerges automatically during intake
- The engine blends graph connections, event streams, chronological metrics, and flexible NoSQL structures

## Visual Metaphors for the Game

- A beating heart at the center of a digital city
- A physical lakehouse blending warehouse shelves with water
- A glowing web or constellation map tracing causal threads
- Warp-speed tunnels or teleportation portals representing datawarping
- Eternally flowing springs symbolizing always-hydrated storage
- Contrasting arctic and tropical zones for cold/hot tiers
- Sealed stone tablets or unbreakable blocks for immutable atomic records
- A time-stamped cargo train carrying one-gigabyte capsules
- A fortified castle gate manned by guards depicting the secure query layer

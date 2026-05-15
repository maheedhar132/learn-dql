# DQL Visual Signatures

> How each DQL command should animate in the Data View — making the invisible visible
> Date: 2026-04-29

## Philosophy

Every DQL command transforms data. In the Data View (the hero pane), these transformations must be **visible, physical, and intuitive**. Rows are not abstract records — they are tangible objects that can appear, disappear, move, split, merge, and morph.

## Animation Language

| Term | Meaning |
|------|---------|
| **Flash** | Brief color pulse (red = removed, green = added, gold = changed) |
| **Shrink/Grow** | Scale transform with spring physics |
| **Slide** | Horizontal or vertical translation |
| **Morph** | One shape transitions into another |
| **Split** | One row becomes multiple |
| **Merge** | Multiple rows collapse into one |
| **Fade** | Opacity transition |
| **Glow** | Box-shadow or border luminosity pulse |
| **Bar** | The record-count bar at the top of the Data View |

## Command Signatures

### `fetch`
- **Effect**: Full dataset materializes from nothing
- **Animation**: Rows cascade in from top with staggered delay (0.03s per row). The record-count bar grows from 0% to 100% with a smooth ease-out.
- **Sound**: Soft "whoosh" or data-stream hum
- **Metaphor**: A filing cabinet drawer sliding open, revealing files

### `filter`
- **Effect**: Rows that do NOT match the condition are removed
- **Animation**: Matching rows get a subtle green border glow. Non-matching rows flash **red**, then slide downward and fade out. The record-count bar shrinks to the new percentage.
- **Sound**: Dropping/thud for removed rows
- **Metaphor**: A sieve — unwanted grains fall through

### `filterOut`
- **Effect**: Rows that DO match the condition are removed
- **Animation**: Same as `filter`, but removed rows flash **orange** instead of red (to distinguish the inverse logic).
- **Metaphor**: A magnet pulling away metal fragments, leaving the pure material

### `search`
- **Effect**: Rows are scored by token match; non-matching rows dim
- **Animation**: Matching fields within rows briefly **glow gold** (1.2x brightness). Non-matching rows fade to 30% opacity. The search term highlights in-place like a highlighter pen.
- **Metaphor**: A flashlight sweeping across documents, illuminating keywords

### `fields` / `fieldsKeep`
- **Effect**: Columns are reduced
- **Animation**: Kept columns stay solid. Removed columns **slide right** and fade out. The table width compresses smoothly. Column headers shrink with a slight blur.
- **Metaphor**: Folding a map — only the relevant section remains visible

### `fieldsAdd`
- **Effect**: New column appears
- **Animation**: New column slides in from the **right** with a green glow, pushing existing columns left. Header morphs in with a flash.
- **Metaphor**: A new sticky note appearing on a whiteboard

### `fieldsRemove`
- **Effect**: Specific columns disappear
- **Animation**: Targeted columns fade out with a slight downward drift (0.5s). Other columns slide to fill the gap.
- **Metaphor**: Erasing specific entries from a ledger

### `fieldsRename`
- **Effect**: Column header changes name
- **Animation**: Old header text blurs out, new text blurs in with a gold flash on the header cell.
- **Metaphor**: A label being peeled off and replaced

### `fieldsAdd` (computed)
- **Effect**: New computed column
- **Animation**: Values "type themselves in" character-by-character (fast, 0.3s total) in the new column, as if being entered on a teletype.
- **Metaphor**: A calculator printing a tape

### `summarize`
- **Effect**: Many rows collapse into aggregated groups
- **Animation**: Rows belonging to the same group **slide toward each other horizontally** and merge into a single bar. The table morphs into a **horizontal bar chart**. Bar heights represent aggregate values. Groups sort by value.
- **Transition**: 0.8s spring physics. Non-grouped fields dissolve.
- **Sound**: Soft clink/chime as rows stack
- **Metaphor**: Sorting coins into piles by denomination, then stacking them

### `makeTimeseries`
- **Effect**: Data aggregated into time buckets
- **Animation**: Rows scatter into time slots like raindrops falling into buckets. The table morphs into a **line chart** or bar chart with time on X-axis. Empty buckets show a dashed outline.
- **Transition**: 1.0s. Each bucket "fills" from bottom with fluid animation.
- **Metaphor**: Hourglasses filling with sand at each time interval

### `sort`
- **Effect**: Rows reorder
- **Animation**: Rows physically **swap positions** with spring physics. Moving rows leave a faint motion trail. Sort indicator (up/down arrow) appears in the header with a bounce.
- **Transition**: 0.6s per swap. Staggered so the whole sort completes in ~1.2s.
- **Sound**: Soft shuffling/papers rustling
- **Metaphor**: A dealer sorting cards on a felt table

### `limit`
- **Effect**: Cap the number of rows
- **Animation**: A **vertical wall** slides in from the right at the cutoff point. Rows beyond the wall are pushed off-screen with a red tint and fade. The record-count bar gets physically cut by the wall.
- **Transition**: 0.5s
- **Metaphor**: A guillotine blade dropping, or a gate closing

### `dedup`
- **Effect**: Duplicate rows are merged
- **Animation**: Duplicate rows **highlight in amber**, then collapse into a single row. The surviving row gets a subtle pulse. A badge shows "+N merged".
- **Transition**: 0.5s
- **Metaphor**: Two identical documents being stapled together

### `parse`
- **Effect**: Extract structured data from raw text
- **Animation**: Raw text cell shows a **regex highlight sweep** (left to right, like a scanner). Extracted fields pop out as colored labels that float upward and slot into new columns. Unmatched text dims slightly.
- **Transition**: 1.0s for the sweep, 0.3s per extracted field
- **Sound**: Scanner beep for each match
- **Metaphor**: An X-ray revealing bones inside a body

### `expand`
- **Effect**: One row with an array becomes N rows
- **Animation**: The array cell **splits vertically** like a cell dividing under a microscope. Each element pulls out into its own row. Original field values clone to each new row with a ghosting effect.
- **Transition**: 0.6s. Staggered per element (0.05s delay).
- **Sound**: Soft "pop" for each split
- **Metaphor**: A single egg hatching into multiple chicks

### `flatten` / `fieldsFlatten`
- **Effect**: Nested record fields pulled to top level
- **Animation**: Nested fields "unfold" from their parent cell like an origami flower opening. Dot-notation labels (e.g., `user.name`) trace paths from nested position to top-level column.
- **Transition**: 0.7s
- **Metaphor**: Opening a nested set of Russian dolls

### `join`
- **Effect**: Two streams merge based on a condition
- **Animation**: Left table stays. Right table slides in from the **right** as a ghosted mini-table. Matching rows **lock together** with a magnetic snap and a connecting line. Unmatched rows (leftOuter) show nulls as gray dashes.
- **Transition**: 1.0s for the merge
- **Sound**: Click/lock sound for each match
- **Metaphor**: Two trains coupling together at a junction

### `joinNested`
- **Effect**: Matching results become nested array on left row
- **Animation**: Matching rows from the right stream **shrink and fly into** the left row's new column as a stacked card deck. A badge shows the array count.
- **Metaphor**: Filing multiple related documents into a single folder

### `lookup`
- **Effect**: Fields from subquery added by match
- **Animation**: A **second mini-table slides in** from the right. Matching rows glow and merge. Added fields appear with a purple tint. Prefix is shown as a breadcrumb trail on the header.
- **Metaphor**: Looking up a name in a phone book and writing the number in the margin

### `append`
- **Effect**: Records from subquery added below
- **Animation**: Subquery results slide up from the **bottom** with a different tint (slightly warmer color temperature). A subtle divider line appears between original and appended blocks.
- **Metaphor**: Stapling a new page to the bottom of a report

### `data`
- **Effect**: Generate sample data inline
- **Animation**: Records "type themselves in" row by row from top, as if being entered into a terminal.
- **Metaphor**: A teletype machine printing sample cards

### `describe`
- **Effect**: Schema extraction
- **Animation**: The dataset freezes in place. A sidebar slides in showing column names and type icons (INT, STR, TIME, etc.) with connecting lines to their source columns.
- **Metaphor**: A detective's magnifying glass examining evidence labels

### `load`
- **Effect**: External lookup file loaded
- **Animation**: A file icon drops from above and "unpacks" into rows.
- **Metaphor**: A courier delivering a file folder

### `timeseries` / `metrics`
- **Effect**: Metric data loaded as time series
- **Animation**: Data points drop onto a time axis like rain onto a graph paper, connecting into lines as they land.
- **Metaphor**: A seismograph needle drawing continuously

### `smartscapeNodes` / `smartscapeEdges`
- **Effect**: Topology data loaded
- **Animation**: Nodes appear as glowing dots on a network graph. Edges draw themselves as animated lines between nodes.
- **Metaphor**: A constellation map being sketched in real-time

### `traverse`
- **Effect**: Graph traversal
- **Animation**: A "walker" dot travels along edges from source to target nodes, leaving a glowing trail. Reached nodes pulse when visited.
- **Metaphor**: A bloodhound following a scent trail through a network

## Meta-Animations

### Pipeline Stage Transitions
When moving from one command to the next, the Data View should show a **brief "stage card" overlay** (0.4s) with:
- Command name
- Icon representing the visual signature
- Before/after row count

### Error State
If a command is invalid:
- The offending command in the pipeline glows **red**.
- Data View shows a "glitch" effect (RGB split + horizontal lines) for 0.3s.
- Error tooltip appears with specific message.

### Empty Result
If a command produces zero rows:
- Data View shows a dashed outline of where rows would be.
- Text: "No records match this condition."
- The record-count bar shrinks to a thin line at 0%.

## Color Coding

| Event | Color | Hex |
|-------|-------|-----|
| Row added / created | Green | `#22c55e` |
| Row removed / filtered out | Red | `#ef4444` |
| Row modified / changed | Gold | `#f59e0b` |
| Row matched (search) | Amber glow | `#fbbf24` |
| New column | Cyan | `#06b6d4` |
| Null / empty | Gray | `#94a3b8` |
| Join match | Purple | `#a855f7` |
| Parse match | Teal | `#14b8a6` |
| Warning / orange | Orange | `#f97316` |

---
url: https://canary.warp-drive.io/skills/contributors/fix-at-the-source.md
---
# Fix at the Source

Use this skill whenever you're fixing a bug, adding a guard, or adding a fallback inside
WarpDrive's internals (`Store`, cache, graph, reactive signals, record arrays). The question is
never just "where do I stop the crash" — it's "where does 'x changed' fail to correctly produce
'y updated', and what's the one place that should know it."

## Steps

1. Trace the bug back to its root cause: the place where a change to one piece of state should
   have correctly propagated to another, and didn't. Fix there, not at the symptom's surface.
   A patch at the surface only treats the one call site that happened to crash or misbehave —
   every other consumer of the same broken invariant is still wrong.
2. That root cause is usually also the cheapest place to check: the earliest point in the call
   chain where the fact you need — "is there new data to sync," "did anything actually change" —
   is already known or a single cheap check away (an `undefined` check, a reference comparison, a
   boolean already on the object). Put the fix there, immediately in front of the work it's
   guarding.
3. Centralize the check at that one source instead of duplicating a defensive check at every
   downstream consumer. Don't guard further upstream "just in case" (runs even when the expensive
   work wouldn't have happened) or further downstream after the fact (too late, and easy to miss
   a sibling call site that needs the same guard). One correct check at the source beats the same
   defensive check copy-pasted in ten places.
4. Don't reach for a wider fix (a new state field, a broader notification path, a refactor of how
   staleness is tracked) when a narrow, local check at the source does the job. Save the bigger
   change for when the narrow check turns out to be wrong somewhere else too.
5. Treat a fallback (`?? []`, `|| defaultValue`) that only exists to stop a crash as a smell, not
   a fix — it silently produces a plausible-looking wrong result instead of a loud one, and
   doesn't restore the "x changed → y updated" correctness that was actually broken. Prefer a
   guard that skips unnecessary work over a fallback that fabricates an input for it.
6. If the fix changes behavior that is documented — a TSDoc comment, a guide, or an upgrade
   page now says something untrue — update that documentation in the same PR. Follow
   [Write Documentation](./write-documentation.md); its checklist has a bug-fix row for exactly
   this case, and a fix that leaves the docs describing the old behavior isn't finished.

## Example

`ManyArrayManager#_syncArray` re-syncs a `ManyArray`'s membership whenever its relationship goes
stale. A relationship can go stale from a `links`-only update with no new `data` (e.g. a save
response that only changes a pagination link) — in that case there is no membership to sync at
all. The root cause was that staleness alone doesn't imply new membership data exists; the fix
was a single `rawValue.data !== undefined` check placed directly in front of the clear-and-refill,
the one place that has the fact it needs. Not a `?? []` fallback (which would silently empty an
already-populated array on an unrelated links-only change, papering over the symptom instead of
the cause) and not a fix upstream in the graph layer (which would touch every consumer of
relationship state to fix a bug specific to this one array-sync path, trading a narrow correct
check for a wide speculative one).

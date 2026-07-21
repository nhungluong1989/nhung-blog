---
title: The one habit that saved my weekends — idempotent pipelines
description: Why a pipeline you can safely re-run is worth more than a clever one, and how to build it.
pubDate: 2026-07-21
tags:
  - data engineering
---

Early on, I built pipelines that worked — right up until they didn't. A job would fail halfway, I'd rerun it, and now yesterday's numbers were double-counted. The fix was never a fancier tool. It was one idea: **make every job safe to run twice.**

That property has a name: *idempotency*. An idempotent pipeline produces the same result whether you run it once or five times. Once I started designing for it, the 3am "why is revenue doubled" pages basically stopped.

## The trap: append-only writes

Here's the pattern that burned me. It looks harmless:

```python
def load(date):
    df = transform(read_raw(date))
    df.to_sql("orders", engine, if_exists="append")  # danger
```

Run it once, you get the right rows. Run it again after a failure, and you get *those same rows a second time*. The job "succeeded" both times — the data is just quietly wrong.

## The fix: make the write replace, not add

The trick is to tie each run to the slice of data it owns, then **delete that slice before writing it**. Re-running just replaces the slice with an identical one:

```python
def load(date):
    df = transform(read_raw(date))
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM orders WHERE order_date = :d"),
            {"d": date},
        )
        df.to_sql("orders", conn, if_exists="append", index=False)
```

Now the outcome depends only on the *input for that date*, not on how many times the job ran. That's the whole game.

## Three rules I now follow

A few habits make idempotency the default instead of an afterthought:

- **Partition by a natural key.** A date, an hour, a batch id — something each run owns cleanly. Your delete-then-write targets exactly that partition and nothing else.
- **Never trust "append" alone.** If a table only ever grows, a single retry corrupts it. Prefer overwrite-by-partition, or an upsert keyed on a unique column.
- **Make failure boring.** Wrap the delete and the write in one transaction so a crash mid-write rolls back. A half-finished run should leave *no* trace, not half a trace.

For warehouses, the same idea shows up as `MERGE`:

```sql
MERGE INTO orders AS t
USING staging_orders AS s
  ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET t.amount = s.amount
WHEN NOT MATCHED THEN INSERT (order_id, amount)
  VALUES (s.order_id, s.amount);
```

Same row in, same row out — no matter how many times it runs.

## Why it's worth the extra thought

Idempotency turns retries from something you fear into something you shrug at. A job failed overnight? Rerun it. Backfilling three months? Loop over the dates — each one cleanly replaces itself. No cleanup scripts, no manual "did this already run?" detective work.

It's not the most exciting property to design for. But it's the one that lets me sleep, and after a few painful weekends, that's the trade I'll take every time.
---
title: Batch vs. streaming, explained with a real pipeline
description: When "just make it real-time" actually costs you, and when it pays off.
pubDate: 2026-07-10
tags:
  - data engineering
---

Most teams reach for streaming too early. Here's a simple batch job that covers 90% of cases before you ever need Kafka:

```python
# daily batch: load, transform, write
import pandas as pd

def run(date):
    df = pd.read_parquet(f"raw/{date}.parquet")
    df = df[df.amount > 0]
    df.to_parquet(f"clean/{date}.parquet")
```

No brokers, no consumers, no 3am pages. If your data lands once a day, a job like this is enough.

## When streaming earns its keep

Reach for streaming when the *value of the data decays in seconds* — fraud detection, live dashboards, alerting. If a one-hour delay is fine, batch is almost always cheaper to build and run.

> Rule of thumb: start with batch, and let a real latency requirement — not excitement — pull you toward streaming.

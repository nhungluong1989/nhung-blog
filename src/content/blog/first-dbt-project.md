---
title: My first dbt project, and what I'd do differently
description: Models, tests, and the folder structure I wish I'd started with.
pubDate: 2026-07-15
tags:
  - data engineering
---

The first time I set up dbt, I dumped every model into one folder. Six months later it was unmaintainable. Here's the structure I use now:

```
models/
  staging/     -- 1:1 with source tables, light renaming
  intermediate/-- reusable joins and logic
  marts/       -- business-facing tables
```

## Test as you go

The single highest-leverage habit is adding tests from day one:

```yaml
models:
  - name: stg_orders
    columns:
      - name: order_id
        tests: [unique, not_null]
```

These catch broken assumptions before they reach a dashboard someone trusts.

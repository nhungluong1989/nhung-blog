---
title: "Walking through prompt caching, turn by turn"
description: A three-turn worked example of Claude's prompt caching — what gets read, what gets written, where the 20-block lookback quietly breaks it, and what it's actually worth in dollars.
pubDate: 2026-08-06
tags:
  - ai engineering
  - reading notes
---

Prompt caching always made sense to me in the abstract — don't repay for tokens you've already sent — but it didn't click until I traced the actual `usage` numbers through a real conversation, turn by turn. Once I saw the pattern accumulate, the [docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) stopped being an API reference and started being obvious. So here's the mechanism first, then the one place it quietly breaks, then what it's actually worth once I ran it against a real document instead of a toy example.

## The setup

A ~1,000-token system prompt (a tutor persona) that never changes, plus a growing back-and-forth about the solar system. The Messages API is stateless, so at every turn the client resends the *entire* conversation so far and puts `cache_control` on the last block — that's the breakpoint.

## Turn 1 — first message ever

```json
{
  "system": [
    {"type": "text", "text": "...1000-token tutor system prompt...", "cache_control": {"type": "ephemeral"}}
  ],
  "messages": [
    {"role": "user", "content": [
      {"type": "text", "text": "Tell me about the solar system.", "cache_control": {"type": "ephemeral"}}
    ]}
  ]
}
```

No cache exists yet, so there's nothing to read. The breakpoint at the end of the user block causes everything up to it to be written fresh:

```json
"usage": {
  "input_tokens": 0,
  "cache_read_input_tokens": 0,
  "cache_creation_input_tokens": 1020,
  "output_tokens": 150
}
```

1020 = 1000 (system prompt) + 20 (the question). Claude replies with 150 tokens — call it `a1`.

## Turn 2 — a follow-up

The client resends system + turn 1's question + turn 1's answer, plus the new question, with the breakpoint moved to the new last block:

```json
{
  "system": [
    {"type": "text", "text": "...1000-token tutor system prompt...", "cache_control": {"type": "ephemeral"}}
  ],
  "messages": [
    {"role": "user", "content": [{"type": "text", "text": "Tell me about the solar system."}]},
    {"role": "assistant", "content": "...150-token answer about planets..."},
    {"role": "user", "content": [
      {"type": "text", "text": "Tell me more about Mars.", "cache_control": {"type": "ephemeral"}}
    ]}
  ]
}
```

Claude hashes the prefix at the new breakpoint — no match there. It walks backward one block at a time and finds turn 1's cached entry (system + first question, 1020 tokens). Cache hit. Only what comes after that point — `a1` plus the new question — is new:

```json
"usage": {
  "input_tokens": 0,
  "cache_read_input_tokens": 1020,
  "cache_creation_input_tokens": 180,
  "output_tokens": 200
}
```

180 = 150 (`a1`, now folded into the prefix) + 30 (the Mars question). Reply: 200 tokens (`a2`).

## Turn 3 — the pattern locks in

Same shape: resend everything, breakpoint on the new last block.

```json
{
  "system": [...same 1000-token prompt, cache_control...],
  "messages": [
    {"role": "user", "content": [{"type": "text", "text": "Tell me about the solar system."}]},
    {"role": "assistant", "content": "...150-token answer..."},
    {"role": "user", "content": [{"type": "text", "text": "Tell me more about Mars."}]},
    {"role": "assistant", "content": "...200-token answer about Mars..."},
    {"role": "user", "content": [
      {"type": "text", "text": "What about its moons?", "cache_control": {"type": "ephemeral"}}
    ]}
  ]
}
```

The walk-back finds turn 2's cached entry, which now covers 1020 + 180 = 1200 tokens. Cache hit on all of it. Only the newest increment — `a2` plus the moons question — gets written:

```json
"usage": {
  "input_tokens": 0,
  "cache_read_input_tokens": 1200,
  "cache_creation_input_tokens": 215,
  "output_tokens": 180
}
```

215 = 200 (`a2`) + 15 (the new question). Three turns in, the pattern is already obvious enough to write down as a table.

## The pattern across turns

| Turn | cache_read | cache_creation | What's new |
|---|---|---|---|
| 1 | 0 | 1020 | system prompt + q1 |
| 2 | 1020 | 180 | a1 + q2 |
| 3 | 1200 | 215 | a2 + q3 |
| 4 | 1415 | ... | a3 + q4 |

`cache_read` is always the cumulative total written by the previous turn. `cache_creation` is always just this turn's increment. You never reprocess the whole conversation — only the newest slice — because each request's breakpoint chains onto the one written before it. That chaining is the whole mechanism, and it's also exactly what breaks in the next section.

## Where the chain snaps: the 20-block lookback

Say at turn 4, instead of a short follow-up, the user pastes a huge document that turns into 25 new content blocks before the breakpoint. Claude walks backward from the new breakpoint, checking up to 20 positions back — but turn 3's cached entry is 25 blocks back, outside that window. No match found, full cache miss:

```json
"usage": {
  "input_tokens": 0,
  "cache_read_input_tokens": 0,
  "cache_creation_input_tokens": 1415,
  "output_tokens": 220
}
```

Everything gets rewritten from scratch at full price — even though most of it was byte-identical to what was already cached at turn 3. It just wasn't reachable within 20 blocks of the new breakpoint.

## The fix: anchor a second breakpoint

This is why the docs recommend a second, earlier `cache_control` breakpoint — right after the system prompt — for any conversation where a single turn might add many blocks. It gives the backward walk a closer anchor to hit even when the "latest" entry falls out of range, so a 25-block turn still recovers the 1,000-token system-prompt cache instead of missing entirely.

## Proving it with real dollars

The solar-system example is clean enough to show the mechanism, but it doesn't tell you what caching is actually worth. So I ran the same shape — one shared document, three different questions about it — against a real ~2,900-token internal policy document, once with no caching and once with a breakpoint after the document.

The document is a synthetic company remote-work policy — sections on eligibility, data security, incident reporting, equipment stipends, that kind of thing:

```
COMPANY REMOTE WORK & DATA SECURITY POLICY
Version 3.2 — Effective Date: January 15, 2026

1. PURPOSE

This policy establishes the standards, responsibilities, and procedures
governing remote work arrangements and data security practices for all
employees, contractors, and temporary staff of the organization...

[... 12 sections, ~2,900 tokens total ...]

5. THE PRIMARY RISK: SHADOW IT AND UNSANCTIONED TOOLS

The single greatest security risk identified in this policy is the
proliferation of "shadow IT" — the use of unsanctioned applications,
browser extensions, and cloud services by employees attempting to work
around approved tools for convenience...
```

Same three questions against it every time: summarize it, name the main risk, list the dates. Here's the script *without* caching — the document goes into `system` on every call, no `cache_control` anywhere:

<details class="code-toggle">
<summary><code>no_caching_example.py</code></summary>

```python
"""
Example 1: WITHOUT prompt caching
----------------------------------
We send the same large document as context on every request.
Each call re-processes the full document from scratch as fresh input tokens.
"""

import time
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

with open("big_document.txt") as f:
    big_document = f.read()

questions = [
    "Summarize the key points of this document in 2 sentences.",
    "What is the main risk mentioned in this document?",
    "List any dates or deadlines mentioned in this document.",
]

for i, question in enumerate(questions, start=1):
    start = time.time()

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=300,
        system=[
            {
                "type": "text",
                "text": big_document,
                # NOTE: no cache_control here -> processed fresh every single call
            }
        ],
        messages=[{"role": "user", "content": question}],
    )

    elapsed = time.time() - start
    usage = response.usage

    print(f"--- Call {i} ---")
    print(f"Question: {question}")
    print(f"Time: {elapsed:.2f}s")
    print(f"Input tokens (fresh, billed at full rate): {usage.input_tokens}")
    print(f"Output tokens: {usage.output_tokens}")
```

</details>

And here's the *only* change for the caching version — one `cache_control` block, plus reading the two new usage fields:

<details class="code-toggle">
<summary><code>with_caching_example.py</code></summary>

```python
"""
Example 2: WITH prompt caching
--------------------------------
Same scenario as example 1 - same document, same 3 questions - but this time
we mark the document with cache_control so Claude only pays "full price" to
process it once. Every call after that reads it from cache at ~10% of the cost.
"""

import time
import anthropic

client = anthropic.Anthropic()

with open("big_document.txt") as f:
    big_document = f.read()

questions = [
    "Summarize the key points of this document in 2 sentences.",
    "What is the main risk mentioned in this document?",
    "List any dates or deadlines mentioned in this document.",
]

for i, question in enumerate(questions, start=1):
    start = time.time()

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=300,
        system=[
            {
                "type": "text",
                "text": big_document,
                "cache_control": {"type": "ephemeral"},  # <-- the only change
            }
        ],
        messages=[{"role": "user", "content": question}],
    )

    elapsed = time.time() - start
    usage = response.usage

    print(f"--- Call {i} ---")
    print(f"Question: {question}")
    print(f"Time: {elapsed:.2f}s")
    print(f"Fresh input tokens: {usage.input_tokens}")
    print(f"Cache CREATION tokens (written to cache, this call): "
          f"{getattr(usage, 'cache_creation_input_tokens', 0)}")
    print(f"Cache READ tokens (reused from cache, ~90% cheaper): "
          f"{getattr(usage, 'cache_read_input_tokens', 0)}")
    print(f"Output tokens: {usage.output_tokens}")
```

</details>

Run both, and this is what comes back.

**No caching** — every call resends the full document:

```
--- Call 1 --- Input tokens (fresh, billed at full rate): 2916   Output: 244
--- Call 2 --- Input tokens (fresh, billed at full rate): 2912   Output: 300
--- Call 3 --- Input tokens (fresh, billed at full rate): 2915   Output: 300
```

**With caching** — same three questions, breakpoint after the document:

```
--- Call 1 --- Fresh: 21    Cache CREATION: 2895   Cache READ: 0      Output: 220
--- Call 2 --- Fresh: 17    Cache CREATION: 0       Cache READ: 2895   Output: 300
--- Call 3 --- Fresh: 20    Cache CREATION: 0       Cache READ: 2895   Output: 300
```

Same shape as the solar-system walkthrough: call 1 pays to write the document into the cache, calls 2 and 3 read it back for a fraction of the cost.

To turn that into dollars: cache writes cost **1.25×** base input price (5-minute TTL) or **2×** (1-hour TTL), and cache reads cost **~0.1×** base input price. At Claude Sonnet 5's standard rate — $3.00 / $15.00 per million input/output tokens — that's $3.75/MTok to write and $0.30/MTok to read:

| | No caching | With caching |
|---|---|---|
| Input tokens billed at full rate | 8,743 | 58 (fresh) |
| Cache write tokens (1.25×) | — | 2,895 |
| Cache read tokens (0.1×) | — | 5,790 |
| **Input-side cost** | **$0.0262** | **$0.0128** |
| Output cost (unaffected by caching) | $0.0127 | $0.0123 |
| **Total** | **$0.0389** | **$0.0251** |

Three calls sharing one cached document already comes out ~36% cheaper overall, and ~51% cheaper on just the input side, where caching actually acts. But the total across three calls understates the real payoff — what matters is the *marginal* cost of each additional question against the same document. Resending the full ~2,900-token document costs about $0.0087 per question with no caching; reading it from cache costs about $0.0009 — a **~90% reduction per follow-up**, which is exactly the number the script's own comments predicted. That gap only widens the longer the conversation runs, because the one-time cache-write cost gets amortized over more and more reads.

## The takeaway

The number that made this stick for me was `cache_read` in turn 3: 1200, not "the whole conversation." Cache reads only ever cover what a *previous* breakpoint wrote — caching isn't magically remembering the conversation, it's chaining discrete, hashed prefixes together turn by turn. That framing explains both halves of this post: it's what makes the 20-block failure mode predictable instead of surprising (if nothing chains the new breakpoint back to the old one, there's no cache to find, full stop), and it's why the savings compound the way they do in the cost comparison — every read is only ever a bet that a previous write is still reachable.

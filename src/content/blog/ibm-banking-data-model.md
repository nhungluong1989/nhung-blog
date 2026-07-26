---
title: "IBM Industry Models for Banking"
description: A layer-by-layer walkthrough of IBM Industry Models for Banking — conceptual, logical, physical — with a worked example and diagrams.
pubDate: 2026-07-26
tags:
  - data engineering
  - banking
  - data modeling
---

Most large banks don't build their data warehouse from scratch. Instead, they license a ready-made blueprint: **IBM Industry Models for Banking**. It comes in two parts — the **Financial Services Data Model (FSDM)**, which defines the concepts and their relationships, and the **Banking Data Warehouse (BDW)**, which turns that design into an actual database.

## Three layers, one model

Think of the model as three levels of the same idea, each one more concrete than the last:

| Layer          | What it means                             | Delivered as                     | Details                                                          |
|----------------|--------------------------------------------|-----------------------------------|-------------------------------------------------------------------|
| **Conceptual** | What does this idea mean, bank-wide?      | Part of FSDM (shared vocabulary) | Nine broad concepts, the "A-Types" — details below                |
| **Logical**    | How is that idea structured into pieces?  | Part of FSDM (structural design) | Concepts like customer, account, product, event — details below   |
| **Physical**   | How is it stored in a database?           | Part of BDW (the real database)  | Actual tables and columns — example below                         |

Why bother with three layers? Because a bank might run 200 different systems, each with its own idea of what a "customer" or an "account" means. Starting at the conceptual layer forces everyone to agree on one clear definition — before anyone builds a single table.

### 1. Conceptual layer — the nine A-Types

No matter how specific a banking term gets, it always boils down to one of nine basic ideas, called the "A-Types":

| A-Type | What it means | Banking example |
|---|---|---|
| **Involved Party** | Any person or organization the bank deals with | A retail customer, a joint account holder, a bank employee, a corporate client, a regulator |
| **Arrangement** | Any agreement or contract between two parties | A savings account, a mortgage, a credit card agreement, a loan syndication |
| **Product** | A template that agreements are based on | The "Premium Saver" product definition — its rate rules, fee schedule, eligibility criteria |
| **Event** | Something that happens | A deposit, a wire transfer, a call to customer service, a login to online banking |
| **Location** | Any place, physical or digital | A branch address, an ATM, a mailing address, an IP address |
| **Classification** | A label used to categorize something | A risk rating, an industry code, a currency code, a product category |
| **Condition** | A rule attached to something else | A promotional interest rate on an account, a loan covenant, a fee waiver |
| **Business Direction Item** | An internal goal or plan | A branch's quarterly sales target, a budget line, a strategic KPI |
| **Resource Item** | Something valuable the bank owns or holds | Cash in a vault, a house held as loan collateral, a security in custody |

That's the whole point of the nine A-Types: no matter how different two banks' systems are, a "Mortgage" and a "Corporate Client" both trace back to the same two ideas — Arrangement and Involved Party. That shared starting point is what lets a bank connect very different systems using one common language.

### 2. Logical layer — entities and relationships

For core banking, that's four main entities — `INVOLVED_PARTY`, `ARRANGEMENT`, `PRODUCT`, `EVENT` — plus how they connect. The key connection is **role**: a person's link to an account is never just "belongs to." Different people can hold different roles on the same account, and the same person can hold different roles on different accounts. A separate table, `INVOLVED_PARTY_ARRANGEMENT_ROLE`, records exactly which role applies to which account.

For example: Maria and Jon jointly open a savings account with their son as beneficiary, while Maria separately holds a mortgage:

| party_id | arrangement_id | role_code | What it means |
|---|---|---|---|
| CUST001 | ACC123 | HOLDER | Maria is the primary account holder |
| CUST002 | ACC123 | JOINT_HOLDER | Jon is the co-holder on the same account |
| CUST003 | ACC123 | BENEFICIARY | Their son is named as beneficiary |
| CUST001 | LOAN456 | HOLDER | Same Maria, a role on a different arrangement |

One arrangement can have several people with different roles, and one person can appear on several arrangements — each row keeps that pairing straight. (We'll come back to this exact joint account, `ACC123`, once the physical tables are defined below.)

Classification, Condition, and Location work the same way: a risk rating attaches to a customer, a promotional rate attaches to an account, a branch attaches to a transaction.

### 3. Physical layer — tables and columns

Here's a simplified example — it shows the pattern, not IBM's actual schema:

```sql
CREATE TABLE involved_party (
  party_id            VARCHAR(20)   PRIMARY KEY,
  party_type          VARCHAR(20)   NOT NULL,   -- 'PERSON' | 'ORGANIZATION'
  full_name           VARCHAR(200)  NOT NULL,
  date_of_birth       DATE,
  incorporation_date  DATE,
  risk_rating_code    VARCHAR(5)    REFERENCES classification(classification_code)
);

CREATE TABLE product (
  product_id          VARCHAR(20)   PRIMARY KEY,
  product_name        VARCHAR(100)  NOT NULL,
  product_type        VARCHAR(30)   NOT NULL,   -- 'SAVINGS' | 'MORTGAGE' | 'CREDIT_CARD'
  base_interest_rate  DECIMAL(5,3),
  fee_schedule_id     VARCHAR(20)
);

CREATE TABLE arrangement (
  arrangement_id      VARCHAR(20)   PRIMARY KEY,
  product_id          VARCHAR(20)   REFERENCES product(product_id),
  arrangement_type    VARCHAR(30)   NOT NULL,   -- 'ACCOUNT' | 'LOAN' | 'CARD'
  status_code         VARCHAR(10)   NOT NULL,
  open_date           DATE          NOT NULL,
  close_date          DATE
);

CREATE TABLE involved_party_arrangement_role (
  party_id            VARCHAR(20)   REFERENCES involved_party(party_id),
  arrangement_id      VARCHAR(20)   REFERENCES arrangement(arrangement_id),
  role_code           VARCHAR(20)   NOT NULL,   -- 'HOLDER' | 'JOINT_HOLDER' | 'BENEFICIARY'
  role_start_date     DATE          NOT NULL,
  PRIMARY KEY (party_id, arrangement_id, role_code)
);

CREATE TABLE event (
  event_id            VARCHAR(20)   PRIMARY KEY,
  arrangement_id      VARCHAR(20)   REFERENCES arrangement(arrangement_id),
  event_type          VARCHAR(30)   NOT NULL,   -- 'DEPOSIT' | 'WITHDRAWAL' | 'ACCOUNT_OPEN'
  event_timestamp     TIMESTAMP     NOT NULL,
  amount              DECIMAL(15,2),
  location_id         VARCHAR(20)   REFERENCES location(location_id)
);
```

Notice how the physical layer still reflects the conceptual one: instead of separate `ACCOUNT`, `LOAN`, and `CARD` tables, there's one `ARRANGEMENT` table with an `arrangement_type` column to tell them apart. That's the payoff of designing top-down from nine shared concepts, instead of each product team inventing its own version of "account" from scratch.

(The `classification` and `location` tables referenced above aren't defined here, to keep the example short — the "How the pieces connect" diagram further down shows where they fit in.)

## A worked example: opening a savings account

This is the same joint account from the Logical layer section above: Maria and Jon open a "Premium Saver" savings account together, name their son as beneficiary, and Maria deposits $500 on the spot. Here's exactly what gets written into each table:

**`involved_party`** — the people involved

| party_id | party_type | full_name | risk_rating_code |
|---|---|---|---|
| CUST001 | PERSON | Maria Chen | LOW |
| CUST002 | PERSON | Jon Chen | LOW |
| CUST003 | PERSON | Alex Chen | — |

**`product`** — the account type they signed up for

| product_id | product_name | product_type | base_interest_rate |
|---|---|---|---|
| PROD-SAV-01 | Premium Saver | SAVINGS | 3.250 |

**`arrangement`** — the account itself

| arrangement_id | product_id | arrangement_type | status_code | open_date |
|---|---|---|---|---|
| ACC123 | PROD-SAV-01 | ACCOUNT | ACTIVE | 2026-07-26 |

**`involved_party_arrangement_role`** — the same roles from the Logical layer table, now as real rows

| party_id | arrangement_id | role_code | role_start_date |
|---|---|---|---|
| CUST001 | ACC123 | HOLDER | 2026-07-26 |
| CUST002 | ACC123 | JOINT_HOLDER | 2026-07-26 |
| CUST003 | ACC123 | BENEFICIARY | 2026-07-26 |

**`event`** — everything that happens on the account

| event_id | arrangement_id | event_type | event_timestamp | amount |
|---|---|---|---|---|
| EVT0001 | ACC123 | ACCOUNT_OPEN | 2026-07-26 09:14 | — |
| EVT0002 | ACC123 | DEPOSIT | 2026-07-26 09:16 | 500.00 |

Five tables, a handful of rows each — that's the entire joint account opening captured. Every later deposit or withdrawal just adds another row to `event` with the same `arrangement_id`; nothing else in the schema has to change.

## How the pieces connect

<div class="mermaid">
erDiagram
    INVOLVED_PARTY ||--o{ INVOLVED_PARTY_ARRANGEMENT_ROLE : "plays a role in"
    ARRANGEMENT ||--o{ INVOLVED_PARTY_ARRANGEMENT_ROLE : "has parties"
    PRODUCT ||--o{ ARRANGEMENT : "is instantiated as"
    ARRANGEMENT ||--o{ EVENT : "generates"
    EVENT }o--|| LOCATION : "occurs at"
    ARRANGEMENT }o--o{ CONDITION : "is governed by"
    INVOLVED_PARTY }o--o{ CLASSIFICATION : "is classified by"
    ARRANGEMENT }o--o{ RESOURCE_ITEM : "holds"
</div>

## Where the data actually comes from

The BDW doesn't create data — it's where data from every other system ends up. Each source feeds in, gets translated into the shared model, and becomes queryable from one place:

<div class="mermaid">
flowchart LR
    subgraph SRC["Source systems"]
        CBS["Core banking system"]
        CARD["Card processing"]
        CRM["CRM / servicing"]
        PAY["Payments and wires"]
    end
    CBS --> STG["Staging and ingestion"]
    CARD --> STG
    CRM --> STG
    PAY --> STG
    STG --> BDW[(Banking Data Warehouse - FSDM-aligned schema)]
    BDW --> RISK["Risk and regulatory reporting mart"]
    BDW --> C360["Customer 360 mart"]
    BDW --> FIN["Finance and profitability mart"]
</div>

Here's the problem this solves: the core banking system might store Maria (the same Maria from the joint account above) as `CUST_NO: 1092, NAME: "Maria Chen"`, while the card platform stores the very same person as `CardholderID: MC-7743, FullName: "Chen, Maria"` — same customer, two completely different formats. The staging layer's job is to translate both into the same shape: one `involved_party` row, `party_id = CUST001`, `party_type = PERSON`, `full_name = Maria Chen`. Once that's done, every report downstream — risk, customer 360, profitability — reads one consistent version of Maria, instead of every team reconciling five different definitions of "customer" on their own.

## Why banks actually pay for this

The real answer is regulatory pressure and integration cost, not elegance for its own sake. Banks that have grown through decades of mergers end up running dozens of separate systems, each with its own idea of what a "customer" or "account" is. That creates two expensive problems: reconciling all those different definitions, and proving to regulators that risk and compliance reports are built on solid, consistent data. Licensing a pre-built model like FSDM/BDW skips the work of inventing that shared vocabulary from scratch — and skips re-arguing it every time a new system gets bolted on after the next acquisition.

There's a real cost too: adopting FSDM/BDW means bending your data to fit IBM's model, not the other way around, and that's still a multi-year project. It saves you from *inventing* the vocabulary — it doesn't save you from the work of mapping every system onto it.

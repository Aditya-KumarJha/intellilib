# IntelliLib Database Schema Reference

This document explains the final relational model used by IntelliLib.

For historical SQL evolution, see `docs/sqlFile.txt`.
For one-shot clean setup SQL, see `docs/sql.dump.sql`.

---

## 1) Domain Overview

| Domain | Tables | Responsibility |
|---|---|---|
| Identity and access | `profiles` (+ `auth.users`) | User profile, role, and account status |
| Catalog | `categories`, `books`, `book_copies` | Library inventory and copy-level states |
| Circulation | `transactions`, `reservations`, `return_requests` | Issue, return, and queue workflows |
| Finance | `fines`, `payments`, `system_settings` | Fine lifecycle, payment records, policy values |
| Communication | `notifications`, `bookmarks`, `ai_queries` | User messaging, saved books, assistant logging |
| Governance | `audit_logs` | Auditable operation trail |

---

## 2) Entity Relationship Summary

## 2.1 Core relationships

| Parent | Child | Key | Cardinality | Notes |
|---|---|---|---|---|
| `auth.users` | `profiles` | `profiles.id -> auth.users.id` | 1:1 | profile auto-created by trigger |
| `categories` | `books` | `books.category_id -> categories.id` | 1:N | optional category assignment |
| `books` | `book_copies` | `book_copies.book_id -> books.id` | 1:N | copy-level physical/digital units |
| `book_copies` | `transactions` | `transactions.book_copy_id -> book_copies.id` | 1:N | historical issue/return records |
| `auth.users` | `transactions` | `transactions.user_id -> auth.users.id` | 1:N | user circulation history |
| `transactions` | `fines` | `fines.transaction_id -> transactions.id` | 1:1 | enforced by unique index |
| `auth.users` | `fines` | `fines.user_id -> auth.users.id` | 1:N | user unpaid/paid fine records |
| `fines` | `payments` | `payments.fine_id -> fines.id` | 1:N | payment attempts and status |
| `auth.users` | `payments` | `payments.user_id -> auth.users.id` | 1:N | payer relationship |
| `auth.users` | `notifications` | `notifications.user_id -> auth.users.id` | 1:N | in-app notification stream |
| `auth.users` | `reservations` | `reservations.user_id -> auth.users.id` | 1:N | queue entries per user |
| `books` | `reservations` | `reservations.book_id -> books.id` | 1:N | queue entries per title |
| `transactions` | `return_requests` | `return_requests.transaction_id -> transactions.id` | 1:N | constrained to one pending at a time |
| `auth.users` | `return_requests` | `return_requests.user_id -> auth.users.id` | 1:N | requester |
| `auth.users` | `return_requests.processed_by` | `return_requests.processed_by -> auth.users.id` | 1:N | staff processor |
| `auth.users` | `bookmarks` | `bookmarks.user_id -> auth.users.id` | 1:N | saved items |
| `books` | `bookmarks` | `bookmarks.book_id -> books.id` | 1:N | many users can bookmark same book |

## 2.2 Mermaid ER diagram

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : has_profile

  CATEGORIES ||--o{ BOOKS : classifies
  BOOKS ||--o{ BOOK_COPIES : has_copies

  AUTH_USERS ||--o{ TRANSACTIONS : borrows
  BOOK_COPIES ||--o{ TRANSACTIONS : issued_in
  TRANSACTIONS ||--|| FINES : may_generate
  AUTH_USERS ||--o{ FINES : owes
  FINES ||--o{ PAYMENTS : paid_with
  AUTH_USERS ||--o{ PAYMENTS : makes

  AUTH_USERS ||--o{ RESERVATIONS : creates
  BOOKS ||--o{ RESERVATIONS : queued_for

  TRANSACTIONS ||--o{ RETURN_REQUESTS : return_flow
  AUTH_USERS ||--o{ RETURN_REQUESTS : requests
  AUTH_USERS ||--o{ RETURN_REQUESTS : processes

  AUTH_USERS ||--o{ NOTIFICATIONS : receives
  AUTH_USERS ||--o{ BOOKMARKS : saves
  BOOKS ||--o{ BOOKMARKS : bookmarked
  AUTH_USERS ||--o{ AI_QUERIES : submits

  AUTH_USERS o|--o{ AUDIT_LOGS : actor

  SYSTEM_SETTINGS {
    bigint id PK
    int max_books_per_user
    int max_days_allowed
    int fine_per_day
    timestamp created_at
  }

  PROFILES {
    uuid id PK,FK
    text role
    text status
  }

  CATEGORIES {
    bigint id PK
    text name
  }

  BOOKS {
    bigint id PK
    bigint category_id FK
    text title
    int total_copies
    int available_copies
  }

  BOOK_COPIES {
    bigint id PK
    bigint book_id FK
    text type
    text status
  }

  TRANSACTIONS {
    bigint id PK
    uuid user_id FK
    bigint book_copy_id FK
    timestamp due_date
    text status
  }

  RESERVATIONS {
    bigint id PK
    uuid user_id FK
    bigint book_id FK
    text status
    int queue_position
  }

  RETURN_REQUESTS {
    bigint id PK
    bigint transaction_id FK
    uuid user_id FK
    uuid processed_by FK
    text status
  }

  FINES {
    bigint id PK
    uuid user_id FK
    bigint transaction_id FK
    int amount
    text status
  }

  PAYMENTS {
    bigint id PK
    uuid user_id FK
    bigint fine_id FK
    int amount
    text status
  }

  NOTIFICATIONS {
    bigint id PK
    uuid user_id FK
    text type
    boolean is_read
  }

  BOOKMARKS {
    bigint id PK
    uuid user_id FK
    bigint book_id FK
  }

  AI_QUERIES {
    bigint id PK
    uuid user_id FK
    text query
    timestamp created_at
  }

  AUDIT_LOGS {
    bigint id PK
    uuid user_id FK
    text action
    text entity
    bigint entity_id
  }
```

---

## 3) Table Dictionary

## 3.1 `profiles`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `uuid` | no | - | PK, FK to `auth.users.id`, cascades on delete |
| `created_at` | `timestamptz` | no | `now()` | creation timestamp |
| `full_name` | `text` | yes | - | user display name |
| `role` | `text` | no | `'user'` | enum-like check: `user/librarian/admin` |
| `avatar_url` | `text` | yes | - | profile photo URL |
| `status` | `text` | no | `'active'` | enum-like check: `active/suspended` |

Use:
- Controls role-based navigation and policy permissions.
- Suspension guard logic references account status.

## 3.2 `categories`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `name` | `text` | no | - | unique category label |
| `created_at` | `timestamp` | no | `now()` | creation timestamp |

Use:
- Logical taxonomy for discovery and reporting.

## 3.3 `books`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `title` | `text` | no | - | title |
| `author` | `text` | no | - | author |
| `description` | `text` | yes | - | summary |
| `type` | `text` | no | `physical` | check: `physical/digital/both` |
| `category_id` | `bigint` | yes | - | FK to `categories.id` |
| `isbn` | `text` | yes | - | unique ISBN |
| `cover_url` | `text` | yes | - | cover media |
| `pdf_url` | `text` | yes | - | digital copy URL |
| `publisher` | `text` | yes | - | publisher |
| `published_year` | `int` | yes | - | publishing year |
| `total_copies` | `int` | no | `0` | maintained by triggers |
| `available_copies` | `int` | no | `0` | maintained by triggers |
| `created_at` | `timestamp` | no | `now()` | creation timestamp |

Use:
- Main catalog record and search surface.
- Availability cards read from aggregate copy counters.

## 3.4 `book_copies`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `book_id` | `bigint` | no | - | FK to `books.id` (cascade delete) |
| `type` | `text` | no | - | check: `physical/digital` |
| `status` | `text` | no | `available` | check: `available/issued/reserved/lost/maintenance` |
| `location` | `text` | yes | - | physical shelf/location |
| `access_url` | `text` | yes | - | digital access link |
| `condition` | `text` | yes | - | copy condition metadata |
| `created_at` | `timestamp` | no | `now()` | creation timestamp |

Constraint highlights:
- `check_location_access` ensures:
  - physical copy must have `location`
  - digital copy must have `access_url`

Use:
- Real source-of-truth for issueability and stock.
- Status synced by transaction triggers.

## 3.5 `transactions`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `user_id` | `uuid` | no | - | FK to `auth.users` |
| `book_copy_id` | `bigint` | no | - | FK to `book_copies` |
| `issue_date` | `timestamp` | no | `now()` | issued at |
| `due_date` | `timestamp` | no | - | due date |
| `return_date` | `timestamp` | yes | - | return timestamp |
| `status` | `text` | no | `issued` | check: `issued/returned/overdue`, normalized by trigger |
| `fine_amount` | `int` | no | `0` | non-negative |
| `created_at` | `timestamp` | no | `now()` | creation timestamp |

Constraint highlights:
- `due_date >= issue_date`
- `return_date IS NULL OR return_date >= issue_date`
- unique open issue per copy: `unique_active_issue` on `(book_copy_id)` where `return_date IS NULL`

Use:
- Primary circulation ledger.
- Analytics source for due reminders and history panels.

## 3.6 `reservations`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `user_id` | `uuid` | no | - | FK to `auth.users` |
| `book_id` | `bigint` | no | - | FK to `books` |
| `status` | `text` | no | `waiting` | check: `waiting/approved/cancelled/completed` |
| `queue_position` | `int` | yes | - | queue order |
| `created_at` | `timestamp` | no | `now()` | created timestamp |

Constraint highlights:
- unique queue slot for active rows:
  - `(book_id, queue_position)` where status in `waiting/approved`
- one active reservation per user/book:
  - `(user_id, book_id)` where status in `waiting/approved`

Use:
- Queueing unavailable books.
- Promotion into approved holds based on stock.

## 3.7 `return_requests`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `transaction_id` | `bigint` | no | - | FK to `transactions`, cascade delete |
| `user_id` | `uuid` | no | - | FK to `auth.users`, cascade delete |
| `status` | `text` | no | `pending` | check: `pending/approved/rejected` |
| `requested_at` | `timestamp` | no | `now()` | request timestamp |
| `processed_at` | `timestamp` | yes | - | completion timestamp |
| `processed_by` | `uuid` | yes | - | staff FK to `auth.users` |
| `notes` | `text` | yes | - | staff notes |
| `created_at` | `timestamp` | no | `now()` | insertion timestamp |

Constraint highlights:
- one pending request per transaction:
  - unique index on `transaction_id` where status = `pending`

Use:
- Explicit user request and staff moderation workflow for returns.

## 3.8 `fines`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `user_id` | `uuid` | no | - | FK to `auth.users` |
| `transaction_id` | `bigint` | no | - | FK to `transactions` |
| `amount` | `int` | no | - | positive amount |
| `status` | `text` | no | `pending` | check: `pending/paid` |
| `paid_at` | `timestamp` | yes | - | marks fine settled |
| `created_at` | `timestamp` | no | `now()` | creation timestamp |

Constraint highlights:
- one fine per transaction via `unique_fine_per_transaction`

Use:
- Financial penalty state and reconciliation anchor.

## 3.9 `payments`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `user_id` | `uuid` | no | - | FK to `auth.users` |
| `fine_id` | `bigint` | no | - | FK to `fines`, cascade delete |
| `amount` | `int` | no | - | positive payment amount |
| `provider` | `text` | no | `razorpay` | payment rail |
| `razorpay_order_id` | `text` | yes | - | order reference |
| `razorpay_payment_id` | `text` | yes | - | provider payment reference |
| `razorpay_signature` | `text` | yes | - | verification signature |
| `status` | `text` | no | `created` | check: `created/success/failed` |
| `method` | `text` | yes | - | card/netbanking/wallet/etc |
| `bank` | `text` | yes | - | bank name if available |
| `wallet` | `text` | yes | - | wallet detail |
| `vpa` | `text` | yes | - | UPI VPA |
| `created_at` | `timestamp` | no | `now()` | created timestamp |

Constraint highlights:
- unique non-null `razorpay_payment_id`

Use:
- payment audit log and reconciliation source.

## 3.10 `notifications`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `user_id` | `uuid` | no | - | FK to `auth.users` |
| `type` | `text` | yes | - | due/fine/payment/reservation type |
| `message` | `text` | no | - | in-app message |
| `is_read` | `boolean` | no | `false` | read state |
| `target_role` | `text` | yes | - | optional role targeting metadata |
| `metadata` | `jsonb` | yes | - | optional contextual payload |
| `created_at` | `timestamp` | no | `now()` | created timestamp |

Use:
- user notification feed and action-required prompts.

## 3.11 `audit_logs`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `user_id` | `uuid` | yes | - | actor id when available |
| `action` | `text` | no | - | verb (issue, return, suspend, etc.) |
| `entity` | `text` | yes | - | affected entity type |
| `entity_id` | `bigint` | yes | - | affected entity id |
| `metadata` | `jsonb` | yes | - | event details |
| `created_at` | `timestamp` | no | `now()` | event timestamp |

Use:
- operational compliance and troubleshooting.

## 3.12 `ai_queries`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `user_id` | `uuid` | yes | - | requesting user |
| `query` | `text` | no | - | user prompt/question |
| `response` | `text` | yes | - | model output |
| `context` | `jsonb` | yes | - | assistant context payload |
| `created_at` | `timestamp` | no | `now()` | execution timestamp |

Use:
- assistant analytics and troubleshooting.

## 3.13 `bookmarks`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `user_id` | `uuid` | no | - | FK to `auth.users` |
| `book_id` | `bigint` | no | - | FK to `books` |
| `created_at` | `timestamptz` | no | `now()` | bookmark timestamp |

Constraint highlights:
- unique pair `(user_id, book_id)` prevents duplicate bookmarks.

Use:
- personalized saved title list.

## 3.14 `system_settings`

| Column | Type | Null | Default | Constraints/Meaning |
|---|---|---|---|---|
| `id` | `bigint` identity | no | auto | PK |
| `max_books_per_user` | `int` | no | `3` | max concurrent borrow count |
| `max_days_allowed` | `int` | no | `14` | standard due window |
| `fine_per_day` | `int` | no | `5` | fine rate |
| `created_at` | `timestamp` | no | `now()` | policy timestamp |

Use:
- policy source used by circulation services.

---

## 4) Trigger and Function Catalog

| Function | Trigger/Usage | Purpose |
|---|---|---|
| `handle_new_user()` | `on_auth_user_created` | auto-create profile row for new auth user |
| `update_book_counts()` | `trg_book_copy_insert/update/delete` | keep `books.total_copies` and `available_copies` synchronized |
| `normalize_transaction_status()` | `trg_normalize_transaction_status` | derive status from due/return dates |
| `validate_transaction_rules()` | `trg_validate_transaction_rules` | block invalid issue updates (overdue/duplicate active copy) |
| `refresh_book_copy_status()` | called by sync trigger | compute copy status from open transactions |
| `sync_book_copy_status_from_transactions()` | `trg_sync_book_copy_status_from_transactions` | synchronize `book_copies.status` on tx changes |
| `validate_reservation_no_active_issue()` | `trg_validate_reservation_no_active_issue` | block reservation if user already holds same title |
| `promote_waiting_reservations(p_book_id, p_limit)` | RPC-style function | promote waiting queue entries to approved |
| `mark_transaction_returned_on_fine_payment()` | `trg_mark_transaction_returned_on_fine_payment` | auto-close transaction after fine payment |
| `current_user_role()` | policy helper | resolve role from `profiles` |
| `is_staff()` | policy helper | role helper for admin/librarian checks |

---

## 5) Important Uniqueness and Guardrails

| Rule | Enforcement |
|---|---|
| One open issue per copy | unique partial index `unique_active_issue` |
| One active reservation per user/book | unique partial index `unique_active_reservation_per_user_book` |
| Unique queue slot per active book queue | unique partial index `unique_queue_position_active` |
| One pending return request per transaction | unique partial index `uniq_return_request_pending_per_tx` |
| One fine per transaction | unique index `unique_fine_per_transaction` |
| No duplicate successful provider payment id | unique partial index `uniq_payments_razorpay_payment_id` |
| No negative/invalid amounts and dates | CHECK constraints on `transactions`, `fines`, `payments` |

---

## 6) RLS Strategy Summary

RLS is enabled on domain tables and split by role and ownership:

- Read-all, write-staff model for catalog entities (`books`, `book_copies`, `categories`).
- Owner-or-staff read/update model for user-owned entities (`transactions`, `reservations`, `notifications`, `payments`, `fines`).
- Staff-only reads for `audit_logs`.
- Admin-only write policy for `system_settings`.
- `return_requests` allows user creation, staff moderation.
- `bookmarks` allows owner-or-staff CRUD subset.

---

## 7) Realtime Registration

The following tables are registered to `supabase_realtime` publication (if publication exists):

- `public.return_requests`
- `public.bookmarks`

This supports dashboard updates without manual refresh for these flows.

---

## 8) Setup Recommendation

For a new environment:

1. Run `docs/sql.dump.sql` once.
2. Verify all triggers/functions exist in Supabase SQL editor.
3. Confirm role values in `profiles` are valid (`user`, `librarian`, `admin`).
4. Validate reservation promotion RPC by calling `promote_waiting_reservations` with a test `book_id`.
5. Keep `docs/sqlFile.txt` only as historical reference, not as primary bootstrap script.

---

## 9) Data Flow Diagrams (DFD)

The following DFD set models IntelliLib from context level down to process-level internals.

## 9.1 DFD Level 0 (System Context)

```mermaid
flowchart LR
  U[User / Member]
  L[Librarian]
  A[Admin]
  PG[Payment Gateway\nRazorpay]
  ES[Email Service\nResend]
  SCH[Scheduler / Cron]

  SYS((IntelliLib System))

  U -->|search, reserve, issue request, return request, pay fine| SYS
  SYS -->|results, status, notifications, receipts| U

  L -->|catalog ops, issue/return approval, request processing| SYS
  SYS -->|dashboard insights, pending queues, alerts| L

  A -->|settings, governance actions, policy updates| SYS
  SYS -->|analytics, audit reports, system health| A

  SYS -->|create order, verify payment| PG
  PG -->|order id, payment status, signature| SYS

  SYS -->|email payload| ES
  ES -->|delivery outcome| SYS

  SCH -->|trigger queue processing| SYS
  SYS -->|worker health, queue run status| SCH
```

## 9.2 DFD Level 1 (Major Process Decomposition)

```mermaid
flowchart TB
  %% External entities
  U[User]
  L[Librarian]
  A[Admin]
  PG[Payment Gateway]
  ES[Email Service]
  SCH[Scheduler]

  %% Processes
  P1((P1 Auth & Access))
  P2((P2 Catalog Discovery))
  P3((P3 Circulation Management))
  P4((P4 Reservation Queue))
  P5((P5 Fine & Payment Processing))
  P6((P6 Notification Orchestration))
  P7((P7 Reporting & Governance))

  %% Data stores
  D1[(D1 profiles)]
  D2[(D2 books/categories)]
  D3[(D3 book_copies)]
  D4[(D4 transactions)]
  D5[(D5 reservations)]
  D6[(D6 return_requests)]
  D7[(D7 fines/payments)]
  D8[(D8 notifications)]
  D9[(D9 audit_logs)]
  D10[(D10 system_settings)]

  %% Access/auth flows
  U -->|login/signup, token| P1
  L -->|login, role access| P1
  A -->|login, admin access| P1
  P1 <--> D1

  %% Catalog flows
  U -->|search/filter/detail request| P2
  L -->|catalog create/update| P2
  P2 <--> D2
  P2 <--> D3
  P2 --> D9

  %% Circulation flows
  U -->|issue/return requests| P3
  L -->|approve issue/return| P3
  P3 <--> D3
  P3 <--> D4
  P3 <--> D6
  P3 <--> D10
  P3 --> D9

  %% Reservation flows
  U -->|create/cancel reservation| P4
  L -->|manual queue action| P4
  SCH -->|queue run trigger| P4
  P4 <--> D5
  P4 <--> D3
  P4 <--> D10
  P4 --> D9

  %% Finance flows
  U -->|fine payment request| P5
  P5 <--> D7
  P5 <--> D4
  P5 <--> D10
  P5 <--> PG
  P5 --> D9

  %% Notification flows
  P3 -->|events| P6
  P4 -->|events| P6
  P5 -->|events| P6
  P6 <--> D8
  P6 <--> ES
  P6 --> D9

  %% Governance/reporting flows
  A -->|dashboard/report requests| P7
  L -->|operational analytics requests| P7
  P7 <--> D2
  P7 <--> D3
  P7 <--> D4
  P7 <--> D5
  P7 <--> D7
  P7 <--> D8
  P7 <--> D9
  P7 <--> D10
```

## 9.3 DFD Level 2 (Circulation Process P3)

```mermaid
flowchart LR
  U[User]
  L[Librarian]

  S31((P3.1 Validate Borrow Eligibility))
  S32((P3.2 Create Issue Transaction))
  S33((P3.3 Sync Copy Availability))
  S34((P3.4 Manage Return Request))
  S35((P3.5 Complete Return & Status Update))

  D1[(profiles)]
  D3[(book_copies)]
  D4[(transactions)]
  D6[(return_requests)]
  D7[(fines)]
  D10[(system_settings)]
  D9[(audit_logs)]

  U -->|issue request| S31
  S31 <--> D1
  S31 <--> D4
  S31 <--> D10
  S31 -->|eligible request| S32

  S32 --> D4
  S32 --> S33
  S33 <--> D3
  S33 --> D9

  U -->|return request| S34
  S34 <--> D6
  S34 --> D9

  L -->|approve/reject return| S35
  S35 <--> D6
  S35 <--> D4
  S35 <--> D3
  S35 <--> D7
  S35 --> D9
```

## 9.4 DFD Level 2 (Reservation and Queue Process P4)

```mermaid
flowchart LR
  U[User]
  L[Librarian]
  SCH[Scheduler]

  S41((P4.1 Validate Reservation Rules))
  S42((P4.2 Insert/Update Queue Entry))
  S43((P4.3 Promote Waiting Reservations))
  S44((P4.4 Finalize Queue State))

  D3[(book_copies)]
  D4[(transactions)]
  D5[(reservations)]
  D10[(system_settings)]
  D9[(audit_logs)]

  U -->|reserve/cancel| S41
  S41 <--> D4
  S41 <--> D10
  S41 --> S42

  S42 <--> D5
  S42 --> D9

  SCH -->|cron/manual run| S43
  L -->|force process| S43
  S43 <--> D3
  S43 <--> D5
  S43 --> S44

  S44 <--> D5
  S44 --> D9
```

## 10) Use Case Diagram

```mermaid
flowchart LR
  U[Member]
  L[Librarian]
  A[Admin]
  PG[Payment Gateway]
  ES[Email Service]

  subgraph IntelliLib Use Cases
    UC1((Register / Login))
    UC2((Browse / Search Books))
    UC3((View Book Details))
    UC4((Create Reservation))
    UC5((Cancel Reservation))
    UC6((Issue Book))
    UC7((Submit Return Request))
    UC8((Pay Fine))
    UC9((View Notifications))
    UC10((Manage Catalog))
    UC11((Process Requests))
    UC12((Manage Members))
    UC13((Review Audit Logs))
    UC14((Manage System Settings))
    UC15((Run Queue Processing))
    UC16((Generate Analytics Reports))
    UC17((Send Email Notification))
    UC18((Verify Payment Signature))
  end

  U --> UC1
  U --> UC2
  U --> UC3
  U --> UC4
  U --> UC5
  U --> UC7
  U --> UC8
  U --> UC9

  L --> UC1
  L --> UC6
  L --> UC10
  L --> UC11
  L --> UC12
  L --> UC13
  L --> UC15

  A --> UC1
  A --> UC12
  A --> UC13
  A --> UC14
  A --> UC16

  UC8 --> UC18
  UC11 --> UC17
  UC15 --> UC17

  UC18 --> PG
  UC17 --> ES
```

---

## 11) Class Diagram (Domain + Service Layer)

```mermaid
classDiagram
  class Profile {
    +uuid id
    +string fullName
    +string role
    +string status
    +DateTime createdAt
    +isStaff() bool
  }

  class Category {
    +long id
    +string name
    +DateTime createdAt
  }

  class Book {
    +long id
    +string title
    +string author
    +string type
    +string isbn
    +int totalCopies
    +int availableCopies
    +incrementCounts()
    +decrementCounts()
  }

  class BookCopy {
    +long id
    +long bookId
    +string type
    +string status
    +string location
    +string accessUrl
    +markIssued()
    +markAvailable()
  }

  class Transaction {
    +long id
    +uuid userId
    +long bookCopyId
    +DateTime issueDate
    +DateTime dueDate
    +DateTime returnDate
    +string status
    +int fineAmount
    +normalizeStatus()
  }

  class Reservation {
    +long id
    +uuid userId
    +long bookId
    +string status
    +int queuePosition
    +approve()
    +cancel()
  }

  class ReturnRequest {
    +long id
    +long transactionId
    +uuid userId
    +uuid processedBy
    +string status
    +DateTime requestedAt
    +DateTime processedAt
    +approve()
    +reject()
  }

  class Fine {
    +long id
    +uuid userId
    +long transactionId
    +int amount
    +string status
    +DateTime paidAt
    +calculate()
    +markPaid()
  }

  class Payment {
    +long id
    +uuid userId
    +long fineId
    +int amount
    +string provider
    +string status
    +verifySignature()
  }

  class Notification {
    +long id
    +uuid userId
    +string type
    +string message
    +bool isRead
    +markRead()
  }

  class AuditLog {
    +long id
    +uuid userId
    +string action
    +string entity
    +long entityId
    +json metadata
    +write()
  }

  class SystemSetting {
    +long id
    +int maxBooksPerUser
    +int maxDaysAllowed
    +int finePerDay
    +int maxHoldMinutes
    +latest() SystemSetting
  }

  class CatalogService {
    +searchBooks(filters)
    +createBook(data)
    +updateBook(data)
  }

  class LibrarianCirculationService {
    +issueBook(userId, copyId)
    +processReturn(requestId)
    +validateIssueRules(userId, copyId)
  }

  class ReservationService {
    +createReservation(userId, bookId)
    +promoteWaitingReservations(bookId)
    +cancelReservation(id)
  }

  class QueueProcessor {
    +run()
    +processReservationQueue()
    +processDueReminders()
  }

  class PaymentService {
    +createOrder(fineId)
    +verifyPayment(payload)
    +applyPaymentToFine()
  }

  class NotificationService {
    +createInAppNotification(event)
    +enqueueEmail(event)
    +dispatch()
  }

  Profile "1" --> "many" Transaction : borrows
  Profile "1" --> "many" Reservation : creates
  Profile "1" --> "many" Notification : receives
  Profile "1" --> "many" Fine : owes
  Profile "1" --> "many" Payment : makes
  Profile "1" --> "many" AuditLog : actor

  Category "1" --> "many" Book : classifies
  Book "1" --> "many" BookCopy : has
  BookCopy "1" --> "many" Transaction : appears in
  Book "1" --> "many" Reservation : queued by
  Transaction "1" --> "1" Fine : generates
  Fine "1" --> "many" Payment : settled by
  Transaction "1" --> "many" ReturnRequest : has

  CatalogService ..> Book
  CatalogService ..> BookCopy
  LibrarianCirculationService ..> Transaction
  LibrarianCirculationService ..> ReturnRequest
  LibrarianCirculationService ..> SystemSetting
  ReservationService ..> Reservation
  ReservationService ..> BookCopy
  ReservationService ..> SystemSetting
  QueueProcessor ..> ReservationService
  QueueProcessor ..> NotificationService
  PaymentService ..> Fine
  PaymentService ..> Payment
  NotificationService ..> Notification
  NotificationService ..> AuditLog
```

---

## 12) Sequence Diagrams

## 12.1 Book Issue Flow

```mermaid
sequenceDiagram
  actor U as User
  participant UI as Dashboard UI
  participant API as Issue API
  participant AUTH as Auth Helper
  participant CIRC as Circulation Service
  participant DB as Supabase DB
  participant NOTIF as Notification Service

  U->>UI: Click Issue Book
  UI->>API: POST /api/library/issue
  API->>AUTH: Resolve bearer token
  AUTH-->>API: userId + role

  API->>CIRC: validateAndIssue(userId, copyId)
  CIRC->>DB: Read system_settings
  CIRC->>DB: Validate open overdue and max limit
  CIRC->>DB: Insert transaction
  CIRC->>DB: Trigger set_due_date + normalize_status
  CIRC->>DB: Trigger sync_book_copy_status
  DB-->>CIRC: Transaction created

  CIRC->>NOTIF: createInAppNotification(issue_success)
  NOTIF->>DB: Insert notifications row
  CIRC-->>API: Success + due date
  API-->>UI: 200 response
  UI-->>U: Show issue confirmation
```

## 12.2 Reservation Promotion Flow (Scheduler)

```mermaid
sequenceDiagram
  participant SCH as Scheduler/Cron
  participant API as Queue Process API
  participant QP as Queue Processor
  participant RS as Reservation Service
  participant DB as Supabase DB
  participant NOTIF as Notification Service

  SCH->>API: POST /api/library/queue/process/cron
  API->>QP: processQueues()
  QP->>RS: promoteWaitingReservations(bookId)
  RS->>DB: pg_advisory_xact_lock(bookId)
  RS->>DB: Count available copies
  RS->>DB: Count approved reservations
  RS->>DB: Promote waiting rows
  DB-->>RS: promoted reservations

  loop for each promoted user
    RS->>NOTIF: reservation_approved event
    NOTIF->>DB: Insert notification
    NOTIF->>DB: Enqueue email payload
  end

  QP-->>API: processing summary
  API-->>SCH: success metrics
```

## 12.3 Fine Payment Verification Flow

```mermaid
sequenceDiagram
  actor U as User
  participant UI as Fines UI
  participant ORD as Create Order API
  participant VER as Verify API
  participant RZP as Razorpay
  participant DB as Supabase DB

  U->>UI: Pay fine
  UI->>ORD: POST /api/razorpay/create-order
  ORD->>DB: Read fine + pending amount
  ORD->>RZP: Create order
  RZP-->>ORD: order_id
  ORD-->>UI: order payload

  UI->>RZP: Open checkout
  RZP-->>UI: payment_id + signature
  UI->>VER: POST /api/razorpay/verify
  VER->>RZP: Verify signature/server-side integrity
  RZP-->>VER: verified

  VER->>DB: Insert payments(success)
  VER->>DB: Update fines(status=paid, paid_at)
  VER->>DB: Trigger mark_transaction_returned_on_fine_payment
  VER-->>UI: payment success
  UI-->>U: receipt + updated fine state
```

---

## 13) Activity Diagrams

## 13.1 Member Borrow and Return Lifecycle

```mermaid
flowchart TD
  A([Start]) --> B[Search and select title]
  B --> C{Copy available?}
  C -- Yes --> D[Submit issue request]
  C -- No --> E[Create reservation]
  E --> F[Wait for queue promotion]
  F --> G{Reservation approved?}
  G -- No --> F
  G -- Yes --> D

  D --> H{Eligible by rules?\nno overdue, under max limit}
  H -- No --> I[Reject issue and notify user]
  H -- Yes --> J[Create transaction + set due date]
  J --> K[Sync copy status to issued]
  K --> L[User reads book]
  L --> M[User submits return request]
  M --> N[Librarian processes request]
  N --> O{Approved?}
  O -- No --> P[Return request rejected]
  O -- Yes --> Q[Close transaction and set copy available]
  Q --> R{Fine exists?}
  R -- No --> S([End])
  R -- Yes --> T[Pay fine]
  T --> U[Mark fine paid + auto-close transaction]
  U --> S
  I --> S
  P --> L
```

## 13.2 Queue Processing and Notification Activity

```mermaid
flowchart TD
  A([Start queue run]) --> B[Load books with waiting reservations]
  B --> C[For each book lock queue via advisory lock]
  C --> D[Count available copies]
  D --> E[Count approved holds]
  E --> F[Compute promotable slots]
  F --> G{slots > 0?}
  G -- No --> H[Skip book]
  G -- Yes --> I[Promote waiting -> approved]
  I --> J[Write audit entries]
  J --> K[Create in-app notifications]
  K --> L[Queue email notifications]
  L --> H
  H --> M{More books?}
  M -- Yes --> C
  M -- No --> N([End queue run])
```

---

## 14) Diagram Reading Guide

1. DFD focuses on data movement between actors, processes, and stores.
2. Use case captures functional responsibilities by actor role.
3. Class diagram maps structural model and service responsibilities.
4. Sequence diagrams capture time-ordered interactions for critical paths.
5. Activity diagrams represent end-to-end operational workflows and decisions.

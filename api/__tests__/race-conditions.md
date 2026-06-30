# Agent 9 — QA: Race Condition & Idempotency Test Cases

## TC-01: Double-Tap "Accept" — Idempotency Guard

**Risk**: Older user double-taps the Accept button. Two identical POST /api/matches/accept
requests fire within milliseconds.

**Guard**: `acceptanceKey` is a unique server-generated token stored on the DateMatch record.
The client reads it from the initial match notification and sends it with every accept request.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User receives match with `acceptanceKey: "abc123"` | Match created, status = PENDING |
| 2 | User taps Accept → POST /matches/accept `{acceptanceKey: "abc123"}` | 200, status = CANDIDATE_ACCEPTED |
| 3 | Double-tap fires second POST /matches/accept `{acceptanceKey: "abc123"}` | 200 idempotent — same response, NO second state change |
| 4 | Database state | `candidateAcceptedAt` is set exactly once |

**Code reference**: `api/matches/accept.js` — `if (!alreadyCandidateAccepted)` guard inside the `$transaction` block.

---

## TC-02: Race Condition — Both Users Accept Simultaneously

**Risk**: Broadcaster and Candidate both tap Accept within the same 50ms window. Two server
processes execute the BOTH_ACCEPTED branch concurrently and attempt to create two DateCommitments.

**Guard**: `DateCommitment` has `matchId String @unique` — database unique constraint prevents
the second insert. One transaction wins; the other gets a Prisma P2002 unique violation error.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Process A and Process B both execute `accept.js` simultaneously for the same matchId | Both enter `$transaction` |
| 2 | Process A completes the transaction first | Match → BOTH_ACCEPTED, Commitment created |
| 3 | Process B's transaction tries to create DateCommitment | Prisma throws P2002 (unique violation) |
| 4 | Process B's response | 409 "Match is already in state: BOTH_ACCEPTED" |
| 5 | Net result | Exactly one DateCommitment, holds authorized exactly once |

**Test to add**: Mock two simultaneous `$transaction` calls and verify only one Commitment is created.

---

## TC-03: Double-Charge Prevention — $50 Hold

**Risk**: Network timeout causes the client to retry the hold. The hold fires twice, creating two $50 charges.

**Guard**: Stripe idempotency key `hold-{commitmentId}-{role}` is sent with every PaymentIntent creation.
Stripe ignores the second request and returns the original PaymentIntent.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | `authorizeHoldForBoth("commit_abc")` called | Creates PI with idempotencyKey `hold-commit_abc-user1` |
| 2 | Network timeout → function retries | Same idempotencyKey sent to Stripe |
| 3 | Stripe response | Same PaymentIntent object returned (no new charge) |
| 4 | Database | Only one `HOLD_AUTHORIZATION` transaction record |

---

## TC-04: Vendor Booking Duplicate Prevention

**Risk**: User taps "Book OpenTable" twice while the first request is in-flight.

**Guard**: `VenueBooking.commitmentId` has `@unique` — only one venue booking per commitment.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | POST /api/vendors/book `{vendorType: "venue", commitmentId: "c1"}` | 201, booking created |
| 2 | Second POST /api/vendors/book `{vendorType: "venue", commitmentId: "c1"}` | 409 "A venue booking already exists" |
| 3 | Stripe | Vendor's Stripe Connect idempotency key `vendor-c1-venue` prevents second charge |

---

## TC-05: Broadcast — One Active Broadcast Per User

**Risk**: User submits two broadcasts before the first one expires.

**Guard**: `broadcasts/create.js` queries for any existing `ACTIVE` or `MATCHED` broadcast before creating.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | POST /api/broadcasts/create for userId U1 | 201, broadcast B1 created |
| 2 | POST /api/broadcasts/create for userId U1 again | 409 "You already have an active broadcast" |
| 3 | B1 expires (status → EXPIRED) | U1 can now broadcast again |

---

## TC-06: Background Check Status Gate

**Risk**: User without CLEAR background check broadcasts a date.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User registers (bgCheckStatus = PENDING) | Account created |
| 2 | POST /api/broadcasts/create | 403 "Background check must be cleared before broadcasting" |
| 3 | Background check webhook fires with status = 'clear' | bgCheckStatus → CLEAR |
| 4 | POST /api/broadcasts/create | 201 |

---

## TC-07: Stripe Hold — Manual Capture Authorization TTL

**Risk**: Date is scheduled 10+ days in the future. Stripe cancels uncaptured holds after 7 days.

**Guard**: (To implement) A Vercel cron job at `/api/cron/refresh-holds` runs every 6 days.
It re-authorizes holds for commitments where `scheduledFor > now + 6 days`.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Commitment created, holds authorized | PI status = `requires_capture` |
| 2 | 6 days pass without date | Cron re-runs _authorizeHold() with same idempotency key structure + `-refresh-N` suffix |
| 3 | Old PI cancelled, new PI authorized | Hold refreshed; user never re-prompted |

*Note: Stripe allows re-capture on the same card without user action for off-session PIs.*

# Issue 3 — No automated recovery for post-burn CCTP mint failures

**Severity:** High — user-visible "funds lost" until manual intervention
**Component:** Execution orchestrator / recovery subsystem
**Status:** Open

## Symptom
When a CCTP mint fails, the order sits in `status: error` indefinitely. Unlike a source-chain revert (auto-refunds), there's no path back — source USDC is already burned. The Circle attestation is valid and the mint is retriable, but nothing polls or replays.

## Example
- Order: SOL → USDC on Base
- Burn tx: `5wVn3RYzPiHqD4RRmznGHLXSbJUKvMbMVCfNoqZaCpuXPzNQd3ymLBNtDx5P1BQuAjxLeyCriMRTQ16rYFvLn46V`
- `refund_tx_hash: null`, `destination_tx_hash: null`
- Attestation is `status: complete` at Circle Iris — actionable right now, nothing is acting on it.

## Acceptance criteria
- [ ] On CCTP mint `status: error`, enqueue a recovery job that:
  - polls Circle Iris for `status: complete`,
  - submits `receiveMessage(message, attestation)` on the destination chain,
  - retries on transient bundler/RPC errors with backoff.
- [ ] Recovery job is idempotent (CCTP mints are nonce-guarded — safe to replay).
- [ ] Handle non-recoverable cases (e.g. `destinationCaller` mismatch from Issue 2): flag for manual intervention instead of infinite retry.
- [ ] Surface user-facing state: "bridging — retrying mint" rather than terminal `error`.
- [ ] Alert on any order in `error` with an unredeemed attestation older than N minutes.

## Out of scope
- Fixing the root cause of the mint failure itself — see Issue 2.

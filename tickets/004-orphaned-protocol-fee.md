# Issue 4 — Protocol fee orphaned at deposit address when a later step fails

**Severity:** Low (accounting leak, small amounts per order)
**Component:** Execution orchestrator / fee sweeper
**Status:** Open

## Symptom
The `fee` step (DIRECT_TRANSFER) is sequenced after swap/bridge. If an earlier step errors, the fee never sweeps; the fee slice stays at the deposit address indefinitely.

## Examples
- Sui order: ~0.0104 USDC on Sui stranded at `0x1b9bd6d0bb559c2e8d3f89ec827e3e980cd4b7b0cba15d0406ae4fe9b9f9c62f`
- Solana order: ~0.0157 USDC on Solana stranded at `F5trcbAufNDTtWMqWayjwXcASsaHRNoKLtsi9rUwSyN1`

## Acceptance criteria
- [ ] On terminal order failure, reconcile deposit-address balances: either sweep the fee or include it in the refund.
- [ ] Emit a ledger entry so stranded-at-deposit balances are auditable.
- [ ] Periodic job scans known deposit addresses for residual balances and reports.

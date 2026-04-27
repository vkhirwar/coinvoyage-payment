# Issue 1 — Swap leg reverts with slippage error on thin DEX pools

**Severity:** Medium
**Component:** Routing / DEX adapter — Cetus (Sui)
**Status:** Open

## Symptom
Cetus swap aborts on-chain with:
```
MoveAbort ... err_amount_out_slippage_check_failed ... in command 7
```
Quote-time `price_impact` was 0.72%, realized impact exceeded the minAmountOut bound.

## Examples

**Order A — WWAL → USDC**
- 29.97 WWAL (Sui) → 2.09 USDC (Base)
- Quoted `price_impact`: 0.72%
- Source tx: `2Qfh1J7LaQiPTng6Dhs7CNdxmLqnnEU2y7pbb7qihfvo`
- Refund tx: `4CCCLY7aB6wQQxTmDbVhQXVfu8CEKG2XDhXnwyV7v6FB`

**Order B — NAVX → USDC** (order id `cmocq14a600hr01m9vtcrnc1a`)
- 247.15 NAVX (Sui) → 2.09 USDC (Base)
- Quoted `price_impact`: **6.38%** — still reverted, meaning realized slippage exceeded even the 6%+ bound
- Source tx: `HCTUdJEnxZJnJkAkGHFvLxJqHejxzGgy4ZHBJztEBHr3`
- Refund tx: `8Vm5ux9FUcwPRbRPAhKLH2P7dXXveh7F5eiJMk1jmk36`

Both auto-refunded correctly (pre-burn revert on Sui). Same user (`refund_address 0x0b14517c…f09100`) in both cases.

## Root cause hypothesis
- Cetus pools for low-cap Sui tokens (WWAL, NAVX) are thin; price moves significantly between quote and execution.
- The fact that Order B quoted 6.38% impact and *still* reverted rules out "slippage tolerance is simply too tight" as the sole cause. The quote itself is stale or the pool state shifts mid-tx.
- Likely: minAmountOut is computed from the stale quote with no additional safety buffer; by execution time the pool has moved further.

## Acceptance criteria
- [ ] For quotes with `price_impact > 0.5%`, add a dynamic safety buffer to minAmountOut beyond the user's slippage tolerance, OR warn the user that execution likelihood is low.
- [ ] For quotes with `price_impact > 3%`, block by default and require explicit user confirmation.
- [ ] Log realized vs. expected output for Cetus fills to quantify quote staleness.
- [ ] Deprioritize Cetus when an alternative Sui venue returns a comparable quote.
- [ ] Consider re-quoting immediately before submission if the first quote is more than N seconds old.

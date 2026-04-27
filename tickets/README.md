# Swap order failure tickets

Opened 2026-04-24 from investigation of two failed production orders.

| # | Title | Severity |
|---|---|---|
| [001](001-slippage-thin-dex-pools.md) | Swap leg reverts with slippage error on thin DEX pools | Medium |
| [002](002-solana-cctp-destination-caller.md) | Solana CCTP burns set a `destinationCaller` that doesn't match the Base relayer | **High** |
| [003](003-cctp-post-burn-recovery.md) | No automated recovery for post-burn CCTP mint failures | **High** |
| [004](004-orphaned-protocol-fee.md) | Protocol fee orphaned at deposit address when a later step fails | Low |
| [005](005-error-state-ux.md) | Error states don't communicate recoverability to the user | Medium |
| [006](006-paykit-sdk-payment-methods-422-after-status-transition.md) | Card payments fail instantly on click: `/payment-methods` 422s for every card-enabled order | **Critical** |
| [007](007-card-payment-cost-transparency.md) | Card payment total (~6.7%) dominated by Stripe onramp; verify user sees final charge | Medium |

## Priority order
1. **002** — root cause; blocks every Solana → EVM bridge.
2. **003** — recovery backstop; protects users when 002-like bugs recur.
3. **001**, **005**, **004** — quality/UX improvements, not funds-at-risk.

## Recovery for the stuck order (burn `5wVn3R…Ln46V`)
Circle attestation is `status: complete`. Minting requires `msg.sender == 0x4d5936106290eb5dfdd6f1164370d29d5c0ca024` calling `MessageTransmitterV2.receiveMessage(message, attestation)` on Base. Message and attestation bytes are retrievable from:
```
https://iris-api.circle.com/v2/messages/5?transactionHash=5wVn3RYzPiHqD4RRmznGHLXSbJUKvMbMVCfNoqZaCpuXPzNQd3ymLBNtDx5P1BQuAjxLeyCriMRTQ16rYFvLn46V
```
On success, 3.134902 USDC mints to `0xFC99C0c8D697ab7a7262640145F453c988d36b75`.

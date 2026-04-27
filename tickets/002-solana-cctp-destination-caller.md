# Issue 2 — Solana CCTP burns set a `destinationCaller` that doesn't match the Base relayer

**Severity:** High — funds stuck post-burn on every Solana → EVM bridge
**Component:** Solana CCTP adapter (burn path)
**Status:** Open
**Scope:** Solana-source CCTP only. EVM-source CCTP is confirmed working.

## Confirmed via Circle Iris API

**Working Optimism → Base burn** (`0x86025073320c1c485c3f4863fbe94e466dac0ea60198c570f4d062ce23003947`):
```
destinationCaller: 0xba5fa6f5f7f8e56cc9b805046bf07a3f38873d5a  ← == deposit address (same counterfactual smart-wallet on every EVM chain)
mintRecipient:     0xfc99c0c8d697ab7a7262640145f453c988d36b75
cctpVersion:       2
```
Bundler submits `receiveMessage` from `0xba5FA6f5…` → `msg.sender == destinationCaller` ✓

**Failing Solana → Base burn** (`5wVn3RYzPiHqD4RRmznGHLXSbJUKvMbMVCfNoqZaCpuXPzNQd3ymLBNtDx5P1BQuAjxLeyCriMRTQ16rYFvLn46V`):
```
destinationCaller: 0x4d5936106290eb5dfdd6f1164370d29d5c0ca024  ← unrelated to bundler's smart-wallet sender
mintRecipient:     0xfc99c0c8d697ab7a7262640145f453c988d36b75
amount:            3134902 (3.134902 USDC)
cctpVersion:       2
status:            complete  (attestation ready)
```
Bundler attempts `receiveMessage` from a smart-wallet → `msg.sender != destinationCaller` → reverts `Invalid caller for message (-32521)`.

## Root cause
The Solana CCTP adapter writes `0x4d5936106290eb5dfdd6f1164370d29d5c0ca024` into the `destinationCaller` field when calling `depositForBurnWithCaller` (v2). That address is not the smart-wallet the Base bundler actually uses to execute `receiveMessage`.

## Fix options
1. **Simplest:** set `destinationCaller = bytes32(0)` on Solana burns → permissionless mint, matches UX of EVM→EVM flows.
2. **Stricter:** compute the exact Base-side smart-wallet address (e.g. counterfactual 4337 address used by our bundler) and set that, matching the EVM→EVM pattern.

Option 1 is recommended unless there's a specific reason we need caller-restricted minting.

## Acceptance criteria
- [ ] Solana CCTP burn path no longer sets `destinationCaller = 0x4d59…a024`.
- [ ] A live Solana → Base test order mints successfully on Base within normal attestation window.
- [ ] Add an end-to-end test for Solana → Base so regressions are caught before deploy.
- [ ] Verify Solana → Optimism / Solana → Arbitrum also work after the fix.

## Related
- Issue 3 (recovery): once the fix lands, replay the pending Solana attestations so historical stuck orders settle.

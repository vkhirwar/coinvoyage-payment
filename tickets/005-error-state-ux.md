# Issue 5 — Error states don't communicate recoverability to the user

**Severity:** Medium (trust + support load)
**Component:** Swap UI (`app/swap/swap-content.tsx`) + status polling
**Status:** Open

## Symptom
Both failure modes return `status: error` but mean very different things:
- Sui/Cetus slippage revert → auto-refunded, user is whole.
- Solana CCTP mint failure → funds in limbo, recovery required.

UI can't distinguish them; user sees the same generic error.

## Acceptance criteria
- [ ] Introduce sub-statuses: `refunded`, `stuck_recoverable`, `stuck_needs_support`.
- [ ] When a retry is active, show progress ("Circle attestation ready — retrying mint…").
- [ ] When `stuck_needs_support`, link to a support path with the order/burn hashes prefilled.
- [ ] In `refunded`, show the refund tx hash clearly so the user confirms funds returned.

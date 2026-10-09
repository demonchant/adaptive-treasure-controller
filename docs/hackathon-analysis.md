# Hackathon Analysis

**Updated:** October 9, 2026. Research only; no code, sandbox operation or submission.

## Finding

The Airwallex Agentic Banking Hackathon publicly lists Treasury & Ops Kit 01 Adaptive Treasury Controller and Kit 03 Payment Ops Incident Commander. The event page says one or more tracks may be selected; this does not confirm multiple project submissions. Kit 01 is the strongest thematic fit. Select the narrowly scoped Liquidity Crisis Response Agent as the first Kit 01 slice: delayed receipt/balance shock changes a reserve-constrained pay/defer/escalate decision.

## Schedule and deliverables

HackerEarth lists build Oct 25, 2026 04:30 UTC–Nov 13, 2026 18:29 UTC; Africa/Lagos is UTC+1. Application phase closes Oct 23 at 16:29 UTC. Main page also says “Over 48 hours,” creating an unresolved schedule conflict. FAQ lists working demo, video under five minutes and repository link with setup instructions. See `competition-rules.md`.

## Rules and rubric

No published weights/criteria found in event FAQ or accessible HackerEarth overview. Two-project, prior-code and pre-build rules are **UNCONFIRMED**. Do not implement substantial features until organizer clarification or official build start. Request actual rubric and form fields. Do not invent a score.

## Sponsor and technical feasibility

Airwallex developer guide documents Kit 01 and sandbox paths; exact API contracts still require current official API reference and empirical proof. No sandbox credential/account or provider response verified for this repository. Use only a separate builder-configured sandbox, never TransferGuard credentials. High-risk spike: authenticate → current balance → approved sandbox action → independent provider read-back. FX is optional and omitted unless quote/fees/conversion can be proven.

## Idea gate and next step

See `idea-selection.md`, `hardest-promise.md`, `architecture.md` and `verification-plan.md`. Liquidity crisis slice scores 46/50 by internal Appendix A planning method; this does not pass mandatory floors yet. Stop at research/docs until eligibility and API evidence gates clear. No contest submission, deployment, tests or live API proof exists.

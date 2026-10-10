# Idea Selection

**Decision date:** October 9, 2026. **Status:** provisional pending eligibility clarification and live sandbox spike. Scores use Hackathon Build Standard Appendix A (1–5 per dimension, /50). They are internal planning aids, not official hackathon scores or predictions. API evidence remains documentation-only.

## Candidates

### A. Adaptive Treasury Decision Engine — broad option, not selected at full scope

For a founder/treasury operator who must decide which obligations to pay, defer, escalate or convert when funds are insufficient. The engine shows an initial constrained plan, receives a delayed-receipt or balance change, recalculates, and binds approval to a specific provider action. Deterministic money arithmetic and rules own the plan; optional AI extracts obligation terms from supplied invoices/receipt notices and explains trade-offs. Airwallex is the sandbox balance, FX and transfer source/action provider. Synthetic obligations/events are clearly identified.

Official match: Airwallex Treasury & Ops, Kit 01, directly about funding/converting/deferring/escalating under a reserve floor. The guide documents API pathways, no extra enablement, and a changed-condition demo. Real complexity includes multi-currency precision, liquidity, fee-aware conversion, stale inputs, partial payment outcomes and approval-bound execution. Bound initial scope to supported corridors; omit FX if not live-verified.

### B. Liquidity Crisis Response Agent — selected as the Kit 01 first slice

For an operator facing a delayed expected receipt or sudden balance reduction immediately before payments fall due. It recomputes a feasible pay/defer/escalate plan and protects the reserve. This is the narrowest high-consequence first slice of the official Kit 01 decision, with a clear before/after state and bounded solo scope. Expand into the broader Adaptive Treasury Engine only after the core proof works.

### C. Cross-Currency Treasury Optimizer — reject as primary standalone concept

For an operator funding foreign-currency liabilities while comparing conversion costs, deadlines and reserve constraints. This exposes FX quote/conversion APIs and a measurable cost trade-off, but current evidence is docs only. Rate/fee locking, corridor and wallet support, quote freshness, precision and resulting funds need live proof. A full optimizer risks overclaiming optimality and overloading a solo builder. Include fee-aware FX as a bounded sub-decision of A only after verification.

## Comparison scorecard

Scores reflect evidence and feasibility as of Oct 9, not ambition. “Sponsor” means Airwallex would be load-bearing if documented APIs are confirmed live. Definitions follow the Build Standard Appendix A.

| Dimension | A: Adaptive Treasury | B: Liquidity Crisis | C: Cross-Currency |
|---|---:|---:|---:|
| User pain and specificity | 5 | 5 | 4 |
| Rubric fit / eligibility confidence | 5 | 5 | 4 |
| Distinctive mechanism beyond wrapper | 4 | 3 | 4 |
| Hardest promise buildable/provable | 4 | 5 | 3 |
| Airwallex load-bearing role | 5 | 5 | 5 |
| Data/API/credential feasibility | 4 | 4 | 3 |
| Evidence/evaluation practicality | 5 | 5 | 4 |
| Failure/recovery handling | 4 | 4 | 3 |
| Judge comprehension/demo clarity | 5 | 5 | 4 |
| Solo scope / actual time | 4 | 5 | 3 |
| **Total** | **45/50** | **46/50** | **37/50** |

No candidate clears the Build Standard proceed gate: primary rules/rubric are incomplete, sponsor use is not live-probed, and pre-build permission is unresolved. B scores highest because its smaller promise has the clearest feasibility and scope for a solo builder, while still directly expressing Kit 01's consequential reserve-constrained decision. Select B as the initial product, under the Adaptive Treasury Controller track; defer A's broader multi-currency allocation/optimization scope until the vertical proof passes. Revise scores after the API spike.

## Trade-offs and competitor evidence

- Kit 01 is an unusually direct official track match; that does not establish originality or score.
- Meaningful decision and state change distinguish it from a generic dashboard; differentiation must be checked against Airwallex products and actual projects.
- Event page/guide did not expose competitor submissions. Checked Oct 9; no accessible public submissions/results found. Competitor quality and novelty remain **UNKNOWN**, not assumed weak.
- Solo feasibility depends on the long HackerEarth build window; main page also says “Over 48 hours.” Confirm schedule.
- Minimize AI: use only for extraction/interpretation if it improves the workflow; never add a chatbot or AI arithmetic.

## Selection and pivot criteria

Select **Liquidity Crisis Response Agent**, implemented as the first scoped slice of **Adaptive Treasury Controller (Kit 01)** in **Treasury & Ops**. Use a delayed receipt or sudden balance drop as its decision-change beat. This is not yet implementation-ready.

Narrow or pivot if: organizer rules disallow this work or prior-code separation; no sandbox account/credentials; balances/transfers cannot be queried and independently read back; transition demo is not repeatable; FX is not proven (drop it); or the plan cannot preserve reserves and segregate forecast from available funds. If only one submission is allowed, do not submit TransferGuard and this as two entries without explicit authorization.

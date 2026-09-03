# Must-Know scoring

The score ranks catalog records for curriculum selection. It is editorial infrastructure, not learner-facing UI.

```text
Primary loose checkout item    +30
Common supermarket produce     +25
Weight / Each explicitly given +15
Belongs to confusion family    +15
Common family                  +10
Useful visual distinction      +10

Package / bag                  -15
Case / inventory record        -25
Duplicate/alternate listing    -20
Obscured / uncertain           -25
Rare specialty produce         -10
```

The raw total is clamped to `0–100`, then classified:

```text
80–100  Essential
60–79   Common
40–59   Useful
20–39   Specialty
0–19    Reference
```

The implementation lives in `lib/must-know-score.ts`. Every active signal is retained in the returned breakdown so a ranking can be audited rather than treated as a black box.

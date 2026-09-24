# MAHWORLD — New class and combat rules

This is the 14 September 2026 continuation for gameplay answers 17–23. It extends the earlier bare-field brief. It does not claim the game code or characters have already changed.

Give Claude the entire packet. Ask it to execute `CLAUDE_IMPLEMENT_17_23.md` using the design and JSON, continuing from its actual latest checkpoint.

| File | Purpose |
|---|---|
| `MAHWORLD_RULES_17_23.md` | Readable decisions, five class profiles, mechanics, interpretations and open questions. |
| `MAHWORLD_RULES_17_23_STARTER.json` | Editable development numbers and 30 draft starter skill definitions for Claude to map into the real project. |
| `CLAUDE_IMPLEMENT_17_23.md` | Complete continuation prompt with implementation stages and required runtime evidence. |
| `validate_rules.py` | Internal configuration consistency check. Run with Python 3; no external dependencies. |
| `CONFIG_VALIDATION.md` | Actual result from that configuration check, not a gameplay test report. |

Simple picture: three attack choices, two energy bars, five distinct class profiles, and the same empty test floor. BAGE can heal; Titan infuses strikes; Athlete hits hardest physically; Visionary controls space; Lean moves and acts fastest.

The numbers, draft move names, guard coefficients and niche-ability details are starting choices, not final balance. Two readings are explicitly flagged: Visionary cannot heal, and Lean's 80% magic reference is Athlete's corresponding magic strength. BAGE/Mage/Balance Mage are one class.

The current project rule ledger should remain Claude's integrated reference. This packet is a dated incoming specification. Claude must record what it actually adopts and its ruleset version, while keeping earlier unanswered decisions open and historical replay deterministic.

No native Blender execution, finished art, map, real workout connection or production deployment is needed to implement the independent gameplay work. Astra's source and protected characters stay separate.

To repeat the design check from this folder:

```bash
python3 validate_rules.py --report
```

The requested result from Claude is a working local launch and controls, implemented mechanics, focused tests and honest browser evidence. Configured data alone does not satisfy that implementation task.

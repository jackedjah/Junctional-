# R90 COACH / FOB FUNCTION INVENTORY

No legitimate pre-pass coach/business capability was intentionally deleted.

| Existing capability | R90 disposition |
|---|---|
| MAH COACH BACKEND landing | **STANDARDIZED / REPOSITIONED.** Legacy `/admin` is now clearly FOB business administration. Primary fitness entry is canonical MAHFITT Coach Mode. |
| Choose Profile dropdown | **REPLACED AS PRIMARY UX.** Canonical Coach Mode uses searchable authorized Client Directory. Legacy dropdown remains as an administrative shortcut/fallback. |
| Client selection | **REUSED + STANDARDIZED.** Existing member data remains authoritative; selection now enters authorized active-fitness-profile context. |
| Client transition/orientation | **NEW CANONICAL CONTEXT UX.** Short `SWITCHING TO [CLIENT]` transition. |
| Persistent client identity | **NEW SHARED PRIMITIVE.** `COACH MODE · VIEWING [CLIENT] · EXIT` across canonical MAHFITT surfaces. |
| MAH Gym / workouts | **REUSED CANONICAL COMPONENTS.** Client fitness context flows through existing member MAHFITT. |
| Program Library / editing | **REUSED CANONICAL COMPONENTS.** Authorized client edits write the same `gym_member_programs` rows the client sees. No shadow coach program database. |
| MAH Calendar | **REUSED CANONICAL COMPONENT.** Calendar reads client events while account Theme/music remain coach-owned. Member-originated booking/reschedule actions cannot be impersonated by coach context. Existing calendar-admin remains available for legacy FOB administration. |
| MAH Log | **REUSED CANONICAL COMPONENT.** Relationship coach can access authorized client log data with `logs` permission. |
| Meal Scan AI | **PROTECTED.** Coach-client context receives `CLIENT_AI_PROTECTED`; ordinary log review remains available. |
| MAH Progress | **REUSED CANONICAL CONTEXT.** `progress` permission enforced by the shared role owner. |
| MAH Media | **REUSED CANONICAL CONTEXT.** `media` permission enforced; no separate coach-media page created. |
| Mr.Mah / MAH Protocol / Prowork / Retrowork | **PROTECTED PERSONAL AI.** UI and server/action guards prevent another member's AI use/quota/history access. Coach self AI remains ordinary self context. |
| Message Center | **REUSED DATABASE + STANDARDIZED.** Relationship coaches can open/send in the existing member thread through canonical MAHFITT with `messages` permission. Server persists coach sender identity; legacy FOB Message Center remains for business/admin workflows and Theme Curation. |
| Members Edit / membership access | **PRESERVED FOB ADMIN.** Existing `/fob-payment` business logic remains authoritative. |
| Session balance / QR check-in | **PRESERVED FOB ADMIN.** Existing admin/session owners remain; client context cannot mint a client's check-in identity. |
| MAH Inquiries | **PRESERVED FOB ADMIN** through existing `/form-review`. |
| FOBreakdown / report cards | **PRESERVED FOB ADMIN / COACH BUSINESS SURFACE.** |
| Theme Curation fulfillment | **PRESERVED** in existing private Message Center/business flow. |
| Outer FOB website | **PRESERVED.** No standalone-app migration or PT Distinction feature expansion occurred. |

## Parked by scope

R90 does not add Habits, Guides, groups, challenges, PTD calendar architecture, new assessments, new coaching packages, or unrelated nutrition/coaching automation products.

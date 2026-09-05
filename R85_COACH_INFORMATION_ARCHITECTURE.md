# R85 COACH INFORMATION ARCHITECTURE

## First level

Coach Mode is now organized around what a coach needs first:

1. **TODAY** — who needs attention now, based only on supported current data.
2. **CLIENTS** — search/browse authorized clients and enter canonical client context.
3. **MESSAGES** — relationship-scoped private inbox and threads.
4. **RESOURCES** — manage simple coaching materials and assign them to clients.
5. **ADMIN** — deliberate FOB business administration depth.

This replaces the old first-level experience where Periodization, Body / Activity, Routine Creator, Exercise Database and program machinery competed for attention immediately.

## Today

Supported attention types are intentionally narrow:

- unread client message notifications
- scheduled client calendar events occurring in the requested day window
- completed workouts occurring in the requested day window

R85 does not fabricate check-in readiness, adherence scores, or analytics that the current backend cannot prove.

## Clients

`Coach Mode -> Clients -> select client -> short switch transition -> canonical MAHFITT Home`

The selected person becomes the active **fitness profile**, not the authenticated account. Context stays visible and Exit returns to coach self.

## Client-context depth

The coach first sees the same Home hierarchy the client uses. Advanced training machinery appears only when the coach deliberately enters:

`Client Home -> Program Library -> Program Tools`

Program Tools preserve access to existing deeper functions such as Periodization, Routine/Program creation and the Exercise Database without making them the welcome screen.

Body / Activity remains connected to the existing Progress/Health ownership rather than being a Coach Home toolbox card.

## Messages

Coach Inbox lists relationship-scoped threads. Opening a row enters the existing canonical private thread. Sending preserves the real authenticated sender.

## Resources

Coach Resources is a first-class area. Member/client assigned resources are surfaced through canonical Progress. The initial production resource types are deliberately **link** and **text** because those are safe within the current stack; browser-compatible PDFs/images/videos can be represented by valid site-relative or HTTPS links. R85 does not falsely present a new upload CMS.

## MAH Habits

MAH Habits is one canonical system for self/member/client/coach context. It is discoverable through MAH Progress so normal member Home density and its accepted primary hierarchy remain intact.

## Admin

FOB-specific business administration is intentionally separated from day-to-day coaching. Existing business functions remain reachable. Old direct per-member shortcuts survive only as an explicit fallback, not the primary Coach experience.

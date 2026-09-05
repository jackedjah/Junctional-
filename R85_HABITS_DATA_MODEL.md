# R85 MAH HABITS DATA MODEL

R85 implements **one canonical MAH Habits system** rather than separate coach/member/client copies.

## Tables

### `mahfitt_habits`

Key ownership fields:

- `member_id` — fitness profile that owns the habit
- `created_by_member_id` — actual account/member actor that created it
- `source_type` — `self`, `coach`, or future `mrmah`
- `title`
- `schedule` — JSONB; R85 supports simple `daily` and `weekdays` schedule kinds
- `active`
- timestamps

The provenance split means a future Mr.Mah-created habit does not require replacing the storage model.

### `mahfitt_habit_completions`

Stores per-day state separately from habit definition:

- `habit_id`
- `member_id`
- `day`
- `completed`
- `updated_by_member_id`
- timestamps

One `(habit_id, day)` row is upserted, allowing complete/uncomplete without duplicating the habit.

## Permission behavior

- Self context creates `source_type=self` with self as owner and actor.
- Coach viewing an authorized client creates `source_type=coach`, with client as fitness owner and coach as actor.
- A coach may edit/archive a client habit through this surface only when the coach created that coach-sourced habit and the relationship grants `habits` permission.
- The coach can view/toggle authorized client completion state where `habits` permission allows it.
- Habit rows are always filtered by the active fitness member, preventing cross-profile leakage.

## Security

The tables have RLS enabled and direct `anon` / `authenticated` privileges revoked. Production mutation flows through server-side functions using the existing authenticated role-context resolver.

# R90 ROLE / CONTEXT MAP

R90 implements the R84 unified-role product contract on top of the newer complete `MAHFITT_R89_FULL_SITE_DEPLOY.zip` checkpoint.

## Canonical ownership model

| Concept | Owner |
|---|---|
| Signed-in account | The authenticated MAHFITT human holding the device |
| Active fitness profile | The member whose fitness state is being rendered |
| Permission context | Self, active coach relationship, or existing FOB admin grant |
| Fitness data owner | Active fitness profile |
| Music owner | Signed-in account |
| Theme owner | Signed-in account |
| Personal AI owner | Active fitness profile; another person cannot operate it through Coach Mode |
| Message sender | Signed-in account / actual sender role, never the selected client |

The canonical server resolver is `netlify/functions/_mahfitt-role-context.js`. A browser-provided `activeProfileId` is never authorization by itself. Non-self access requires either an active `mahfitt_coach_relationships` row or the independently authenticated legacy FOB admin grant.

## Examples

### Independent member
`account = member`, `fitness = member`, `music/theme = member`, `AI = member`, client context false.

### Coached client using their own account
Same ownership as any other member. Being coached does not create a second account species or second UI.

### Coach using MAHFITT as self
`account = Jah`, `fitness = Jah`, `music/theme = Jah`, personal AI allowed according to Jah's entitlement, plus Coach Mode capability.

### Jah viewing Dominic
`account = Jah`, `activeFitnessProfile = Dominic`, `fitness data = Dominic`, `permissions = Jah -> Dominic relationship`, `music/theme = Jah`, `AI owner = Dominic`, `clientAiBlocked = true`. Messages sent by Jah remain `sender_role = coach`.

### FOB administrator viewing a member
The existing private FOB admin authentication remains a separate business-admin grant. It can authorize a target through the same resolver, but does not turn ordinary MAHFITT coaches into FOB administrators.

## Client-context lifecycle

Client context is stored under the one session key `fob.mahfitt.coachContext.v1`. Every request that uses it is re-authorized server-side. Normal MAHFITT navigation preserves the selected fitness profile. EXIT requests a self `coachProfileBoot`, restores the signed-in account's fitness profile, and leaves the single audio/Theme owner untouched.

The client switch uses a fitness-only hydration endpoint. It deliberately excludes Theme and music so entering/exiting client context cannot replace, duplicate, or restart the signed-in coach's audio state.

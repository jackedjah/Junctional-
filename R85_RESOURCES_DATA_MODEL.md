# R85 RESOURCES DATA MODEL

Resources is a deliberately small v1 coaching library using one resource record plus assignment relationships.

## Tables

### `mahfitt_resources`

- `owner_coach_member_id` — coach/account owner
- `title`
- `category`
- `resource_type` — R85 supports `link` or `text`
- `url` for link resources
- `body` for text resources
- `archived`
- timestamps

URLs are restricted to valid HTTPS URLs or site-relative paths. This safely permits references to existing browser-compatible PDFs, images, videos or site pages without falsely introducing a new upload/storage CMS.

### `mahfitt_resource_assignments`

- `resource_id`
- `client_member_id`
- `assigned_by_member_id`
- `assigned_at`

The same resource can be assigned to multiple clients without copying its content into shadow client records.

## Authorization

- Resource management requires Coach self context.
- Assignment independently resolves the target client through the canonical role-context owner and requires `resources` permission.
- Client/member retrieval returns only active resources actually assigned to that active fitness profile.
- Archiving a resource removes it from active listings while preserving historical relational identity.

## Scope intentionally not claimed

R85 does not implement a large upload CMS, mass broadcast system, content automation, groups, or challenges. The model is extensible without presenting those features as working today.

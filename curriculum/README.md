# Curriculum

Lesson metadata for StylusForge.

## lessons.json

[`lessons.json`](lessons.json) is the single source of truth for each lesson's on-chain identity:

```json
[
  { "id": 1, "name": "Hello World Stylus", "xp": 100 }
]
```

| Field | Type | Rule |
|---|---|---|
| `id` | integer | Positive and unique. It is the ERC-1155 token id of the lesson certificate. |
| `name` | string | Non-empty. Registered on-chain with `addLesson`. |
| `xp` | integer | Zero or more. XP awarded when the certificate is claimed. |

### Consumers

- `contracts/scripts/deploy.ts` registers every lesson on `StylusForgeNFT`.
- `contracts/test/StylusForgeNFT.ts` registers the same lessons and derives its expectations from them.
- The web app will read it in Phase 2. Until then, `apps/web/lib/curriculum/lessons.ts` keeps its own copy of the ids, titles and XP.

Both contract consumers load the file through `contracts/scripts/lessons.ts`, which validates it and fails on a malformed entry.

### Changing lessons

Lessons are registered once, at deployment. On a deployed contract a lesson cannot be renamed, repriced or removed, so editing an existing entry here does not change it on-chain. To add a lesson after deployment, append it with a new id and call `addLesson` with the same values from the owner account.

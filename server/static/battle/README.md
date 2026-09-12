# Battle view

Open `/battle` (or `/battle/`) to watch Anima activity as a side-view, 16-bit RPG battle. The dashboard's **Battle** navigation entry opens it in a new tab. `/battle?demo=1` plays an explicitly labeled, repeatable sample adventure with four fictional Animas. Demo mode does not subscribe to live events or read tasks. A failed live connection never switches to demo.

The page includes command selection, target selection, casting, a dash or spell effect, floating damage, a result message, and enemy dissolution on completion. Research, crafting, support, and guard use different effects. Playback can be paused or played at 0.5×–4×; fullscreen is available where supported. Reduced-motion preferences disable moving sprites and particles. Layout adapts to phones and tablets. Labels are translated in Japanese, English, and Korean.

## What the battle means

This is a spectator view: it never starts tasks, sends messages, or changes Anima state. Pause and speed affect only the presentation. Damage and gauges are illustrative, not estimates of task progress or Anima health.

| Runtime activity | Battle interpretation |
| --- | --- |
| Pending/running task | Monster, labeled with its actual summary and assignee |
| Read, search, browse, memory retrieval | Research / Knowledge Flare |
| File editing, commands, other tools | Attack / Craftblade |
| Messages, reports, board posts, delegation | Support / Link Rally |
| Checks, planning, heartbeat context | Guard / Focus Shield |
| Tool error | MISS; enemy remains |
| Task `done`, execution `completed` | Finishing attack, defeat, and task counter increment |
| Failed/blocked execution | Enemy remains; no victory |
| Cancelled, expired, skipped, undeclared, hidden or removed task | Withdrawal; no victory |
| Chat, inbox, cron or heartbeat activity without an identifiable task | Temporary activity encounter, excluded from task victory counts |

Only one action is animated at a time. Four Animas and three enemies appear on the field; the acting Anima's party page and target become visible automatically. Idle party pages can also be changed manually. Extra enemies remain in reserve and enter as space becomes available. Tool traffic is coalesced during bursts, with a bounded animation queue. Very large batches of terminal transitions are reconciled immediately when necessary to prevent an unbounded playback backlog.

## Live data

`server/static/battle/modules/live.js` extends **the existing Pixel `LiveClient`**. It reuses `/ws`, ping/pong, reconnect backoff, and cleanup. No second backend socket or execution system is introduced.

- `GET /api/animas` supplies the roster and busy state.
- `GET /api/task-board` supplies the canonical task projection at startup, reconnect, every 15 seconds, and after task lifecycle events.
- `anima.tool_activity` accepts both activity-log payloads (`type`, `tool`, `ctx`, `ts`, `meta`) and chat-stream payloads (`event`, `tool_name`, `tool_id`, `is_error`).
- `anima.status`, `anima.interaction`, `anima.proactive_message`, `board.post`, `anima.heartbeat`, and `anima.cron` also drive the scene.
- ActivityLogger exports `task_exec_start` and `task_exec_end` through the existing `anima.tool_activity` envelope. Task lifecycle events bypass the tool-event limiter so a final completion cannot be lost behind a burst of tools.

Task identity is `(anima_name, task_id)`, because separate queues can contain the same ID. Explicit task IDs and `task:<id>` contexts take precedence. An unscoped tool is associated with a canonical task only when there is exactly one running task for that Anima; otherwise a separate activity encounter is used. Becoming idle never counts as completion. Historical completed tasks do not replay as victories on first load. Cancelled/deleted tasks never count as completed. Snapshots that predate a live completion cannot resurrect the monster.

Connection status and data errors remain visible. The standard server authentication and setup guards apply; a user who needs to authenticate can follow the workspace link. Base-path deployments (for example `/office/battle`) use the same prefix for assets, APIs, and WebSocket requests.

## Assets

Original generated art, inspired by the presentation of classic 16-bit RPGs, lives in `server/static/battle/assets/`. Generation prompts and provenance are recorded in that directory's `README.md`.

The renderer uses the bundled PixelMplus font and nearest-neighbor image sampling. It probes `/api/animas/<name>/assets/pixel_sheet.png` using Pixel's existing **256×640, 64×64-frame** character contract. If a personal sheet is unavailable, one of four generated job sprites is selected deterministically. Runtime character names and private assets are never bundled.

## Verification

```bash
uv run pytest tests/unit/server/test_battle_model.py tests/unit/server/test_battle_routes.py tests/unit/core/memory/test_activity_live_event.py
uv run pytest tests/e2e/test_battle_e2e.py
```

Model tests execute the real JavaScript in Node.js; browser tests use Playwright Chromium. Tests cover actual animation phases, pause, mobile/tablet overflow, demo waves, WebSocket ping/pong and reconnect, scoped task identity, completion/failure/cancellation, duplicate tool events, snapshot races, authorization errors, untrusted text, and prefixed deployments. Browser tests use fixture APIs and WebSocket frames; they do not connect to a real Anima runtime.

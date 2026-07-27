# Obsidian AI Capture Task Plan

## Goal

Add an AI-assisted capture layer to the Obsidian Daily Todo page. The feature should turn pasted text into **candidate Todos** using a company-internal LLM endpoint, then require explicit user confirmation before writing anything into the selected Obsidian daily note.

This is intentionally a candidate-first workflow:

```text
Paste text
→ Analyze with LLM endpoint
→ Show candidate Todo cards
→ User confirms
→ Write to Obsidian daily note
→ Optional: Analyze and execute with an Orca agent
```

## Product principles

1. **AI suggests, user confirms.** Never write to Obsidian automatically in the first version.
2. **No automatic execution.** Candidate acceptance only creates a daily Todo. Agent execution remains a separate user action.
3. **Manual first.** Start with paste-to-analyze. Do not ship background AX/input monitoring in v1.
4. **Main-process LLM calls only.** API key and endpoint config must not be exposed to the renderer.
5. **Endpoint-based LLM is expected.** The analyzer should call the company-internal OpenAI-compatible/chat-completions endpoint from the main process.
6. **Safe degradation.** If LLM is not configured or analysis fails, the existing manual Add Todo flow must continue working.

## Current context

The Obsidian Daily Todo page already supports:

- Selecting an Obsidian vault/daily note.
- Parsing Markdown checkboxes from daily notes.
- Grouping by `###` sections and `#### P1` / `#### P2` / `#### P3` priority headings.
- Mapping `[ ]`, `[/]`, `[x]`, `[-]` to pending, in-progress, completed, cancelled.
- Adding a Todo manually.
- Editing Todo text.
- Switching Todo status.
- Creating/editing per-Todo `工作记录` entries.
- Launching an Orca agent from an existing Todo through `ObsidianTodoAgentLaunchDialog`.

Reference commits already created:

- `f9c872d3f feat(tasks): enhance Obsidian daily todo workflow`
- `c30f437cd refactor(updater): remove desktop auto update flow`
- `c792c18a2 fix(runtime): handle app restart beforeunload events`

## Proposed user experience

### Placement

Place AI Capture in the Obsidian Daily Todo panel between the manual Add Todo form and the official Todo list/overview.

```text
Daily note header / week navigation
↓
Manual Add Todo form
↓
AI Capture candidate area
↓
Overview / filters
↓
Official Todo list
```

### AI Capture section

Default state: collapsed or compact, to avoid taking over the task page.

Header copy:

```text
AI Capture
Paste text or meeting notes. AI will suggest Todo candidates before adding them to today.
```

Header right-side status examples:

- `0 candidates`
- `3 candidates`
- `Analyzing...`
- `LLM not configured`

Expanded layout:

```text
┌ AI Capture ───────────────────────────────┐
│ Paste messages, meeting notes, or random  │
│ thoughts. AI will extract candidate Todos.│
│                                           │
│ [ multiline textarea                    ] │
│                                           │
│ [Analyze] [Clear]                         │
└───────────────────────────────────────────┘
```

Textarea placeholder:

```text
Paste a message, meeting note, or rough thought. AI will suggest Todo candidates.
```

Chinese fallback copy:

```text
粘贴消息、会议记录或零散想法，AI 会整理成待确认任务。
```

### Candidate card

Each candidate should be shown as a review card, not as an official Todo row.

```text
┌───────────────────────────────────────────┐
│ ✨ Follow up budget approval        High  │
│ From pasted text · confidence 0.86        │
│                                           │
│ Context: Alice asked me to confirm the... │
│                                           │
│ Priority P2 · Due tomorrow 16:00          │
│                                           │
│ Original text ▸                           │
│                                           │
│ [Add to today] [Edit] [Dismiss]           │
└───────────────────────────────────────────┘
```

Card fields:

- Title: LLM-generated Todo title.
- Confidence badge:
  - `High`: `>= 0.85`
  - `Medium`: `0.70 - 0.85`
  - `Low`: `< 0.70`
- Source: first version can use `From pasted text`.
- Context summary.
- Priority: optional `P1` / `P2` / `P3`.
- Due text: optional human-readable deadline/reminder text.
- Original text: collapsed by default.

### Candidate actions

#### Add to today

Behavior:

1. Writes the candidate into the current selected daily note.
2. Uses group `今日任务` by default unless the user edits it.
3. Preserves priority if available.
4. Refreshes the daily note snapshot.
5. Marks candidate as accepted or removes it from the pending candidate list.
6. Shows toast: `Added to Daily Todo`.

Optional follow-up action in toast or inline card:

```text
Analyze and execute now?
```

If clicked, reuse the existing `ObsidianTodoAgentLaunchDialog` after locating the newly added Todo.

#### Edit

Open a lightweight dialog or inline editor with:

- Title
- Priority
- Group, default `今日任务`
- Context / due text as optional metadata
- Original text read-only

Saving edits should update the candidate only. It should not write to Obsidian until the user clicks `Add to today`.

#### Dismiss

Behavior:

- Mark candidate as dismissed.
- Remove it from the visible list.
- Show toast: `Candidate dismissed`.
- Optional Undo.

### Empty state

```text
No AI candidates yet.
Paste text above to extract candidate Todos.
```

### Error states

#### LLM not configured

```text
AI Capture is not configured.
Set endpoint, model, and API key to extract Todos.
[Open settings]
```

#### Analysis failed

```text
Could not analyze this text.
You can still add a Todo manually.
[Retry]
```

## Data model

Add shared candidate types, suggested file:

```text
src/shared/obsidian-daily-todo-candidate.ts
```

Suggested types:

```ts
export type ObsidianDailyTodoCandidateStatus = 'pending' | 'accepted' | 'dismissed'

export type ObsidianDailyTodoCandidateConfidence = 'high' | 'medium' | 'low'

export type ObsidianDailyTodoCandidate = {
  id: string
  title: string
  context: string
  sourceText: string
  sourceApp?: string
  confidence: number
  priority?: 'P1' | 'P2' | 'P3'
  dueText?: string
  group?: string
  createdAt: number
  status: ObsidianDailyTodoCandidateStatus
  suggestedMergeTodoId?: string
}

export type ObsidianDailyTodoCandidateAnalyzeInput = {
  directory: string
  filePath: string
  sourceText: string
  sourceApp?: string
}

export type ObsidianDailyTodoCandidateAcceptInput = {
  directory: string
  filePath: string
  candidateId: string
  title?: string
  group?: string
  priority?: 'P1' | 'P2' | 'P3'
}
```

## Main-process services

### Candidate store

Suggested file:

```text
src/main/obsidian-daily-todo-candidate-service.ts
```

Responsibilities:

- Persist candidate queue locally.
- List pending candidates.
- Add candidates from LLM analysis.
- Update candidate edits.
- Dismiss candidates.
- Accept candidate and write it into the selected Obsidian daily note.

Persistence can start as a JSON file in the app data directory. Do not store API keys in the candidate file.

### Endpoint analyzer

Suggested file:

```text
src/main/obsidian-daily-todo-candidate-analyzer.ts
```

Responsibilities:

- Read endpoint/model/API key from settings/env.
- Build prompt with:
  - source text
  - current daily note date/path metadata
  - existing Todos for merge suggestions
- Call the internal OpenAI-compatible/chat-completions endpoint.
- Parse strict JSON.
- Return zero or more candidates.
- Degrade safely on invalid JSON, timeout, or HTTP error.

Expected LLM output shape:

```json
{
  "candidates": [
    {
      "title": "Follow up budget approval",
      "context": "Alice asked for confirmation before tomorrow",
      "confidence": 0.86,
      "priority": "P2",
      "dueText": "tomorrow 16:00",
      "suggestedMergeTodoId": "optional-existing-id"
    }
  ]
}
```

Analyzer constraints:

- Do not expose API key to renderer.
- Do not log API key.
- Default logs should record request type, duration, status, and output parse result only.
- Full source text logging should be behind an explicit debug flag, if needed.
- Use timeout and clear error messages.

## IPC / preload API

Extend the existing `obsidianDailyTodos` API surface.

Suggested renderer API:

```ts
window.api.obsidianDailyTodos.candidates.list()
window.api.obsidianDailyTodos.candidates.analyzeText(args)
window.api.obsidianDailyTodos.candidates.update(args)
window.api.obsidianDailyTodos.candidates.accept(args)
window.api.obsidianDailyTodos.candidates.dismiss(args)
```

Suggested IPC channels:

```text
obsidianDailyTodos:candidates:list
obsidianDailyTodos:candidates:analyzeText
obsidianDailyTodos:candidates:update
obsidianDailyTodos:candidates:accept
obsidianDailyTodos:candidates:dismiss
```

## Renderer components

Suggested new files:

```text
src/renderer/src/components/obsidian-daily-todo-candidate-panel.tsx
src/renderer/src/components/obsidian-daily-todo-candidate-card.tsx
src/renderer/src/components/obsidian-daily-todo-candidate-edit-dialog.tsx
```

Integration points:

- `ObsidianDailyTodoPanel.tsx`
  - Own candidate state loading/refresh.
  - Provide selected `directory` and `snapshot.filePath` to candidate actions.
  - Refresh Todos after candidate accept.
- `obsidian-daily-todo-panel-content.tsx`
  - Render candidate panel below manual Add Todo form.

## Settings

AI Capture is configured from Orca Settings → Tasks. The API key is protected
with Electron `safeStorage` before the settings file is written when OS-backed
encryption is available.

Environment variables remain a compatibility fallback when no saved
configuration exists:

```text
TODO_CAPTURE_LLM_ENDPOINT=
TODO_CAPTURE_LLM_MODEL=
TODO_CAPTURE_LLM_API_KEY=
TODO_CAPTURE_CONFIDENCE_THRESHOLD=0.75
```

Settings UI fields:

- Enable AI Capture
- Endpoint
- Model
- API key
- Confidence threshold
- Debug logging toggle

## Parallel execution plan

### Track A: data and store

Owner can work independently.

Tasks:

- Add candidate shared types.
- Implement candidate store/service.
- Implement list/update/dismiss.
- Implement accept by reusing existing Obsidian add Todo flow.
- Add store/service tests.

Files likely touched:

```text
src/shared/obsidian-daily-todo-candidate.ts
src/main/obsidian-daily-todo-candidate-service.ts
src/main/obsidian-daily-todo-candidate-service.test.ts
```

### Track B: endpoint analyzer

Owner can work independently after shared types are drafted.

Tasks:

- Implement analyzer config.
- Implement prompt.
- Implement endpoint fetch call.
- Implement strict JSON parsing.
- Implement confidence bucketing / filtering.
- Add parse/failure tests.

Files likely touched:

```text
src/main/obsidian-daily-todo-candidate-analyzer.ts
src/main/obsidian-daily-todo-candidate-analyzer.test.ts
```

### Track C: UI

Can start with mock data while A/B are in progress.

Tasks:

- Add candidate panel.
- Add candidate card.
- Add edit dialog or inline editor.
- Add loading, empty, not-configured, error states.
- Wire props into `ObsidianDailyTodoPanel`.

Files likely touched:

```text
src/renderer/src/components/obsidian-daily-todo-candidate-panel.tsx
src/renderer/src/components/obsidian-daily-todo-candidate-card.tsx
src/renderer/src/components/obsidian-daily-todo-candidate-edit-dialog.tsx
src/renderer/src/components/ObsidianDailyTodoPanel.tsx
src/renderer/src/components/obsidian-daily-todo-panel-content.tsx
src/renderer/src/assets/main.css
src/renderer/src/i18n/locales/*.json
```

### Track D: IPC and integration

Should merge after A and B have stable function signatures.

Tasks:

- Add IPC handlers.
- Add preload API types.
- Wire UI to real APIs.
- Refresh snapshot after accept.
- Add focused integration tests.

Files likely touched:

```text
src/main/ipc/obsidian-daily-todos.ts
src/preload/index.ts
src/preload/api-types.ts
```

## Milestones

### Milestone 1: manual candidate creation without LLM

- Candidate panel appears.
- User can paste text.
- Temporary local candidate is created with a manual title.
- User can dismiss and accept.
- Accept writes into current daily note.

### Milestone 2: endpoint analysis

- Analyze button calls main-process analyzer.
- LLM returns candidates.
- Invalid/failed responses show safe errors.
- Low-confidence candidates are still shown as reviewable, not auto-added.

### Milestone 3: polished review workflow

- Edit candidate before adding.
- Confidence badge.
- Original text disclosure.
- Optional `Analyze and execute now?` after successful add.

### Milestone 4: settings and hardening

- Settings UI for endpoint/model/key/threshold.
- Better merge suggestion UI.
- Optional manual clipboard shortcut.
- Auto capture remains behind a separate explicit beta setting.

## Acceptance criteria

- User can paste text and generate candidate Todos.
- Candidate Todos do not appear in the official Todo list until accepted.
- Accepting a candidate writes one Markdown checkbox to the selected daily note.
- Dismissing a candidate removes it from the visible pending list.
- LLM endpoint/key are used only in the main process.
- If endpoint is missing or fails, the UI shows an actionable error and manual Add Todo still works.
- Existing Obsidian Todo actions continue working: add, edit, status switch, work record, date navigation, open Obsidian, agent execution.
- Focused tests cover candidate parsing, store behavior, accept write, and failure handling.

## Non-goals for v1

- Background AX/input monitoring.
- Auto-writing candidates into Obsidian.
- Auto-starting agents.
- Complex multi-candidate merge UI.
- Cross-device sync of candidates.

## Verification commands

Run focused tests first, then broader checks as risk requires:

```bash
pnpm vitest run --config config/vitest.config.ts src/main/obsidian-daily-todo-candidate-service.test.ts
pnpm vitest run --config config/vitest.config.ts src/main/obsidian-daily-todo-candidate-analyzer.test.ts
pnpm vitest run --config config/vitest.config.ts src/main/obsidian-daily-todo-service.test.ts src/shared/obsidian-daily-todo.test.ts
pnpm run typecheck
```

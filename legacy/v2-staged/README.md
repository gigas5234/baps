# Chat v2 — Staged for follow-up integration

These files (chat-tokens.ts, components/chat/*, plus the thin chat-fab.tsx wrapper described in `patch/baps-patches/README.chat.md`) were authored against an older API surface for:

- `@/lib/coach-personas` — expects `coachMeta()` to return `name`/`role`/`tagline`/`voiceSample`. Current returns `label`/`description`/`emoji`.
- `@/lib/chat-coach` — expects `CoachChatReply.turn` + `dataCard` (camelCase) + `streamSegments`. Current uses `data_card` and a different shape.
- `@/lib/coach-stream-tts-pipeline` — `CoachStreamTtsSentencePipeline` was redesigned to take options `{persona, loadModule, onSpeakingChange}` and have `dispose()`/`finalize()`. Current takes a positional `personaId` and only has `setLead`/`reset`/`feed`.
- `@/lib/chat-azure-stt` — `startAzureChatStt` does not accept `onFinal` (interim-only callback model). Current SttCallbacks has only `onInterim`/`onError`.
- `@/components/common/coach-typewriter` — requires `enabled` + `children` props.

To finish wiring v2:

1. Either adapt these hooks/views to the current lib API, OR
2. Refactor the libs to expose the v2-compatible signatures, then move these files back to `src/`.

Until then, the working chat-fab.tsx (v1, 2018 LOC) stays in place and is the live FAB.

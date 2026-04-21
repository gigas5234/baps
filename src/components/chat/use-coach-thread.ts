// src/components/chat/use-coach-thread.ts
// Chat v2 — 메시지 상태 훅
// chat-fab.tsx 안에 useState 3~4개로 흩어져 있던 messages / pendingTurnId / streamDelimited를
// useReducer 하나로 통합. 서버 응답 → optimistic → 확정 흐름을 순수 함수로 기술.
//
// 분리된 책임:
//   - ChatMessage 타입 보존 (기존 chat-fab.tsx의 ChatMessage 그대로)
//   - dispatch 5종 (append / updateTurnSegments / commitTurn / clear / removePending)
//   - postCoachChat 호출은 뷰에서, 반환값만 dispatch

import { useCallback, useReducer } from "react";
import type { CoachStreamSegment } from "@/lib/coach-delimited-stream";
import type {
  CoachStrategicTurn,
  DataCardPayload,
} from "@/lib/chat-coach";

export interface ChatMessage {
  id: string;
  message: string;
  is_ai: boolean;
  createdAt?: number;
  coachTurn?: CoachStrategicTurn;
  data_card?: DataCardPayload | null;
  streamDelimited?: { segments: CoachStreamSegment[] };
  streamSegments?: CoachStreamSegment[];
}

type Action =
  | { type: "append"; message: ChatMessage }
  | { type: "appendMany"; messages: ChatMessage[] }
  | {
      type: "updateStream";
      id: string;
      segments: CoachStreamSegment[];
    }
  | {
      type: "commitTurn";
      id: string;
      turn: CoachStrategicTurn;
      dataCard?: DataCardPayload | null;
      streamSegments?: CoachStreamSegment[];
    }
  | { type: "removeById"; id: string }
  | { type: "clear" };

interface State {
  messages: ChatMessage[];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "append":
      return { messages: [...state.messages, action.message] };
    case "appendMany":
      return { messages: [...state.messages, ...action.messages] };
    case "updateStream":
      return {
        messages: state.messages.map((m) =>
          m.id === action.id
            ? { ...m, streamDelimited: { segments: action.segments } }
            : m
        ),
      };
    case "commitTurn":
      return {
        messages: state.messages.map((m) =>
          m.id === action.id
            ? {
                ...m,
                coachTurn: action.turn,
                data_card: action.dataCard ?? null,
                streamSegments: action.streamSegments,
                streamDelimited: undefined,
              }
            : m
        ),
      };
    case "removeById":
      return {
        messages: state.messages.filter((m) => m.id !== action.id),
      };
    case "clear":
      return { messages: [] };
    default:
      return state;
  }
}

/**
 * useCoachThread — 메시지 스트림 상태.
 *
 * @example
 * const { messages, append, updateStream, commitTurn } = useCoachThread();
 * append({ id, message: userText, is_ai: false, createdAt: Date.now() });
 */
export function useCoachThread(initial: ChatMessage[] = []) {
  const [state, dispatch] = useReducer(reducer, { messages: initial });

  const append = useCallback((message: ChatMessage) => {
    dispatch({ type: "append", message });
  }, []);

  const appendMany = useCallback((messages: ChatMessage[]) => {
    dispatch({ type: "appendMany", messages });
  }, []);

  const updateStream = useCallback(
    (id: string, segments: CoachStreamSegment[]) => {
      dispatch({ type: "updateStream", id, segments });
    },
    []
  );

  const commitTurn = useCallback(
    (
      id: string,
      turn: CoachStrategicTurn,
      dataCard?: DataCardPayload | null,
      streamSegments?: CoachStreamSegment[]
    ) => {
      dispatch({ type: "commitTurn", id, turn, dataCard, streamSegments });
    },
    []
  );

  const removeById = useCallback((id: string) => {
    dispatch({ type: "removeById", id });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  return {
    messages: state.messages,
    append,
    appendMany,
    updateStream,
    commitTurn,
    removeById,
    clear,
  };
}

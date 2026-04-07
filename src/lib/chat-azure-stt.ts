"use client";

export type AzureSttSession = {
  stop: () => Promise<void>;
  getLatestText: () => string;
};

type SttCallbacks = {
  onInterim: (text: string) => void;
  onError: (message: string) => void;
};

/**
 * 마이크 → Azure Speech 연속 인식 (ko-KR).
 * 구독 키는 사용하지 않고 /api/speech/token 의 단기 토큰만 사용합니다.
 */
export async function startAzureChatStt(
  callbacks: SttCallbacks
): Promise<AzureSttSession> {
  const res = await fetch("/api/speech/token");
  const raw: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof raw === "object" &&
      raw !== null &&
      "error" in raw &&
      typeof (raw as { error: unknown }).error === "string"
        ? (raw as { error: string }).error
        : "음성 인식 설정을 불러오지 못했어요.";
    throw new Error(msg);
  }

  if (
    typeof raw !== "object" ||
    raw === null ||
    typeof (raw as { token?: unknown }).token !== "string" ||
    typeof (raw as { region?: unknown }).region !== "string"
  ) {
    throw new Error("토큰 응답 형식이 올바르지 않아요.");
  }

  const { token, region } = raw as { token: string; region: string };

  const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");

  const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
    token,
    region
  );
  speechConfig.speechRecognitionLanguage = "ko-KR";
  /** TTS는 별도 연동 시 참고: speechConfig.speechSynthesisVoiceName = "ko-KR-SunHiNeural" */

  const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
  const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

  let committed = "";
  let interim = "";

  const flushDisplay = () => {
    const display = (
      committed +
      (committed && interim ? " " : "") +
      interim
    ).trim();
    callbacks.onInterim(display);
    return display;
  };

  let latestText = "";

  recognizer.recognizing = (_s, e) => {
    interim = e.result.text ?? "";
    latestText = flushDisplay();
  };

  recognizer.recognized = (_s, e) => {
    if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
      const t = (e.result.text ?? "").trim();
      if (t) {
        committed = (committed + " " + t).trim();
      }
      interim = "";
      latestText = committed;
      callbacks.onInterim(committed);
    }
  };

  recognizer.canceled = (_s, e) => {
    if (e.reason === SpeechSDK.CancellationReason.Error) {
      callbacks.onError(e.errorDetails || "음성 인식이 중단되었어요.");
    }
  };

  await new Promise<void>((resolve, reject) => {
    recognizer.startContinuousRecognitionAsync(
      () => resolve(),
      (err: unknown) => {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    );
  });

  return {
    getLatestText: () => latestText,
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        recognizer.stopContinuousRecognitionAsync(
          () => resolve(),
          (err: unknown) => {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        );
      });
      recognizer.close();
    },
  };
}

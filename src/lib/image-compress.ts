/**
 * Vercel 등 요청 본문 제한(413) 회피 — 분석 API용으로 해상도·용량 축소
 */
const DEFAULT_MAX_EDGE = 1280;
const DEFAULT_JPEG_QUALITY = 0.82;
/** 이미 작은 파일은 재인코딩 생략 */
const SKIP_REENCODE_UNDER_BYTES = 120_000;

function blobToBase64Pure(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface CompressedImage {
  base64: string;
  mimeType: string;
  /** Supabase 등 업로드용(압축본) */
  file: File;
}

export async function compressImageForAnalysis(
  file: File,
  options?: { maxEdge?: number; quality?: number }
): Promise<CompressedImage> {
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options?.quality ?? DEFAULT_JPEG_QUALITY;

  if (file.size < SKIP_REENCODE_UNDER_BYTES) {
    const base64 = await blobToBase64Pure(file);
    return {
      base64,
      mimeType: file.type || "image/jpeg",
      file,
    };
  }

  try {
    const bitmap = await createImageBitmap(file);
    let w = bitmap.width;
    let h = bitmap.height;
    const longest = Math.max(w, h);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      throw new Error("canvas");
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
    if (!blob || blob.size === 0) {
      throw new Error("toBlob");
    }

    const base64 = await blobToBase64Pure(blob);
    const base = file.name.replace(/\.[^.]+$/, "") || `meal-${Date.now()}`;
    const outFile = new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
    });

    return { base64, mimeType: "image/jpeg", file: outFile };
  } catch {
    if (file.size > 1_800_000) {
      throw new Error(
        "사진 용량이 커서 전송에 실패할 수 있어요. 편집해서 줄이거나 다른 사진을 골라 주세요."
      );
    }
    const base64 = await blobToBase64Pure(file);
    return {
      base64,
      mimeType: file.type || "image/jpeg",
      file,
    };
  }
}

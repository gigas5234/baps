import exifr from "exifr";

/**
 * 갤러리 파일에서 촬영·생성 시각 추출 (가능할 때만).
 * 실패 시 null — 브라우저·포맷에 따라 EXIF 없을 수 있음.
 */
export async function readCaptureDateFromImageFile(
  file: File
): Promise<Date | null> {
  try {
    const out = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
      reviveValues: true,
    });
    if (!out || typeof out !== "object") return null;
    const rec = out as Record<string, unknown>;
    const d =
      rec.DateTimeOriginal ??
      rec.CreateDate ??
      rec.ModifyDate;
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
    return null;
  } catch {
    return null;
  }
}

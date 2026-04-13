import { ApiError } from "./api";

const FACE_FIELD_MAP = {
  straight: "front_image",
  left: "left_image",
  right: "right_image",
  up: "up_image",
  down: "down_image",
};

function dataUrlToBlob(dataUrl) {
  const [meta, content] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || "image/jpeg";
  const binary = window.atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function buildBatchMetadata(batchFrames) {
  return {
    source: "scanner_capture",
    capture_mode: "guided",
    frames: batchFrames.map((frame, index) => ({
      index,
      hint_pose: frame.pose || "front",
      timestamp_ms: frame.timestamp || index * 180,
    })),
  };
}

function appendFallbackFrames(formData, payloadByPose, existingCount) {
  const fallbackImages = Object.entries(FACE_FIELD_MAP)
    .map(([pose]) => ({ pose, image: payloadByPose?.[pose] }))
    .filter((item) => item.image);

  let appendedCount = existingCount;
  let fallbackIndex = 0;

  while (appendedCount < 20 && fallbackImages.length > 0) {
    const item = fallbackImages[fallbackIndex % fallbackImages.length];
    formData.append("frames", dataUrlToBlob(item.image), `fallback-${appendedCount + 1}.jpg`);
    appendedCount += 1;
    fallbackIndex += 1;
  }

  return appendedCount;
}

export async function registerEmployeeFaceIdentity(employeeId, payloadByPose, batchFrames = []) {
  const formData = new FormData();
  let appendedCount = 0;

  batchFrames.forEach((frame, index) => {
    if (!frame?.image) return;
    formData.append("frames", dataUrlToBlob(frame.image), `frame-${index + 1}.jpg`);
    appendedCount += 1;
  });

  appendedCount = appendFallbackFrames(formData, payloadByPose, appendedCount);

  if (appendedCount < 20) {
    throw new ApiError("Chưa thu đủ khung hình để gửi lên máy chủ.", {
      payload: { frame_count: appendedCount, status: "insufficient_frames" },
      status: 400,
    });
  }

  formData.append(
    "metadata",
    JSON.stringify(
      buildBatchMetadata(
        batchFrames.length
          ? batchFrames
          : Object.entries(FACE_FIELD_MAP)
              .map(([pose]) => ({ image: payloadByPose?.[pose], pose }))
              .filter((item) => item.image)
              .flatMap((item) => Array.from({ length: 4 }, (_, index) => ({ ...item, timestamp: index * 180 }))),
      ),
    ),
  );

  const response = await fetch(`/api/manager/employees/${employeeId}/face-enrollment/batch`, {
    body: formData,
    credentials: "include",
    method: "POST",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.message || "Không thể lưu bộ khuôn mặt nhân viên.", {
      payload,
      status: response.status,
    });
  }

  return payload || { status: "success", saved: true };
}

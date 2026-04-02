import { apiRequest } from './api'

export function createGuestFrameFormData(frameFile) {
  const formData = new FormData()
  formData.append('frame', frameFile, frameFile?.name || 'guest-frame.jpg')
  return formData
}

export async function submitGuestCheckin(frameFile) {
  return apiRequest('/api/guest/checkin', {
    body: createGuestFrameFormData(frameFile),
    method: 'POST',
  })
}

export async function captureGuestFrame(videoElement) {
  if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight

  const context = canvas.getContext('2d')
  if (context) {
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
  }

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  })

  if (!blob) {
    return null
  }

  return new File([blob], 'guest-frame.jpg', { type: 'image/jpeg' })
}

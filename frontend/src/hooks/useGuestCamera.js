import { useCallback, useEffect, useRef, useState } from 'react'

function getCameraErrorMessage(error) {
  if (!error) return 'Khong the truy cap camera.'

  if (error.name === 'NotAllowedError') {
    return 'Quyen camera da bi tu choi. Hay cho phep camera va thu lai.'
  }

  if (error.name === 'NotFoundError') {
    return 'Khong tim thay camera phu hop tren thiet bi nay.'
  }

  return 'Khong the khoi dong camera browser. Hay thu lai.'
}

export function useGuestCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraState, setCameraState] = useState('idle')
  const [cameraError, setCameraError] = useState('')

  const stopCamera = useCallback(() => {
    const video = videoRef.current
    const stream = streamRef.current

    if (video) {
      video.srcObject = null
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraState('unavailable')
      setCameraError('Trinh duyet nay khong ho tro camera browser.')
      return false
    }

    setCameraState('requesting')
    setCameraError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch {
          // Ignore autoplay rejections; the preview can still render.
        }
      }

      setCameraState('ready')
      return true
    } catch (error) {
      const nextState =
        error?.name === 'NotAllowedError'
          ? 'denied'
          : error?.name === 'NotFoundError'
            ? 'unavailable'
            : 'error'

      setCameraState(nextState)
      setCameraError(getCameraErrorMessage(error))
      return false
    }
  }, [])

  useEffect(() => {
    void startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  return {
    cameraError,
    cameraState,
    retryCamera: startCamera,
    startCamera,
    stopCamera,
    videoRef,
  }
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGuestCamera } from '../hooks/useGuestCamera'
import { captureGuestFrame, submitGuestCheckin } from '../lib/guestApi'
import {
  getGuestResultCopy,
  getGuestStatusMessage,
  getFriendlyBackendErrorMessage,
} from '../lib/errorMessages'
import './GuestCheckinPage.css'

const SCAN_INTERVAL_MS = 2000
const SUCCESS_COOLDOWN_SECONDS = 5

function getStatusTone(result) {
  if (!result) return 'idle'
  if (result.status === 'recognized' || result.status === 'already_checked_in') return 'success'
  if (result.status === 'multiple_faces') return 'warning'
  if (result.status === 'unknown' || result.status === 'network_error') return 'error'
  return 'scanning'
}

function getStatusIcon(tone) {
  if (tone === 'success') return '✅'
  if (tone === 'warning') return '⚠️'
  if (tone === 'error') return '❌'
  if (tone === 'scanning') return '🔍'
  return '📷'
}

function GuestCheckinPage() {
  const { videoRef, cameraState, cameraError, retryCamera, stopCamera } = useGuestCamera()
  const [scanMode, setScanMode] = useState('idle')
  const [submissionState, setSubmissionState] = useState('idle')
  const [result, setResult] = useState(null)
  const [statusText, setStatusText] = useState('Sẵn sàng quét khuôn mặt.')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [manualFile, setManualFile] = useState(null)
  const [showFallback, setShowFallback] = useState(false)
  const inFlightRef = useRef(false)

  const isScanning = scanMode === 'scanning' && cooldownSeconds === 0
  const isBusy = submissionState === 'loading'
  const cameraUnavailable = ['denied', 'unavailable', 'unsupported'].includes(cameraState)
  const manualSubmissionBlocked = isBusy || cooldownSeconds > 0 || scanMode === 'scanning'

  const resultCopy = useMemo(() => {
    if (!result) return null
    return getGuestResultCopy(result)
  }, [result])

  // Auto-scan interval
  useEffect(() => {
    if (!isScanning) return undefined
    const intervalId = window.setInterval(() => {
      if (inFlightRef.current) return
      void runAutoScan()
    }, SCAN_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [isScanning])

  // Cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined
    const intervalId = window.setInterval(() => {
      setCooldownSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [cooldownSeconds])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  // Status text sync
  useEffect(() => {
    if (cooldownSeconds > 0) {
      setStatusText(`Tạm dừng quét, sẵn sàng quay lại sau ${cooldownSeconds} giây.`)
      return
    }
    if (cameraUnavailable) {
      setStatusText(cameraError || 'Camera không khả dụng. Bạn có thể tải ảnh lên thay thế.')
      return
    }
    if (scanMode === 'scanning' && result && ['no_face', 'multiple_faces', 'network_error', 'unknown'].includes(result.status)) {
      setStatusText(getGuestResultCopy(result).message)
      return
    }
    if (scanMode === 'scanning') {
      setStatusText('Đang quét tự động...')
      return
    }
    if (cameraState === 'ready') {
      setStatusText('Camera sẵn sàng. Bấm "Bắt đầu quét" để bắt đầu.')
      return
    }
    if (cameraState === 'requesting') {
      setStatusText('Đang yêu cầu quyền camera...')
      return
    }
    if (cameraState === 'error' && cameraError) {
      setStatusText(cameraError)
      return
    }
    if (cameraState === 'idle') {
      setStatusText('Đang khởi động camera...')
    }
  }, [cameraState, cameraError, cameraUnavailable, cooldownSeconds, result, scanMode])

  async function runAutoScan() {
    if (cameraState !== 'ready' || !isScanning || inFlightRef.current) return
    inFlightRef.current = true
    setSubmissionState('loading')
    try {
      const frame = await captureGuestFrame(videoRef.current)
      if (!frame) {
        setResult({ status: 'no_face' })
        setStatusText(getGuestStatusMessage('no_face'))
        return
      }
      const payload = await submitGuestCheckin(frame)
      handleGuestResult(payload)
    } catch (error) {
      const friendly = getFriendlyBackendErrorMessage(error)
      setResult({ message: friendly, status: 'network_error' })
      setStatusText(friendly)
    } finally {
      inFlightRef.current = false
      setSubmissionState('idle')
    }
  }

  function handleGuestResult(payload) {
    setResult(payload)
    const copy = getGuestResultCopy(payload)
    setStatusText(copy.message)
    if (payload?.status === 'recognized' || payload?.status === 'already_checked_in') {
      setScanMode('paused')
      setCooldownSeconds(SUCCESS_COOLDOWN_SECONDS)
      return
    }
    if (payload?.status === 'unknown' || payload?.status === 'no_face' || payload?.status === 'multiple_faces') {
      setScanMode('scanning')
    }
  }

  async function handleStartScanning() {
    if (isBusy || cameraState !== 'ready') return
    if (cooldownSeconds > 0) setCooldownSeconds(0)
    setScanMode('scanning')
  }

  function handleStopScanning() {
    setScanMode('paused')
  }

  async function handleManualSubmit(event) {
    event.preventDefault()
    if (!manualFile) {
      setStatusText('Hãy chọn một ảnh trước khi gửi.')
      return
    }
    if (manualSubmissionBlocked || inFlightRef.current) {
      setStatusText('Hãy đợi hệ thống xử lý xong rồi thử lại.')
      return
    }
    setSubmissionState('loading')
    try {
      const payload = await submitGuestCheckin(manualFile)
      handleGuestResult(payload)
    } catch (error) {
      const friendly = getFriendlyBackendErrorMessage(error)
      setStatusText(friendly)
      setResult({ message: friendly, status: 'network_error' })
    } finally {
      setSubmissionState('idle')
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null
    setManualFile(file)
  }

  const tone = getStatusTone(result)
  const icon = getStatusIcon(tone)
  const cardClass = isScanning && !result ? 'status-scanning' : `status-${tone}`

  return (
    <main className="guest-page">
      <div className="guest-container">
        {/* Top bar */}
        <div className="guest-topbar">
          <h1>Điểm danh khuôn mặt</h1>
          <Link to="/" className="guest-topbar-back">← Về trang chủ</Link>
        </div>

        {/* Split: Camera | Info */}
        <div className="guest-split">
          {/* Left: Camera */}
          <div className="guest-camera-card">
            <div className={`guest-video-wrapper${isScanning ? ' scanning' : ''}`}>
              <video ref={videoRef} className="guest-video" autoPlay playsInline muted />

              {/* Reticle corners */}
              {cameraState === 'ready' && (
                <div className="guest-reticle"><span /></div>
              )}

              {/* Overlay when camera not ready */}
              {cameraState !== 'ready' ? (
                <div className="guest-video-overlay">
                  <p>{statusText}</p>
                  {cameraUnavailable ? (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={retryCamera}>
                      Thử lại camera
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Controls */}
            <div className="guest-camera-controls">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartScanning}
                disabled={cameraState !== 'ready' || isBusy || isScanning}
              >
                {isScanning ? 'Đang quét...' : 'Bắt đầu quét'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleStopScanning}
                disabled={!isScanning}
              >
                Tạm dừng
              </button>
              {isBusy && <div className="spinner" />}
            </div>
          </div>

          {/* Right: Status + Fallback */}
          <div className="guest-info-panel">
            {/* Status Card */}
            <div className={`guest-status-card ${cardClass}`}>
              <div className="guest-status-icon">{icon}</div>
              <div className="guest-status-label">
                {resultCopy ? resultCopy.label : 'Chưa có kết quả'}
              </div>

              {/* Show employee name prominently on success */}
              {result?.status === 'recognized' && result?.employee_name && (
                <div className="guest-status-name">{result.employee_name}</div>
              )}

              <div className="guest-status-text">{statusText}</div>

              {cooldownSeconds > 0 && (
                <div className="guest-cooldown">
                  Sẵn sàng quét lại sau {cooldownSeconds} giây
                </div>
              )}
            </div>

            {/* Fallback upload (collapsed by default) */}
            {!showFallback ? (
              <button
                type="button"
                className="guest-fallback-toggle"
                onClick={() => setShowFallback(true)}
              >
                📷 Không dùng được camera? Tải ảnh lên
              </button>
            ) : (
              <form className="guest-fallback-form" onSubmit={handleManualSubmit}>
                <h3>Tải ảnh kiểm tra</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Nếu camera bị từ chối quyền hoặc không có camera, hãy tải lên một ảnh khuôn mặt.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  aria-label="Tải ảnh check-in"
                  style={{ padding: '8px' }}
                />
                <div className="row">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={!manualFile || manualSubmissionBlocked || inFlightRef.current}
                  >
                    Gửi ảnh
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowFallback(false)}
                  >
                    Đóng
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default GuestCheckinPage

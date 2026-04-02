import { useEffect, useMemo, useRef, useState } from 'react'
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

function GuestCheckinPage() {
  const { videoRef, cameraState, cameraError, retryCamera, stopCamera } = useGuestCamera()
  const [scanMode, setScanMode] = useState('idle')
  const [submissionState, setSubmissionState] = useState('idle')
  const [result, setResult] = useState(null)
  const [statusText, setStatusText] = useState('San sang quet khuon mat.')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [manualFile, setManualFile] = useState(null)
  const inFlightRef = useRef(false)

  const isScanning = scanMode === 'scanning' && cooldownSeconds === 0
  const isBusy = submissionState === 'loading'
  const cameraUnavailable = cameraState === 'denied' || cameraState === 'unsupported'

  const resultCopy = useMemo(() => {
    if (!result) return null
    return getGuestResultCopy(result)
  }, [result])

  useEffect(() => {
    if (!isScanning) return undefined

    const intervalId = window.setInterval(() => {
      if (inFlightRef.current) return
      void runAutoScan()
    }, SCAN_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [isScanning])

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

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  useEffect(() => {
    if (cooldownSeconds > 0) {
      setStatusText(`Tam dung quet, san sang quay lai sau ${cooldownSeconds} giay.`)
      return
    }

    if (cameraUnavailable) {
      setStatusText('Camera khong kha dung. Ban co the tai anh len thay the.')
      return
    }

    if (
      scanMode === 'scanning' &&
      result &&
      ['no_face', 'multiple_faces', 'network_error', 'unknown'].includes(result.status)
    ) {
      setStatusText(getGuestResultCopy(result).message)
      return
    }

    if (scanMode === 'scanning') {
      setStatusText('Dang quet tu dong...')
      return
    }

    if (cameraState === 'ready') {
      setStatusText('Camera san sang. Bam "Bat dau quet" de bat dau.')
      return
    }

    if (cameraState === 'requesting') {
      setStatusText('Dang yeu cau quyen camera...')
      return
    }

    if (cameraState === 'error' && cameraError) {
      setStatusText(cameraError)
      return
    }

    if (cameraState === 'idle') {
      setStatusText('Dang khoi dong camera...')
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
      setResult({
        message: friendly,
        status: 'network_error',
      })
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

    if (payload?.status === 'unknown') {
      setScanMode('scanning')
      return
    }

    if (payload?.status === 'no_face' || payload?.status === 'multiple_faces') {
      setScanMode('scanning')
    }
  }

  async function handleStartScanning() {
    if (cooldownSeconds > 0 || isBusy) return
    setScanMode('scanning')
    if (cameraUnavailable) {
      setStatusText('Ban co the dung anh tai len neu camera khong san sang.')
    }
  }

  function handleStopScanning() {
    setScanMode('paused')
  }

  async function handleManualSubmit(event) {
    event.preventDefault()

    if (!manualFile) {
      setStatusText('Hay chon mot anh truoc khi gui.')
      return
    }

    setSubmissionState('loading')
    try {
      const payload = await submitGuestCheckin(manualFile)
      handleGuestResult(payload)
    } catch (error) {
      const friendly = getFriendlyBackendErrorMessage(error)
      setStatusText(friendly)
      setResult({
        message: friendly,
        status: 'network_error',
      })
    } finally {
      setSubmissionState('idle')
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null
    setManualFile(file)
  }

  const latestResultLabel = resultCopy ? resultCopy.label : 'Chua co ket qua'
  const latestResultTone = resultCopy ? resultCopy.tone : 'neutral'

  return (
    <main className="guest-checkin-page">
      <section className="guest-hero">
        <div>
          <p className="guest-eyebrow">Guest check-in</p>
          <h1>Quet khuon mat ngay tren trinh duyet</h1>
          <p className="guest-subtitle">
            Camera browser se lay khung hinh tu dong va gui tung anh mot cho backend
            nhan dien. Khi nhan dien thanh cong, he thong se tam dung mot khoang ngan
            truoc khi san sang quet lai.
          </p>
        </div>

        <div className={`guest-status-card guest-status-${latestResultTone}`}>
          <p className="guest-status-label">{latestResultLabel}</p>
          <p className="guest-status-text">{statusText}</p>
        </div>
      </section>

      <section className="guest-grid">
        <article className="guest-panel guest-camera-panel">
          <div className="guest-video-shell">
            <video
              ref={videoRef}
              className="guest-video"
              autoPlay
              playsInline
              muted
            />

            {cameraState !== 'ready' ? (
              <div className="guest-video-overlay">
                <p>{statusText}</p>
                {cameraUnavailable ? (
                  <button type="button" className="ghost-button" onClick={retryCamera}>
                    Thu camera lai
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="guest-control-row">
            <button
              type="button"
              className="primary-button"
              onClick={handleStartScanning}
              disabled={cameraState !== 'ready' || isScanning || isBusy || cooldownSeconds > 0}
            >
              Bat dau quet
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleStopScanning}
              disabled={!isScanning}
            >
              Tam dung
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void handleStartScanning()}
              disabled={cameraState !== 'ready' || isBusy || cooldownSeconds > 0}
            >
              Quet lai
            </button>
          </div>

          <p className="guest-microcopy">
            Trang nay chi gui mot khung hinh moi lan, tranh spam backend va tranh
            diem danh trung lap.
          </p>
        </article>

        <aside className="guest-panel guest-result-panel">
          <div className="guest-result-stack">
            <div>
              <h2>Ket qua gan nhat</h2>
              {resultCopy ? (
                <div className="guest-result-detail">
                  <p><strong>Trang thai:</strong> {resultCopy.label}</p>
                  <p>{resultCopy.message}</p>
                  {resultCopy.meta ? <p>{resultCopy.meta}</p> : null}
                </div>
              ) : (
                <p>He thong se hien thi ket qua o day sau khi quet.</p>
              )}
            </div>

            <div className="guest-result-badges">
              <span className="guest-badge">`recognized`</span>
              <span className="guest-badge">`already_checked_in`</span>
              <span className="guest-badge">`unknown`</span>
              <span className="guest-badge">`no_face`</span>
              <span className="guest-badge">`multiple_faces`</span>
            </div>

            {cooldownSeconds > 0 ? (
              <p className="guest-cooldown">
                San sang quet lai sau {cooldownSeconds} giay.
              </p>
            ) : null}
          </div>

          <form className="guest-fallback-form" onSubmit={handleManualSubmit}>
            <h3>Fallback tai anh</h3>
            <p>
              Neu camera bi tu choi quyen hoac khong co camera, hay tai len mot anh
              de gui di.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              aria-label="Tai anh check-in"
            />
            <button type="submit" className="secondary-button" disabled={isBusy}>
              Gui anh
            </button>
          </form>
        </aside>
      </section>
    </main>
  )
}

export default GuestCheckinPage

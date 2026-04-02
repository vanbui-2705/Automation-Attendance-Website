import { createRef } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GuestCheckinPage from './GuestCheckinPage'

let cameraMode = 'ready'
let intervalCallbacks = []
const submitGuestCheckin = vi.fn()
const captureGuestFrame = vi.fn()
const retryCamera = vi.fn()
const stopCamera = vi.fn()

vi.mock('../hooks/useGuestCamera', () => ({
  useGuestCamera: () => {
    if (cameraMode === 'denied') {
      return {
        cameraError: 'Camera khong kha dung.',
        cameraState: 'denied',
        retryCamera,
        stopCamera,
        videoRef: createRef(),
      }
    }

    return {
      cameraError: '',
      cameraState: 'ready',
      retryCamera,
      stopCamera,
      videoRef: createRef(),
    }
  },
}))

vi.mock('../lib/guestApi', () => ({
  captureGuestFrame: (...args) => captureGuestFrame(...args),
  submitGuestCheckin: (...args) => submitGuestCheckin(...args),
}))

describe('GuestCheckinPage', () => {
  beforeEach(() => {
    cameraMode = 'ready'
    intervalCallbacks = []
    submitGuestCheckin.mockReset()
    captureGuestFrame.mockReset()
    retryCamera.mockReset()
    stopCamera.mockReset()

    vi.spyOn(window, 'setInterval').mockImplementation((callback) => {
      intervalCallbacks.push(callback)
      return intervalCallbacks.length
    })
    vi.spyOn(window, 'clearInterval').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the guest check-in camera page', () => {
    render(<GuestCheckinPage />)

    expect(
      screen.getByRole('heading', { name: /quet khuon mat ngay tren trinh duyet/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bat dau quet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tam dung/i })).toBeInTheDocument()
  })

  it('auto-scans one frame at a time and shows success cooldown', async () => {
    captureGuestFrame.mockResolvedValue(new File(['guest'], 'guest-frame.jpg', { type: 'image/jpeg' }))
    submitGuestCheckin.mockResolvedValue({
      checked_in_at: '2026-04-02T10:00:00Z',
      employee_code: 'NV001',
      full_name: 'Nguyen Van A',
      snapshot_path: '/tmp/checkin.jpg',
      status: 'recognized',
    })

    render(<GuestCheckinPage />)
    fireEvent.click(screen.getByRole('button', { name: /bat dau quet/i }))

    expect(intervalCallbacks).toHaveLength(1)

    await act(async () => {
      await intervalCallbacks[0]()
    })

    await waitFor(() => expect(submitGuestCheckin).toHaveBeenCalledTimes(1))
    expect(captureGuestFrame).toHaveBeenCalledTimes(1)
    expect(
      screen.getByText(/diem danh thanh cong/i, { selector: '.guest-status-label' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/NV001/i)).toBeInTheDocument()
    expect(screen.getByText(/Nguyen Van A/i)).toBeInTheDocument()
    expect(screen.getByText(/san sang quet lai sau 5 giay/i)).toBeInTheDocument()
  })

  it('shows a friendly message for no_face results and keeps scanning available', async () => {
    captureGuestFrame.mockResolvedValue(new File(['guest'], 'guest-frame.jpg', { type: 'image/jpeg' }))
    submitGuestCheckin.mockResolvedValue({ status: 'no_face' })

    render(<GuestCheckinPage />)
    fireEvent.click(screen.getByRole('button', { name: /bat dau quet/i }))

    expect(intervalCallbacks).toHaveLength(1)

    await act(async () => {
      await intervalCallbacks[0]()
    })

    await waitFor(() => expect(submitGuestCheckin).toHaveBeenCalledTimes(1))
    expect(
      screen.getByText(/hay dua mat vao trung tam khung hinh/i, {
        selector: '.guest-status-text',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tam dung/i }).disabled).toBe(false)
  })

  it('renders a manual upload fallback when camera is unavailable', () => {
    cameraMode = 'denied'

    render(<GuestCheckinPage />)

    expect(screen.getByLabelText(/tai anh check-in/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /thu camera lai/i })).toBeInTheDocument()
  })

  it('submits the fallback uploaded image when camera is unavailable', async () => {
    const user = userEvent.setup()
    cameraMode = 'denied'
    submitGuestCheckin.mockResolvedValue({
      checked_in_at: '2026-04-02T10:00:00Z',
      employee_code: 'NV002',
      full_name: 'Nguyen Van B',
      snapshot_path: '/tmp/checkin-2.jpg',
      status: 'already_checked_in',
    })

    render(<GuestCheckinPage />)

    const fileInput = screen.getByLabelText(/tai anh check-in/i)
    const file = new File(['guest'], 'fallback.jpg', { type: 'image/jpeg' })

    fireEvent.change(fileInput, { target: { files: [file] } })
    await user.click(screen.getByRole('button', { name: /gui anh/i }))

    await waitFor(() => expect(submitGuestCheckin).toHaveBeenCalledTimes(1))
    expect(submitGuestCheckin).toHaveBeenCalledWith(file)
    expect(screen.getByText(/da diem danh/i, { selector: '.guest-status-label' })).toBeInTheDocument()
  })
})

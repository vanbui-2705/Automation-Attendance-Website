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

function getCameraState() {
  if (cameraMode === 'denied') {
    return {
      cameraError: 'Quyen camera da bi tu choi. Hay cho phep camera va thu lai.',
      cameraState: 'denied',
    }
  }

  if (cameraMode === 'unavailable') {
    return {
      cameraError: 'Khong tim thay camera phu hop tren thiet bi nay.',
      cameraState: 'unavailable',
    }
  }

  return {
    cameraError: '',
    cameraState: 'ready',
  }
}

vi.mock('../hooks/useGuestCamera', () => ({
  useGuestCamera: () => ({
    ...getCameraState(),
    retryCamera,
    stopCamera,
    videoRef: createRef(),
  }),
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

  it('renders unknown and multiple_faces result copy', async () => {
    captureGuestFrame.mockResolvedValue(new File(['guest'], 'guest-frame.jpg', { type: 'image/jpeg' }))
    submitGuestCheckin.mockResolvedValueOnce({ status: 'unknown' }).mockResolvedValueOnce({
      status: 'multiple_faces',
    })

    render(<GuestCheckinPage />)
    fireEvent.click(screen.getByRole('button', { name: /bat dau quet/i }))

    await act(async () => {
      await intervalCallbacks[0]()
    })

    expect(
      screen.getByText(/he thong chua xac dinh duoc khuon mat/i, {
        selector: '.guest-status-text',
      }),
    ).toBeInTheDocument()

    await act(async () => {
      await intervalCallbacks[0]()
    })

    expect(
      screen.getByText(/chi can mot nguoi trong khung hinh/i, {
        selector: '.guest-status-text',
      }),
    ).toBeInTheDocument()
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

  it('prevents overlapping submissions while a request is in flight', async () => {
    let resolveSubmit
    const pendingSubmit = new Promise((resolve) => {
      resolveSubmit = resolve
    })

    captureGuestFrame.mockResolvedValue(new File(['guest'], 'guest-frame.jpg', { type: 'image/jpeg' }))
    submitGuestCheckin.mockReturnValue(pendingSubmit)

    render(<GuestCheckinPage />)
    fireEvent.click(screen.getByRole('button', { name: /bat dau quet/i }))

    await act(async () => {
      await intervalCallbacks[0]()
    })

    expect(submitGuestCheckin).toHaveBeenCalledTimes(1)

    await act(async () => {
      await intervalCallbacks[0]()
    })

    expect(submitGuestCheckin).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /gui anh/i })).toBeDisabled()

    await act(async () => {
      resolveSubmit({ status: 'no_face' })
      await pendingSubmit
    })
  })

  it('allows manual resume during cooldown', async () => {
    captureGuestFrame.mockResolvedValue(new File(['guest'], 'guest-frame.jpg', { type: 'image/jpeg' }))
    submitGuestCheckin.mockResolvedValue({
      checked_in_at: '2026-04-02T10:00:00Z',
      employee_code: 'NV002',
      full_name: 'Nguyen Van B',
      snapshot_path: '/tmp/checkin-2.jpg',
      status: 'recognized',
    })

    render(<GuestCheckinPage />)
    fireEvent.click(screen.getByRole('button', { name: /bat dau quet/i }))

    await act(async () => {
      await intervalCallbacks[0]()
    })

    expect(screen.getByText(/san sang quet lai sau 5 giay/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bat dau quet/i })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /quet lai/i }))

    expect(screen.queryByText(/san sang quet lai sau 5 giay/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tam dung/i })).toBeEnabled()
  })

  it('renders an unavailable camera fallback state with retry and manual upload', () => {
    cameraMode = 'unavailable'

    render(<GuestCheckinPage />)

    expect(
      screen.getByText(/khong tim thay camera phu hop tren thiet bi nay/i, {
        selector: '.guest-status-text',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /thu camera lai/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/tai anh check-in/i)).toBeInTheDocument()
  })

  it('does not let manual fallback bypass the one-request-at-a-time guard', async () => {
    const user = userEvent.setup()
    let resolveSubmit
    const pendingSubmit = new Promise((resolve) => {
      resolveSubmit = resolve
    })

    captureGuestFrame.mockResolvedValue(new File(['guest'], 'guest-frame.jpg', { type: 'image/jpeg' }))
    submitGuestCheckin.mockReturnValue(pendingSubmit)

    render(<GuestCheckinPage />)

    fireEvent.change(screen.getByLabelText(/tai anh check-in/i), {
      target: { files: [new File(['guest'], 'fallback.jpg', { type: 'image/jpeg' })] },
    })

    fireEvent.click(screen.getByRole('button', { name: /bat dau quet/i }))

    await act(async () => {
      await intervalCallbacks[0]()
    })

    expect(screen.getByRole('button', { name: /gui anh/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /gui anh/i }))
    expect(submitGuestCheckin).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveSubmit({ status: 'no_face' })
      await pendingSubmit
    })
  })

  it('submits the fallback uploaded image when camera is unavailable', async () => {
    const user = userEvent.setup()
    cameraMode = 'unavailable'
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

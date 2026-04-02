import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('./hooks/useGuestCamera', () => ({
  useGuestCamera: () => ({
    cameraError: '',
    cameraState: 'ready',
    retryCamera: vi.fn(),
    stopCamera: vi.fn(),
    videoRef: { current: null },
  }),
}))

vi.mock('./lib/guestApi', () => ({
  captureGuestFrame: vi.fn(),
  submitGuestCheckin: vi.fn(),
}))

describe('App routing', () => {
  it('renders the guest check-in page on /guest', () => {
    window.history.pushState({}, '', '/guest')

    render(
      <MemoryRouter initialEntries={['/guest']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /quet khuon mat ngay tren trinh duyet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bat dau quet/i })).toBeInTheDocument()
  })
})

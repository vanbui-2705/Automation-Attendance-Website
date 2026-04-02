import { describe, expect, it } from 'vitest'
import { createGuestFrameFormData } from './guestApi'

describe('guestApi', () => {
  it('creates guest check-in form data with a frame field', () => {
    const file = new File(['guest'], 'guest-frame.jpg', { type: 'image/jpeg' })
    const formData = createGuestFrameFormData(file)

    expect(formData.get('frame').name).toBe('guest-frame.jpg')
  })
})

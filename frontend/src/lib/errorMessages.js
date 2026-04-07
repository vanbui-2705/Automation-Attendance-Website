const FRIENDLY_ERROR_MESSAGES = {
  already_checked_in: 'Nhan vien nay da duoc diem danh truoc do.',
  denied: 'Quyen camera da bi tu choi. Hay cho phep camera va thu lai.',
  duplicate_employee_code: 'Ma nhan vien da ton tai.',
  face_registration_exists: 'Nhan vien nay da co dang ky khuon mat. Hay xoa truoc khi dang ky lai.',
  invalid_credentials: 'Ten dang nhap hoac mat khau khong dung.',
  invalid_request: 'Yeu cau gui len khong hop le. Hay thu lai.',
  multiple_faces: 'Trong khung hinh co nhieu hon mot khuon mat. Hay de chi mot nguoi vao khung.',
  network_error: 'Khong the ket noi toi may chu. Hay thu lai.',
  no_face: 'Khong phat hien khuon mat. Hay dieu chinh goc nhin va thu lai.',
  rate_limited: 'Ban dang gui qua nhieu yeu cau. Hay doi vai giay roi thu lai.',
  unauthorized: 'Ban can dang nhap lai.',
  unknown: 'Khong xac dinh duoc khuon mat. Hay thu lai.',
}

const GUEST_RESULT_COPY = {
  already_checked_in: {
    label: 'Da diem danh',
    message: 'Khuon mat da duoc ghi nhan truoc do trong ngay hom nay.',
    tone: 'info',
    meta: (payload) =>
      [payload?.employee_code, payload?.full_name, payload?.checked_in_at]
        .filter(Boolean)
        .join(' | '),
  },
  multiple_faces: {
    label: 'Nhieu khuon mat',
    message: 'Chi can mot nguoi trong khung hinh de he thong nhan dien chinh xac hon.',
    tone: 'warning',
  },
  network_error: {
    label: 'Loi ket noi',
    message: 'Khong the ket noi toi may chu. Hay thu lai.',
    tone: 'warning',
  },
  no_face: {
    label: 'Chua thay khuon mat',
    message: 'Hay dua mat vao trung tam khung hinh va giu anh sang on dinh.',
    tone: 'warning',
  },
  recognized: {
    label: 'Diem danh thanh cong',
    message: 'Nhan dien thanh cong va da ghi nhan check-in.',
    tone: 'success',
    meta: (payload) =>
      [payload?.employee_code, payload?.full_name, payload?.checked_in_at]
        .filter(Boolean)
        .join(' | '),
  },
  unknown: {
    label: 'Khong nhan dien duoc',
    message: 'He thong chua xac dinh duoc khuon mat. Hay thu lai voi goc nhin ro hon.',
    tone: 'neutral',
  },
}

export function getFriendlyBackendErrorMessage(errorOrCode, fallback = 'Da co loi xay ra.') {
  if (!errorOrCode) return fallback

  const candidateValues = []

  if (typeof errorOrCode === 'string') {
    candidateValues.push(errorOrCode)
  } else {
    if (typeof errorOrCode?.payload === 'string') {
      candidateValues.push(errorOrCode.payload)
    }

    if (errorOrCode?.payload && typeof errorOrCode.payload === 'object') {
      candidateValues.push(errorOrCode.payload.status)
      candidateValues.push(errorOrCode.payload.message)
    }

    if (typeof errorOrCode?.message === 'string') {
      candidateValues.push(errorOrCode.message)
    }

    if (typeof errorOrCode?.status === 'string') {
      candidateValues.push(errorOrCode.status)
    }
  }

  for (const candidate of candidateValues) {
    if (candidate && FRIENDLY_ERROR_MESSAGES[candidate]) {
      return FRIENDLY_ERROR_MESSAGES[candidate]
    }
  }

  return fallback
}

export const getFriendlyErrorMessage = getFriendlyBackendErrorMessage
export const getBackendErrorMessage = getFriendlyBackendErrorMessage

export function getGuestStatusMessage(status) {
  return FRIENDLY_ERROR_MESSAGES[status] || FRIENDLY_ERROR_MESSAGES.unknown
}

export const getGuestRecognitionMessage = getGuestStatusMessage

export function getGuestResultCopy(payload) {
  if (!payload?.status) {
    return {
      label: 'Chua co ket qua',
      message: 'He thong dang san sang.',
      tone: 'neutral',
    }
  }

  const copy =
    GUEST_RESULT_COPY[payload.status] || {
      label: 'Ket qua khac',
      message: getGuestStatusMessage(payload.status),
      tone: 'neutral',
    }

  if (typeof copy.meta === 'function') {
    return { ...copy, meta: copy.meta(payload) }
  }

  return copy
}

export type InquiryStatus = 'new' | 'read' | 'closed'

export type SupportInquiry = {
  id: string
  name: string
  email: string
  phone: string
  message: string
  status: InquiryStatus
  customerId: string | null
  emailProviderId: string | null
  emailError: string | null
  emailSentAt: string | null
  createdAt: string
  updatedAt: string
}

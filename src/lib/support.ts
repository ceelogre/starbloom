import { requireSupabase, supabase } from './supabase'
import type { InquiryStatus, SupportInquiry } from '../types/support'

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  read: 'Read',
  closed: 'Closed',
}

const MESSAGE_MAX = 4000

type InquiryRow = {
  id: string
  name: string
  email: string
  phone: string
  message: string
  status: InquiryStatus
  customer_id: string | null
  email_provider_id: string | null
  email_error: string | null
  email_sent_at: string | null
  created_at: string
  updated_at: string
}

function mapInquiry(row: InquiryRow): SupportInquiry {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    customerId: row.customer_id,
    emailProviderId: row.email_provider_id,
    emailError: row.email_error,
    emailSentAt: row.email_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function previewMessage(message: string, max = 96) {
  const trimmed = message.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) {
    return trimmed
  }
  return `${trimmed.slice(0, max).trimEnd()}…`
}

export async function submitSupportInquiry(input: {
  name: string
  email: string
  phone: string
  message: string
}): Promise<string> {
  requireSupabase()

  const name = input.name.trim()
  const email = input.email.trim()
  const phone = input.phone.trim()
  const message = input.message.trim()

  if (!name) {
    throw new Error('Name is required.')
  }
  if (!email) {
    throw new Error('Email is required.')
  }
  if (!message) {
    throw new Error('Message is required.')
  }
  if (message.length > MESSAGE_MAX) {
    throw new Error('Message is too long.')
  }

  const { data, error } = await supabase.rpc('submit_support_inquiry', {
    p_name: name,
    p_email: email,
    p_phone: phone,
    p_message: message,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (typeof data !== 'string' || !data) {
    throw new Error('Inquiry was not created.')
  }

  return data
}

export type InquiryFilters = {
  status?: InquiryStatus | 'all'
  search?: string
}

export async function fetchInquiries(filters: InquiryFilters = {}): Promise<SupportInquiry[]> {
  requireSupabase()

  let query = supabase.from('support_inquiries').select('*').order('created_at', { ascending: false })

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const search = filters.search?.trim()
  if (search) {
    const pattern = `%${search.replace(/[%*,()"'\\]/g, '')}%`
    query = query.or(`name.ilike."${pattern}",email.ilike."${pattern}",phone.ilike."${pattern}"`)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as InquiryRow[]).map(mapInquiry)
}

export async function fetchInquiry(id: string): Promise<SupportInquiry> {
  requireSupabase()

  const { data, error } = await supabase.from('support_inquiries').select('*').eq('id', id).single()

  if (error) {
    throw new Error(error.message)
  }

  return mapInquiry(data as InquiryRow)
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  requireSupabase()

  const { error } = await supabase.from('support_inquiries').update({ status }).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}

import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

// Type definitions for Resend API responses
export interface ResendEmailResponse {
  data?: {
    id: string
  }
  error?: {
    message: string
    name: string
  }
}

export interface SendEmailOptions {
  from: string
  to: string | string[]
  subject: string
  html?: string
  text?: string
  reply_to?: string
}
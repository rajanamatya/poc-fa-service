export interface Contact {
  clientId: string
  advisorId: string | null
  firstName: string
  lastName: string
  email: string
  phone: string | null
  state: string
  notes: string | null
  intakeStatus: 'not_started' | 'in_progress' | 'complete'
  referralStatus: 'none' | 'referred' | 'viewed' | 'connected'
  consentStatus: 'pending' | 'accepted' | 'declined'
  consentGivenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateContactPayload {
  firstName: string
  lastName: string
  email: string
  phone?: string
  state: string
  notes?: string
}

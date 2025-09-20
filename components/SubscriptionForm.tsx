'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react'

export default function SubscriptionForm() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setStatus('error')
      setMessage('Email is required')
      return
    }

    setIsSubmitting(true)
    setStatus('idle')
    
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          source: 'Landing Page'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message || 'Successfully subscribed!')
        setEmail('')
        setFirstName('')
        setLastName('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to subscribe. Please try again.')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      setStatus('error')
      setMessage('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Welcome to our community!
        </h3>
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <p className="text-blue-800 font-medium">Check your inbox!</p>
          </div>
          <p className="text-sm text-blue-700">
            We've sent you a welcome email with important information about your subscription.
          </p>
        </div>
        <Button 
          onClick={() => {
            setStatus('idle')
            setMessage('')
          }}
          variant="outline"
          className="mt-4"
        >
          Subscribe Another Email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="email" className="text-base font-medium">
          Email Address *
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          required
          disabled={isSubmitting}
          className="mt-2 text-base h-12"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" className="text-base font-medium">
            First Name (Optional)
          </Label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
            disabled={isSubmitting}
            className="mt-2 text-base h-12"
          />
        </div>
        
        <div>
          <Label htmlFor="lastName" className="text-base font-medium">
            Last Name (Optional)
          </Label>
          <Input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Your last name"
            disabled={isSubmitting}
            className="mt-2 text-base h-12"
          />
        </div>
      </div>

      {status === 'error' && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{message}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !email}
        className="w-full h-12 text-base font-medium"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Subscribing...
          </>
        ) : (
          'Join Our Newsletter'
        )}
      </Button>

      <div className="text-center space-y-2">
        <p className="text-sm text-gray-500">
          We'll send you a confirmation email after you subscribe.
        </p>
        <p className="text-xs text-gray-400">
          We'll never share your email with anyone else.
        </p>
      </div>
    </form>
  )
}
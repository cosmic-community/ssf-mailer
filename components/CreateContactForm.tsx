'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  status: 'Active' | 'Unsubscribed' | 'Bounced';
  tags: string[];
  subscribe_date: string;
  notes: string;
}

const AVAILABLE_TAGS = ['Newsletter', 'Promotions', 'Product Updates', 'VIP Customer'];

export default function CreateContactForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<'Active' | 'Unsubscribed' | 'Bounced'>('Active')
  
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ContactFormData>({
    defaultValues: {
      status: 'Active',
      subscribe_date: new Date().toISOString().split('T')[0]
    }
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          status: selectedStatus,
          tags: selectedTags
        })
      })

      if (response.ok) {
        router.push('/contacts')
        router.refresh()
      } else {
        throw new Error('Failed to create contact')
      }
    } catch (error) {
      console.error('Error creating contact:', error)
      alert('Failed to create contact. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleStatusChange = (value: string) => {
    const status = value as 'Active' | 'Unsubscribed' | 'Bounced'
    setSelectedStatus(status)
    setValue('status', status)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div>
          <label className="label">First Name *</label>
          <input
            type="text"
            className="input-field"
            {...register('first_name', { required: 'First name is required' })}
          />
          {errors.first_name && (
            <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="label">Last Name</label>
          <input
            type="text"
            className="input-field"
            {...register('last_name')}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="label">Email Address *</label>
        <input
          type="email"
          className="input-field"
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address'
            }
          })}
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status */}
        <div>
          <label className="label">Subscription Status *</label>
          <Select value={selectedStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Unsubscribed">Unsubscribed</SelectItem>
              <SelectItem value="Bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subscribe Date */}
        <div>
          <label className="label">Subscribe Date</label>
          <input
            type="date"
            className="input-field"
            {...register('subscribe_date')}
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="label">Tags</label>
        <div className="grid grid-cols-2 gap-3">
          {AVAILABLE_TAGS.map(tag => (
            <label key={tag} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedTags.includes(tag)}
                onChange={() => handleTagToggle(tag)}
                className="mr-2 rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes</label>
        <textarea
          rows={3}
          className="input-field resize-none"
          placeholder="Add any additional notes about this contact..."
          {...register('notes')}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Adding Contact...' : 'Add Contact'}
        </button>
      </div>
    </form>
  )
}
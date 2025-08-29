'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/useToast'
import ToastContainer from '@/components/ToastContainer'

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
  const { toasts, addToast, removeToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<'Active' | 'Unsubscribed' | 'Bounced'>('Active')
  
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ContactFormData>({
    defaultValues: {
      status: 'Active',
      subscribe_date: new Date().toISOString().split('T')[0]
    }
  })

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
        addToast('Contact added successfully!', 'success')
        scrollToTop()
        
        // Navigate after a short delay to show the toast and refresh data
        setTimeout(() => {
          router.push('/contacts')
          router.refresh() // Ensure fresh data is fetched
        }, 1500)
      } else {
        throw new Error('Failed to create contact')
      }
    } catch (error) {
      console.error('Error creating contact:', error)
      addToast('Failed to create contact. Please try again.', 'error')
      scrollToTop()
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
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              type="text"
              {...register('first_name', { required: 'First name is required' })}
            />
            {errors.first_name && (
              <p className="text-sm text-destructive">{errors.first_name.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              type="text"
              {...register('last_name')}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
              }
            })}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status */}
          <div className="space-y-2">
            <Label>Subscription Status *</Label>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="subscribe_date">Subscribe Date</Label>
            <Input
              id="subscribe_date"
              type="date"
              {...register('subscribe_date')}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <Label>Tags</Label>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_TAGS.map(tag => (
              <div key={tag} className="flex items-center space-x-2">
                <Checkbox
                  id={tag}
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={() => handleTagToggle(tag)}
                />
                <Label 
                  htmlFor={tag}
                  className="text-sm font-normal cursor-pointer"
                >
                  {tag}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Add any additional notes about this contact..."
            {...register('notes')}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding Contact...' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </>
  )
}
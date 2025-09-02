import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowLeft } from 'lucide-react'

export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Thank You for Subscribing!
          </h1>
          
          <p className="text-gray-600 mb-6">
            You've successfully joined our email list. We'll keep you updated with our latest content, tips, and exclusive offers.
          </p>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              <p>What's next?</p>
              <ul className="mt-2 space-y-1">
                <li>• Check your email for a welcome message</li>
                <li>• Add us to your contacts to ensure delivery</li>
                <li>• Look out for our next newsletter</li>
              </ul>
            </div>
            
            <Button asChild className="w-full">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
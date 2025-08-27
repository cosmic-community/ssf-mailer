import './globals.css'
import type { Metadata } from 'next'
import CosmicBadge from '@/components/CosmicBadge'

export const metadata: Metadata = {
  title: 'Email Marketing Hub',
  description: 'Comprehensive email marketing platform for managing contacts, templates, and campaigns',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const bucketSlug = process.env.COSMIC_BUCKET_SLUG as string

  return (
    <html lang="en">
      <head>
        {/* Console capture script for dashboard debugging */}
        <script src="/dashboard-console-capture.js" />
      </head>
      <body className="bg-gray-50 min-h-screen">
        {children}
        <CosmicBadge bucketSlug={bucketSlug} />
      </body>
    </html>
  )
}
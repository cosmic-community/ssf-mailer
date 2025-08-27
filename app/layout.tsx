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
        {/* Email emoji favicon */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📧</text></svg>" />
        {/* Console capture script for dashboard debugging */}
        <script src="/dashboard-console-capture.js" />
      </head>
      <body className="bg-slate-50 min-h-screen">
        {children}
        <CosmicBadge bucketSlug={bucketSlug} />
      </body>
    </html>
  )
}
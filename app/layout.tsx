'use client'

import './globals.css'
import Layout from '@/components/Layout'
import CosmicBadge from '@/components/CosmicBadge'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [bucketSlug, setBucketSlug] = useState<string>('')

  // Don't show layout on login page
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    // Fetch bucket slug for client-side components
    fetch('/api/bucket-info')
      .then(res => res.json())
      .then(data => setBucketSlug(data.bucketSlug))
      .catch(console.error)
  }, [])

  return (
    <html lang="en">
      <head>
        {/* Email emoji favicon */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📧</text></svg>" />
        {/* Console capture script for dashboard debugging */}
        <script src="/dashboard-console-capture.js" />
        <title>Cosmic Email Marketing</title>
        <meta name="description" content="Comprehensive email marketing platform for managing contacts, templates, and campaigns" />
      </head>
      <body className="bg-slate-50 min-h-screen">
        {isLoginPage ? (
          children
        ) : (
          <Layout>
            {children}
          </Layout>
        )}
        {bucketSlug && <CosmicBadge bucketSlug={bucketSlug} />}
      </body>
    </html>
  )
}
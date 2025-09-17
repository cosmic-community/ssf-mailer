import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Layout from '@/components/Layout'
import { Toaster } from '@/components/ui/toaster'
import { getSettings } from '@/lib/cosmic'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Email Marketing Dashboard',
  description: 'Manage your email campaigns, contacts, and templates with AI assistance',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch company name on server-side once
  let companyName = "Email Marketing";
  
  try {
    const settings = await getSettings();
    const settingsCompanyName = settings?.metadata?.company_name;
    if (settingsCompanyName?.trim()) {
      companyName = settingsCompanyName;
    }
  } catch (error) {
    console.error("Failed to fetch company name:", error);
    // Keep default "Email Marketing" on error
  }

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📧</text></svg>" />
      </head>
      <body className={inter.className}>
        <Layout companyName={companyName}>
          {children}
        </Layout>
        <Toaster />
      </body>
    </html>
  )
}
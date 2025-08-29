'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Home, 
  Users, 
  Mail, 
  Send, 
  Settings, 
  Menu, 
  X,
  BarChart3
} from 'lucide-react'
import LogoutButton from './LogoutButton'
import CosmicBadge from './CosmicBadge'

interface LayoutProps {
  children: React.ReactNode
  showNav?: boolean
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Templates', href: '/templates', icon: Mail },
    { name: 'Campaigns', href: '/campaigns', icon: Send },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(href)
  }

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault()
    // Force a hard navigation to ensure proper route handling
    if (href === '/') {
      router.push('/')
      router.refresh()
    } else {
      router.push(href)
    }
    setMobileMenuOpen(false)
  }

  if (!showNav) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full">
          {children}
        </main>
        <CosmicBadge bucketSlug={process.env.NEXT_PUBLIC_COSMIC_BUCKET_SLUG || ''} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2" onClick={(e) => handleNavClick('/', e)}>
                <Mail className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Cosmic Email Marketing</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={(e) => handleNavClick(item.href, e)}
                    className={`
                      flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Right side - Desktop logout */}
            <div className="hidden md:flex items-center">
              <LogoutButton />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div 
              className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed top-0 right-0 bottom-0 w-64 bg-white shadow-xl z-50 overflow-y-auto">
              {/* Mobile menu header */}
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                <Link href="/" className="flex items-center space-x-2" onClick={(e) => handleNavClick('/', e)}>
                  <Mail className="h-6 w-6 text-blue-600" />
                  <span className="text-lg font-bold text-gray-900">Cosmic Email Marketing</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile menu items */}
              <nav className="mt-6 px-3">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-md transition-colors
                        ${isActive(item.href)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                      onClick={(e) => handleNavClick(item.href, e)}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>

              {/* Mobile logout */}
              <div className="absolute bottom-4 left-3 right-3">
                <LogoutButton />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content area */}
      <main className="flex-1">
        {children}
      </main>

      <CosmicBadge bucketSlug={process.env.NEXT_PUBLIC_COSMIC_BUCKET_SLUG || ''} />
    </div>
  )
}
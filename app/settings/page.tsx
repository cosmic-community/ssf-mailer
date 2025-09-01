import { getSettings } from '@/lib/cosmic'
import SettingsForm from '@/components/SettingsForm'

// Force dynamic rendering - prevents static generation and caching
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  let settings = null
  
  try {
    settings = await getSettings()
  } catch (error) {
    console.error('Error fetching settings:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your email marketing configuration</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SettingsForm initialSettings={settings} />
      </main>
    </div>
  )
}
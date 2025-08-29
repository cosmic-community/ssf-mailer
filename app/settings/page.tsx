import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/cosmic'
import SettingsForm from '@/components/SettingsForm'
import Layout from '@/components/Layout'

export default async function SettingsPage() {
  let settings = null
  
  try {
    settings = await getSettings()
  } catch (error) {
    console.error('Error fetching settings:', error)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your email marketing configuration</p>
          </div>
        </div>
        
        <SettingsForm initialSettings={settings} />
      </div>
    </Layout>
  )
}
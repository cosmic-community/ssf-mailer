interface DashboardStatsProps {
  contactsCount: number
  templatesCount: number
  campaignssCount: number
}

export default function DashboardStats({ 
  contactsCount, 
  templatesCount, 
  campaignssCount 
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Contacts Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-slate-800 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4 text-white">
              <p className="text-3xl font-bold">{contactsCount.toLocaleString()}</p>
              <p className="text-slate-300 font-medium">Total Contacts</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Active subscribers</span>
            <span className="text-slate-700 font-medium">
              {contactsCount > 0 ? `${Math.round(contactsCount * 0.85)}` : '0'} active
            </span>
          </div>
        </div>
      </div>

      {/* Templates Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-slate-700 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="ml-4 text-white">
              <p className="text-3xl font-bold">{templatesCount}</p>
              <p className="text-slate-300 font-medium">Email Templates</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Ready to use</span>
            <span className="text-slate-700 font-medium">
              {templatesCount > 0 ? `${templatesCount} available` : 'Create first template'}
            </span>
          </div>
        </div>
      </div>

      {/* Campaigns Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-slate-600 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div className="ml-4 text-white">
              <p className="text-3xl font-bold">{campaignssCount}</p>
              <p className="text-slate-300 font-medium">Campaigns</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total sent</span>
            <span className="text-slate-700 font-medium">
              {campaignssCount > 0 ? `${campaignssCount} campaigns` : 'Launch your first'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
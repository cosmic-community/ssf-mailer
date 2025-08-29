import CreateTemplateForm from '@/components/CreateTemplateForm'

export default function NewTemplatePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Container with max-width and padding for consistency */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Create New Template</h1>
          <p className="text-slate-600">Use AI to generate content or create your template manually</p>
        </div>
        
        <CreateTemplateForm />
      </div>
    </div>
  )
}
import { ShieldCheck } from 'lucide-react'
import { API_BASE_URL } from './config'

function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <ShieldCheck aria-hidden="true" className="mb-6 text-blue-700" size={32} />
        <h1 className="text-2xl font-semibold">Cloud Kitchen Admin</h1>
        <p className="mt-2 text-slate-600">Admin dashboard scaffold</p>
        <p className="mt-6 text-sm text-slate-500">
          Shared API: <code className="font-mono">{API_BASE_URL}</code>
        </p>
      </section>
    </main>
  )
}

export default App

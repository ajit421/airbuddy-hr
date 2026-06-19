import AppLayout from '@/components/layout/AppLayout'

// Placeholder dashboard — will be fully built in Phase 13
export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Welcome to AirBuddy HR Platform. Full dashboard coming in Phase 13.
          </p>
        </div>

        {/* Placeholder cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: '—', color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20' },
            { label: 'Full-Time', value: '—', color: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' },
            { label: 'Interns', value: '—', color: 'from-blue-500/10 to-blue-500/5 border-blue-500/20' },
            { label: 'Docs Generated', value: '—', color: 'from-purple-500/10 to-purple-500/5 border-purple-500/20' },
          ].map((card) => (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${card.color} border rounded-xl p-5`}
            >
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">{card.label}</p>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Coming soon note */}
        <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-6 text-center">
          <p className="text-slate-400 text-sm">
            📊 Full dashboard with stats, charts, and recent activity will be built in Phase 13.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}

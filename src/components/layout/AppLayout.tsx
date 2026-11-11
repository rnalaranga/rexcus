import React, { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { RouteTransitionLoader } from '@/components/common/RouteTransitionLoader'

const ContentLoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-fade-in p-2 w-full">
    <div className="flex items-center justify-between pb-4 border-b border-theme-subtle">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-3 w-80 bg-zinc-100 dark:bg-zinc-800/60 rounded animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-8 w-28 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
      <div className="h-24 bg-zinc-100 dark:bg-zinc-800/40 rounded-lg border border-theme-subtle animate-pulse" />
      <div className="h-24 bg-zinc-100 dark:bg-zinc-800/40 rounded-lg border border-theme-subtle animate-pulse" />
      <div className="h-24 bg-zinc-100 dark:bg-zinc-800/40 rounded-lg border border-theme-subtle animate-pulse" />
      <div className="h-24 bg-zinc-100 dark:bg-zinc-800/40 rounded-lg border border-theme-subtle animate-pulse" />
    </div>
    <div className="h-80 bg-zinc-100 dark:bg-zinc-800/40 rounded-lg border border-theme-subtle mt-4 animate-pulse flex flex-col items-center justify-center">
      <div className="relative w-10 h-10 mb-3">
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-xs font-mono font-bold tracking-wider text-muted uppercase">Loading view...</p>
    </div>
  </div>
)

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-base grid-pattern">
      <RouteTransitionLoader />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute -top-40 -left-20 w-96 h-96"
          style={{
            background: 'radial-gradient(circle, rgba(185,28,28,0.06) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<ContentLoadingSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

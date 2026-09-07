import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-base grid-pattern">
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
          <Outlet />
        </main>
      </div>
    </div>
  )
}

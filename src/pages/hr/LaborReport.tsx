import React, { useState, useEffect } from 'react'
import { Download, Users, Award, Factory, Printer, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export const LaborReport: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([])
  const [machineries, setMachineries] = useState<any[]>([])
  const [skillsMaster, setSkillsMaster] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [empRes, machRes, skillsRes] = await Promise.all([
          fetch(`${API}/hr/employees`).then(r => r.json()),
          fetch(`${API}/production/machineries`).then(r => r.json()),
          fetch(`${API}/hr/skills`).then(r => r.json())
        ])
        setEmployees(Array.isArray(empRes) ? empRes : [])
        setMachineries(Array.isArray(machRes) ? machRes : [])
        setSkillsMaster(Array.isArray(skillsRes) ? skillsRes : [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Grouping logic
  const groupedSkills = skillsMaster.map(skill => {
    const matchedEmps = employees.filter(e => e.skillIds?.includes(skill.id))
    return { ...skill, employees: matchedEmps }
  }).filter(s => s.employees.length > 0) // Only show skills that have assigned employees

  const unverifiedEmps = employees.filter(e => !e.skillIds || e.skillIds.length === 0)

  if (loading) {
    return <div className="p-10 text-center animate-pulse text-xs text-muted font-medium">Generating Report...</div>
  }

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      
      {/* Header - Hidden during print */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-bold text-primary">Skill-wise Labor Report</h1>
          <p className="text-xs text-muted mt-0.5">Laborers and Operators categorized by certified skills</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={Printer} onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black uppercase tracking-widest text-black">Rex Industries</h1>
        <h2 className="text-lg font-bold text-gray-700 mt-1">Skill-wise Labor & Operator Allocation Report</h2>
        <p className="text-xs text-gray-500 mt-1">Generated on {new Date().toLocaleString()}</p>
      </div>

      {groupedSkills.length === 0 && unverifiedEmps.length === 0 && (
        <GlassCard className="p-10 text-center">
          <p className="text-secondary text-sm">No employees or skills registered.</p>
        </GlassCard>
      )}

      {/* Grouped by Skill */}
      <div className="space-y-6">
        {groupedSkills.map(group => (
          <GlassCard key={group.id} className="p-0 overflow-hidden border border-theme-subtle print:border-gray-300 print:shadow-none print:break-inside-avoid">
            <div className="bg-surface/50 p-4 border-b border-theme-subtle flex items-center justify-between print:bg-gray-100 print:border-gray-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex-shrink-0 bg-blue-600 border border-blue-500/40 flex items-center justify-center print:border-none">
                  <Award size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-primary text-sm leading-tight print:text-black">{group.name}</h3>
                  <p className="text-[10px] text-muted font-semibold uppercase tracking-widest">{group.category}</p>
                </div>
              </div>
              <div className="text-xs font-bold bg-theme-subtle px-3 py-1 rounded-full text-secondary print:border print:border-black">
                {group.employees.length} Staff Member{group.employees.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm print:text-xs">
                <thead>
                  <tr className="text-xs text-secondary bg-surface2/30 print:bg-white border-b border-theme-subtle print:border-gray-300">
                    <th className="py-2.5 px-4 font-semibold w-1/4">Employee Name</th>
                    <th className="py-2.5 px-4 font-semibold w-1/4">Role</th>
                    <th className="py-2.5 px-4 font-semibold w-1/6">Contact</th>
                    <th className="py-2.5 px-4 font-semibold">Assigned Machines</th>
                  </tr>
                </thead>
                <tbody>
                  {group.employees.map((emp: any) => (
                    <tr key={emp.id} className="border-b border-theme-subtle/50 last:border-0 hover:bg-surface/30 transition-colors print:border-gray-200">
                      <td className="py-2.5 px-4">
                        <p className="font-semibold text-primary print:text-black">{emp.name}</p>
                        <p className="text-[10px] text-muted font-mono">{emp.id}</p>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-secondary">{emp.role}</td>
                      <td className="py-2.5 px-4 text-[10px] text-secondary">
                        {emp.phone && <div className="print:text-black">{emp.phone}</div>}
                        {emp.email && <div className="text-muted">{emp.email}</div>}
                        {!emp.phone && !emp.email && '-'}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.machineIds?.map((mId: string) => {
                            const mach = machineries.find(m => m.id === mId)
                            return (
                              <span key={mId} className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] rounded font-semibold whitespace-nowrap flex items-center gap-1 print:border-gray-300 print:text-black print:bg-transparent">
                                <Factory size={8}/> {mach ? mach.name : mId}
                              </span>
                            )
                          })}
                          {(!emp.machineIds || emp.machineIds.length === 0) && (
                            <span className="text-[10px] text-muted italic print:text-gray-500">Unassigned</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        ))}

        {/* Unverified Section */}
        {unverifiedEmps.length > 0 && (
          <GlassCard className="p-0 overflow-hidden border border-red-500/30 print:border-gray-300 print:shadow-none print:break-inside-avoid opacity-90">
            <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex items-center justify-between print:bg-gray-100 print:border-gray-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex-shrink-0 bg-red-600 border border-red-500/40 flex items-center justify-center print:border-none">
                  <AlertCircle size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-red-600 dark:text-red-400 text-sm leading-tight print:text-black">Unverified / No Skills Assigned</h3>
                  <p className="text-[10px] text-red-500/70 font-semibold uppercase tracking-widest">Action Required</p>
                </div>
              </div>
              <div className="text-xs font-bold bg-red-500/20 px-3 py-1 rounded-full text-red-600 print:border print:border-black">
                {unverifiedEmps.length} Staff Member{unverifiedEmps.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm print:text-xs">
                <thead>
                  <tr className="text-xs text-secondary bg-surface2/30 print:bg-white border-b border-theme-subtle print:border-gray-300">
                    <th className="py-2.5 px-4 font-semibold w-1/4">Employee Name</th>
                    <th className="py-2.5 px-4 font-semibold w-1/4">Role</th>
                    <th className="py-2.5 px-4 font-semibold w-1/6">Contact</th>
                    <th className="py-2.5 px-4 font-semibold">Assigned Machines</th>
                  </tr>
                </thead>
                <tbody>
                  {unverifiedEmps.map((emp: any) => (
                    <tr key={emp.id} className="border-b border-theme-subtle/50 last:border-0 hover:bg-surface/30 transition-colors print:border-gray-200">
                      <td className="py-2.5 px-4">
                        <p className="font-semibold text-primary print:text-black">{emp.name}</p>
                        <p className="text-[10px] text-muted font-mono">{emp.id}</p>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-secondary">{emp.role}</td>
                      <td className="py-2.5 px-4 text-[10px] text-secondary">
                        {emp.phone && <div className="print:text-black">{emp.phone}</div>}
                        {emp.email && <div className="text-muted">{emp.email}</div>}
                        {!emp.phone && !emp.email && '-'}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.machineIds?.map((mId: string) => {
                            const mach = machineries.find(m => m.id === mId)
                            return (
                              <span key={mId} className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] rounded font-semibold whitespace-nowrap flex items-center gap-1 print:border-gray-300 print:text-black print:bg-transparent">
                                <Factory size={8}/> {mach ? mach.name : mId}
                              </span>
                            )
                          })}
                          {(!emp.machineIds || emp.machineIds.length === 0) && (
                            <span className="text-[10px] text-muted italic print:text-gray-500">Unassigned</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  )
}

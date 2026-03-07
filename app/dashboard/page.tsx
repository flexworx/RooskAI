'use client'

import { useCallback } from 'react'
import { ErrorBoundary } from '@/components/dashboard/ErrorBoundary'
import { SystemHealthBar } from '@/components/dashboard/panels/SystemHealthBar'
import { VMInventoryGrid } from '@/components/dashboard/panels/VMInventoryGrid'
import { AICommandTerminal } from '@/components/dashboard/panels/AICommandTerminal'
import { RecentActivity } from '@/components/dashboard/panels/RecentActivity'
import { SecurityAlertsPanel } from '@/components/dashboard/panels/SecurityAlertsPanel'
import { MurphAgentStatus } from '@/components/dashboard/panels/MurphAgentStatus'
import { DatabaseHealth } from '@/components/dashboard/panels/DatabaseHealth'
import { NetworkMap } from '@/components/dashboard/panels/NetworkMap'
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard'
import { useApi } from '@/hooks/useApi'
import { getVMs, getAlerts, getAuditLogs, getDatabases, getAgents, getSystemMetrics } from '@/services/api'
import type { VM, SecurityAlert, AuditLogEntry, DatabaseInstance, MurphAgent, SystemMetrics } from '@/types'

export default function DashboardPage() {
  const vmFetcher = useCallback(() => getVMs(), [])
  const alertFetcher = useCallback(() => getAlerts(), [])
  const logFetcher = useCallback(() => getAuditLogs(20), [])
  const dbFetcher = useCallback(() => getDatabases(), [])
  const agentFetcher = useCallback(() => getAgents(), [])
  const metricsFetcher = useCallback(() => getSystemMetrics(), [])

  const { data: vms } = useApi<VM[]>(vmFetcher, 30000)
  const { data: alerts } = useApi<SecurityAlert[]>(alertFetcher, 15000)
  const { data: logs } = useApi<AuditLogEntry[]>(logFetcher, 10000)
  const { data: databases } = useApi<DatabaseInstance[]>(dbFetcher, 30000)
  const { data: agents } = useApi<MurphAgent[]>(agentFetcher, 15000)
  const { data: metrics } = useApi<SystemMetrics>(metricsFetcher, 5000)

  const safeVms = Array.isArray(vms) ? vms : []
  const safeAlerts = Array.isArray(alerts) ? alerts : []
  const safeLogs = Array.isArray(logs) ? logs : []
  const safeDbs = Array.isArray(databases) ? databases : []
  const safeAgents = Array.isArray(agents) ? agents : []

  return (
    <div className="space-y-6">
      <OnboardingWizard />
      <ErrorBoundary>
        <SystemHealthBar metrics={metrics} />
      </ErrorBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ErrorBoundary>
            <VMInventoryGrid vms={safeVms} />
          </ErrorBoundary>
          <ErrorBoundary>
            <AICommandTerminal />
          </ErrorBoundary>
        </div>

        <div className="space-y-6">
          <ErrorBoundary>
            <RecentActivity logs={safeLogs} />
          </ErrorBoundary>
          <ErrorBoundary>
            <SecurityAlertsPanel alerts={safeAlerts} />
          </ErrorBoundary>
          <ErrorBoundary>
            <MurphAgentStatus agents={safeAgents} />
          </ErrorBoundary>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary>
          <DatabaseHealth databases={safeDbs} />
        </ErrorBoundary>
        <ErrorBoundary>
          <NetworkMap />
        </ErrorBoundary>
      </div>
    </div>
  )
}

'use client'

import { useAuth } from './useAuth'

type Permission =
  | 'vm:create' | 'vm:action' | 'vm:delete'
  | 'user:manage' | 'user:delete'
  | 'service:deploy'
  | 'alert:resolve'
  | 'agent:deregister'
  | 'db:backup'
  | 'settings:edit'
  | 'api_keys:manage'
  | 'audit:view'
  | 'compliance:view'

const rolePermissions: Record<string, Permission[]> = {
  platform_admin: [
    'vm:create', 'vm:action', 'vm:delete',
    'user:manage', 'user:delete',
    'service:deploy',
    'alert:resolve',
    'agent:deregister',
    'db:backup',
    'settings:edit',
    'api_keys:manage',
    'audit:view',
    'compliance:view',
  ],
  operator: [
    'vm:action',
    'service:deploy',
    'alert:resolve',
    'db:backup',
    'audit:view',
    'compliance:view',
  ],
  viewer: [
    'audit:view',
    'compliance:view',
  ],
  api_service: [
    'vm:action',
    'alert:resolve',
    'db:backup',
  ],
}

export function useRBAC() {
  const { user } = useAuth()
  const role = user?.role ?? 'viewer'

  const can = (permission: Permission): boolean => {
    const perms = rolePermissions[role] ?? []
    return perms.includes(permission)
  }

  const isAdmin = role === 'platform_admin'
  const isOperator = role === 'operator' || isAdmin
  const isViewer = role === 'viewer'

  return { can, isAdmin, isOperator, isViewer, role }
}

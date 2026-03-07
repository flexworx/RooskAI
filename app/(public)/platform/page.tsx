import type { Metadata } from 'next'
import { PlatformHero } from '@/components/platform/PlatformHero'
import { CentralIntelShowcase } from '@/components/platform/CentralIntelShowcase'
import { AgentFramework } from '@/components/platform/AgentFramework'
import { InfrastructureStack } from '@/components/platform/InfrastructureStack'
import { CTASection } from '@/components/home/CTASection'

export const metadata: Metadata = {
  title: 'Platform',
  description:
    'Explore the CentralIntel.ai platform — AI-driven orchestration, 7 specialized agents, and enterprise-grade infrastructure automation.',
}

export default function PlatformPage() {
  return (
    <>
      <PlatformHero />
      <CentralIntelShowcase />
      <AgentFramework />
      <InfrastructureStack />
      <CTASection />
    </>
  )
}

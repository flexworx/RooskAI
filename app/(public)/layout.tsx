import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageTransition } from '@/components/layout/PageTransition'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SiteHeader />
      <main className="pt-16">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
    </>
  )
}

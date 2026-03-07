import Link from 'next/link'

export default function PublicNotFound() {
  return (
    <section className="section-padding bg-nexgen-bg min-h-[60vh] flex items-center">
      <div className="section-container text-center">
        <p className="text-6xl font-bold font-mono gradient-text mb-4">404</p>
        <h1 className="heading-md mb-3">Page not found</h1>
        <p className="body-md max-w-md mx-auto mb-8">
          This page doesn&apos;t exist. Check the URL or head back to explore our platform.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-primary text-sm px-6 py-2.5">
            Back to Home
          </Link>
          <Link href="/platform" className="btn-secondary text-sm px-6 py-2.5">
            View Platform
          </Link>
        </div>
      </div>
    </section>
  )
}

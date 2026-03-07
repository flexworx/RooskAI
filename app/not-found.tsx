import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-nexgen-bg">
      <div className="text-center max-w-md px-6">
        <p className="text-7xl font-bold font-mono gradient-text mb-4">404</p>
        <h1 className="text-xl font-semibold text-nexgen-text mb-3">
          Page not found
        </h1>
        <p className="text-sm text-nexgen-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-primary text-sm px-6 py-2.5">
            Go Home
          </Link>
          <Link href="/contact" className="btn-secondary text-sm px-6 py-2.5">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}

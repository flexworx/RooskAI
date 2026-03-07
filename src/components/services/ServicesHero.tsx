'use client'

import { motion } from 'framer-motion'

export function ServicesHero() {
  return (
    <section className="relative section-padding overflow-hidden">
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid-60 opacity-30" />

      <div className="section-container relative z-10">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xs font-mono text-nexgen-accent uppercase tracking-[0.2em] mb-4 block">
            Services
          </span>
          <h1 className="heading-xl mb-6">
            Managed Intelligence,
            <br />
            <span className="gradient-text">Not Managed Tickets.</span>
          </h1>
          <p className="body-lg max-w-xl mx-auto">
            Every service is AI-augmented, continuously monitored, and backed
            by enterprise-grade SLAs. No more waiting for a human to notice the problem.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

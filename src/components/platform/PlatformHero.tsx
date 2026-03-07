'use client'

import { motion } from 'framer-motion'
import { Brain } from 'lucide-react'

export function PlatformHero() {
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
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-nexgen-accent to-nexgen-blue glow-accent-strong mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <Brain size={28} className="text-white" />
          </motion.div>

          <h1 className="heading-xl mb-6">
            The <span className="gradient-text">CentralIntel.ai</span> Platform
          </h1>
          <p className="body-lg max-w-xl mx-auto">
            A unified AI intelligence layer that sits above your infrastructure
            and below your operations team — orchestrating everything in between.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

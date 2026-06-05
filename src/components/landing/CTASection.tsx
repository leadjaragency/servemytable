"use client";

import Link from "next/link";
import { ArrowRight, Monitor, Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedSection from "./motion/AnimatedSection";
import AnimatedText from "./motion/AnimatedText";
import { fadeIn, fadeUp, scaleIn, staggerContainer } from "./motion/MotionConfig";

export default function CTASection() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="py-20 bg-[#131313]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection
          variants={prefersReduced ? undefined : scaleIn()}
          threshold={0.2}
          className={`relative bg-[#141414] rounded-3xl overflow-hidden px-8 py-16 sm:px-14 sm:py-20 text-center${prefersReduced ? "" : " animate-gold-glow"}`}
        >
          {/* Background glow blobs — animated scale+opacity loop */}
          <motion.div
            className="absolute top-0 left-0 w-72 h-72 bg-[#C6A34E]/15 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            animate={prefersReduced ? undefined : { scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <motion.div
            className="absolute bottom-0 right-0 w-64 h-64 bg-[#C6A34E]/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"
            animate={prefersReduced ? undefined : { scale: [1, 1.15, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl mx-auto">
            <motion.p
              className="text-[#C6A34E] text-[11px] font-semibold uppercase tracking-[3px] mb-4"
              variants={prefersReduced ? undefined : fadeUp(0.1)}
              initial="hidden"
              animate="visible"
            >
              Join 100+ Restaurants
            </motion.p>

            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white mb-5 leading-none">
              <AnimatedText
                text="Your competitors are"
                initialDelay={0.2}
                staggerDelay={0.07}
              />
              <br />
              <AnimatedText
                text="already using AI."
                className="text-[#C6A34E]"
                initialDelay={0.5}
                staggerDelay={0.07}
              />
            </h2>

            <motion.p
              className="text-white/65 text-base leading-relaxed mb-10 max-w-lg mx-auto"
              variants={prefersReduced ? undefined : fadeUp(0.65)}
              initial="hidden"
              animate="visible"
            >
              Take 30 minutes today. Let your AI waiter handle the rest — permanently.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center justify-center gap-3"
              variants={prefersReduced ? undefined : staggerContainer(0.1)}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={prefersReduced ? undefined : scaleIn(0.75)}
                whileHover={prefersReduced ? undefined : { scale: 1.04, boxShadow: "0 0 40px rgba(198,163,78,0.6)" }}
                whileTap={prefersReduced ? undefined : { scale: 0.97 }}
              >
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 h-12 px-8 text-base font-bold uppercase tracking-wider rounded-xl bg-[#C6A34E] text-[#FAF6ED] hover:bg-[#A8873A] hover:text-white transition-colors shadow-lg"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div
                variants={prefersReduced ? undefined : fadeIn(0.85)}
                whileHover={prefersReduced ? undefined : { borderColor: "rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                <Link
                  href="/auth/login"
                  className="inline-flex items-center h-12 px-7 text-base font-medium rounded-xl border border-white/25 text-white transition-colors"
                >
                  Log in
                </Link>
              </motion.div>
            </motion.div>

            <motion.p
              className="mt-6 text-xs text-white/35"
              variants={prefersReduced ? undefined : fadeUp(0.95)}
              initial="hidden"
              animate="visible"
            >
              Free 14-day trial · No credit card required · Cancel anytime
            </motion.p>
          </div>

        </AnimatedSection>

        {/* ── Try the live demo — no sign-up ───────────────────────────── */}
        <AnimatedSection
          variants={prefersReduced ? undefined : fadeUp()}
          threshold={0.2}
          className="mt-8 rounded-3xl border border-[#2A2A2A] bg-[#0A0A0A] px-8 py-10 text-center"
        >
          <p className="text-[#C6A34E] text-[11px] font-semibold uppercase tracking-[3px] mb-2">
            No sign-up needed
          </p>
          <h3 className="font-display text-3xl sm:text-4xl text-[#FAF6ED] mb-2 leading-none">
            Try the live demo
          </h3>
          <p className="text-[#AD897E] text-sm mb-7 max-w-md mx-auto">
            Explore both sides of ServeMyTable instantly — see what your guests see, and what you&apos;d manage.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/table/1?restaurant=saffron-palace"
              className="inline-flex items-center gap-2 h-12 px-6 text-base font-semibold rounded-xl bg-[#C6A34E] text-[#FAF6ED] hover:bg-[#A8873A] hover:text-white transition-colors shadow-md"
            >
              <Smartphone className="w-4 h-4" />
              Customer Experience
            </Link>
            <Link
              href="/api/demo/enter"
              className="inline-flex items-center gap-2 h-12 px-6 text-base font-semibold rounded-xl bg-[#141414] text-white hover:bg-[#2A3D66] transition-colors shadow-md"
            >
              <Monitor className="w-4 h-4" />
              Admin Dashboard
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

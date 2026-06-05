"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, Clock, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedSection from "./motion/AnimatedSection";
import AnimatedText from "./motion/AnimatedText";
import { fadeUp, scaleIn, slideInRight, staggerContainer } from "./motion/MotionConfig";

const perks = [
  { icon: Clock,        text: "Full 14-day free trial" },
  { icon: CreditCard,   text: "No credit card required" },
  { icon: Zap,          text: "Set up in under 30 minutes" },
  { icon: CheckCircle2, text: "Cancel anytime — no contracts" },
];

export default function TrialSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="trial" className="py-20 bg-[#131313]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <AnimatedSection className="text-center mb-12">
          <motion.p
            className="text-[11px] font-semibold text-[#C6A34E] uppercase tracking-[3px] mb-3"
            variants={prefersReduced ? undefined : fadeUp(0.0)}
            initial="hidden"
            animate="visible"
          >
            Risk-Free Trial
          </motion.p>
          <motion.h2
            className="font-display text-4xl md:text-5xl text-[#FAF6ED] mb-4"
            variants={prefersReduced ? undefined : fadeUp(0.1)}
            initial="hidden"
            animate="visible"
          >
            Try it free for 14 days
          </motion.h2>
          <motion.p
            className="text-[#AD897E] text-base md:text-lg max-w-xl mx-auto leading-relaxed"
            variants={prefersReduced ? undefined : fadeUp(0.2)}
            initial="hidden"
            animate="visible"
          >
            No credit card. No commitment. Just set up your AI waiter and see the difference in your first week.
          </motion.p>
        </AnimatedSection>

        {/* Trial card */}
        <AnimatedSection
          variants={prefersReduced ? undefined : scaleIn()}
          threshold={0.2}
          className={`relative rounded-3xl overflow-hidden${prefersReduced ? "" : " animate-gold-glow"}`}
          style={{ background: "#1B2A4A" } as React.CSSProperties}
        >
          {/* Glow blobs */}
          <div
            className="animate-orb-drift absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: "rgba(198,163,78,0.10)", filter: "blur(80px)", transform: "translate(30%, -30%)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: "rgba(198,163,78,0.07)", filter: "blur(60px)", transform: "translate(-20%, 30%)" }}
          />

          <div className="relative z-10 px-8 py-12 sm:px-14 sm:py-14 flex flex-col lg:flex-row items-center gap-10">

            {/* Left: main message */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider mb-5"
                style={{ background: "rgba(198,163,78,0.15)", color: "#C6A34E" }}
                variants={prefersReduced ? undefined : scaleIn(0.2)}
                initial="hidden"
                animate="visible"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6A34E] inline-block" />
                Free Trial — No Card Needed
              </motion.div>

              <h3 className="font-display text-4xl sm:text-5xl text-white leading-none mb-4">
                <AnimatedText text="14 Days. Full Access." initialDelay={0.3} staggerDelay={0.07} />
                <br />
                <AnimatedText
                  text="No Commitments."
                  className="text-[#C6A34E]"
                  initialDelay={0.55}
                  staggerDelay={0.07}
                />
              </h3>

              <motion.p
                className="text-sm leading-relaxed max-w-md mx-auto lg:mx-0"
                style={{ color: "rgba(255,255,255,0.6)" }}
                variants={prefersReduced ? undefined : fadeUp(0.55)}
                initial="hidden"
                animate="visible"
              >
                Get complete access to all features — AI waiter, menu management, live orders, QR codes, analytics, and games. No limits during your trial.
              </motion.p>

              <motion.div
                className="mt-8 inline-block"
                variants={prefersReduced ? undefined : scaleIn(0.7)}
                initial="hidden"
                animate="visible"
                whileHover={prefersReduced ? undefined : { scale: 1.03, boxShadow: "0 0 30px rgba(198,163,78,0.5)" }}
                whileTap={prefersReduced ? undefined : { scale: 0.97 }}
              >
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 h-13 px-8 py-3.5 text-sm font-bold uppercase tracking-widest rounded-xl transition-colors hover:opacity-90"
                  style={{ background: "#C6A34E", color: "#1B2A4A" }}
                >
                  Activate My Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>

            {/* Right: perks list */}
            <motion.div
              className="w-full lg:w-auto lg:min-w-[280px] rounded-2xl px-7 py-7"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(198,163,78,0.2)" }}
              variants={prefersReduced ? undefined : slideInRight(0.3)}
              initial="hidden"
              animate="visible"
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
                What&apos;s included
              </p>
              <motion.ul
                className="space-y-4"
                variants={prefersReduced ? undefined : staggerContainer(0.1)}
                initial="hidden"
                animate="visible"
              >
                {perks.map(({ icon: Icon, text }) => (
                  <motion.li
                    key={text}
                    className="flex items-center gap-3"
                    variants={prefersReduced ? undefined : fadeUp()}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: "rgba(198,163,78,0.15)" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: "#C6A34E" }} />
                    </div>
                    <span className="text-sm font-medium text-white">{text}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <p className="mt-6 text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                After trial, choose a plan that fits.<br />No surprises.
              </p>
            </motion.div>

          </div>
        </AnimatedSection>

      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Smartphone, PlayCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedText from "./motion/AnimatedText";
import CountUp from "./motion/CountUp";
import { fadeIn, fadeUp, scaleIn, slideInLeft, slideInRight, staggerContainer } from "./motion/MotionConfig";

const stats = [
  { target: 40, prefix: "-", suffix: "%", label: "Labor costs",    color: "text-[#1B2A4A]"  },
  { target: 34, prefix: "+", suffix: "%", label: "Average bill",   color: "text-[#2D8A56]"  },
  { target: 0,  prefix: "",  suffix: "",  label: "Allergy errors", color: "text-[#C04525]"  },
  { target: 24, prefix: "",  suffix: "/7",label: "Always on",      color: "text-[#C6A34E]"  },
];

export default function HeroSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative bg-[#FAF6ED] pt-20 pb-12 md:pt-28 md:pb-20 overflow-hidden">
      {/* Background decorations — animated orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="animate-orb-drift absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#C6A34E]/6 blur-3xl -translate-y-1/4 translate-x-1/4" />
        <div
          className="animate-orb-drift absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#1B2A4A]/5 blur-3xl translate-y-1/4 -translate-x-1/4"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── Left: content ──────────────────────────────── */}
          <motion.div
            className="order-2 lg:order-1"
            variants={prefersReduced ? undefined : slideInLeft()}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#F0E8D6] bg-white text-sm text-[#8B7355] mb-4 shadow-sm"
              variants={prefersReduced ? undefined : fadeIn(0.1)}
              initial="hidden"
              animate="visible"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C6A34E] shrink-0" />
              <span>14-Day Free Trial · No Credit Card Required</span>
            </motion.div>

            {/* Tagline */}
            <motion.p
              className="text-[11px] font-semibold tracking-[4px] text-[#C6A34E] uppercase mb-3"
              variants={prefersReduced ? undefined : fadeUp(0.2)}
              initial="hidden"
              animate="visible"
            >
              TAP . ORDER . ENJOY
            </motion.p>

            {/* Headline — word-by-word reveal */}
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-[#1B2A4A] leading-none mb-5">
              <AnimatedText
                text="Your Restaurant."
                initialDelay={0.35}
                staggerDelay={0.07}
              />
              <br />
              <AnimatedText
                text="Running Itself."
                className="text-[#C6A34E]"
                initialDelay={0.6}
                staggerDelay={0.07}
              />
            </h1>

            {/* Subheadline */}
            <motion.p
              className="text-base sm:text-lg text-[#8B7355] leading-relaxed mb-8 max-w-lg"
              variants={prefersReduced ? undefined : fadeUp(0.75)}
              initial="hidden"
              animate="visible"
            >
              Guests scan, chat with your AI waiter, and order in seconds. Zero staff required. Zero missed orders. Pure revenue.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-wrap gap-3 mb-8"
              variants={prefersReduced ? undefined : staggerContainer(0.1)}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={prefersReduced ? undefined : scaleIn(0.85)}>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 h-12 px-6 text-base font-semibold rounded-xl bg-[#C6A34E] text-[#1B2A4A] hover:bg-[#A8873A] hover:text-white transition-colors shadow-md"
                >
                  Start Free — No Card Needed
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div variants={prefersReduced ? undefined : scaleIn(0.9)}>
                <Link
                  href="/table/1?restaurant=saffron-palace"
                  className="inline-flex items-center gap-2 h-12 px-6 text-base font-semibold rounded-xl bg-[#1B2A4A] text-white hover:bg-[#2A3D66] transition-colors shadow-md"
                >
                  <PlayCircle className="w-4 h-4" />
                  Try Live Demo
                </Link>
              </motion.div>
              <motion.div variants={prefersReduced ? undefined : scaleIn(0.95)}>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 h-12 px-6 text-base font-medium rounded-xl border border-[#F0E8D6] text-[#1B2A4A] bg-white/70 hover:bg-white transition-colors"
                >
                  See How It Works
                </a>
              </motion.div>
            </motion.div>

            {/* Stats row with CountUp */}
            <div className="grid grid-cols-2 sm:flex sm:gap-8 gap-4 pt-5 border-t border-[#F0E8D6]">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  variants={prefersReduced ? undefined : fadeUp(1.1 + i * 0.1)}
                  initial="hidden"
                  animate="visible"
                >
                  <div className={`font-display text-2xl sm:text-3xl ${s.color}`}>
                    <CountUp target={s.target} prefix={s.prefix} suffix={s.suffix} />
                  </div>
                  <div className="text-xs text-[#8B7355] mt-0.5">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Right: photo ──────────────────────────── */}
          <motion.div
            className="order-1 lg:order-2 flex justify-center lg:justify-end"
            variants={prefersReduced ? undefined : slideInRight(0.15)}
            initial="hidden"
            animate="visible"
          >
            <div className="relative w-full max-w-[520px]">

              {/* Main photo */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-[#1B2A4A]/20 border border-[#F0E8D6]">
                <Image
                  src="/photos/happy-owner.png"
                  alt="Happy restaurant owner using ServeMyTable — Happy Customers, Happy Owners"
                  width={520}
                  height={347}
                  className="w-full h-auto object-cover"
                  priority
                  sizes="(max-width: 640px) 95vw, (max-width: 1024px) 70vw, 520px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B2A4A]/20 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating badge — bottom left */}
              <div
                className="animate-float-bob absolute -bottom-4 left-4 sm:-left-4 bg-white rounded-2xl px-3 py-2.5 shadow-xl border border-[#F0E8D6] flex items-center gap-2.5"
                style={{ animationDelay: "0s" }}
              >
                <div className="w-9 h-9 rounded-xl bg-[#FAF6ED] flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-[#C6A34E]" />
                </div>
                <div>
                  <div className="font-display text-sm text-[#1B2A4A] leading-none">Zero App</div>
                  <div className="text-[10px] text-[#8B7355] mt-0.5">Just scan & order</div>
                </div>
              </div>

              {/* Floating badge — top right */}
              <div
                className="animate-float-bob absolute -top-4 right-4 sm:-right-4 bg-[#1B2A4A] rounded-2xl px-3 py-2.5 shadow-xl"
                style={{ animationDelay: "1.5s" }}
              >
                <div className="font-display text-lg text-[#C6A34E] leading-none">24/7</div>
                <div className="text-[10px] text-white/70 mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A56] inline-block animate-pulse shrink-0" />
                  AI Always On
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

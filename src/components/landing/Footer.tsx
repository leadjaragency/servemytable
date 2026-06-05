"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedSection from "./motion/AnimatedSection";
import { fadeIn, fadeUp, staggerContainer } from "./motion/MotionConfig";

export default function Footer() {
  const prefersReduced = useReducedMotion();

  return (
    <footer className="bg-[#141414] text-white py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection
          variants={prefersReduced ? undefined : staggerContainer(0.1)}
          threshold={0.05}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-white/10"
        >
          {/* Brand column */}
          <motion.div
            className="lg:col-span-2"
            variants={prefersReduced ? undefined : fadeUp()}
          >
            <Image
              src="/photos/logo-trimmed.png"
              alt="ServeMyTable — TAP . ORDER . ENJOY"
              width={220}
              height={57}
              className="h-12 w-auto object-contain mb-4"
              sizes="220px"
            />
            <p className="text-white/60 text-sm max-w-xs leading-relaxed mb-4">
              AI-powered virtual waiters for restaurants. From QR scan to Google review — we handle it all.
            </p>
            <div className="text-xs text-white/40 space-y-1">
              <p>hello@servemytable.ca</p>
              <p>servemytable.ca</p>
            </div>
          </motion.div>

          {/* Product links */}
          <motion.div variants={prefersReduced ? undefined : fadeUp()}>
            <h4 className="font-semibold text-sm mb-4 text-white/90 tracking-wide uppercase text-[11px] tracking-widest">Product</h4>
            <ul className="space-y-2.5 text-sm text-white/60">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#trial" className="hover:text-white transition-colors">Free Trial</a></li>
              <li><Link href="/auth/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
            </ul>
          </motion.div>

          {/* Account links */}
          <motion.div variants={prefersReduced ? undefined : fadeUp()}>
            <h4 className="font-semibold text-sm mb-4 text-white/90 text-[11px] tracking-widest uppercase">Account</h4>
            <ul className="space-y-2.5 text-sm text-white/60">
              <li><Link href="/auth/login" className="hover:text-white transition-colors">Restaurant Login</Link></li>
              <li><Link href="/auth/signup" className="hover:text-white transition-colors">Get Started</Link></li>
              <li><Link href="/auth/pending" className="hover:text-white transition-colors">Check Application</Link></li>
            </ul>
          </motion.div>
        </AnimatedSection>

        {/* Bottom bar */}
        <AnimatedSection
          variants={prefersReduced ? undefined : fadeIn(0.35)}
          threshold={0.05}
          className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/40"
        >
          <span>© 2026 ServeMyTable. All rights reserved. Powered by{" "}
            <a href="https://leadjar.ca" className="hover:text-white/70 transition-colors underline underline-offset-2">
              LeadJar Agency
            </a>.
          </span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-white/70 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white/70 transition-colors">Terms of Service</a>
          </div>
        </AnimatedSection>
      </div>
    </footer>
  );
}

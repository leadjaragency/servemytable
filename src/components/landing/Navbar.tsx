"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASING } from "./motion/MotionConfig";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0) setScrollProgress((window.scrollY / total) * 100);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "bg-[#131313]/95 backdrop-blur-md shadow-sm border-b border-[#2A2A2A]"
          : "bg-transparent"
      }`}
    >
      {/* Scroll progress bar */}
      {prefersReduced ? (
        <div
          className="absolute top-0 left-0 h-[3px] bg-[#C6A34E] origin-left"
          style={{ width: `${scrollProgress}%` }}
        />
      ) : (
        <motion.div
          className="absolute top-0 left-0 h-[3px] bg-[#C6A34E] origin-left w-full"
          style={{ scaleX: scrollProgress / 100 }}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/photos/logo-trimmed.png"
              alt="ServeMyTable — TAP . ORDER . ENJOY"
              width={210}
              height={54}
              className="h-11 w-auto object-contain"
              priority
              sizes="210px"
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#AD897E] hover:text-[#FAF6ED] transition-colors font-medium">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-[#AD897E] hover:text-[#FAF6ED] transition-colors font-medium">
              How It Works
            </a>
            <a href="#testimonials" className="text-sm text-[#AD897E] hover:text-[#FAF6ED] transition-colors font-medium">
              Reviews
            </a>
            <a href="#trial" className="text-sm text-[#AD897E] hover:text-[#FAF6ED] transition-colors font-medium">
              Free Trial
            </a>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-[#AD897E] hover:text-[#FAF6ED] transition-colors px-3 py-2 font-medium"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center h-9 px-4 text-sm font-semibold rounded-lg bg-[#C6A34E] text-[#FAF6ED] hover:bg-[#A8873A] hover:text-white transition-colors shadow-sm"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-[#FAF6ED] hover:bg-[#1A1A1A] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu — animated */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-menu"
              initial={prefersReduced ? false : { opacity: 0, y: -8, scaleY: 0.96 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -8, scaleY: 0.96 }}
              transition={{ duration: 0.2, ease: EASING.spring }}
              style={{ transformOrigin: "top" }}
              className="md:hidden border-t border-[#2A2A2A] bg-[#131313]/98 backdrop-blur-md py-4 flex flex-col gap-1"
            >
              <a href="#features" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 text-sm font-medium text-[#FAF6ED] hover:bg-[#0A0A0A] rounded-lg">
                Features
              </a>
              <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 text-sm font-medium text-[#FAF6ED] hover:bg-[#0A0A0A] rounded-lg">
                How It Works
              </a>
              <a href="#testimonials" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 text-sm font-medium text-[#FAF6ED] hover:bg-[#0A0A0A] rounded-lg">
                Reviews
              </a>
              <a href="#trial" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 text-sm font-medium text-[#FAF6ED] hover:bg-[#0A0A0A] rounded-lg">
                Free Trial
              </a>
              <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex flex-col gap-2 px-4">
                <Link href="/auth/login" className="py-2.5 text-sm text-center text-[#AD897E] hover:text-[#FAF6ED] font-medium">
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center h-11 px-4 text-sm font-semibold rounded-lg bg-[#C6A34E] text-[#FAF6ED] hover:bg-[#A8873A] hover:text-white transition-colors"
                >
                  Get Started Free
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

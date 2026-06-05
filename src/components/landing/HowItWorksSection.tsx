"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import AnimatedSection from "./motion/AnimatedSection";
import { fadeUp, scaleIn, staggerContainer, EASING } from "./motion/MotionConfig";

const steps = [
  {
    number: "01",
    image: "/photos/qr-scan-2.png",
    imageAlt: "Customer scanning QR code at restaurant table with food",
    title: "Guests Scan the QR Code",
    description:
      "A unique QR sits on every table. Guests scan it with any phone — no app, no friction. They are inside your AI waiter experience in under 5 seconds.",
  },
  {
    number: "02",
    image: "/photos/happy-customer-1.png",
    imageAlt: "Happy customers enjoying their meal at a restaurant",
    title: "AI Waiter Chats & Orders",
    description:
      "Your AI waiter greets them instantly, checks for allergies, recommends dishes naturally, upsells drinks and desserts, and confirms their order.",
  },
  {
    number: "03",
    image: "/photos/chef-orders.png",
    imageAlt: "Chef receiving orders directly on a tablet in the kitchen",
    title: "Orders Go Straight to Kitchen",
    description:
      "The moment guests confirm, orders hit the kitchen screen live. No middleman, no lost tickets. Chef taps Ready — guests see it on their phone instantly.",
  },
];

function StepsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="grid md:grid-cols-3 gap-6 lg:gap-8 relative"
      variants={prefersReduced ? undefined : staggerContainer(0.2)}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      {steps.map((step, i) => (
        <motion.div
          key={step.number}
          variants={prefersReduced ? undefined : fadeUp()}
          whileHover={prefersReduced ? undefined : { y: -4 }}
          transition={{ duration: 0.2 }}
          className="group flex flex-col rounded-2xl overflow-hidden border border-[#2A2A2A] bg-[#131313] shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          {/* Photo with step number overlay */}
          <div className="relative h-52 sm:h-56 overflow-hidden">
            <Image
              src={step.image}
              alt={step.imageAlt}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 95vw, (max-width: 1024px) 45vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 via-[#141414]/10 to-transparent" />

            {/* Step number */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <span className="font-display text-5xl text-[#C6A34E] leading-none drop-shadow-md">
                {step.number}
              </span>
            </div>

            {/* Connector arrow — animated */}
            {i < steps.length - 1 && (
              <motion.div
                className="hidden md:flex absolute top-1/2 -right-4 z-10 -translate-y-1/2 w-8 h-8 rounded-full bg-[#C6A34E] items-center justify-center shadow-md"
                initial={prefersReduced ? false : { scale: 0, opacity: 0 }}
                animate={inView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{ delay: 0.4 + i * 0.3, duration: 0.4, ease: EASING.snappy }}
              >
                <svg
                  className="w-4 h-4 text-[#FAF6ED]"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <motion.path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={prefersReduced ? false : { pathLength: 0, opacity: 0 }}
                    animate={inView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                    transition={{ delay: 0.6 + i * 0.3, duration: 0.3 }}
                  />
                </svg>
              </motion.div>
            )}
          </div>

          {/* Text content */}
          <div className="p-6 flex flex-col flex-1">
            <h3 className="font-display text-xl text-[#FAF6ED] mb-2">{step.title}</h3>
            <p className="text-sm text-[#AD897E] leading-relaxed flex-1">{step.description}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default function HowItWorksSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="how-it-works" className="py-20 bg-[#0A0A0A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <AnimatedSection className="text-center mb-14">
          <motion.p
            className="text-[11px] font-semibold text-[#C6A34E] uppercase tracking-[3px] mb-3"
            variants={prefersReduced ? undefined : fadeUp(0.0)}
            initial="hidden"
            animate="visible"
          >
            How It Works
          </motion.p>
          <motion.h2
            className="font-display text-4xl md:text-5xl text-[#FAF6ED] mb-4"
            variants={prefersReduced ? undefined : fadeUp(0.1)}
            initial="hidden"
            animate="visible"
          >
            Three steps. Thirty minutes. Done.
          </motion.h2>
          <motion.p
            className="text-[#AD897E] text-base md:text-lg max-w-xl mx-auto leading-relaxed"
            variants={prefersReduced ? undefined : fadeUp(0.2)}
            initial="hidden"
            animate="visible"
          >
            No hardware. No training. No app downloads. Just print one QR code — and your AI waiter is ready.
          </motion.p>
        </AnimatedSection>

        <StepsSection />

        {/* Bottom trust note */}
        <AnimatedSection className="text-center mt-10" variants={scaleIn(0.2)}>
          <p className="text-sm text-[#AD897E]">
            <span className="text-[#C6A34E] font-semibold">Setup takes under 30 minutes.</span>{" "}
            No hardware. No IT department. Just your menu and a printer.
          </p>
        </AnimatedSection>

      </div>
    </section>
  );
}

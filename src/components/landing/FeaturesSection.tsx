"use client";

import Image from "next/image";
import { MessageSquare, ShieldCheck, QrCode, Gamepad2, BarChart3, Globe } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedSection from "./motion/AnimatedSection";
import { fadeUp, scaleIn, staggerContainer } from "./motion/MotionConfig";

const features = [
  {
    icon: MessageSquare,
    title: "AI Waiter Chat",
    description:
      "Natural conversation in 14 languages. Guests chat just like messaging a friend — no learning curve, no app download.",
    iconColor: "#C6A34E",
    iconBg: "#FEF3E2",
  },
  {
    icon: ShieldCheck,
    title: "Allergen Safety First",
    description:
      "Never recommends a dish that conflicts with stated allergies. Flags every relevant item proactively — your guests stay safe.",
    iconColor: "#C04525",
    iconBg: "#FDE8EC",
  },
  {
    icon: QrCode,
    title: "QR Code Ordering",
    description:
      "No app download required. Guests scan, chat, and order in under 60 seconds from any smartphone.",
    iconColor: "#2D8A56",
    iconBg: "#E6F5EC",
  },
  {
    icon: Gamepad2,
    title: "Guest Entertainment",
    description:
      "Spin wheel, food trivia, and bill estimator reduce wait frustration — and earn guests discount rewards on their bill.",
    iconColor: "#4F46E5",
    iconBg: "#EEF2FF",
  },
  {
    icon: BarChart3,
    title: "Live Admin Dashboard",
    description:
      "Real-time orders, revenue tracking, and AI conversation analytics all in one dashboard. Know your restaurant inside out.",
    iconColor: "#0891B2",
    iconBg: "#E0F7FA",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description:
      "English, Hindi, French, Spanish, Arabic, Mandarin, and 8 more. Serve every guest in their preferred language.",
    iconColor: "#7C3AED",
    iconBg: "#F3EFFE",
  },
];

const proofImages = [
  {
    src: "/photos/happy-customer-2.png",
    alt: "Groups of happy customers enjoying their evening at a restaurant",
    label: "Happy Guests",
    stat: "Every Night",
  },
  {
    src: "/photos/analytics.png",
    alt: "Restaurant food analytics and sales charts",
    label: "Smart Analytics",
    stat: "Real-Time",
  },
  {
    src: "/photos/review.png",
    alt: "Customer leaving a 5-star review on their phone",
    label: "Auto Reviews",
    stat: "5-Star Results",
  },
];

export default function FeaturesSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="features" className="py-20 bg-[#131313]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <AnimatedSection className="text-center mb-14">
          <motion.p
            className="text-[11px] font-semibold text-[#C6A34E] uppercase tracking-[3px] mb-3"
            variants={prefersReduced ? undefined : fadeUp(0.0)}
            initial="hidden"
            animate="visible"
          >
            What&apos;s Inside
          </motion.p>
          <motion.h2
            className="font-display text-4xl md:text-5xl text-[#FAF6ED] mb-4"
            variants={prefersReduced ? undefined : fadeUp(0.1)}
            initial="hidden"
            animate="visible"
          >
            One Platform. Zero Chaos.
          </motion.h2>
          <motion.p
            className="text-[#AD897E] text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
            variants={prefersReduced ? undefined : fadeUp(0.2)}
            initial="hidden"
            animate="visible"
          >
            One platform to run your front-of-house — from the moment guests scan the QR code to the final bill.
          </motion.p>
        </AnimatedSection>

        {/* Feature grid */}
        <AnimatedSection
          variants={prefersReduced ? undefined : staggerContainer(0.08)}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={prefersReduced ? undefined : scaleIn()}
                whileHover={prefersReduced ? undefined : { y: -4, boxShadow: "0 12px 40px rgba(198,163,78,0.15)" }}
                transition={{ duration: 0.2 }}
                className="group p-6 rounded-2xl border border-[#2A2A2A] hover:border-[#C6A34E]/30 transition-colors duration-200 bg-[#131313] cursor-default"
              >
                <motion.div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: feature.iconBg }}
                  whileHover={prefersReduced ? undefined : { rotate: [0, -8, 8, 0], scale: 1.1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Icon className="w-5 h-5" style={{ color: feature.iconColor }} />
                </motion.div>
                <h3 className="font-display text-xl text-[#FAF6ED] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#AD897E] leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </AnimatedSection>

        {/* Visual proof strip */}
        <div className="mt-16">
          <AnimatedSection className="text-center mb-6">
            <p className="text-[11px] font-semibold text-[#C6A34E] uppercase tracking-[3px]">
              In the Wild
            </p>
          </AnimatedSection>
          <AnimatedSection
            variants={prefersReduced ? undefined : staggerContainer(0.12)}
            className="grid sm:grid-cols-3 gap-4"
          >
            {proofImages.map((img) => (
              <motion.div
                key={img.label}
                variants={prefersReduced ? undefined : scaleIn()}
                whileHover={prefersReduced ? undefined : { scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="group relative rounded-2xl overflow-hidden h-52 sm:h-60 shadow-sm border border-[#2A2A2A]"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 95vw, (max-width: 1024px) 45vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-[#141414]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="font-display text-xl text-white leading-none">{img.label}</div>
                  <div className="text-[11px] text-[#C6A34E] font-semibold mt-1 tracking-wider">{img.stat}</div>
                </div>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>

      </div>
    </section>
  );
}

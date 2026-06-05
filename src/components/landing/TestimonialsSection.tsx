"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedSection from "./motion/AnimatedSection";
import { fadeIn, fadeUp, scaleIn, slideInLeft, slideInRight, staggerContainer } from "./motion/MotionConfig";

const testimonials = [
  {
    name: "Raj Malhotra",
    restaurant: "Spice Garden, Toronto",
    stars: 5,
    avatar: "👨‍🍳",
    quote:
      "Our guests love chatting with the AI waiter. Allergen questions used to slow down my team every service — now guests get instant, accurate answers before they even order.",
  },
  {
    name: "Sarah Chen",
    restaurant: "The Golden Bowl, Vancouver",
    stars: 5,
    avatar: "👩‍🍳",
    quote:
      "Setup took 20 minutes. Within the first week, our table turn time dropped noticeably because guests were already browsing and chatting before our staff even arrived.",
  },
  {
    name: "Priya Nair",
    restaurant: "Coconut Grove, Calgary",
    stars: 5,
    avatar: "🧑‍🍳",
    quote:
      "The games feature is brilliant. Families with kids love the spin wheel, and we have seen a real uptick in dessert orders from the discount prizes guests win.",
  },
];

export default function TestimonialsSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="testimonials" className="py-20 bg-[#0A0A0A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Visual header strip */}
        <AnimatedSection
          variants={prefersReduced ? undefined : fadeIn()}
          threshold={0.1}
          className="relative rounded-3xl overflow-hidden mb-14 h-52 sm:h-64"
        >
          <Image
            src="/photos/happy-customer-2.png"
            alt="Happy customers enjoying an evening at a restaurant"
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 95vw, (max-width: 1280px) 90vw, 1152px"
          />
          <div className="absolute inset-0 bg-[#141414]/65" />

          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <motion.p
              className="text-[11px] font-semibold text-[#C6A34E] uppercase tracking-[3px] mb-3"
              variants={prefersReduced ? undefined : fadeUp(0.2)}
              initial="hidden"
              animate="visible"
            >
              Real Owners. Real Results.
            </motion.p>
            <motion.h2
              className="font-display text-4xl sm:text-5xl text-white mb-2"
              variants={prefersReduced ? undefined : fadeUp(0.35)}
              initial="hidden"
              animate="visible"
            >
              What Restaurant Owners Say
            </motion.h2>
            <motion.p
              className="text-white/70 text-sm sm:text-base max-w-md leading-relaxed"
              variants={prefersReduced ? undefined : fadeUp(0.5)}
              initial="hidden"
              animate="visible"
            >
              Hear from owners who transformed their dining experience.
            </motion.p>
          </div>
        </AnimatedSection>

        {/* Testimonial cards */}
        <AnimatedSection
          variants={prefersReduced ? undefined : staggerContainer(0.15)}
          className="grid md:grid-cols-3 gap-5"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={prefersReduced ? undefined : fadeUp()}
              whileHover={prefersReduced ? undefined : { y: -6, boxShadow: "0 20px 60px rgba(27,42,74,0.12)" }}
              transition={{ duration: 0.2 }}
              className="bg-[#131313] rounded-2xl p-6 border border-[#2A2A2A] shadow-sm flex flex-col relative"
            >
              {/* Decorative quote mark */}
              <motion.span
                className="absolute -top-3 -left-1 text-[#C6A34E]/15 font-display text-8xl leading-none select-none pointer-events-none"
                variants={prefersReduced ? undefined : fadeIn(0.1)}
                initial="hidden"
                animate="visible"
              >
                &ldquo;
              </motion.span>

              {/* Stars */}
              <motion.div
                className="flex gap-0.5 mb-4"
                variants={prefersReduced ? undefined : staggerContainer(0.05)}
                initial="hidden"
                animate="visible"
              >
                {Array.from({ length: t.stars }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="text-[#C6A34E] text-base"
                    variants={prefersReduced ? undefined : scaleIn()}
                  >
                    ★
                  </motion.span>
                ))}
              </motion.div>

              {/* Quote */}
              <p className="text-[#FAF6ED] text-sm leading-relaxed mb-6 italic flex-1 relative z-10">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center text-xl shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#FAF6ED]">{t.name}</div>
                  <div className="text-xs text-[#AD897E]">{t.restaurant}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatedSection>

        {/* Review CTA strip */}
        <AnimatedSection
          variants={prefersReduced ? undefined : fadeUp(0.1)}
          className="mt-10 rounded-2xl overflow-hidden border border-[#2A2A2A]"
        >
          <div className="grid sm:grid-cols-2 items-center">
            {/* Image side */}
            <motion.div
              className="relative h-48 sm:h-full min-h-[160px]"
              variants={prefersReduced ? undefined : slideInLeft(0.1)}
              initial="hidden"
              animate="visible"
            >
              <Image
                src="/photos/review.png"
                alt="Customer leaving a 5-star restaurant review on their phone"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 95vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#141414]/10" />
            </motion.div>
            {/* Text side */}
            <motion.div
              className="bg-[#141414] p-6 sm:p-8"
              variants={prefersReduced ? undefined : slideInRight(0.2)}
              initial="hidden"
              animate="visible"
            >
              <div className="font-display text-3xl sm:text-4xl text-[#C6A34E] mb-2">Auto Google Reviews</div>
              <p className="text-white/70 text-sm leading-relaxed mb-4">
                After every meal, ServeMyTable prompts happy guests to leave a Google review. More reviews, higher ranking, more customers.
              </p>
              <motion.div
                className="flex gap-0.5"
                variants={prefersReduced ? undefined : staggerContainer(0.08)}
                initial="hidden"
                animate="visible"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="text-[#C6A34E] text-lg"
                    variants={prefersReduced ? undefined : scaleIn()}
                  >
                    ★
                  </motion.span>
                ))}
                <span className="text-white/50 text-sm ml-2 self-center">· Free marketing</span>
              </motion.div>
            </motion.div>
          </div>
        </AnimatedSection>

      </div>
    </section>
  );
}

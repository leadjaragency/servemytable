import Link from "next/link";

const tiers = [
  {
    name: "Basic",
    price: 99,
    limits: ["15 tables", "1 AI waiter", "2 team members"],
    features: [
      "Menu management",
      "QR code generation",
      "Live order feed",
      "Basic analytics",
    ],
    popular: false,
  },
  {
    name: "Standard",
    price: 199,
    limits: ["50 tables", "3 AI waiters", "5 team members"],
    features: [
      "Everything in Basic",
      "Guest games & rewards",
      "Advanced analytics",
      "POS integration",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Premium",
    price: 399,
    limits: ["Unlimited tables", "Unlimited waiters", "Unlimited team"],
    features: [
      "Everything in Standard",
      "Custom AI personality",
      "API access",
      "White-glove onboarding",
      "Dedicated account manager",
    ],
    popular: false,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-[#131313]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-[#C6A34E] uppercase tracking-wider mb-3">
            Pricing
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-[#FAF6ED] mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-[#AD897E] text-lg">
            No setup fees. No hidden charges. Cancel anytime.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 border-2 transition-shadow ${
                tier.popular
                  ? "border-[#C6A34E] shadow-xl shadow-[#C6A34E]/10"
                  : "border-[#E8DFD0] hover:shadow-md"
              }`}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#C6A34E] text-[#FAF6ED] text-xs font-bold rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}

              {/* Tier name + price */}
              <div className="mb-6">
                <h3 className="font-display text-xl text-[#FAF6ED] mb-2">{tier.name}</h3>
                <div className="flex items-end gap-1">
                  <span className="font-display text-4xl font-bold text-[#FAF6ED]">
                    ${tier.price}
                  </span>
                  <span className="text-[#AD897E] pb-1 text-sm">/month</span>
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-2 mb-6 pb-6 border-b border-[#E8DFD0]">
                {tier.limits.map((limit) => (
                  <div key={limit} className="flex items-center gap-2 text-sm text-[#FAF6ED]">
                    <span className="text-[#C6A34E] font-bold">✓</span>
                    {limit}
                  </div>
                ))}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#AD897E]">
                    <span className="text-[#1B8C3A] mt-0.5 shrink-0">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/auth/signup"
                className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                  tier.popular
                    ? "bg-[#C6A34E] text-[#FAF6ED] hover:bg-[#A8873A] hover:text-white"
                    : "border border-[#E8DFD0] text-[#FAF6ED] hover:bg-[#0A0A0A]"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        {/* Trust note */}
        <p className="text-center text-sm text-[#AD897E] mt-8">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}

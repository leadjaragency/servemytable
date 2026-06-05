"use client";

import { useCustomer } from "@/lib/CustomerContext";
import { Loader2, Clock, Phone, Mail, MapPin, Utensils } from "lucide-react";

export default function AboutPage() {
  const { restaurant, waiter, loading, error } = useCustomer();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cu-bg">
        <Loader2 className="h-8 w-8 animate-spin text-cu-accent" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cu-bg px-6 text-center">
        <p className="text-cu-text/60">{error ?? "Restaurant not found."}</p>
      </div>
    );
  }

  const hours = restaurant.hours as { open?: string; close?: string } | null;

  function fmt12(t?: string) {
    if (!t) return "";
    const [hStr, mStr] = t.split(":");
    const h    = parseInt(hStr, 10);
    const m    = parseInt(mStr, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  return (
    <div className="min-h-dvh bg-cu-bg pb-32">
      {/* Hero banner */}
      <div className="bg-gradient-to-b from-cu-accent/15 to-cu-bg px-6 pb-8 pt-10 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-cu-accent/15 text-4xl">
          🍽️
        </div>
        <h1 className="font-display text-3xl font-bold text-cu-text">{restaurant.name}</h1>
        {restaurant.tagline && (
          <p className="mt-2 max-w-xs mx-auto text-sm text-cu-text/60 leading-relaxed">
            {restaurant.tagline}
          </p>
        )}
        <span className="mt-3 inline-block rounded-full border border-cu-accent/20 bg-cu-accent/10 px-3 py-1 text-xs font-medium text-cu-accent">
          {restaurant.cuisine}
        </span>
      </div>

      <div className="mx-auto max-w-md px-5 space-y-5">
        {/* Story */}
        <div className="rounded-2xl border border-cu-border bg-cu-surface p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-cu-accent" />
            <h2 className="font-display text-base font-semibold text-cu-text">Our Story</h2>
          </div>
          <p className="text-sm text-cu-text/70 leading-relaxed">
            Welcome to {restaurant.name}! We bring you the authentic flavors of{" "}
            {restaurant.cuisine.toLowerCase()} cuisine, crafted with passion and the finest
            ingredients. Every dish tells a story — we hope you enjoy the experience as much as we
            enjoy creating it for you.
          </p>
        </div>

        {/* Hours */}
        {hours && (hours.open || hours.close) && (
          <div className="rounded-2xl border border-cu-border bg-cu-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-cu-accent" />
              <h2 className="font-display text-base font-semibold text-cu-text">Opening Hours</h2>
            </div>
            <div className="space-y-2 text-sm">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                <div key={day} className="flex justify-between">
                  <span className="text-cu-text/60">{day}</span>
                  <span className="font-medium text-cu-text">
                    {fmt12(hours.open)} — {fmt12(hours.close)}
                  </span>
                </div>
              ))}
              <div className="mt-1 border-t border-cu-border pt-2">
                {["Saturday", "Sunday"].map((day) => (
                  <div key={day} className="flex justify-between mt-1">
                    <span className="text-cu-text/60">{day}</span>
                    <span className="font-medium text-cu-text">
                      {fmt12(hours.open)} — {fmt12(hours.close)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        {(restaurant.phone || restaurant.email || restaurant.address) && (
          <div className="rounded-2xl border border-cu-border bg-cu-surface p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-cu-text">Contact Us</h2>
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="flex items-center gap-3 rounded-xl border border-cu-border px-4 py-3 transition-colors hover:bg-cu-accent/5"
              >
                <Phone className="h-4 w-4 shrink-0 text-cu-accent" />
                <span className="text-sm text-cu-text">{restaurant.phone}</span>
              </a>
            )}
            {restaurant.email && (
              <a
                href={`mailto:${restaurant.email}`}
                className="flex items-center gap-3 rounded-xl border border-cu-border px-4 py-3 transition-colors hover:bg-cu-accent/5"
              >
                <Mail className="h-4 w-4 shrink-0 text-cu-accent" />
                <span className="text-sm text-cu-text">{restaurant.email}</span>
              </a>
            )}
            {restaurant.address && (
              <div className="flex items-start gap-3 rounded-xl border border-cu-border px-4 py-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cu-accent" />
                <span className="text-sm text-cu-text">{restaurant.address}</span>
              </div>
            )}
          </div>
        )}

        {/* AI Waiter profile */}
        {waiter && (
          <div className="rounded-2xl border border-cu-border bg-cu-surface p-5">
            <h2 className="font-display text-base font-semibold text-cu-text mb-3">Your AI Waiter</h2>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cu-accent/10 text-3xl">
                {waiter.avatar}
              </div>
              <div>
                <p className="font-semibold text-cu-text">{waiter.name}</p>
                <p className="text-sm capitalize text-cu-text/60">
                  {waiter.personality} · {waiter.tone}
                </p>
                {waiter.languages.length > 0 && (
                  <p className="mt-0.5 text-xs text-cu-text/50">
                    Speaks: {waiter.languages.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer branding */}
        <div className="py-4 text-center">
          <p className="text-xs text-cu-text/30">
            Powered by <span className="font-semibold text-cu-accent/80">ServeMyTable</span> · AI Virtual Waiter
          </p>
        </div>
      </div>
    </div>
  );
}

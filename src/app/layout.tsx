import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Montserrat, JetBrains_Mono, Inter, Playfair_Display } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "ServeMyTable — TAP . ORDER . ENJOY",
    template: "%s | ServeMyTable",
  },
  description:
    "ServeMyTable gives restaurants an AI-powered virtual waiter that chats with diners, takes orders, answers questions, and handles allergens — all via a QR code scan. No app download needed.",
  keywords: ["AI waiter", "restaurant technology", "QR menu", "virtual waiter", "food ordering", "ServeMyTable"],
  authors: [{ name: "ServeMyTable" }],
  creator: "LeadJar Agency",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "ServeMyTable",
    title: "ServeMyTable — TAP . ORDER . ENJOY",
    description: "AI-powered virtual waiters for restaurants. Scan. Order. Enjoy.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0A0A0A",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${bebasNeue.variable} ${montserrat.variable} ${jetbrainsMono.variable} ${inter.variable} ${playfairDisplay.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <MotionConfig reducedMotion="user">
            {children}
          </MotionConfig>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

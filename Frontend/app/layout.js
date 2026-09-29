import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import AuthProvider from "@/components/AuthProvider";
import SocketProvider from "@/components/SocketProvider";
import AppChrome from "@/components/motion/AppChrome";

// Design spec §3: Inter is the preferred family for the soft-neumorphic UI.
// Geist_Mono stays for hashes, addresses and other monospace readouts.
const inter = Inter({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ArkCare",
  description: "Your personalized healthcare companion",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
        <div className="ark-shell">
          {/* AppChrome owns the ambient layer and scroll-progress rail so they
              mount once for the whole app and never restart on navigation. */}
          <AppChrome>
            <div className="ark-content">
              <AuthProvider>
                <SocketProvider>{children}</SocketProvider>
              </AuthProvider>
            </div>
          </AppChrome>
        </div>
      </body>
    </html>
  );
}

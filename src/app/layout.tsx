import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./nine.css";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Nine Housing",
    default: "Nine Housing – Căn hộ Ba Đình, Tây Hồ, Hà Nội | Live your way",
  },
  description: "Căn hộ Nine Housing tại Ba Đình và Tây Hồ, Hà Nội: yên tĩnh, tiện nghi như ở nhà, hỗ trợ 24/7. Studio đến 3 phòng ngủ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Contract Review - Kiểm tra hợp đồng",
  description: "AI-powered contract review against Vietnamese law",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={cn("font-sans antialiased", inter.variable)}>
      <body>{children}</body>
    </html>
  );
}

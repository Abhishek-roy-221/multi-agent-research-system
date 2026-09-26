import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResearchMind",
  description:
    "AI-powered research assistant that searches, reads, writes, and reviews research.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
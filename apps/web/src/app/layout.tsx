import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AnalysisProvider } from "@/context/analysis-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resume Analyzer",
  description: "Upload a resume, extract a candidate skill profile, and generate tiered interview questions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AnalysisProvider>{children}</AnalysisProvider>
      </body>
    </html>
  );
}

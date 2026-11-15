import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseWatch | Website & API Monitoring Platform",
  description: "Real-time availability monitoring, heartbeat analytics, incident management, and public status pages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0e14] text-slate-100 antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}

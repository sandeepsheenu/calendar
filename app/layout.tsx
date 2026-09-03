import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FocusCal — Calendar & Task Planner",
  description:
    "Plan tasks, follow-ups, deadlines, daily targets, and protected time blocks from one monthly calendar.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

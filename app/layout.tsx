import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Morning Briefing · Hawks & Doves",
  description: "Daily financial morning briefing for the Hawks & Doves intern cohort",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

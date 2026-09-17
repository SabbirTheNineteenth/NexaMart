import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NexaMart — Things worth keeping",
  description: "A considered commerce experience.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

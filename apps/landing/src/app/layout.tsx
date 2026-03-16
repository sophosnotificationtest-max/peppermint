// apps/landing/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Se Fathom não existir, comente ou remova esta linha
// import Fathom from "@/component/Fathom";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Peppermint",
  description: "Open Source Ticket Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* {typeof window !== "undefined" && <Fathom />} */}
        {children}
      </body>
    </html>
  );
}

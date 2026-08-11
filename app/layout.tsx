import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vânia Festas Pro",
    template: "%s | Vânia Festas Pro",
  },
  description:
    "Locação de materiais para festas, casamentos, formaturas, kits pegue e monte e muito mais.",
  keywords: [
    "locação de festas",
    "decoração",
    "casamento",
    "formatura",
    "pegue e monte",
    "Vânia Festas",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

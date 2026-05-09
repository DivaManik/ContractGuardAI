import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "./components/Toast";
import SolanaWalletProvider from "./components/WalletProvider";
import ThemeProvider from "./components/ThemeProvider";
import LanguageProvider from "./components/LanguageProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ContractGuard AI — Contracts Secured.",
  description:
    "AI Agent + Solana Blockchain for contract audit and project monitoring. Detect price markups, verify work, and record everything on-chain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>
        <LanguageProvider>
          <ThemeProvider>
            <SolanaWalletProvider>
              {children}
              <ToastContainer />
            </SolanaWalletProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

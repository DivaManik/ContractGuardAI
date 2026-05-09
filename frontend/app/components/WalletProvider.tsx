"use client";
import { useMemo, useState, useContext, createContext, useCallback } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import WalletModal from "./WalletModal";

// ── Custom modal context (replaces @solana/wallet-adapter-react-ui modal) ──
interface WalletModalCtx { setVisible: (v: boolean) => void; }
export const WalletModalContext = createContext<WalletModalCtx>({ setVisible: () => {} });
export const useWalletModal = () => useContext(WalletModalContext);

function CustomModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const close = useCallback(() => setVisible(false), []);

  return (
    <WalletModalContext.Provider value={{ setVisible }}>
      {children}
      <WalletModal open={visible} onClose={close} />
    </WalletModalContext.Provider>
  );
}

export default function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl(network),
    [network]
  );
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <CustomModalProvider>
          {children}
        </CustomModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

interface PhantomSolanaProvider {
  connect(): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
}

interface PhantomEthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

interface PhantomBitcoinProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

interface Phantom {
  solana?: PhantomSolanaProvider;
  ethereum?: PhantomEthereumProvider;
  bitcoin?: PhantomBitcoinProvider;
}

declare global {
  interface Window {
    phantom?: Phantom;
    solana?: PhantomSolanaProvider;
    ethereum?: PhantomEthereumProvider;
  }
}

export {};

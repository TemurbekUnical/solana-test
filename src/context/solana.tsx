import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, ParsedTransactionWithMeta } from '@solana/web3.js';

const NETWORK = "https://api.devnet.solana.com";

interface SolanaWindow extends Window {
  solana?: {
    isPhantom?: boolean;
    connect: (params: { onlyIfTrusted: boolean }) => Promise<{ publicKey: PublicKey }>;
    signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
  };
}

declare const window: SolanaWindow;

export default function SolanaIntegration() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransactionWithMeta[]>([]);

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          );
          setWalletAddress(response.publicKey.toString());
          getBalance(response.publicKey);
          getAllTransactions(response.publicKey);
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect({ onlyIfTrusted: false });
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
      getBalance(response.publicKey);
      getAllTransactions(response.publicKey);
    }
  };

  const getBalance = async (publicKey: PublicKey) => {
    try {
      const connection = new Connection(NETWORK, "confirmed");
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error getting balance:', error);
    }
  };

  const getAllTransactions = async (publicKey: PublicKey) => {
    try {
      const connection = new Connection(NETWORK, "confirmed");
      const signatures = await connection.getSignaturesForAddress(publicKey);
      
      const transactions = await Promise.all(
        signatures.map(sig => connection.getParsedTransaction(sig.signature))
      );

      setTransactions(transactions.filter((tx): tx is ParsedTransactionWithMeta => tx !== null));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const sendTransaction = async () => {
    if (!walletAddress) return;

    try {
      const connection = new Connection(NETWORK, "confirmed");
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(walletAddress),
          toPubkey: new PublicKey(walletAddress), // Sending to self for demo
          lamports: 0.1 * LAMPORTS_PER_SOL
        })
      );
      
      const { solana } = window;
      
      if (!solana) {
        alert("Please install Phantom wallet");
        return;
      }
      
      const { signature } = await solana.signAndSendTransaction(transaction);
      await connection.confirmTransaction(signature);
      
      console.log('Transaction sent:', signature);
      getBalance(new PublicKey(walletAddress));
      getAllTransactions(new PublicKey(walletAddress));
    } catch (error) {
      console.error('Error sending transaction:', error);
    }
  };

  return (
    <div>
      <h1>Solana Wallet Integration</h1>
      {!walletAddress && (
        <button onClick={connectWallet}>Connect to Phantom Wallet</button>
      )}
      {walletAddress && (
        <div>
          <p>Connected wallet: {walletAddress}</p>
          <p>Balance: {balance} SOL</p>
          <button onClick={sendTransaction}>Send 0.1 SOL to self (demo)</button>
          <h2>Recent Transactions</h2>
          <ul>
            {transactions.map((tx, index) => (
              <li key={index}>
                Signature: {tx.transaction.signatures[0]}
                <br />
                Block Time: {tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
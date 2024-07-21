import { ethers } from "ethers";
import { createContext, useCallback, useEffect, useState } from "react";
import { contractABI, contractAddress } from "../utils/constants";
import {
  Connection,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const createEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionsContract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  );

  return transactionsContract;
};
const { ethereum } = window as any;

const NETWORK = "https://api.devnet.solana.com";

interface SolanaWindow extends Window {
  solana?: {
    isPhantom?: boolean;
    connect: (params: {
      onlyIfTrusted: boolean;
    }) => Promise<{ publicKey: PublicKey }>;
    signAndSendTransaction: (
      transaction: Transaction
    ) => Promise<{ signature: string }>;
  };
}

declare const window: SolanaWindow;

const useTransactions = () => {
  const [formData, setformData] = useState({
    addressTo: "",
    amount: "",
    keyword: "",
    message: "",
  });
  const [currentAccount, setCurrentAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
  );
  const [transactions, setTransactions] = useState<ParsedTransactionWithMeta[]>(
    []
  );

  const handleChange = (e: any, name: string) => {
    setformData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const getAllTransactions = async (publicKey: PublicKey) => {
    try {
      const connection = new Connection(NETWORK, "confirmed");
      const signatures = await connection.getSignaturesForAddress(publicKey);

      const transactions = await Promise.all(
        signatures.map((sig) => connection.getParsedTransaction(sig.signature))
      );

      setTransactions(
        transactions.filter(
          (tx): tx is ParsedTransactionWithMeta => tx !== null
        )
      );
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const getAccountBalance = async (publicKey: PublicKey) => {
    try {
      const connection = new Connection(NETWORK, "confirmed");
      const balance = await connection.getBalance(publicKey);
      setBalance(String(balance / LAMPORTS_PER_SOL));
    } catch (error) {
      console.error("Error getting balance:", error);
    }
  };

  const checkIfWalletIsConnect = async () => {
    try {
      const { solana } = window;
      debugger;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Connected with Public Key:",
            response.publicKey.toString()
          );
          setCurrentAccount(response.publicKey.toString());
          getAccountBalance(response.publicKey);
          getAllTransactions(response.publicKey);
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (error) {
      console.error(error);
    }
  };
  const checkIfTransactionsExists = async () => {
    try {
      if (ethereum) {
        const transactionsContract = createEthereumContract();
        const currentTransactionCount =
          await transactionsContract.getTransactionCount();

        window.localStorage.setItem(
          "transactionCount",
          currentTransactionCount
        );
      }
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object");
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect({ onlyIfTrusted: false });
      console.log("Connected with Public Key:", response.publicKey.toString());
      setCurrentAccount(response.publicKey.toString());
      getAccountBalance(response.publicKey);
      getAllTransactions(response.publicKey);
    }
  };

  const sendTransaction = async () => {
    if (!currentAccount) return;

    try {
      const connection = new Connection(NETWORK, "confirmed");
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(currentAccount),
          toPubkey: new PublicKey(currentAccount), // Sending to self for demo
          lamports: 0.1 * LAMPORTS_PER_SOL,
        })
      );

      const { solana } = window;

      if (!solana) {
        alert("Please install Phantom wallet");
        return;
      }

      const { signature } = await solana.signAndSendTransaction(transaction);
      await connection.confirmTransaction(signature);

      console.log("Transaction sent:", signature);
      getAccountBalance(new PublicKey(currentAccount));
      getAllTransactions(new PublicKey(currentAccount));
    } catch (error) {
      console.error("Error sending transaction:", error);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnect();
    checkIfTransactionsExists();
  }, [transactionCount]);
  return {
    transactionCount,
    connectWallet,
    transactions,
    currentAccount,
    balance,
    isLoading,
    sendTransaction,
    handleChange,
    formData,
  };
};
export const TransactionContext = createContext<
  ReturnType<typeof useTransactions>
>({} as any);

export const TransactionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const value = useTransactions();

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};

import { useEffect, useState } from "react";
import "./App.css";
import {
  initPolkadotClient,
  getClient,
  getWestendApi,
} from "./lib/papi/client";
import { enableExtensions, getInjectedAccounts } from "./lib/papi/wallet";
import { MultiAddress } from "@polkadot-api/descriptors";
import { formatWnd, parseWnd } from "./lib/units";
import { toast } from "react-toastify";

function App() {
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accounts, setAccounts] = useState<
    { address: string; name?: string }[]
  >([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [finalized, setFinalized] = useState<{
    number: number;
    hash: string;
  } | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [txState, setTxState] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<string>("");
  const [amountWnd, setAmountWnd] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined;
    (async () => {
      await initPolkadotClient();
      const client = getClient();
      sub = client.finalizedBlock$.subscribe(
        (b: { number: number; hash: string }) =>
          setFinalized({ number: b.number, hash: b.hash })
      );
      setIsReady(true);
      setChainName("Westend");

      console.log("client initialized");
      try {
        await enableExtensions();
        const accs = await getInjectedAccounts();
        setAccounts(accs);
        console.log("wallet extensions enabled, accounts=", accs.length);
        if (!selected && accs.length > 0) {
          setSelected(accs[0].address);
          console.log("wallet auto-selected", accs[0].address);
        }
      } catch {
        console.error("wallet extensions enable failed");
      }
    })();
    return () => {
      if (sub) sub.unsubscribe();
    };
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await enableExtensions();
      const accs = await getInjectedAccounts();
      setAccounts(accs);
      setSelected(accs[0]?.address);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (!selected || !isReady) return;
      console.log("[balance] fetching for", selected);
      const api = getWestendApi();
      const info = await api.query.System.Account.getValue(selected);
      const free = info.data.free;
      setBalance(`${formatWnd(free)} WND`);
      console.log("balance free", String(free));
    })();
  }, [selected, isReady]);

  const handleTransfer = async () => {
    if (!selected) return;
    try {
      setTxState("Signing…");
      const api = getWestendApi();
      const value = parseWnd(amountWnd.trim());
      const dest = recipient.trim();
      const tx = api.tx.Balances.transfer_allow_death({
        dest: MultiAddress.Id(dest),
        value,
      });
      const { getPapiSignerForAddress } = await import("./lib/papi/wallet");

      const signer = await getPapiSignerForAddress(selected);
      tx.signSubmitAndWatch(signer).subscribe({
        next: (evt: { type: string } & { txHash?: string }) => {
          setTxState(evt.type);
          if (evt.txHash) setTxHash(evt.txHash);
          if (evt.type === "txBestBlocksState")
            toast.info("Transaction is in a best block");
        },
        error: (e: unknown) => {
          setTxState("Error: " + String(e));
          toast.error("Transaction failed");
        },
        complete: () => {
          setTxState("Finalized");
          toast.success("Transaction finalized");
        },
      });
    } catch (e) {
      setTxState("Error: " + String(e));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full px-6">
        <h1 className="text-center">Polkadot Wallet Dashboard (PAPI)</h1>
        <div className="flex items-center justify-center gap-12 flex-wrap mb-3">
          {accounts.length === 0 ? (
            <button disabled={!isReady || isConnecting} onClick={handleConnect}>
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          ) : (
            <span>
              Wallet connected
              {selected && (
                <>
                  {" "}
                  | {selected.slice(0, 6)}…{selected.slice(-6)}{" "}
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(selected);
                        toast.success("Address copied");
                      } catch {
                        toast.error("Copy failed");
                      }
                    }}
                  >
                    Copy
                  </button>
                </>
              )}
            </span>
          )}
          <span>{chainName ? `Network: ${chainName}` : "Network: …"}</span>
          <span>
            {finalized ? `Finalized #${finalized.number}` : "Finalized: …"}
          </span>
        </div>

        <div className="mt-4">
          <label>
            Account:
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={accounts.length === 0}
              className="ml-2"
            >
              <option value="" disabled>
                {accounts.length === 0 ? "No accounts" : "Select account"}
              </option>
              {accounts.map((a) => (
                <option key={a.address} value={a.address}>
                  {a.name ? `${a.name} — ` : ""}
                  {a.address}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <strong>Balance:</strong> {selected ? balance ?? "…" : "—"}
        </div>

        <div className="mx-auto mt-10 w-full max-w-md text-center space-y-6">
          <h2 className="text-center text-lg font-semibold">Send (Westend)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] justify-items-center">
            <div>
              <input
                className="px-3 py-2 w-[400px] h-[20px] md:w-[320px] "
                placeholder="Recipient address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div>
              <input
                className="px-3 py-2 w-[280px] md:w-[220px]"
                placeholder="Amount (WND)"
                value={amountWnd}
                onChange={(e) => setAmountWnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-center mt-[15px]">
            <button
              className="mt-1 px-6 w-[180px] md:w-[200px]"
              disabled={!selected || !recipient || !amountWnd}
              onClick={handleTransfer}
            >
              Send
            </button>
          </div>
          {txState && (
            <div className="text-sm text-gray-500 text-center mt-1">
              Tx: {txState}
            </div>
          )}
          {txHash && (
            <div className="mt-1">
              <a
                className="text-blue-600 hover:underline"
                href={`https://westend.subscan.io/extrinsic/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View on Subscan
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

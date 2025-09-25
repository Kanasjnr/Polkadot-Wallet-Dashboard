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
      if (!selected) return;
      const api = getWestendApi();
      const info = await api.query.System.Account.getValue(selected);
      const free = info.data.free;
      setBalance(`${formatWnd(free)} WND`);
    })();
  }, [selected]);

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
        },
        error: (e: unknown) => {
          setTxState("Error: " + String(e));
        },
        complete: () => setTxState("Finalized"),
      });
    } catch (e) {
      setTxState("Error: " + String(e));
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>Polkadot Wallet Dashboard (PAPI)</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {accounts.length === 0 ? (
          <button disabled={!isReady || isConnecting} onClick={handleConnect}>
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>
        ) : (
          <span>Wallet connected</span>
        )}
        <span>{chainName ? `Network: ${chainName}` : "Network: …"}</span>
        <span>
          {finalized ? `Finalized #${finalized.number}` : "Finalized: …"}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <label>
          Account:
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={accounts.length === 0}
            style={{ marginLeft: 8 }}
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

      <div style={{ marginTop: 16 }}>
        <strong>Balance:</strong> {selected ? balance ?? "…" : "—"}
      </div>

      <div style={{ marginTop: 24, display: "grid", gap: 8, maxWidth: 520 }}>
        <h2>Send transfer (Westend)</h2>
        <input
          placeholder="Recipient address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <input
          placeholder="Amount (WND)"
          value={amountWnd}
          onChange={(e) => setAmountWnd(e.target.value)}
        />
        {/* Fee preview removed */}
        <button
          disabled={!selected || !recipient || !amountWnd}
          onClick={handleTransfer}
        >
          Send
        </button>
        {txState && <div>Tx: {txState}</div>}
        {txHash && (
          <a
            href={`https://westend.subscan.io/extrinsic/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Subscan
          </a>
        )}
      </div>
    </div>
  );
}

export default App;

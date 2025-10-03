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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { decodeAddress } from "@polkadot/util-crypto";

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
  const [isTransferring, setIsTransferring] = useState(false);

  const selectedAccount = accounts.find((a) => a.address === selected);
  const shortAddress = (addr: string) =>
    `${addr.slice(0, 6)}…${addr.slice(-6)}`;
  const getInitials = (name?: string) =>
    name && name.trim().length > 0
      ? name
          .trim()
          .split(/\s+/)
          .map((s) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : selected
      ? selected.slice(0, 2)
      : "??";

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
      setIsTransferring(true);
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
          setIsTransferring(false);
        },
        complete: () => {
          setTxState("Finalized");
          toast.success("Transaction finalized");
          setIsTransferring(false);
        },
      });
    } catch (e) {
      setTxState("Error: " + String(e));
      setIsTransferring(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-center text-2xl font-semibold">
          Polkadot Wallet Dashboard (PAPI)
        </h1>

        <Card>
          <CardHeader className="items-center gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">
                {accounts.length === 0 ? "Wallet" : "Wallet connected"}
              </CardTitle>
              <Badge variant="secondary">{chainName ? chainName : "…"}</Badge>
              <Badge variant="outline">
                {finalized ? `#${finalized.number}` : "#…"}
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Manage your connection
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {accounts.length === 0 ? (
              <Button
                size="sm"
                disabled={!isReady || isConnecting}
                onClick={handleConnect}
              >
                {isConnecting ? "Connecting…" : "Connect Wallet"}
              </Button>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                {selected && (
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>
                      {getInitials(selectedAccount?.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span>
                  {selected
                    ? `${
                        selectedAccount?.name
                          ? `${selectedAccount.name} — `
                          : ""
                      }${shortAddress(selected)}`
                    : "—"}
                </span>
                {selected && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="ml-1"
                          variant="secondary"
                          size="sm"
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
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy address</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setAccounts([]);
                    setSelected(undefined);
                    setBalance(null);
                  }}
                >
                  Disconnect
                </Button>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Use an extension account to interact
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>Select an account to use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account-select">Account</Label>
                <Select
                  value={selected}
                  onValueChange={(v) => setSelected(v)}
                  disabled={accounts.length === 0 || isTransferring}
                >
                  <SelectTrigger id="account-select" className="w-full">
                    <SelectValue
                      placeholder={
                        accounts.length === 0 ? "No accounts" : "Select account"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto w-[--radix-select-trigger-width]">
                    {accounts.map((a) => (
                      <SelectItem key={a.address} value={a.address}>
                        {(a.name ? `${a.name} — ` : "") +
                          shortAddress(a.address)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm">
                <span className="font-medium">Balance:</span>{" "}
                {selected ? balance ?? "…" : "—"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send (Westend)</CardTitle>
              <CardDescription>Transfer WND to another address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient address</Label>
                <Input
                  id="recipient"
                  placeholder="5Dsu..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  disabled={!selected || isTransferring}
                />
                {recipient &&
                  (() => {
                    try {
                      decodeAddress(recipient.trim());
                      return null;
                    } catch {
                      return (
                        <p className="text-xs text-destructive">
                          Invalid address
                        </p>
                      );
                    }
                  })()}
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (WND)</Label>
                <Input
                  id="amount"
                  placeholder="0.5"
                  value={amountWnd}
                  onChange={(e) => setAmountWnd(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  disabled={!selected || isTransferring}
                />
                {amountWnd && Number.isNaN(Number(amountWnd)) && (
                  <p className="text-xs text-destructive">
                    Enter a valid number
                  </p>
                )}
                {amountWnd && Number(amountWnd) <= 0 && (
                  <p className="text-xs text-destructive">
                    Amount must be greater than 0
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-center gap-2">
              <Button
                className="w-full md:w-auto"
                disabled={
                  !selected ||
                  !recipient ||
                  !amountWnd ||
                  isTransferring ||
                  (() => {
                    try {
                      decodeAddress(recipient.trim());
                      return false;
                    } catch {
                      return true;
                    }
                  })() ||
                  Number(amountWnd) <= 0 ||
                  Number.isNaN(Number(amountWnd))
                }
                onClick={handleTransfer}
              >
                {isTransferring ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"></span>
                    Sending…
                  </span>
                ) : (
                  "Send"
                )}
              </Button>
              {txState && (
                <div className="text-xs text-muted-foreground">
                  Tx: {txState}
                </div>
              )}
              {txHash && (
                <a
                  className="text-xs text-blue-600 hover:underline"
                  href={`https://westend.subscan.io/extrinsic/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Subscan
                </a>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;

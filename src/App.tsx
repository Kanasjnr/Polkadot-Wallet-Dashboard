import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { initPolkadotClient, getClient, getPolkadotApi } from './lib/papi/client'
import { enableExtensions, getInjectedAccounts } from './lib/papi/wallet'

function App() {
  const [isReady, setIsReady] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [accounts, setAccounts] = useState<{ address: string; name?: string }[]>([])
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [finalized, setFinalized] = useState<{ number: number; hash: string } | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [chainName, setChainName] = useState<string | null>(null)

  useEffect(() => {
    let sub: any;
    (async () => {
      await initPolkadotClient();
      const client = getClient();
      sub = client.finalizedBlock$.subscribe((b) => setFinalized({ number: b.number, hash: b.hash }))
      setIsReady(true)
      const api = getPolkadotApi()
      const name = await api.constants.System.Version.get().then(() => 'Polkadot')
      setChainName(name)
    })()
    return () => {
      if (sub) sub.unsubscribe()
    }
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await enableExtensions()
      const accs = await getInjectedAccounts()
      setAccounts(accs)
      setSelected(accs[0]?.address)
    } finally {
      setIsConnecting(false)
    }
  }

  useEffect(() => {
    (async () => {
      if (!selected) return
      const api = getPolkadotApi()
      const info = await api.query.System.Account.getValue(selected)
      const free = info.data.free
      setBalance(free.toString())
    })()
  }, [selected])

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Polkadot Wallet Dashboard (PAPI)</h1>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button disabled={!isReady || isConnecting} onClick={handleConnect}>
          {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
        <span>{chainName ? `Network: ${chainName}` : 'Network: …'}</span>
        <span>
          {finalized ? `Finalized #${finalized.number}` : 'Finalized: …'}
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
              {accounts.length === 0 ? 'No accounts' : 'Select account'}
            </option>
            {accounts.map((a) => (
              <option key={a.address} value={a.address}>
                {a.name ? `${a.name} — ` : ''}{a.address}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>Balance:</strong> {selected ? (balance ?? '…') : '—'}
      </div>
    </div>
  )
}

export default App

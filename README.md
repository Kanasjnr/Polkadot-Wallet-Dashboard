# Polkadot Wallet Dashboard (PAPI)

A small, teachable wallet dashboard that runs a Polkadot light client in the browser (smoldot) and uses PAPI’s typed API to:

- Connect a browser wallet (Polkadot.js / Talisman)
- Show network info (Westend), finalized block, and account balance
- Send a transfer on Westend with clear status updates and a Subscan link

This repo is intended as a reference for developers new to PAPI and the smoldot light client.

## Stack
- Vite + React + TypeScript
- PAPI (polkadot-api) + smoldot (browser worker)
- Browser extension signer (pjs-signer preferred)

## Prerequisites
- Node.js 18+
- A Polkadot wallet extension installed (Polkadot.js extension or Talisman)
- Westend WND on the relay chain for testing

## Getting started
```bash
npm install
npm run dev
```
Then open the local URL shown by Vite.

Notes:
- The project is configured to generate PAPI descriptors on install. If needed, run:
  ```bash
  npx papi
  ```

## Usage
1. Click “Connect Wallet” and approve access in your extension.
2. Pick an account (the connect button hides once accounts are available).
3. View network, finalized block, and your balance (displayed in WND).
4. Send a transfer:
   - Paste recipient address (Westend relay chain)
   - Enter amount in WND (e.g., 0.5)
   - Click Send and approve in your extension
   - Follow the status text; when available, use the Subscan link to view the extrinsic

## Technical article
- Read the full write-up that explains the project and key decisions: [Technical article on Medium](https://medium.com/@nasihudeen04/381ee5a79d5c)

## Network notes
- This dashboard connects to the Westend relay chain (`westend2`).
- If you used an AssetHub faucet, those funds live on the AssetHub parachain and won’t appear in the relay chain `System.Account` balance.

## Faucet
- Westend (WND) is the public Polkadot testnet. You can get test WND from a community faucet (search “Westend faucet”) or by asking in Polkadot builders channels.
- There is no “test DOT” on Polkadot mainnet. Use Westend for end‑to‑end transfer testing.

## Project layout (key files)
- `src/lib/papi/client.ts`: smoldot worker + PAPI client setup for Westend (`westend2`)
- `src/lib/papi/wallet.ts`: wallet integration
  - Preferred: `polkadot-api/pjs-signer` (extension-native `polkadotSigner`)
  - Fallback: adapter using `signRaw('bytes')` + SS58 decode + key-type detection
- `src/lib/units.ts`: readable helpers: `formatWnd(plancks)` and `parseWnd(wndString)`
- `src/App.tsx`: minimal dashboard UI and transfer flow using typed API

## Troubleshooting
- MultiAddress undefined when building a transfer
  - Symptom: `Cannot read properties of undefined (reading 'MultiAddress')`
  - Fix: import `MultiAddress` from `@polkadot-api/descriptors` and build destination with `MultiAddress.Id(dest)`.
  - Ref: simple transfer recipe — `Balances.transfer_allow_death` with `MultiAddress.Id(...)`.

- BadProof when submitting a signed transaction
  - Symptom: `InvalidTxError: { "type": "Invalid", "value": { "type": "BadProof" } }`
  - Common causes and fixes:
    - Signer mismatch: Prefer `polkadot-api/pjs-signer` if available.
    - Fallback adapter must sign the exact bytes with `signRaw({ type: 'bytes' })` and pass the proper key type (`Sr25519`/`Ed25519`/`Ecdsa`) into `getPolkadotSigner`.
    - Use `web3FromAddress(address)` to fetch the injector bound to the selected account.
    - Ensure the selected account in the UI matches the account approved in the extension popup.

- Fee estimation
  - Removed on purpose to keep UX clean after some sign-dependent edge cases. Transfers work without it.

## Security
- This project is a demo for educational purposes. Do not use it with your main accounts or large funds.
- No server custody: all signing happens in your browser via the wallet extension. Always verify the extension’s signing prompt.
- Review and build from source before deploying.

## Contributing
Contributions are welcome!

1. Fork and clone the repo
2. Install and run locally
   ```bash
   npm install
   npm run dev
   ```
3. Style/lint: keep code readable, avoid over‑abstractions, and prefer clear names. Match existing formatting. TypeScript: avoid `any` where possible.
4. Open a PR with a concise description and screenshots if UI changes.

## References
- Getting started (smoldot + typed API): `https://papi.how/getting-started`
- Signers (pjs-signer, getPolkadotSigner): `https://papi.how/signers`
- Simple transfer : `https://papi.how/recipes/simple-transfer`

## License
MIT

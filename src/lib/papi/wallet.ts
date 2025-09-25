import { web3Enable, web3Accounts, web3FromAddress } from "@polkadot/extension-dapp";
import { decodeAddress } from "@polkadot/util-crypto";
import { hexToU8a, u8aToHex } from "@polkadot/util";
import { getPolkadotSigner } from "polkadot-api/signer";
import { getInjectedExtensions, connectInjectedExtension } from "polkadot-api/pjs-signer";

export interface InjectedAccount {
  address: string;
  name?: string;
  source: string;
}

export async function enableExtensions(appName = "Polkadot Wallet Dashboard"): Promise<void> {
  await web3Enable(appName);
}

export async function getInjectedAccounts(): Promise<InjectedAccount[]> {
  const accounts = await web3Accounts();
  return accounts.map((a) => ({
    address: a.address,
    name: a.meta.name,
    source: a.meta.source,
  }));
}

export async function getSignerForAddress(address: string) {
  const accounts = await web3Accounts();
  const found = accounts.find((a) => a.address === address);
  if (!found) throw new Error("Account not found in extension");
  const injector = await web3FromAddress(address);
  return injector.signer;
}

export async function getPapiSignerForAddress(address: string) {
  // First, try the official pjs-signer utility from PAPI docs
  const extensions = getInjectedExtensions();
  for (const extName of extensions) {
    try {
      const ext = await connectInjectedExtension(extName);
      const pjsAccounts = ext.getAccounts();
      const match = pjsAccounts.find((a) => a.address === address);
      if (match?.polkadotSigner) {
        return match.polkadotSigner;
      }
    } catch {
      // ignore and try next
    }
  }

  // Fallback to manual adapter for broader compatibility
  const accounts = await web3Accounts();
  const found = accounts.find((a) => a.address === address);
  if (!found) throw new Error("Account not found in extension");
  const injector = await web3FromAddress(address);

  const publicKey = decodeAddress(address);
  const keyType = ((): "Sr25519" | "Ed25519" | "Ecdsa" => {
    const t = (found as unknown as { type?: string }).type;
    if (t === "ecdsa") return "Ecdsa";
    if (t === "ed25519") return "Ed25519";
    return "Sr25519";
  })();
  const sign = async (msg: Uint8Array): Promise<Uint8Array> => {
    if (!injector.signer || !injector.signer.signRaw) {
      throw new Error("Extension signer does not support signRaw")
    }
    const result = await injector.signer.signRaw({
      address,
      data: u8aToHex(msg),
      type: "bytes",
    });
    return hexToU8a(result.signature);
  };

  return getPolkadotSigner(publicKey, keyType, sign);
}



import { web3Enable, web3Accounts, web3FromSource } from "@polkadot/extension-dapp";

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
  const injector = await web3FromSource(found.meta.source);
  return injector.signer;
}



import { createClient, type Client } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import SmWorker from "polkadot-api/smoldot/worker?worker";
import { chainSpec as westendChainSpec } from "polkadot-api/chains/westend2";
import { dot, wnd } from "@polkadot-api/descriptors";


let client: Client | undefined;

export async function initPolkadotClient(): Promise<Client> {
  if (client) return client;

  const worker = new SmWorker();
  const smoldot = startFromWorker(worker);
  const westendChain = await smoldot.addChain({ chainSpec: westendChainSpec });

  client = createClient(getSmProvider(westendChain));
  return client;
}

export function getClient(): Client {
  if (!client) throw new Error("PAPI client not initialized. Call initPolkadotClient() first.");
  return client;
}

export function getPolkadotApi() {
  const c = getClient();
  return c.getTypedApi(dot);
}

export function getWestendApi() {
  const c = getClient();
  return c.getTypedApi(wnd);
}



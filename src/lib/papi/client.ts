import { createClient, type Client } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import SmWorker from "polkadot-api/smoldot/worker?worker";
import { chainSpec as polkadotChainSpec } from "polkadot-api/chains/polkadot";
import { dot } from "@polkadot-api/descriptors";

let client: Client | undefined;

export async function initPolkadotClient(): Promise<Client> {
  if (client) return client;

  const worker = new SmWorker();
  const smoldot = startFromWorker(worker);
  const polkadotChain = await smoldot.addChain({ chainSpec: polkadotChainSpec });

  client = createClient(getSmProvider(polkadotChain));
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



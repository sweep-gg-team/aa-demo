import "dotenv/config";
import { writeFileSync } from "fs";
import {
  ENTRYPOINT_ADDRESS_V07,
  createSmartAccountClient,
} from "permissionless";
import { signerToSafeSmartAccount } from "permissionless/accounts";
import {
  createPimlicoBundlerClient,
  createPimlicoPaymasterClient,
} from "permissionless/clients/pimlico";
import { Hex, createPublicClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const apiKey = "850080d0-7198-471f-87ec-e8be98f8feba";
const paymasterUrl = `https://api.pimlico.io/v2/168587773/rpc?apikey=${apiKey}`;

const privateKey =
  (process.env.PRIVATE_KEY as Hex) ??
  (() => {
    const pk = generatePrivateKey();
    writeFileSync(".env", `PRIVATE_KEY=${pk}`);
    return pk;
  })();

export const publicClient = createPublicClient({
  transport: http(
    "https://blast-sepolia.infura.io/v3/53afdb8897e24aaf934549a2d54d21ae"
  ),
});

export const paymasterClient = createPimlicoPaymasterClient({
  transport: http(paymasterUrl),
  entryPoint: ENTRYPOINT_ADDRESS_V07,
});

const account = await signerToSafeSmartAccount(publicClient, {
  signer: privateKeyToAccount(privateKey),
  entryPoint: ENTRYPOINT_ADDRESS_V07, // global entrypoint
  safeVersion: "1.4.1",
});

console.log(
  `Smart account address: https://sepolia.blastscan.io/address/${account.address}`
);

const bundlerUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${apiKey}`;

const bundlerClient = createPimlicoBundlerClient({
  transport: http(bundlerUrl),
  entryPoint: ENTRYPOINT_ADDRESS_V07,
});

const smartAccountClient = createSmartAccountClient({
  account,
  entryPoint: ENTRYPOINT_ADDRESS_V07,
  chain: sepolia,
  bundlerTransport: http(bundlerUrl),
  middleware: {
    gasPrice: async () => {
      return (await bundlerClient.getUserOperationGasPrice()).fast;
    },
    sponsorUserOperation: paymasterClient.sponsorUserOperation,
  },
});

const date = Date.now();
const txHash = await smartAccountClient.sendTransaction({
  to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  value: 0n,
  data: "0x1234",
});

console.log("Time spent", Date.now() - date);
console.log(txHash);

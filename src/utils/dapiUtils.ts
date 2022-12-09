import { StackItemJson } from '@cityofzion/neon-core/lib/sc';
import {
  sc, rpc, tx, wallet, u, CONST,
} from '@cityofzion/neon-core';
import axios from 'axios';
import { config } from '../config';
import { logger } from './loggingUtils';

const properties = config.getProperties();

export type SwapComputation = {
  ask: number,
  spread: number
};

// Network node
const RPC_NODE_URL: string = properties.rpcNodeUrl;
const RPC_CLIENT = new rpc.RPCClient(RPC_NODE_URL);
const NETWORK_MAGIC = properties.networkMagic;

// Script hashes
export const VAULT_SCRIPT_HASH: string = properties.vaultScriptHash;
export const PRICE_URL: string = properties.priceUrl;

export interface VaultBalance {
  collateralHash: string;
  fTokenHash: string;
  collateralBalance: number;
  fTokenBalance: number;
}

export interface AccountVaultBalance {
  account: string;
  collateralBalance: number;
  fTokenBalance: number;
}

function castVaultBalances(ret: any) {
  const retList = ret as any as StackItemJson[];
  return retList.map((e) => {
    const eVal = e as any as { value: { value: string }[] };
    return {
      collateralHash:
        u.HexString.fromBase64(eVal.value[0].value).toLittleEndian(),
      fTokenHash:
        u.HexString.fromBase64(eVal.value[1].value).toLittleEndian(),
      collateralBalance: parseInt(eVal.value[2].value, 10),
      fTokenBalance: parseInt(eVal.value[3].value, 10),
    } as VaultBalance;
  });
}

function castAccountVaultBalances(ret: any) {
  const retList = ret as any as StackItemJson[];
  return retList.map((e) => {
    const eVal = e as any as { value: { value: string }[] };
    return {
      account:
        u.HexString.fromBase64(eVal.value[0].value).toLittleEndian(),
      collateralBalance: parseInt(eVal.value[1].value, 10),
      fTokenBalance: parseInt(eVal.value[2].value, 10),
    } as AccountVaultBalance;
  });
}

export async function getPriceFeed() {
  return axios.get(PRICE_URL).then((ret) => ret.data);
}

// Entry point for all read operations
async function genericReadCall(scriptHash: string, operation: string, args: any[]) {
  const result = await RPC_CLIENT.invokeFunction(scriptHash, operation, args);
  const retVal = result.stack[0].value;
  return retVal;
}

export async function getBalance(contractHash: string, account: wallet.Account) {
  return genericReadCall(contractHash, 'balanceOf', [sc.ContractParam.hash160(account.address)]).then((ret) => parseInt(ret as unknown as string, 10));
}

export async function symbol(contractHash: string) {
  return genericReadCall(contractHash, 'symbol', [])
    .then((ret) => u.HexString.fromBase64(ret as string).toAscii());
}

export async function decimals(contractHash: string) {
  return genericReadCall(contractHash, 'decimals', [])
    .then((ret) => parseInt(ret as unknown as string, 10));
}

export async function getMaxLoanToValue(collateralHash: string) {
  return genericReadCall(
    VAULT_SCRIPT_HASH,
    'getMaxLoanToValue',
    [
      sc.ContractParam.hash160(collateralHash),
    ],
  ).then((ret) => parseInt(ret as unknown as string, 10));
}

export async function getLiquidationLimit(collateralHash: string) {
  return genericReadCall(
    VAULT_SCRIPT_HASH,
    'getLiquidationLimit',
    [
      sc.ContractParam.hash160(collateralHash),
    ],
  ).then((ret) => parseInt(ret as unknown as string, 10));
}

export async function getLiquidationBonus(collateralHash: string) {
  return genericReadCall(
    VAULT_SCRIPT_HASH,
    'getLiquidationBonus',
    [
      sc.ContractParam.hash160(collateralHash),
    ],
  ).then((ret) => parseInt(ret as unknown as string, 10));
}

export async function getOnChainPrice(tokenHash: string, decimal: number) {
  return genericReadCall(
    VAULT_SCRIPT_HASH,
    'getOnChainPrice',
    [
      sc.ContractParam.hash160(tokenHash),
      sc.ContractParam.integer(decimal),
    ],
  ).then((ret) => parseInt(ret as unknown as string, 10));
}

export async function getVaultBalance(collateralHash: string, fTokenHash: string, address: string) {
  return genericReadCall(
    VAULT_SCRIPT_HASH,
    'getVaultBalance',
    [
      sc.ContractParam.hash160(collateralHash),
      sc.ContractParam.hash160(fTokenHash),
      sc.ContractParam.hash160(address),
    ],
  );
}

export async function getVaultBalances(address: string) {
  return genericReadCall(
    VAULT_SCRIPT_HASH,
    'getVaultBalances',
    [
      sc.ContractParam.hash160(address),
    ],
  ).then((ret) => castVaultBalances(ret));
}

export async function getAllVaults(
  collateralHash: string,
  fTokenHash: string,
  pageSize: number,
  pageNum: number,
) {
  return genericReadCall(
    VAULT_SCRIPT_HASH,
    'getAllVaults',
    [
      sc.ContractParam.hash160(collateralHash),
      sc.ContractParam.hash160(fTokenHash),
      sc.ContractParam.integer(pageSize),
      sc.ContractParam.integer(pageNum),
    ],
  ).then((ret) => castAccountVaultBalances(ret));
}

// Entry point for all write operations
async function createTransaction(
  contractHash: string,
  operation: string,
  params: sc.ContractParam[],
  account: wallet.Account,
) {
  const script = sc.createScript({
    scriptHash: contractHash,
    operation,
    args: params,
  });

  const currentHeight = await RPC_CLIENT.getBlockCount();
  const transaction = new tx.Transaction({
    signers: [
      {
        account: account.scriptHash,
        scopes: tx.WitnessScope.CalledByEntry,
      },
    ],
    validUntilBlock: currentHeight + 10,
    script,
  });
  logger.debug(`Transaction created: contractHash=${contractHash}, operation=${operation}, `
    + `params=${JSON.stringify(params)}, account=${account.address}`);
  return transaction;
}

export async function liquidateOCP(
  fTokenHash: string,
  collateralHash: string,
  liquidatee: string,
  quantity: number,
  account: wallet.Account,
) {
  return createTransaction(
    fTokenHash,
    'transfer',
    [
      sc.ContractParam.hash160(account.address),
      sc.ContractParam.hash160(VAULT_SCRIPT_HASH),
      sc.ContractParam.integer(quantity),
      sc.ContractParam.array(...[
        sc.ContractParam.string('LIQUIDATE_OCP'),
        sc.ContractParam.hash160(collateralHash),
        sc.ContractParam.hash160(liquidatee),
      ]),
    ],
    account,
  );
}

export async function liquidate(
  fTokenHash: string,
  collateralHash: string,
  liquidatee: string,
  quantity: number,
  priceFeed: string,
  signature: string,
  account: wallet.Account,
) {
  return createTransaction(
    fTokenHash,
    'transfer',
    [
      sc.ContractParam.hash160(account.address),
      sc.ContractParam.hash160(VAULT_SCRIPT_HASH),
      sc.ContractParam.integer(quantity),
      sc.ContractParam.array(...[
        sc.ContractParam.string('LIQUIDATE'),
        sc.ContractParam.hash160(collateralHash),
        sc.ContractParam.hash160(liquidatee),
        sc.ContractParam.string(priceFeed),
        sc.ContractParam.string(signature),
      ]),
    ],
    account,
  );
}

export async function transfer(
  contractHash: string,
  quantity: number,
  toAddress: string,
  account: wallet.Account,
) {
  return createTransaction(
    contractHash,
    'transfer',
    [
      sc.ContractParam.hash160(account.address),
      sc.ContractParam.hash160(toAddress),
      sc.ContractParam.integer(quantity),
      sc.ContractParam.array(...[]),
    ],
    account,
  );
}

export async function checkNetworkFee(transaction: tx.Transaction) {
  const feePerByteInvokeResponse = await RPC_CLIENT.invokeFunction(
    CONST.NATIVE_CONTRACT_HASH.PolicyContract,
    'getFeePerByte',
  );

  if (feePerByteInvokeResponse.state !== 'HALT') {
    throw new Error('Unable to retrieve data to calculate network fee.');
  }
  const feePerByte = u.BigInteger.fromNumber(
    feePerByteInvokeResponse.stack[0].value as any as string,
  );
  // Account for witness size
  const transactionByteSize = transaction.serialize().length / 2 + 109;
  // Hardcoded. Running a witness is always the same cost for the basic account.
  const witnessProcessingFee = u.BigInteger.fromNumber(1000390);
  const networkFeeEstimate = feePerByte
    .mul(transactionByteSize)
    .add(witnessProcessingFee);
  // eslint-disable-next-line no-param-reassign
  transaction.networkFee = networkFeeEstimate;
  logger.debug(`Network Fee set: ${transaction.networkFee.toDecimal(8)}`);
}

export async function checkSystemFee(transaction: tx.Transaction) {
  const invokeFunctionResponse = await RPC_CLIENT.invokeScript(
    u.HexString.fromHex(transaction.script),
    transaction.signers,
  );
  if (invokeFunctionResponse.state !== 'HALT') {
    throw new Error(
      `Transfer script errored out: ${invokeFunctionResponse.exception}`,
    );
  }
  const requiredSystemFee = u.BigInteger.fromNumber(
    invokeFunctionResponse.gasconsumed,
  );
  // eslint-disable-next-line no-param-reassign
  transaction.systemFee = requiredSystemFee;
  logger.debug(`System Fee set: ${transaction.systemFee.toDecimal(8)}`);
}

export async function performTransfer(transaction: tx.Transaction, account: wallet.Account) {
  const signedTransaction = transaction.sign(
    account,
    NETWORK_MAGIC,
  );

  const result = await RPC_CLIENT.sendRawTransaction(
    u.HexString.fromHex(signedTransaction.serialize(true)),
  );
  logger.info(`Transaction hash: ${result}`);
}

export function base64MatchesAddress(base64Hash: string, address: string) {
  const fromBase64 = u.HexString.fromBase64(base64Hash, true).toString();
  const fromAddress = wallet.getScriptHashFromAddress(address);
  return fromBase64 === fromAddress;
}

export function base64MatchesScriptHash(base64Hash: string, scriptHash: string) {
  const fromBase64 = u.HexString.fromBase64(base64Hash, true).toString();
  const fromScriptHash = u.HexString.fromHex(scriptHash, true).toLittleEndian();
  return fromBase64 === fromScriptHash;
}

// eslint-disable-next-line import/no-self-import
export * as DapiUtils from './dapiUtils';

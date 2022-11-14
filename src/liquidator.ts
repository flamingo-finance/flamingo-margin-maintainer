/* eslint-disable no-plusplus */
/* eslint-disable no-constant-condition */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
import { tx, wallet } from '@cityofzion/neon-core';
import { config } from './config';
import { logger } from './utils/loggingUtils';

import { AccountVaultBalance, DapiUtils } from './utils/dapiUtils';

const properties = config.getProperties();

const PRIVATE_KEY: string = properties.privateKey;
const OWNER: wallet.Account = new wallet.Account(PRIVATE_KEY);
const DRY_RUN: boolean = properties.dryRun;
const FTOKEN_SCRIPT_HASH = properties.fTokenScriptHash;
const COLLATERAL_SCRIPT_HASH = properties.collateralScriptHash;

const SLEEP_MILLIS = properties.sleepMillis;

interface PriceData {
  payload: string;
  signature: string;
  decimals: number;
  fTokenOnChainPrice: number;
  fTokenOffChainPrice: number;
  fTokenCombinedPrice: number;
  collateralOnChainPrice: number;
  collateralOffChainPrice: number;
  collateralCombinedPrice: number;
}

async function submitTransaction(
  transaction: tx.Transaction,
  description: string,
) {
  await DapiUtils.checkNetworkFee(transaction);
  await DapiUtils.checkSystemFee(transaction);
  if (DRY_RUN) {
    logger.info(`Not submitting ${description} transaction since dry run...`);
    return null;
  }
  logger.info(`Submitting ${description} transaction...`);
  return DapiUtils.performTransfer(transaction, OWNER);
}

async function getPrices(
  fTokenHash: string,
  fTokenSymbol: string,
  collateralHash: string,
  collateralSymbol: string,
) {
  const priceData = await DapiUtils.getPriceFeed();
  const { decimals } = priceData.data;
  const fTokenOnChainPrice = +(await DapiUtils.getOnChainPrice(fTokenHash, decimals));
  const fTokenOffChainPrice = +priceData.data.prices[fTokenSymbol];
  const collateralOnChainPrice = +(await DapiUtils.getOnChainPrice(collateralHash, decimals));
  const collateralOffChainPrice = +priceData.data.prices[collateralSymbol];

  return {
    payload: priceData.payload,
    signature: priceData.signature,
    decimals: priceData.data.decimals,
    fTokenOnChainPrice,
    fTokenOffChainPrice,
    fTokenCombinedPrice: (fTokenOnChainPrice + fTokenOffChainPrice) / 2,
    collateralOnChainPrice,
    collateralOffChainPrice,
    collateralCombinedPrice: (collateralOnChainPrice + collateralOffChainPrice) / 2,
  } as PriceData;
}

function computeLoanToValue(vault: AccountVaultBalance, priceData: PriceData) {
  const numerator = vault.fTokenBalance * priceData.fTokenCombinedPrice;
  if (numerator === 0) {
    return 0;
  }
  const denominator = vault.collateralBalance * priceData.collateralCombinedPrice;
  return (100 * numerator) / denominator;
}

function computeLiquidateQuantity(fTokenBalance: number, vault: AccountVaultBalance, liquidationLimit: number) {
  const maxLiquidateQuantity = (liquidationLimit * vault.fTokenBalance) / 100;
  return Math.floor(Math.min(fTokenBalance, maxLiquidateQuantity));
}

async function liquidate(fTokenHash: string, collateralHash: string, liquidatee: string, liquidateQuantity: number, priceData: PriceData) {
  const transaction = await DapiUtils.liquidate(fTokenHash, collateralHash, liquidatee, liquidateQuantity, priceData.payload, priceData.signature, OWNER);
  await submitTransaction(transaction, `Vault::liquidate(${fTokenHash}, ${collateralHash})`);
}

async function attemptLiquidation(fTokenBalance: number, vault: AccountVaultBalance, priceData: PriceData, maxLoanToValue: number, fTokenHash: string, collateralHash: string, liquidationLimit: number) {
  const loanToValue = computeLoanToValue(vault, priceData);
  logger.debug(`Attempting liquidation: Account: ${vault.account}, LTV: ${loanToValue}, Max LTV: ${maxLoanToValue}`);

  if (loanToValue > maxLoanToValue) {
    logger.info(`Liquidating: Account: ${vault.account}, LTV: ${loanToValue}, Max LTV: ${maxLoanToValue}`);
    const liquidateQuantity = computeLiquidateQuantity(fTokenBalance, vault, liquidationLimit);
    try {
      await liquidate(fTokenHash, collateralHash, vault.account, liquidateQuantity, priceData);
      return true;
    } catch (e) {
      logger.error('Failed to liquidate - your funds have not been sent');
      logger.error(e);
      return false;
    }
  } else {
    logger.debug(`Did not liquidate: Account: ${vault.account}, LTV: ${loanToValue}, Max LTV: ${maxLoanToValue}`);
    return false;
  }
}

function sleep(millis: number) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, millis));
}

// Main loop
(async () => {
  // 0. Wait for initialization
  logger.info('Starting liquidator...');

  const { address } = OWNER;
  logger.info(`Wallet address=${address}`);

  // TODO: change this to props
  const MAX_VAULT_LENGTH = 2;
  const FTOKEN_SYMBOL = await DapiUtils.symbol(FTOKEN_SCRIPT_HASH);
  const FTOKEN_DECIMALS = await DapiUtils.decimals(FTOKEN_SCRIPT_HASH);
  const COLLATERAL_SYMBOL = await DapiUtils.symbol(COLLATERAL_SCRIPT_HASH);
  const LIQUIDATION_LIMIT = await DapiUtils.getLiquidationLimit(COLLATERAL_SCRIPT_HASH);

  const initiaLFTokenBalance = await DapiUtils.getBalance(FTOKEN_SCRIPT_HASH, OWNER);

  const maxLoanToValue = await DapiUtils.getMaxLoanToValue(COLLATERAL_SCRIPT_HASH);
  logger.info(`Initialized with FToken: ${FTOKEN_SYMBOL}, Collateral: ${COLLATERAL_SYMBOL}, Max LTV: ${maxLoanToValue}, Dry Run: ${DRY_RUN}`);
  logger.info(`Initial FToken balance: ${initiaLFTokenBalance / 10 ** FTOKEN_DECIMALS}`);
  logger.info(`Liquidation limit: ${LIQUIDATION_LIMIT}`);

  while (true) {
    const startMillis = new Date().getTime();

    // 1. Update prices and balance
    const priceData = await getPrices(FTOKEN_SCRIPT_HASH, FTOKEN_SYMBOL, COLLATERAL_SCRIPT_HASH, COLLATERAL_SYMBOL);
    const fTokenBalance = await DapiUtils.getBalance(FTOKEN_SCRIPT_HASH, OWNER);
    logger.info(`Current FToken balance: ${fTokenBalance / 10 ** FTOKEN_DECIMALS}`);

    // 2. Loop over vaults and liquidate the first possible vault
    let pageNum = 0;
    let liquidationSuccess = false;
    while (true) {
      const vaults = (await DapiUtils.getAllVaults(COLLATERAL_SCRIPT_HASH, FTOKEN_SCRIPT_HASH, MAX_VAULT_LENGTH, pageNum))
        .sort(() => Math.random() - 0.5);
      for (let i = 0; i < vaults.length; i++) {
        if (vaults[i].collateralBalance > 0) {
          liquidationSuccess = await attemptLiquidation(fTokenBalance, vaults[i], priceData, maxLoanToValue, FTOKEN_SCRIPT_HASH, COLLATERAL_SCRIPT_HASH, LIQUIDATION_LIMIT);
          if (liquidationSuccess) {
            break;
          }
        }
      }
      if (vaults.length === 0 || liquidationSuccess) {
        break;
      }
      pageNum += 1;
    }

    // 3. Rest after a job well done
    const elapsedMillis = new Date().getTime() - startMillis;
    const remainingMillis = Math.max(0, SLEEP_MILLIS - elapsedMillis);
    if (remainingMillis > 0) {
      logger.info(`Sleeping ${remainingMillis} milliseconds...`);
      await sleep(remainingMillis);
    }
  }
})();

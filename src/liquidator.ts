/* eslint-disable no-plusplus */
/* eslint-disable no-constant-condition */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
import { tx, wallet } from '@cityofzion/neon-core';
import { RawData } from 'ws';
import { config } from './config';
import { logger } from './utils/loggingUtils';

import { AccountVaultBalance, DapiUtils } from './utils/dapiUtils';
import { NeoNotification, NeoNotificationInit } from './utils/notificationUtils';
import { WebhookUtils } from './utils/webhookUtils';

const properties = config.getProperties();

const PRIVATE_KEY: string = properties.privateKey;
const OWNER: wallet.Account = new wallet.Account(PRIVATE_KEY);
const DRY_RUN: boolean = properties.dryRun;
const FTOKEN_SCRIPT_HASH = properties.fTokenScriptHash;
const COLLATERAL_SCRIPT_HASH = properties.collateralScriptHash;
const ON_CHAIN_PRICE_ONLY = properties.onChainPriceOnly;
const ON_CHAIN_PRICE_DECIMALS = 20;
const LIQUIDATOR_NAME = properties.liquidatorName;
const LOW_BALANCE_THRESHOLD = properties.lowBalanceThreshold;
const MAX_PAGE_SIZE = properties.maxPageSize;
const VERIFY_WAIT_MILLIS = properties.verifyWaitMillis;
const SLEEP_MILLIS = properties.sleepMillis;

// Globals, set on init
let FTOKEN_SYMBOL: string;
let COLLATERAL_SYMBOL: string;
let FTOKEN_MULTIPLIER: number;
let COLLATERAL_MULTIPLIER: number;
let MAX_LOAN_TO_VALUE: number;
let LIQUIDATION_LIMIT: number;

interface PriceData {
  payload: string;
  signature: string;
  decimals: number;
  fTokenPrice: number;
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
  collateralHash: string,
  collateralSymbol: string,
  onChainPriceOnly: boolean,
) {
  if (onChainPriceOnly) {
    const fTokenOnChainPrice = +(await DapiUtils.getOnChainPrice(fTokenHash, ON_CHAIN_PRICE_DECIMALS));
    const collateralOnChainPrice = +(await DapiUtils.getOnChainPrice(collateralHash, ON_CHAIN_PRICE_DECIMALS));
    return {
      payload: '',
      signature: '',
      decimals: ON_CHAIN_PRICE_DECIMALS,
      fTokenPrice: fTokenOnChainPrice,
      collateralOnChainPrice,
      collateralOffChainPrice: collateralOnChainPrice,
      collateralCombinedPrice: collateralOnChainPrice,
    } as PriceData;
  }

  const priceData = await DapiUtils.getPriceFeed();
  const { decimals } = priceData.data;
  const fTokenOnChainPrice = +(await DapiUtils.getOnChainPrice(fTokenHash, decimals));
  const collateralOnChainPrice = +(await DapiUtils.getOnChainPrice(collateralHash, decimals));
  const collateralOffChainPrice = +priceData.data.prices[collateralSymbol];

  return {
    payload: priceData.payload,
    signature: priceData.signature,
    decimals: priceData.data.decimals,
    fTokenPrice: fTokenOnChainPrice,
    collateralOnChainPrice,
    collateralOffChainPrice,
    collateralCombinedPrice: (collateralOnChainPrice + collateralOffChainPrice) / 2,
  } as PriceData;
}

function computeLoanToValue(vault: AccountVaultBalance, priceData: PriceData) {
  const numerator = vault.fTokenBalance * priceData.fTokenPrice;
  if (numerator === 0) {
    return 0;
  }
  const denominator = vault.collateralBalance * priceData.collateralCombinedPrice;
  return (100 * numerator) / denominator;
}

// TODO: also check collateral balance in Vault
function computeLiquidateQuantity(fTokenBalance: number, vault: AccountVaultBalance, liquidationLimit: number) {
  const maxLiquidateQuantity = (liquidationLimit * vault.fTokenBalance) / 100;
  return Math.floor(Math.min(fTokenBalance, maxLiquidateQuantity));
}

/**
 * Listen to the notification subsystem to determine whether
 * a liquidation was successful
 */
async function confirmLiquidate(
  notification: NeoNotification,
  liquidatee: string,
) {
  let liquidateResolve: Function;
  // eslint-disable-next-line no-unused-vars
  const liquidatePromise = new Promise<string>((resolve, _) => {
    liquidateResolve = resolve;
  });
  const liquidateFailedT = setTimeout(() => {
    logger.info(`Liquidation wasn't confirmed after ${VERIFY_WAIT_MILLIS} milliseconds, but may still have succeeded`);
    // eslint-disable-next-line no-use-before-define
    notification.offCallback(liquidateSuccess);
    liquidateResolve(false);
    WebhookUtils.postLiquidateUnconfirmed(DRY_RUN, LIQUIDATOR_NAME, COLLATERAL_SYMBOL, FTOKEN_SYMBOL);
  }, VERIFY_WAIT_MILLIS);

  async function liquidateSuccess(
    callbackData: RawData,
    isBinary: boolean,
  ): Promise<void> {
    const message = isBinary ? callbackData : callbackData.toString();
    const data = JSON.parse(message as string);
    if (data.params && data.params[0].eventname === 'LiquidateCollateral') {
      const txid = data.params[0].container;
      const dataState = data.params[0].state;

      if (DapiUtils.base64MatchesAddress(dataState.value[2].value, OWNER.address)
       && DapiUtils.base64MatchesScriptHash(dataState.value[0].value, COLLATERAL_SCRIPT_HASH)
       && DapiUtils.base64MatchesScriptHash(dataState.value[1].value, FTOKEN_SCRIPT_HASH)
       && DapiUtils.base64MatchesScriptHash(dataState.value[3].value, liquidatee)
      ) {
        clearTimeout(liquidateFailedT);
        liquidateResolve(true);
        notification.offCallback(liquidateSuccess);
        logger.info(`Liquidation ${txid} succeeded`);
        const fTokenQuantity = (dataState.value[4].value as number) / FTOKEN_MULTIPLIER;
        const collateralQuantity = (dataState.value[5].value as number) / COLLATERAL_MULTIPLIER;
        WebhookUtils.postLiquidateSuccess(DRY_RUN, LIQUIDATOR_NAME, COLLATERAL_SYMBOL, FTOKEN_SYMBOL, fTokenQuantity, collateralQuantity);
      }
    }
  }

  notification.onCallback(DapiUtils.VAULT_SCRIPT_HASH, 'LiquidateCollateral', liquidateSuccess);
  return liquidatePromise;
}

/**
 * Liquidate a Vault. onChainPriceOnly can be set to true only for whitelisted addresses.
 *
 * If onChainPriceOnly is true, we liquidate using only on-chain prices of both the FToken and collateral asset.
 * Otherwise, we use a combination of the on-chain and off-chain price for the collateral asset.
 */
async function liquidate(
  notification: NeoNotification,
  liquidatee: string,
  liquidateQuantity: number,
  priceData: PriceData,
) {
  const liquidateComplete = confirmLiquidate(notification, liquidatee);
  const scaledLiquidateQuantity = liquidateQuantity / FTOKEN_MULTIPLIER;
  if (ON_CHAIN_PRICE_ONLY) {
    const transaction = await DapiUtils.liquidateOCP(FTOKEN_SCRIPT_HASH, COLLATERAL_SCRIPT_HASH, liquidatee, liquidateQuantity, OWNER);
    WebhookUtils.postLiquidateInitiated(DRY_RUN, LIQUIDATOR_NAME, COLLATERAL_SYMBOL, FTOKEN_SYMBOL, scaledLiquidateQuantity, transaction.hash());
    await submitTransaction(transaction, `Vault::liquidateOCP(${FTOKEN_SCRIPT_HASH}, ${COLLATERAL_SCRIPT_HASH})`);
  } else {
    const transaction = await DapiUtils.liquidate(FTOKEN_SCRIPT_HASH, COLLATERAL_SCRIPT_HASH, liquidatee, liquidateQuantity, priceData.payload, priceData.signature, OWNER);
    WebhookUtils.postLiquidateInitiated(DRY_RUN, LIQUIDATOR_NAME, COLLATERAL_SYMBOL, FTOKEN_SYMBOL, scaledLiquidateQuantity, transaction.hash());
    await submitTransaction(transaction, `Vault::liquidate(${FTOKEN_SCRIPT_HASH}, ${COLLATERAL_SCRIPT_HASH})`);
  }
  await liquidateComplete;
}

async function attemptLiquidation(
  notification: NeoNotification,
  fTokenBalance: number,
  vault: AccountVaultBalance,
  priceData: PriceData,
) {
  const loanToValue = computeLoanToValue(vault, priceData);
  logger.debug(`Attempting liquidation: Account: ${vault.account}, Collateral: ${COLLATERAL_SYMBOL}, FToken: ${FTOKEN_SYMBOL}, LTV: ${loanToValue}, Max LTV: ${MAX_LOAN_TO_VALUE}`);

  if (loanToValue > MAX_LOAN_TO_VALUE) {
    logger.info(`Liquidating: Account: ${vault.account}, LTV: ${loanToValue}, Max LTV: ${MAX_LOAN_TO_VALUE}`);
    const liquidateQuantity = computeLiquidateQuantity(fTokenBalance, vault, LIQUIDATION_LIMIT);
    try {
      await liquidate(notification, vault.account, liquidateQuantity, priceData);
      return true;
    } catch (e) {
      logger.error('Failed to liquidate - your funds have not been sent');
      logger.error(e);
      WebhookUtils.postLiquidateFailure(DRY_RUN, LIQUIDATOR_NAME, COLLATERAL_SYMBOL, FTOKEN_SYMBOL);
      return false;
    }
  } else {
    logger.debug(`Did not liquidate: Account: ${vault.account}, Collateral: ${COLLATERAL_SYMBOL}, FToken: ${FTOKEN_SYMBOL}, LTV: ${loanToValue}, Max LTV: ${MAX_LOAN_TO_VALUE}`);
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

  FTOKEN_SYMBOL = await DapiUtils.symbol(FTOKEN_SCRIPT_HASH);
  FTOKEN_MULTIPLIER = 10 ** (await DapiUtils.decimals(FTOKEN_SCRIPT_HASH));
  COLLATERAL_SYMBOL = await DapiUtils.symbol(COLLATERAL_SCRIPT_HASH);
  COLLATERAL_MULTIPLIER = 10 ** (await DapiUtils.decimals(COLLATERAL_SCRIPT_HASH));
  LIQUIDATION_LIMIT = await DapiUtils.getLiquidationLimit(COLLATERAL_SCRIPT_HASH);
  MAX_LOAN_TO_VALUE = await DapiUtils.getMaxLoanToValue(COLLATERAL_SCRIPT_HASH);
  const scaledInitialFTokenBalance = await DapiUtils.getBalance(FTOKEN_SCRIPT_HASH, OWNER) / FTOKEN_MULTIPLIER;

  logger.info(`Initialized "${LIQUIDATOR_NAME}" with FToken: ${FTOKEN_SYMBOL}, Collateral: ${COLLATERAL_SYMBOL}, Max LTV: ${MAX_LOAN_TO_VALUE}, Dry Run: ${DRY_RUN}`);
  logger.info(`Initial FToken balance: ${scaledInitialFTokenBalance}`);
  logger.info(`Liquidation limit: ${LIQUIDATION_LIMIT}`);

  const notification = await NeoNotificationInit();
  await notification.available;

  WebhookUtils.postInit(DRY_RUN, LIQUIDATOR_NAME, COLLATERAL_SYMBOL, FTOKEN_SYMBOL, scaledInitialFTokenBalance);

  while (true) {
    const startMillis = new Date().getTime();

    // 1. Update prices and balance
    const priceData = await getPrices(FTOKEN_SCRIPT_HASH, COLLATERAL_SCRIPT_HASH, COLLATERAL_SYMBOL, ON_CHAIN_PRICE_ONLY);
    const fTokenBalance = await DapiUtils.getBalance(FTOKEN_SCRIPT_HASH, OWNER);
    logger.info(`Current FToken balance: ${fTokenBalance / FTOKEN_MULTIPLIER}`);

    // 2. Notify if balance is low
    const scaledFTokenBalance = fTokenBalance / FTOKEN_MULTIPLIER;
    if (scaledFTokenBalance < LOW_BALANCE_THRESHOLD) {
      logger.warn(`Current ${FTOKEN_SYMBOL} balance=${scaledFTokenBalance} < lowBalanceThreshold=${LOW_BALANCE_THRESHOLD}`);
      WebhookUtils.postLowBalance(DRY_RUN, LIQUIDATOR_NAME, COLLATERAL_SYMBOL, FTOKEN_SYMBOL, scaledFTokenBalance, LOW_BALANCE_THRESHOLD);
    }

    // 3. Loop over vaults and liquidate the first possible vault
    let pageNum = 0;
    let liquidationSuccess = false;
    while (true) {
      const vaults = (await DapiUtils.getAllVaults(COLLATERAL_SCRIPT_HASH, FTOKEN_SCRIPT_HASH, MAX_PAGE_SIZE, pageNum))
        .sort(() => Math.random() - 0.5);
      for (let i = 0; i < vaults.length; i++) {
        if (vaults[i].collateralBalance > 0) {
          liquidationSuccess = await attemptLiquidation(
            notification,
            fTokenBalance,
            vaults[i],
            priceData,
          );
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

    // 4. Rest after a job well done
    const elapsedMillis = new Date().getTime() - startMillis;
    const remainingMillis = Math.max(0, SLEEP_MILLIS - elapsedMillis);
    if (remainingMillis > 0) {
      logger.info(`Sleeping ${remainingMillis} milliseconds...`);
      await sleep(remainingMillis);
    }
  }
})();

import axios from 'axios';
import { config } from '../config';

const properties = config.getProperties();

const WEB_HOOK_URL: string = properties.webhookUrl;

async function postMessage(
  dryRun: boolean,
  title: string,
  header: string,
  details: string,
  color: number,
) {
  // No-op if webhook URL is not configured
  if (!WEB_HOOK_URL.length) {
    return;
  }
  const embeds = [
    {
      title: dryRun ? `[DRY RUN]: ${title}` : title,
      color,
      footer: {
        text: `📅 ${new Date()}`,
      },
      fields: [
        {
          name: header,
          value: details,
        },
      ],
    },
  ];

  const data = JSON.stringify({ embeds });
  axios.post(WEB_HOOK_URL, data, { headers: { 'Content-Type': 'application/json' } });
}

export async function postInit(
  dryRun: boolean,
  name: string,
  collateral: string,
  fToken: string,
  balance: number,
) {
  const balanceStr = balance.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const header = `Maintainer: ${name}`;
  const details = `Collateral: ${collateral}\nFToken: ${fToken}\nFToken Balance: ${balanceStr}`;
  postMessage(dryRun, 'Initialized Maintainer', header, details, 3447003);
}

export async function postMaintenanceInitiated(
  dryRun: boolean,
  name: string,
  collateral: string,
  fToken: string,
  maintenanceQuantity: number,
  txHash: string,
) {
  const maintenanceQuantityStr = maintenanceQuantity.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const header = `Maintainer: ${name}`;
  const details = `Collateral: ${collateral}\nFToken: ${fToken}\nMaintenance Quantity: ${maintenanceQuantityStr}\nTx Hash: ${txHash}`;
  postMessage(dryRun, 'Maintenance Initiated', header, details, 3447003);
}

export async function postMaintenanceUnconfirmed(
  dryRun: boolean,
  name: string,
  collateral: string,
  fToken: string,
) {
  const header = `Maintainer: ${name}`;
  const details = `Collateral: ${collateral}\nFToken: ${fToken}`;
  postMessage(dryRun, 'Maintenance Unconfirmed', header, details, 16776960);
}

export async function postMaintenanceSuccess(
  dryRun: boolean,
  name: string,
  collateral: string,
  fToken: string,
  fTokenQuantity: number,
  collateralQuantity: number,
) {
  const fTokenQuantityStr = fTokenQuantity.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const collateralQuantityStr = collateralQuantity.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const header = `Maintainer: ${name}`;
  const details = `Collateral: ${collateral}\nFToken: ${fToken}\nFToken Quantity: ${fTokenQuantityStr}\nCollateral Quantity: ${collateralQuantityStr}`;
  postMessage(dryRun, 'Maintenance Successful', header, details, 5763719);
}

export async function postMaintenanceFailure(
  dryRun: boolean,
  name: string,
  collateral: string,
  fToken: string,
) {
  const header = `Maintainer: ${name}`;
  const details = `Collateral: ${collateral}\nFToken: ${fToken}`;
  postMessage(dryRun, 'Maintenance Failed', header, details, 15548997);
}

export async function postSwapInitiated(
  dryRun: boolean,
  name: string,
  inToken: string,
  outToken: string,
  swapQuantity: number,
  txHash: string,
) {
  const swapQuantityStr = swapQuantity.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const header = `Maintainer: ${name}`;
  const details = `Swap In: ${inToken}\nSwap Out: ${outToken}\nSwap Quantity: ${swapQuantityStr}\nTx Hash: ${txHash}`;
  postMessage(dryRun, 'Swap Initiated', header, details, 3447003);
}

export async function postSwapUnconfirmed(
  dryRun: boolean,
  name: string,
  inToken: string,
  outToken: string,
) {
  const header = `Maintainer: ${name}`;
  const details = `Swap In: ${inToken}\nSwap Out: ${outToken}`;
  postMessage(dryRun, 'Swap Unconfirmed', header, details, 16776960);
}

export async function postSwapSuccess(
  dryRun: boolean,
  name: string,
  inToken: string,
  outToken: string,
  inQuantity: number,
  outQuantity: number,
) {
  const inQuantityStr = inQuantity.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const outQuantityStr = outQuantity.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const header = `Maintainer: ${name}`;
  const details = `Swap In: ${inToken}\nSwap Out: ${outToken}\nIn Quantity: ${inQuantityStr}\nOut Quantity: ${outQuantityStr}`;
  postMessage(dryRun, 'Swap Successful', header, details, 5763719);
}

export async function postSwapFailure(
  dryRun: boolean,
  name: string,
  inToken: string,
  outToken: string,
) {
  const header = `Maintainer: ${name}`;
  const details = `Swap In: ${inToken}\nSwap Out: ${outToken}`;
  postMessage(dryRun, 'Swap Failed', header, details, 15548997);
}

export async function postExitInitiated(
  dryRun: boolean,
  name: string,
  flund: string,
  swapQuantity: number,
  txHash: string,
) {
  const swapQuantityStr = swapQuantity.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const header = `Maintainer: ${name}`;
  const details = `Exit Token: ${flund}\nExit Quantity: ${swapQuantityStr}\nTx Hash: ${txHash}`;
  postMessage(dryRun, 'Exit Initiated', header, details, 3447003);
}

export async function postExitUnconfirmed(
  dryRun: boolean,
  name: string,
  flund: string,
) {
  const header = `Maintainer: ${name}`;
  const details = `Exit Token: ${flund}`;
  postMessage(dryRun, 'Exit Unconfirmed', header, details, 16776960);
}

export async function postExitSuccess(
  dryRun: boolean,
  name: string,
  flund: string,
  flm: string,
  flundQuantity: number,
  flmQuantity: number,
) {
  const flundQuantityStr = flundQuantity.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const flmQuantityStr = flmQuantity.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const header = `Maintainer: ${name}`;
  const details = `${flund} Quantity: ${flundQuantityStr}\n${flm} Quantity: ${flmQuantityStr}`;
  postMessage(dryRun, 'Exit Successful', header, details, 5763719);
}

export async function postExitFailure(
  dryRun: boolean,
  name: string,
  flund: string,
) {
  const header = `Maintainer: ${name}`;
  const details = `Exit Token: ${flund}`;
  postMessage(dryRun, 'Exit Failed', header, details, 15548997);
}

export async function postLowBalance(
  dryRun: boolean,
  name: string,
  collateral: string,
  fToken: string,
  balance: number,
  balanceThreshold: number,
) {
  const balanceStr = balance.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const balanceThresholdStr = balanceThreshold.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const header = `Maintainer: ${name}`;
  const details = `Collateral: ${collateral}\nFToken: ${fToken}\nFToken Balance: ${balanceStr}\nBalance Threshold: ${balanceThresholdStr}`;
  postMessage(dryRun, 'Low Balance', header, details, 16776960);
}

// eslint-disable-next-line import/no-self-import
export * as WebhookUtils from './webhookUtils';

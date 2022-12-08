import axios from 'axios';
import { config } from '../config';

const properties = config.getProperties();

const WEB_HOOK_URL: string = properties.webhookUrl;

async function postMessage(title: string, header: string, details: string) {
  // No-op if webhook URL is not configured
  if (!WEB_HOOK_URL.length) {
    return;
  }
  const embeds = [
    {
      title,
      color: 5174599,
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

export async function postInit(name: string, collateral: string, fToken: string, balance: number) {
  const balanceStr = balance.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const header = `Liquidator: ${name}`;
  const details = `Collateral: ${collateral}\nFToken: ${fToken}\nFToken Balance: ${balanceStr}`;
  postMessage('Initialized Liquidator', header, details);
}

export async function postLiquidateSuccess(
  name: string,
  collateral: string,
  fToken: string,
  liquidateQuantity: number,
) {
  const liquidateQuantityStr = liquidateQuantity.toLocaleString(
    undefined,
    { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  );
  const header = `Liquidator: ${name}`;
  const details = `Collateral: ${collateral}\nFToken: ${fToken}\nLiquidate Quantity: ${liquidateQuantityStr}`;
  postMessage('Liquidation Successful', header, details);
}

export async function postLiquidateFailure(
  name: string,
  collateral: string,
  fToken: string,
) {
  const header = `Liquidator: ${name}`;
  const details = `Collateral: ${collateral}\nFToken: ${fToken}`;
  postMessage('Liquidation Failed', header, details);
}

export async function postLowBalance(
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
  const header = `Liquidator: ${name}`;
  const details = `Collateral: ${collateral}\nFToken: ${fToken}\nFToken Balance: ${balanceStr}\nBalance Threshold: ${balanceThresholdStr}`;
  postMessage('Low Balance', header, details);
}

// eslint-disable-next-line import/no-self-import
export * as WebhookUtils from './webhookUtils';

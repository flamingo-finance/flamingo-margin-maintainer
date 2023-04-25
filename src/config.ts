import dotenv from 'dotenv';
import convict from 'convict';

dotenv.config();

convict.addFormat({
  name: "script-hash",
  validate: (val) => {
    if (!/^0x[0-9a-fA-F]+$/.test(val)) {
      throw new Error('Must be a hexadecimal string starting with 0x, and be prefixed with "hash:" when added on command line');
    }
  },
  coerce: (input: string): string => {
    const output = input.replace("hash:", "");
    return output;
  }
});

const config = convict({
  env: {
    doc: 'The application environment',
    format: ['prod', 'test'],
    default: 'test',
    arg: 'nodeEnv',
    env: 'NODE_ENV',
    privateKey: process.env.PRIVATE_KEY,
  },
  privateKey: {
    format: String,
    default: '',
    arg: 'privateKey',
    env: 'PRIVATE_KEY',
  },
  logLevel: {
    format: ['debug', 'info', 'warn', 'error'],
    default: 'debug',
    arg: 'logLevel',
    env: 'LOG_LEVEL',
  },
  rpcNodeUrl: {
    format: String,
    default: '',
    arg: 'rpcNodeUrl',
    env: 'RPC_NODE_URL',
  },
  wsNodeUrl: {
    format: String,
    default: '',
    arg: 'wsNodeUrl',
    env: 'WS_NODE_URL',
  },
  networkMagic: {
    format: Number,
    default: 0,
    arg: 'networkMagic',
    env: 'NETWORK_MAGIC',
  },
  priceUrl: {
    format: String,
    default: '',
    arg: 'priceUrl',
    env: 'PRICE_URL',
  },
  onChainPriceOnly: {
    format: Boolean,
    default: false,
    arg: 'onChainPriceOnly',
    env: 'ON_CHAIN_PRICE_ONLY',
  },
  maxPageSize: {
    format: Number,
    default: 128,
    arg: 'maxPageSize',
    env: 'MAX_PAGE_SIZE',
  },
  vaultScriptHash: {
    format: "script-hash",
    default: '',
    arg: 'vaultScriptHash',
    env: 'VAULT_SCRIPT_HASH',
  },
  routerScriptHash: {
    format: "script-hash",
    default: '',
    arg: 'routerScriptHash',
    env: 'ROUTER_SCRIPT_HASH',
  },
  priceFeedScriptHash: {
    format: "script-hash",
    default: '',
    arg: 'priceFeedScriptHash',
    env: 'PRICE_FEED_SCRIPT_HASH',
  },
  flmScriptHash: {
    format: "script-hash",
    default: '',
    arg: 'flmScriptHash',
    env: 'FLM_SCRIPT_HASH',
  },
  flundScriptHash: {
    format: "script-hash",
    default: '',
    arg: 'flundScriptHash',
    env: 'FLUND_SCRIPT_HASH',
  },
  fTokenScriptHash: {
    format: "script-hash",
    default: '',
    arg: 'fTokenScriptHash',
    env: 'FTOKEN_SCRIPT_HASH',
  },
  collateralScriptHash: {
    format: "script-hash",
    default: '',
    arg: 'collateralScriptHash',
    env: 'COLLATERAL_SCRIPT_HASH',
  },
  webhookUrl: {
    format: String,
    default: '',
    arg: 'webhookUrl',
    env: 'WEB_HOOK_URL',
  },
  maintainerName: {
    format: String,
    default: '',
    arg: 'maintainerName',
    env: 'MAINTAINER_NAME',
  },
  maintenanceThreshold: {
    format: Number,
    default: 0,
    arg: 'maintenanceThreshold',
    env: 'MAINTENANCE_THRESHOLD',
  },
  lowBalanceThreshold: {
    format: Number,
    default: 0,
    arg: 'lowBalanceThreshold',
    env: 'LOW_BALANCE_THRESHOLD',
  },
  autoSwap: {
    format: Boolean,
    default: false,
    arg: 'autoSwap',
    env: 'AUTO_SWAP',
  },
  swapThreshold: {
    format: Number,
    default: 0,
    arg: 'swapThreshold',
    env: 'SWAP_THRESHOLD',
  },
  verifyWaitMillis: {
    format: Number,
    default: 0,
    arg: 'verifyWaitMillis',
    env: 'VERIFY_WAIT_MILLIS',
  },
  sleepMillis: {
    format: Number,
    default: 0,
    arg: 'sleepMillis',
    env: 'SLEEP_MILLIS',
  },
  dryRun: {
    format: Boolean,
    default: true,
    arg: 'dryRun',
    env: 'DRY_RUN',
  },
});

const env = config.get('env');
config.loadFile(`./config/${env}.json`);
config.validate({ allowed: 'strict' }); // throws error if config does not conform to schema

// eslint-disable-next-line import/prefer-default-export
export { config };

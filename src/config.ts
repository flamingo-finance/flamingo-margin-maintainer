import dotenv from 'dotenv';
import convict from 'convict';

dotenv.config();

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
    format: String,
    default: '',
    arg: 'vaultScriptHash',
    env: 'VAULT_SCRIPT_HASH',
  },
  fTokenScriptHash: {
    format: String,
    default: '',
    arg: 'fTokenScriptHash',
    env: 'FTOKEN_SCRIPT_HASH',
  },
  collateralScriptHash: {
    format: String,
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
  liquidatorName: {
    format: String,
    default: '',
    arg: 'liquidatorName',
    env: 'LIQUIDATOR_NAME',
  },
  lowBalanceThreshold: {
    format: Number,
    default: 0,
    arg: 'lowBalanceThreshold',
    env: 'LOW_BALANCE_THRESHOLD',
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

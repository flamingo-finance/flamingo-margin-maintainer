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
  networkMagic: {
    format: Number,
    default: 0,
    arg: 'networkMagic',
    env: 'NETWORK_MAGIC',
  },
  vaultScriptHash: {
    format: String,
    default: '0x54fc620196ddb20a5aee59aaea97c8fcd67dd4a9',
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
  priceUrl: {
    format: String,
    default: '',
    arg: 'priceUrl',
    env: 'PRICE_URL',
  },
  sleepMillis: {
    format: Number,
    default: 300_000,
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

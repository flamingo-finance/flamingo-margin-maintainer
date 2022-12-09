# README #

### Introduction ###
flamingo-liquidator is a liquidation bot for Flamingo FUSD.

flamingo-liquidator loops through open `Vaults` which are specified by a set of `(collateralHash, fTokenHash, account)`. Once it finds a Vault eligible for liquidation, it transfers a quantity of the fToken and receives the collateral in exchange.

As of Nov 14, 2022, flamingo-liquidator loops through the following cycle: 
*  Fetch the off-chain prices of the fToken and the collateral from the Flamingo API.
*  Fetch the on-chain prices of the fToken and the collateral from the Flamingo swap pools.
*  Compute the combined prices (arithmetic average) of the fToken and collateral.
*  Fetch open Vaults that have minted the fToken against the collateral.
*  Loop through these Vaults. If `$FTOKEN_VALUE / $COLLATERAL_VALUE > MAX_LTV_THRESHOLD`, attempt liquidation by sending fTokens to the Vault.
*  Sleep

### Getting Started ###
*  Run `npm install` to install all dependencies.
*  Run `export NODE_ENV=test` to run on testnet, or `export NODE_ENV=prod` to run on mainnet.
*  Set up your wallet's private key by calling `export PRIVATE_KEY=<PRIVATE_KEY>` Do not share your private key with anybody. Ensure that your operating environment is secure.
*  Tune parameters as desired.
*  Run `npm run liquidator-dev` to run the bot.
*  Remember to start with `DRY_RUN=true` and check the output.

### Deploying to Production ###
*  Run `npm run build` to transpile the source to JavaScript.
*  Run `docker build -t flamingo_liquidator .` to create a container image.
*  Run your image.

### Tunable Parameters ###
| Option | Description |
| --- | --- |
| `FTOKEN_SCRIPT_HASH` | The hash of the fToken that you would like to use to liquidate. |
| `COLLATERAL_SCRIPT_HASH` | The hash of the collateral that you would like to receive through liquidation. |
| `WEBHOOK_URL` | A webhook URL that allows you to post notifications to a Discord server you own. Please refer to [Discord Webhooks](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks). |
| `LIQUIDATOR_NAME` | The name that is used when webhook messages are posted to disambiguate your process from others. |
| `LOW_BALANCE_THRESHOLD` | The balance under which the process will log a WARN and post an alert to the webhook URL, if specified. |
| `VERIFY_WAIT_MILLIS` | The milliseconds that flamingo-liquidator will wait for a transaction confirmation to be received before moving on to the next cycle. |
| `SLEEP_MILLIS` | The cycle duration expressed in milliseconds. flamingo-liquidator will wait this duration betwen each cycle. It is recommended to set this duration to at least `15000`, as Neo blocks are generated every ~15s. |
| `DRY_RUN` | If set to true, output the computations without actually performing liquidations. Useful for testing and tuning parameters. |

Although other parameters do exist in the configuration, tinkering with these properties is not advised unless you are familiar with Neo N3 development.
# README #

### Disclaimer ###
flamingo-margin-maintainer is provided "as-is", without warranty of any kind. You may modify and use this software freely as you wish, but Flamingo Finance is not responsible for any of its behavior or their consequences, intended or otherwise.

### Introduction ###
flamingo-margin-maintainer is a margin maintenance bot for Flamingo FUSD.

flamingo-margin-maintainer loops through open `Vaults` which are specified by a set of `(collateralHash, fTokenHash, account)`. Once it finds a Vault eligible for margin maintenance, it transfers a quantity of the fToken and receives the collateral in exchange.

As of Dec 20, 2022, flamingo-margin-maintainer loops through the following cycle: 
*  Fetch the off-chain price of the collateral from the Flamingo API.
*  Fetch the on-chain prices of the fToken and the collateral from the Flamingo swap pools.
*  Compute the combined price (arithmetic average) of the collateral.
*  Fetch open Vaults that have minted the fToken against the collateral.
*  Loop through these Vaults. If `$FTOKEN_VALUE / $COLLATERAL_VALUE > MAX_LTV_THRESHOLD`, attempt margin maintenance by sending fTokens to the Vault.
*  If a pre-specified threshold is reached, convert the collateral into more fTokens on Flamingo pools.
*  Sleep

### Getting Started ###
*  Run `npm install` to install all dependencies.
*  Run `export NODE_ENV=test` to run on testnet, or `export NODE_ENV=prod` to run on mainnet.
*  Set up your wallet's private key by calling `export PRIVATE_KEY=<PRIVATE_KEY>` Do not share your private key with anybody. Ensure that your operating environment is secure.
*  Tune parameters as desired.
*  Run `npm run maintainer-dev` to run the bot.
*  Remember to start with `DRY_RUN=true` and check the output.

### Deploying to Production ###
*  Run `npm run build` to transpile the source to JavaScript.
*  Run `docker build -t flamingo_margin_maintainer .` to create a container image.
*  Run your image.

### Tunable Parameters ###
| Option | Description |
| --- | --- |
| `FTOKEN_SCRIPT_HASH` | The hash of the fToken that you would like to use to maintain. |
| `COLLATERAL_SCRIPT_HASH` | The hash of the collateral that you would like to receive through margin maintenance. |
| `WEBHOOK_URL` | A webhook URL that allows you to post notifications to a Discord server you own. Please refer to [Discord Webhooks](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks). |
| `MAINTAINER_NAME` | The name that is used when webhook messages are posted to disambiguate your process from others. |
| `MAINTENANCE_THRESHOLD` | The minimum margin maintenance quantity, expressed in FTokens. Liquidations smaller than this quantity will not be performed. |
| `LOW_BALANCE_THRESHOLD` | The balance under which the process will log a WARN and post an alert to the webhook URL, if specified. |
| `AUTO_SWAP` | Automatically swap collateral into FToken if `AUTO_SWAP === true && collateral balance > SWAP_THRESHOLD`. |
| `SWAP_THRESHOLD` | Automatically swap collateral into FToken if `AUTO_SWAP === true && collateral balance > SWAP_THRESHOLD`. |
| `VERIFY_WAIT_MILLIS` | The milliseconds that flamingo-margin-maintainer will wait for a transaction confirmation to be received before moving on to the next cycle. |
| `SLEEP_MILLIS` | The cycle duration expressed in milliseconds. flamingo-margin-maintainer will wait this duration betwen each cycle. It is recommended to set this duration to at least `15000`, as Neo blocks are generated every ~15s. |
| `DRY_RUN` | If set to true, output the computations without actually performing margin maintenance. Useful for testing and tuning parameters. |

Although other parameters do exist in the configuration, tinkering with these properties is not advised unless you are familiar with Neo N3 development.

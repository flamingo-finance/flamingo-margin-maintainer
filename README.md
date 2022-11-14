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
| `SLEEP_MILLIS` | The cycle duration expressed in milliseconds. arby will wait this duration betwen each cycle. It is meaningless to set this duration to less than `15000`, as Flamingo prices can't change between blocks which are generated every 15 seconds. |
| `DRY_RUN` | If set to true, output the computations without actually performing swaps. Useful for testing and tuning parameters. |

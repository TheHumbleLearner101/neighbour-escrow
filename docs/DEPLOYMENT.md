# Deployment (Base Sepolia)

Test network only. No private keys or secrets in this file.

## Live contract

| | |
| --- | --- |
| Contract | `Campaigns` |
| Address | `0x50729788eaEe25B1faF2680bcE87a147961F6A2e` |
| Network | Base Sepolia (chain id 84532) |
| Stablecoin | USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Deploy tx | `0x20ed7a592d2a5bc02b1bdcf37baabfd1be684c7cb92849e1ffd8b024b3f6193f` |
| Explorer | https://sepolia.basescan.org/address/0x50729788eaEe25B1faF2680bcE87a147961F6A2e |

The stablecoin address is a deployment parameter read from `USDC_ADDRESS` in `.env`, never hard-coded, so the same contract works with any ERC-20 stablecoin or on another chain such as Arc.

## Full loop proven on-chain

Two campaigns were run end to end from the command line, using the three Crossmint email wallets as backers and provider and a separate deployer account as creator. Gas for the wallet transactions was sponsored by Crossmint; the creator's calls were paid by the deployer.

**Campaign 1, happy path (status: Paid).** Goal 2 USDC. Backer A and Backer B each contributed 1 USDC, reaching the goal. The provider submitted proof, the creator confirmed, and the full 2 USDC was released to the provider.

**Campaign 2, refund path (status: Refunding).** Goal 2 USDC. Backer A contributed 0.5 USDC, the goal was missed, the funding deadline passed, and Backer A claimed the 0.5 USDC back.

After both, the contract holds 0 USDC: every campaign settled with nothing stuck.

## How to deploy again

1. Fill `.env` from `.env.example`: `BASE_SEPOLIA_RPC_URL`, `USDC_ADDRESS`, and a testnet-only `DEPLOYER_PRIVATE_KEY` that never holds real funds.
2. Fund the deployer address with a small amount of Base Sepolia ETH (about 0.0001 is enough; the deploy costs roughly 0.00002).
3. From `contracts/`: `forge script script/Deploy.s.sol:Deploy --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast`.
4. Record the printed address in `CAMPAIGNS_CONTRACT_ADDRESS`.

Note: the Crossmint email wallets cannot deploy a contract (their SDK requires a `to` address on every transaction, and deployment has none). A plain deployer account is needed for the deploy only. Everything after deployment runs through the Crossmint wallets, which can call the contract and have their gas sponsored.

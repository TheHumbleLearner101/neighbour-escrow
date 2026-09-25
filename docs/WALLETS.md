# Wallets (Base Sepolia testnet)

Milestone 1 record. Test network only. No private keys, no emails, no secrets in this file.

## The three wallets

Crossmint email-login smart wallets (Kernel / ERC-4337) on Base Sepolia. Each has had a server signer ("agent") authorised, so transactions can be signed server-side without a browser prompt. Each was funded with 20 test USDC from Circle's faucet.

| Role | Address | Server signer | Funded |
| --- | --- | --- | --- |
| Backer A | `0x1B3a8CfEc12Aa3bac017528C3D10cd6daF2EFd21` | authorised | 20 USDC |
| Backer B | `0xb93a68E71A6B609Bb2DD550faFF903dcdd3935aD` | authorised | 20 USDC |
| Provider | `0x473E0B6fC24c068d6e4dE538B298316Edf77a9D4` | authorised | 20 USDC |

USDC on Base Sepolia is `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Circle's, the only correct one).

## What this milestone proved

- Circle's real USDC can be held and sent by these email wallets. It is not USDXM: every balance and transfer below is the USDC contract above.
- The wallets can make arbitrary contract calls, not just token sends. The `approve` in Tx 2 is what the campaign contract will need for approve-then-contribute.
- Gas is sponsored. All three wallets hold 0 ETH and both transactions still went through, so backers never need to hold ETH.

## Transactions

Both signed by the server signer, verified by reading the transaction receipt and decoding the on-chain events.

| # | What | Hash | Result |
| --- | --- | --- | --- |
| 1 | Backer A sends 1 USDC to Provider | `0x516f723c410f5c65a61e69b118df3b9467dd52fa9689053bd72c9b960d7d0d40` | success, block 47277553, USDC Transfer event 1 USDC A to Provider |
| 2 | Backer A approves spender `0x…dEaD` for 1 USDC | `0x449aff56772fb1f6bc56cedb7789bc89e8caf1afc0739af8d522bcbfc2e89498` | success, block 47277576, allowance read back = 1 USDC |

Explorer: https://sepolia.basescan.org/tx/0x516f723c410f5c65a61e69b118df3b9467dd52fa9689053bd72c9b960d7d0d40 and https://sepolia.basescan.org/tx/0x449aff56772fb1f6bc56cedb7789bc89e8caf1afc0739af8d522bcbfc2e89498

## Balances before and after

| Wallet | Before | After | Change |
| --- | --- | --- | --- |
| Backer A | 20 USDC | 19 USDC | sent 1 |
| Backer B | 20 USDC | 20 USDC | none |
| Provider | 20 USDC | 21 USDC | received 1 |

ETH stayed at 0 on all three throughout.

## How to repeat this setup

1. Run the wallet app locally (the Crossmint quickstart the `/app` is built from). Dev server on `127.0.0.1:3000`.
2. Log in with an email address. A smart wallet is created automatically on first login. Enter the emailed one-time code. The codes expire quickly, so enter each one as soon as it arrives.
3. On the "Authorize agent" step, click authorise and approve the one-time code. This registers a server signer so transactions can be signed without a browser.
4. Fund the wallet with test USDC from Circle's faucet at faucet.circle.com: network Base Sepolia, token USDC, paste the wallet address, solve the CAPTCHA.
5. Gas is sponsored by Crossmint on Base Sepolia, so the wallets need no ETH.

Transactions are then run from a script that calls the Crossmint SDK: `wallet.send(recipient, "usdc", amount)` for a transfer, and `EVMWallet.from(wallet).sendTransaction({ to, abi, functionName, args })` for a contract call such as `approve`. Balances and receipts are checked directly against the Base Sepolia RPC.

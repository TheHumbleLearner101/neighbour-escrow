// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Campaigns} from "../src/Campaigns.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys Campaigns bound to the stablecoin at USDC_ADDRESS. The token address
/// comes from the environment, never hard-coded, so the same script serves USDC on Base
/// Sepolia today and any other stablecoin (or Arc) later.
contract Deploy is Script {
    function run() external returns (Campaigns campaigns) {
        address usdc = vm.envAddress("USDC_ADDRESS");
        require(usdc != address(0), "USDC_ADDRESS not set");

        vm.startBroadcast();
        campaigns = new Campaigns(IERC20(usdc));
        vm.stopBroadcast();

        console.log("Campaigns deployed at:", address(campaigns));
        console.log("Bound to stablecoin  :", usdc);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;
import {OFTAdapter} from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
contract Pyusd0OftAdapter is OFTAdapter { constructor(address token,address endpoint,address owner) OFTAdapter(token,endpoint,owner) Ownable(owner) {} }

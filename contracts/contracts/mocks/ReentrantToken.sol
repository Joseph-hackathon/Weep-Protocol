// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ReentrantToken (tests only)
 * @notice A hostile ERC-20: when armed, every transfer first calls back into a target contract (for example a
 * pool's payoutTeam) to try to move money twice. Used to prove WeepPay and TipPool can't be re-entered.
 */
contract ReentrantToken is ERC20 {
    address public target;
    bytes public data;
    bool private busy;

    constructor() ERC20("Hostile", "HOST") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(address _target, bytes calldata _data) external {
        target = _target;
        data = _data;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (target != address(0) && !busy && from != address(0)) {
            busy = true;
            (bool ok, bytes memory reason) = target.call(data);
            busy = false;
            if (!ok) {
                assembly { revert(add(reason, 32), mload(reason)) }
            }
        }
        super._update(from, to, value);
    }
}

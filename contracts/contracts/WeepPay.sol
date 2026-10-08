// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title WeepPay
 * @dev One payment to any list of people, each with an exact amount, in one transaction. The sender reviews
 * the exact recipients and amounts first; the contract then moves exactly that, straight from the sender to
 * each wallet. If any part fails, the whole payment reverts, so it either lands in full or not at all.
 * It holds no money, stores no rules and has no owner. Saved teams and their sharing rules stay in WeepVenues.
 */
contract WeepPay {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_RECIPIENTS = 100;

    IERC20 public immutable token;

    /// @dev `ref` lets the app tie a payment to what the sender reviewed (e.g. a hash of the allocation).
    event Paid(address indexed from, bytes32 indexed ref, uint256 total, uint256 recipients);

    constructor(address _token) {
        token = IERC20(_token);
    }

    /**
     * @param to       each recipient's wallet
     * @param amounts  each recipient's exact amount, in token units
     * @param total    the total the sender reviewed and approved; the payment reverts if the parts differ
     * @param ref      an optional reference for the payment
     */
    function pay(address[] calldata to, uint256[] calldata amounts, uint256 total, bytes32 ref) external {
        uint256 n = to.length;
        require(n > 0 && n <= MAX_RECIPIENTS, "Recipients");
        require(amounts.length == n, "Length mismatch");
        uint256 sum;
        for (uint256 i = 0; i < n; i++) {
            require(to[i] != address(0), "No wallet");
            require(amounts[i] > 0, "Zero amount");
            sum += amounts[i];
            token.safeTransferFrom(msg.sender, to[i], amounts[i]);
        }
        require(sum == total, "Total mismatch");
        emit Paid(msg.sender, ref, sum, n);
    }
}

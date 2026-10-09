// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title WeepPay
 * @notice One payment to many people, in one transaction: each person gets exactly their amount, or nobody
 * gets anything. The sender reviews the people, the amounts and Weep's fee first; the contract re-checks that
 * the parts add up to the reviewed total and that the fee is the one they saw, so nothing can be changed in
 * between. Weep's fee is paid on top by the sender: recipients always receive 100% of their amount.
 * There is no owner and no admin: the fee rate and its recipient are fixed when the contract is deployed.
 * The contract never holds money; everything moves straight from the sender.
 */
contract WeepPay is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_RECIPIENTS = 100;
    uint256 public constant MAX_FEE_BPS = 100; // 1%
    IERC20 public immutable token;
    uint256 public immutable feeBps;
    address public immutable feeRecipient;

    event Paid(address indexed from, bytes32 indexed ref, uint256 total, uint256 fee, uint256 recipients);

    constructor(IERC20 _token, uint256 _feeBps, address _feeRecipient) {
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        require(_feeRecipient != address(0) || _feeBps == 0, "No fee recipient");
        token = _token;
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;
    }

    /// @notice Weep's fee on a payment of `total`, rounded down. Paid on top by the sender.
    function feeFor(uint256 total) public view returns (uint256) {
        return (total * feeBps) / 10_000;
    }

    /**
     * @param to          every recipient, in order (up to 100)
     * @param amounts     each recipient's exact amount, same order
     * @param total       the total the sender reviewed; must equal the sum of `amounts`
     * @param expectedFee the fee the sender reviewed; must equal feeFor(total)
     * @param ref         a fingerprint of the reviewed list, for the record (no names or emails)
     */
    function pay(address[] calldata to, uint256[] calldata amounts, uint256 total, uint256 expectedFee, bytes32 ref) external nonReentrant {
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
        uint256 fee = feeFor(total);
        require(fee == expectedFee, "Fee mismatch");
        if (fee > 0) token.safeTransferFrom(msg.sender, feeRecipient, fee);
        emit Paid(msg.sender, ref, sum, fee, n);
    }
}

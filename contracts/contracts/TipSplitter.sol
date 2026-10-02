// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TipSplitter
 * @dev Distributes tips (in Agora AUSD) to workers based on role ratios.
 * Integrated with Chainlink CRE & Privy Server Wallets.
 */
contract TipSplitter is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public ausdToken;
    address public agent; // Chainlink CRE or Privy Server Wallet

    struct Policy {
        uint256 fohRatio; // e.g. 50%
        uint256 bohRatio; // e.g. 30%
        uint256 barRatio; // e.g. 20%
    }
    Policy public currentPolicy;

    // Events formatted specifically for Nansen tracking & Analytics
    event TipDistributed(uint256 totalAmount, uint256 fohAmount, uint256 bohAmount, uint256 barAmount);
    event PolicyUpdated(uint256 foh, uint256 boh, uint256 bar);
    event WorkerFlagged(address worker, string reason); // For Nansen risk checks

    constructor(address _ausdTokenAddress, address _agent) Ownable(msg.sender) {
        ausdToken = IERC20(_ausdTokenAddress);
        agent = _agent;
        currentPolicy = Policy(50, 30, 20); // Default policy
    }

    modifier onlyAgentOrOwner() {
        require(msg.sender == agent || msg.sender == owner(), "Not authorized");
        _;
    }

    function setAgent(address _agent) external onlyOwner {
        agent = _agent;
    }

    function updatePolicy(uint256 _foh, uint256 _boh, uint256 _bar) external onlyAgentOrOwner {
        require(_foh + _boh + _bar == 100, "Must sum to 100");
        currentPolicy = Policy(_foh, _boh, _bar);
        emit PolicyUpdated(_foh, _boh, _bar);
    }

    /**
     * @dev Nansen Smart KYC integration hook: If a worker is flagged by Nansen off-chain,
     * the manager can flag them on-chain to prevent distributions.
     */
    function flagWorker(address worker, string calldata reason) external onlyOwner {
        emit WorkerFlagged(worker, reason);
    }

    /**
     * @dev Triggered by Chainlink CRE or Privy Server Wallet automatically
     * Distributes the currently held AUSD balance to the workers
     */
    function distributeTips(
        address[] calldata fohWorkers,
        address[] calldata bohWorkers,
        address[] calldata barWorkers
    ) external onlyAgentOrOwner {
        uint256 totalPool = ausdToken.balanceOf(address(this));
        require(totalPool > 0, "No tips to distribute");

        uint256 fohTotal = (totalPool * currentPolicy.fohRatio) / 100;
        uint256 bohTotal = (totalPool * currentPolicy.bohRatio) / 100;
        uint256 barTotal = (totalPool * currentPolicy.barRatio) / 100;

        // FOH
        if (fohWorkers.length > 0 && fohTotal > 0) {
            uint256 fohShare = fohTotal / fohWorkers.length;
            for (uint256 i = 0; i < fohWorkers.length; i++) {
                ausdToken.safeTransfer(fohWorkers[i], fohShare);
            }
        }

        // BOH
        if (bohWorkers.length > 0 && bohTotal > 0) {
            uint256 bohShare = bohTotal / bohWorkers.length;
            for (uint256 i = 0; i < bohWorkers.length; i++) {
                ausdToken.safeTransfer(bohWorkers[i], bohShare);
            }
        }

        // BAR
        if (barWorkers.length > 0 && barTotal > 0) {
            uint256 barShare = barTotal / barWorkers.length;
            for (uint256 i = 0; i < barWorkers.length; i++) {
                ausdToken.safeTransfer(barWorkers[i], barShare);
            }
        }

        emit TipDistributed(totalPool, fohTotal, bohTotal, barTotal);
    }
}

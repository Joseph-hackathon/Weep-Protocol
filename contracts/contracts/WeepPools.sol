// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TipPool.sol";

/**
 * @title WeepPools
 * @notice Gives every business its own tip pool. One call creates the pool (a minimal clone of TipPool, a few
 * hundred thousand gas instead of millions), saves the split and the team, and makes the caller its owner.
 * One pool per owner, at an address anyone can work out in advance (predict), so a business can approve its
 * team's wallets before the pool exists. Every pool gets the same fee rate and recipient, fixed here at
 * deployment. The factory has no owner and holds no money.
 */
contract WeepPools {
    uint256 public constant MAX_FEE_BPS = 100; // 1%

    address public immutable implementation;
    IERC20 public immutable token;
    uint256 public immutable feeBps;
    address public immutable feeRecipient;

    mapping(address => address) public poolOf; // owner => their pool
    mapping(address => bool) public isPool;    // pool => created here

    event PoolCreated(address indexed owner, address pool);

    constructor(IERC20 _token, uint256 _feeBps, address _feeRecipient) {
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        require(_feeRecipient != address(0) || _feeBps == 0, "No fee recipient");
        token = _token;
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;
        implementation = address(new TipPool());
    }

    function predict(address owner) public view returns (address) {
        return Clones.predictDeterministicAddress(implementation, _salt(owner));
    }

    /// @notice Create your pool with its split and team, in one transaction. You become its owner.
    function create(
        uint256 foh, uint256 boh, uint256 bar,
        string[] calldata names, address[] calldata wallets, uint8[] calldata groups
    ) external returns (address pool) {
        require(poolOf[msg.sender] == address(0), "Already has a pool");
        pool = Clones.cloneDeterministic(implementation, _salt(msg.sender));
        TipPool(pool).initialize(msg.sender, foh, boh, bar, names, wallets, groups);
        poolOf[msg.sender] = pool;
        isPool[pool] = true;
        emit PoolCreated(msg.sender, pool);
    }

    function _salt(address owner) private pure returns (bytes32) {
        return bytes32(uint256(uint160(owner)));
    }
}

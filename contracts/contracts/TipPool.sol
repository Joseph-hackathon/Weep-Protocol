// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev The fixed settings every pool copies from the factory that creates it (WeepPools).
interface IPoolSettings {
    function token() external view returns (IERC20);
    function feeBps() external view returns (uint256);
    function feeRecipient() external view returns (address);
}

/**
 * @title TipPool
 * @notice One business's tip pool: its team (names, wallets, groups), how team tips are split between the
 * floor, kitchen and bar, tips to one person by name, team tips, and payouts. Each business gets its own copy,
 * created by WeepPools as a minimal clone and owned by the business's wallet.
 *
 * Money rules:
 *  - Weep's fee is paid on top by the guest; the person or the team always receives 100% of the tip.
 *  - The fee rate and recipient are copied once from WeepPools' fixed settings, and can't be changed.
 *  - A guest's tip is checked against what they reviewed: the fee, and for a named tip the person's wallet.
 *  - Anyone can pay the pool out, but only to the saved team, by the saved split.
 *  - Team tips waiting in the pool are paid out by the rules they were given under: the owner can't change the
 *    team or the split until they've been paid out.
 */
contract TipPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_TEAM = 100;

    struct Policy {
        uint256 fohRatio; // floor (front of house), percent
        uint256 bohRatio; // kitchen (back of house), percent
        uint256 barRatio; // bar, percent
    }

    struct Member {
        string name;
        address wallet;
        uint8 group; // 0 floor, 1 kitchen, 2 bar
    }

    IERC20 public ausdToken;
    address public owner;
    uint256 public feeBps;
    address public feeRecipient;
    Policy public currentPolicy;
    mapping(string => address) public employeeWallets;
    Member[] private team;
    /// @notice Team tips received through tipTeam and not yet paid out. Tokens sent to the pool any other way
    /// don't count, so nobody can block a change by sending the pool a stray amount.
    uint256 public pendingTips;

    event TipDistributed(address indexed by, uint256 totalAmount, uint256 fohAmount, uint256 bohAmount, uint256 barAmount);
    event PolicyUpdated(uint256 foh, uint256 boh, uint256 bar);
    event EmployeeRegistered(string identifier, address wallet);
    event IndividualTip(string identifier, address wallet, uint256 amount, uint256 fee);
    event TeamTip(address indexed from, uint256 amount, uint256 fee);
    event TeamSet(uint256 size);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    /// @dev The implementation itself can never be set up; only its clones can, once each.
    constructor() {
        owner = address(this);
    }

    /**
     * @notice Called once by WeepPools in the same transaction that creates the clone. The token, the fee rate
     * and the fee recipient are read from the calling factory's fixed settings, so they can't be chosen here.
     */
    function initialize(
        address _owner,
        uint256 foh, uint256 boh, uint256 bar,
        string[] calldata names, address[] calldata wallets, uint8[] calldata groups
    ) external {
        require(owner == address(0), "Already set up");
        require(_owner != address(0), "No owner");
        IPoolSettings factory = IPoolSettings(msg.sender);
        ausdToken = factory.token();
        feeBps = factory.feeBps();
        feeRecipient = factory.feeRecipient();
        owner = _owner;
        _setPolicy(foh, boh, bar);
        _setTeam(names, wallets, groups);
    }

    /// @notice Change the split and the whole team in one transaction. Owner only.
    function configure(
        uint256 foh, uint256 boh, uint256 bar,
        string[] calldata names, address[] calldata wallets, uint8[] calldata groups
    ) external onlyOwner {
        // Tips waiting in the pool go out by the rules they arrived under. The one exception is a pool whose rules
        // pay nobody on its team: payout can't run there, so the owner must be able to fix it.
        require(pendingTips == 0 || !_paysSomeone(), "Pay out pending tips first");
        _setPolicy(foh, boh, bar);
        _setTeam(names, wallets, groups);
    }

    function getTeam() external view returns (Member[] memory) {
        return team;
    }

    /// @notice Weep's fee on a tip of `amount`, rounded down. Paid on top by the guest.
    function feeFor(uint256 amount) public view returns (uint256) {
        return (amount * feeBps) / 10_000;
    }

    /**
     * @notice A tip to one person by name: 100% straight from the guest to them, never through the pool.
     * @param expectedWallet the wallet the guest saw for that name; if the team changed since, nothing moves
     * @param expectedFee    the fee the guest reviewed
     */
    function tipIndividual(string calldata identifier, address expectedWallet, uint256 amount, uint256 expectedFee) external nonReentrant {
        address recipient = employeeWallets[identifier];
        require(recipient != address(0), "Employee not registered");
        require(recipient == expectedWallet, "Recipient changed");
        require(amount > 0, "Amount must be greater than zero");
        uint256 fee = _checkedFee(amount, expectedFee);
        ausdToken.safeTransferFrom(msg.sender, recipient, amount);
        if (fee > 0) ausdToken.safeTransferFrom(msg.sender, feeRecipient, fee);
        emit IndividualTip(identifier, recipient, amount, fee);
    }

    /// @notice A tip to the whole team: it waits in the pool until it's paid out by the split.
    function tipTeam(uint256 amount, uint256 expectedFee) external nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        uint256 fee = _checkedFee(amount, expectedFee);
        pendingTips += amount;
        ausdToken.safeTransferFrom(msg.sender, address(this), amount);
        if (fee > 0) ausdToken.safeTransferFrom(msg.sender, feeRecipient, fee);
        emit TeamTip(msg.sender, amount, fee);
    }

    /**
     * @notice Pay the whole pool to the saved team by the saved split, evenly within each group. Anyone can call
     * it: the money can only go to the team. A group with nobody in it hands its share to the groups that have
     * people. A remainder from rounding (well under a cent) stays for the next payout.
     */
    function payoutTeam() external nonReentrant {
        uint256 totalPool = ausdToken.balanceOf(address(this));
        require(totalPool > 0, "No tips to distribute");
        require(team.length > 0, "No team");

        uint256[3] memory counts;
        for (uint256 i = 0; i < team.length; i++) counts[team[i].group]++;
        uint256[3] memory ratios = [currentPolicy.fohRatio, currentPolicy.bohRatio, currentPolicy.barRatio];
        uint256 activeRatio;
        for (uint256 g = 0; g < 3; g++) if (counts[g] > 0) activeRatio += ratios[g];
        require(activeRatio > 0, "Policy pays no one on the team");
        pendingTips = 0; // everything in the pool is paid out now, by the current rules

        uint256[3] memory totals;
        for (uint256 g = 0; g < 3; g++) if (counts[g] > 0) totals[g] = (totalPool * ratios[g]) / activeRatio;
        for (uint256 i = 0; i < team.length; i++) {
            uint8 g = team[i].group;
            uint256 share = totals[g] / counts[g];
            if (share > 0) ausdToken.safeTransfer(team[i].wallet, share);
        }
        emit TipDistributed(msg.sender, totalPool, totals[0], totals[1], totals[2]);
    }

    /// @dev Whether a payout would pay anyone: someone on the team is in a group the split gives a share to.
    function _paysSomeone() private view returns (bool) {
        uint256[3] memory ratios = [currentPolicy.fohRatio, currentPolicy.bohRatio, currentPolicy.barRatio];
        for (uint256 i = 0; i < team.length; i++) if (ratios[team[i].group] > 0) return true;
        return false;
    }

    function _checkedFee(uint256 amount, uint256 expectedFee) private view returns (uint256 fee) {
        fee = feeFor(amount);
        require(fee == expectedFee, "Fee mismatch");
    }

    function _setPolicy(uint256 foh, uint256 boh, uint256 bar) private {
        require(foh + boh + bar == 100, "Must sum to 100");
        currentPolicy = Policy(foh, boh, bar);
        emit PolicyUpdated(foh, boh, bar);
    }

    function _setTeam(string[] calldata names, address[] calldata wallets, uint8[] calldata groups) private {
        require(names.length == wallets.length && names.length == groups.length, "Length mismatch");
        require(names.length <= MAX_TEAM, "Too many people");
        for (uint256 i = 0; i < team.length; i++) delete employeeWallets[team[i].name];
        delete team;
        for (uint256 i = 0; i < names.length; i++) {
            require(bytes(names[i]).length > 0, "Empty name");
            require(wallets[i] != address(0), "No wallet");
            require(groups[i] < 3, "Bad group");
            require(employeeWallets[names[i]] == address(0), "Duplicate name");
            employeeWallets[names[i]] = wallets[i];
            team.push(Member(names[i], wallets[i], groups[i]));
            emit EmployeeRegistered(names[i], wallets[i]);
        }
        emit TeamSet(names.length);
    }
}

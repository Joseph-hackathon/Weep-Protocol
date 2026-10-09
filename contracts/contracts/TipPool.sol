// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TipPool
 * @notice One business's tip pool: its team (names, wallets, groups), how team tips are split between the
 * floor, kitchen and bar, tips to one person by name, and payouts. Each business gets its own copy, created by
 * WeepPools as a minimal clone, so any venue can set up in one transaction and only it controls its pool.
 * The functions the app uses match the original TipSplitter, so one interface serves both.
 */
contract TipPool {
    using SafeERC20 for IERC20;

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
    address public agent;
    Policy public currentPolicy;
    mapping(string => address) public employeeWallets;
    Member[] private team;

    event TipDistributed(uint256 totalAmount, uint256 fohAmount, uint256 bohAmount, uint256 barAmount);
    event PolicyUpdated(uint256 foh, uint256 boh, uint256 bar);
    event EmployeeRegistered(string identifier, address wallet);
    event IndividualTip(string identifier, address wallet, uint256 amount);
    event TeamSet(uint256 size);
    event AgentSet(address agent);

    modifier onlyAgentOrOwner() {
        require(msg.sender == owner || (agent != address(0) && msg.sender == agent), "Not authorized");
        _;
    }

    /// @dev The implementation itself can never be set up; only its clones can, once each.
    constructor() {
        owner = address(this);
    }

    /// @notice Called once by WeepPools in the same transaction that creates the clone.
    function initialize(
        IERC20 token,
        address _owner,
        uint256 foh, uint256 boh, uint256 bar,
        string[] calldata names, address[] calldata wallets, uint8[] calldata groups
    ) external {
        require(owner == address(0), "Already set up");
        require(_owner != address(0), "No owner");
        ausdToken = token;
        owner = _owner;
        _setPolicy(foh, boh, bar);
        _setTeam(names, wallets, groups);
    }

    function setAgent(address _agent) external {
        require(msg.sender == owner, "Not authorized");
        agent = _agent;
        emit AgentSet(_agent);
    }

    /// @notice Change the split and the whole team in one transaction.
    function configure(
        uint256 foh, uint256 boh, uint256 bar,
        string[] calldata names, address[] calldata wallets, uint8[] calldata groups
    ) external onlyAgentOrOwner {
        _setPolicy(foh, boh, bar);
        _setTeam(names, wallets, groups);
    }

    function updatePolicy(uint256 foh, uint256 boh, uint256 bar) external onlyAgentOrOwner {
        _setPolicy(foh, boh, bar);
    }

    function setTeam(string[] calldata names, address[] calldata wallets, uint8[] calldata groups) external onlyAgentOrOwner {
        _setTeam(names, wallets, groups);
    }

    function getTeam() external view returns (Member[] memory) {
        return team;
    }

    /// @notice A tip to one person by name goes straight from the guest to them, 100%; it never enters the pool.
    function tipIndividual(string calldata identifier, uint256 amount) external {
        address recipient = employeeWallets[identifier];
        require(recipient != address(0), "Employee not registered");
        require(amount > 0, "Amount must be greater than zero");
        ausdToken.safeTransferFrom(msg.sender, recipient, amount);
        emit IndividualTip(identifier, recipient, amount);
    }

    /**
     * @notice Pay the whole pool to the team by the split, evenly within each group. A group with nobody in it
     * hands its share to the groups that have people. A remainder from rounding (well under a cent) stays for
     * the next payout.
     */
    function payoutTeam() external onlyAgentOrOwner {
        uint256 totalPool = ausdToken.balanceOf(address(this));
        require(totalPool > 0, "No tips to distribute");
        require(team.length > 0, "No team");

        uint256[3] memory counts;
        for (uint256 i = 0; i < team.length; i++) counts[team[i].group]++;
        uint256[3] memory ratios = [currentPolicy.fohRatio, currentPolicy.bohRatio, currentPolicy.barRatio];
        uint256 activeRatio;
        for (uint256 g = 0; g < 3; g++) if (counts[g] > 0) activeRatio += ratios[g];
        require(activeRatio > 0, "Policy pays no one on the team");

        uint256[3] memory totals;
        for (uint256 g = 0; g < 3; g++) if (counts[g] > 0) totals[g] = (totalPool * ratios[g]) / activeRatio;
        for (uint256 i = 0; i < team.length; i++) {
            uint8 g = team[i].group;
            uint256 share = totals[g] / counts[g];
            if (share > 0) ausdToken.safeTransfer(team[i].wallet, share);
        }
        emit TipDistributed(totalPool, totals[0], totals[1], totals[2]);
    }

    function _setPolicy(uint256 foh, uint256 boh, uint256 bar) private {
        require(foh + boh + bar == 100, "Must sum to 100");
        currentPolicy = Policy(foh, boh, bar);
        emit PolicyUpdated(foh, boh, bar);
    }

    function _setTeam(string[] calldata names, address[] calldata wallets, uint8[] calldata groups) private {
        require(names.length == wallets.length && names.length == groups.length, "Length mismatch");
        require(names.length <= 100, "Too many people");
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

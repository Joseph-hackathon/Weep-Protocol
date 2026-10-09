// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @notice Chainlink CRE's receiver interface: the Forwarder calls onReport with a report the DON signed.
interface IReceiver is IERC165 {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

/**
 * @title WeepPolicyRegistry
 * @notice Records the tip policy that Weep's Chainlink CRE workflow read from a business's own words:
 * the split between floor, kitchen and bar, and each person's first name and group. One entry per pool.
 *
 * It's a record, not a control. It holds no money and has no power over any pool: a business still reviews
 * the proposal and saves it to its own pool itself. Emails and wallets are never part of a report.
 *
 * Only the Chainlink Forwarder set at deployment can write. A report is accepted only if the pool owner could
 * also save it (split adds up to 100, at most 100 people, every group known), so a bad read can't be recorded.
 */
contract WeepPolicyRegistry is IReceiver {
    uint256 public constant MAX_TEAM = 100;

    address public immutable forwarder;

    struct Policy {
        uint8 foh;
        uint8 boh;
        uint8 bar;
        bytes32 descriptionHash; // keccak256 of the business's description, so a proposal can be matched to it
        uint64 attestedAt;
        string[] names;
        uint8[] groups; // 0 floor, 1 kitchen, 2 bar
    }

    mapping(address => Policy) private policies;

    event PolicyAttested(address indexed pool, bytes32 descriptionHash, uint8 foh, uint8 boh, uint8 bar, string[] names, uint8[] groups);

    error InvalidSender(address sender);
    error InvalidPolicy();

    constructor(address _forwarder) {
        require(_forwarder != address(0), "Forwarder required");
        forwarder = _forwarder;
    }

    function onReport(bytes calldata, bytes calldata report) external override {
        if (msg.sender != forwarder) revert InvalidSender(msg.sender);
        (address pool, bytes32 descriptionHash, uint8 foh, uint8 boh, uint8 bar, string[] memory names, uint8[] memory groups) =
            abi.decode(report, (address, bytes32, uint8, uint8, uint8, string[], uint8[]));

        if (pool == address(0) || uint256(foh) + boh + bar != 100) revert InvalidPolicy();
        if (names.length == 0 || names.length > MAX_TEAM || names.length != groups.length) revert InvalidPolicy();
        for (uint256 i = 0; i < groups.length; i++) {
            if (groups[i] > 2 || bytes(names[i]).length == 0) revert InvalidPolicy();
        }

        policies[pool] = Policy(foh, boh, bar, descriptionHash, uint64(block.timestamp), names, groups);
        emit PolicyAttested(pool, descriptionHash, foh, boh, bar, names, groups);
    }

    /// @notice The latest attested policy for a pool; attestedAt is 0 if there is none.
    function policyOf(address pool) external view returns (Policy memory) {
        return policies[pool];
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}

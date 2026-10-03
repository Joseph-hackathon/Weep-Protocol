// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title WeepVenues
 * @dev Any business opens its own venue: a name, a team (name, wallet, group) and a split rule.
 * Tips are pushed straight into the team's wallets in the same transaction, so nothing waits in a pool
 * and nobody has to claim or pay out. Only a venue's admin can change that venue; nobody can move
 * anyone else's money.
 */
contract WeepVenues {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_TEAM = 50;

    struct Member {
        string name;
        address wallet;
        uint8 group; // 0 floor (front of house), 1 kitchen (back of house), 2 bar
    }

    struct Venue {
        string name;
        address admin;
        uint8[3] split; // whole percent per group, sums to 100
        uint256 tipped; // all-time total tipped to this venue, in token units
        Member[] team;
    }

    IERC20 public immutable token;
    Venue[] private venues;
    mapping(address => uint256[]) private adminVenues;

    event VenueCreated(uint256 indexed venueId, address indexed admin, string name);
    event VenueUpdated(uint256 indexed venueId);
    event AdminChanged(uint256 indexed venueId, address indexed admin);
    event TeamTip(uint256 indexed venueId, address indexed from, uint256 amount);
    event PersonTip(uint256 indexed venueId, address indexed from, address indexed to, string name, uint256 amount);

    constructor(address _token) {
        token = IERC20(_token);
    }

    modifier onlyAdmin(uint256 venueId) {
        require(venueId < venues.length, "No such venue");
        require(msg.sender == venues[venueId].admin, "Not your venue");
        _;
    }

    // --- Set up ---

    function createVenue(
        string calldata name,
        uint8[3] calldata split,
        string[] calldata names,
        address[] calldata wallets,
        uint8[] calldata groups
    ) external returns (uint256 venueId) {
        venueId = venues.length;
        Venue storage v = venues.push();
        v.admin = msg.sender;
        _write(v, name, split, names, wallets, groups);
        adminVenues[msg.sender].push(venueId);
        emit VenueCreated(venueId, msg.sender, name);
    }

    function updateVenue(
        uint256 venueId,
        string calldata name,
        uint8[3] calldata split,
        string[] calldata names,
        address[] calldata wallets,
        uint8[] calldata groups
    ) external onlyAdmin(venueId) {
        Venue storage v = venues[venueId];
        delete v.team;
        _write(v, name, split, names, wallets, groups);
        emit VenueUpdated(venueId);
    }

    function setAdmin(uint256 venueId, address admin) external onlyAdmin(venueId) {
        require(admin != address(0), "No admin");
        venues[venueId].admin = admin;
        adminVenues[admin].push(venueId);
        emit AdminChanged(venueId, admin);
    }

    function _write(
        Venue storage v,
        string calldata name,
        uint8[3] calldata split,
        string[] calldata names,
        address[] calldata wallets,
        uint8[] calldata groups
    ) private {
        require(bytes(name).length > 0 && bytes(name).length <= 60, "Bad venue name");
        require(uint256(split[0]) + split[1] + split[2] == 100, "Split must sum to 100");
        require(names.length > 0 && names.length <= MAX_TEAM, "Team size");
        require(names.length == wallets.length && names.length == groups.length, "Length mismatch");
        for (uint256 i = 0; i < names.length; i++) {
            require(bytes(names[i]).length > 0 && bytes(names[i]).length <= 40, "Bad name");
            require(wallets[i] != address(0), "No wallet");
            require(groups[i] < 3, "Bad group");
            for (uint256 j = 0; j < i; j++) {
                require(keccak256(bytes(names[j])) != keccak256(bytes(names[i])), "Duplicate name");
            }
            v.team.push(Member(names[i], wallets[i], groups[i]));
        }
        v.name = name;
        v.split = split;
    }

    // --- Tip ---

    /**
     * @dev Tip the whole team: split by the venue's rule, evenly within each group, straight to every wallet.
     * A group with nobody in it hands its share to the groups that have people. The last person paid also
     * gets the rounding remainder, so exactly `amount` leaves the customer and nothing is left anywhere.
     */
    function tipTeam(uint256 venueId, uint256 amount) external {
        require(venueId < venues.length, "No such venue");
        require(amount > 0, "Amount must be greater than zero");
        Venue storage v = venues[venueId];
        uint256 n = v.team.length;

        uint256[3] memory counts;
        for (uint256 i = 0; i < n; i++) counts[v.team[i].group]++;
        uint256 active;
        for (uint256 g = 0; g < 3; g++) if (counts[g] > 0) active += v.split[g];
        require(active > 0, "Split pays no one on the team");

        uint256 sent;
        for (uint256 i = 0; i < n; i++) {
            Member storage m = v.team[i];
            uint256 share = i == n - 1 ? amount - sent : (amount * v.split[m.group]) / active / counts[m.group];
            sent += share;
            if (share > 0) token.safeTransferFrom(msg.sender, m.wallet, share);
        }
        v.tipped += amount;
        emit TeamTip(venueId, msg.sender, amount);
    }

    /** @dev Tip one person by name: all of it goes straight to their wallet. */
    function tipPerson(uint256 venueId, string calldata name, uint256 amount) external {
        require(venueId < venues.length, "No such venue");
        require(amount > 0, "Amount must be greater than zero");
        Venue storage v = venues[venueId];
        bytes32 key = keccak256(bytes(name));
        for (uint256 i = 0; i < v.team.length; i++) {
            if (keccak256(bytes(v.team[i].name)) == key) {
                token.safeTransferFrom(msg.sender, v.team[i].wallet, amount);
                v.tipped += amount;
                emit PersonTip(venueId, msg.sender, v.team[i].wallet, name, amount);
                return;
            }
        }
        revert("No one by that name");
    }

    // --- Read ---

    function venueCount() external view returns (uint256) {
        return venues.length;
    }

    function getVenue(uint256 venueId)
        external
        view
        returns (string memory name, address admin, uint8[3] memory split, uint256 tipped, Member[] memory team)
    {
        require(venueId < venues.length, "No such venue");
        Venue storage v = venues[venueId];
        return (v.name, v.admin, v.split, v.tipped, v.team);
    }

    /** @dev Venues this wallet has run (check `admin` on each: it may have been handed on since). */
    function venuesOf(address admin) external view returns (uint256[] memory) {
        return adminVenues[admin];
    }
}

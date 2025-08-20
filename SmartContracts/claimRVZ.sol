// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IRVZToken {
    function mint(address to, uint256 amount) external;
}

contract ClaimRVZ is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    IRVZToken public rvzToken;
    uint256 public claimAmount;

    mapping(address => bool) private hasClaimed;

    event Claimed(address indexed user, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address rvzTokenAddress, uint256 _claimAmount) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        rvzToken = IRVZToken(rvzTokenAddress);
        claimAmount = _claimAmount;
    }

    /// @notice Permite a un usuario reclamar su cantidad inicial de RVZ tokens
    function claim() external {
        require(!hasClaimed[msg.sender], "Claim already done");

        hasClaimed[msg.sender] = true;
        rvzToken.mint(msg.sender, claimAmount);

        emit Claimed(msg.sender, claimAmount);
    }

    /// @notice Consulta si una dirección ya hizo su claim inicial
    function checkClaimed(address user) external view returns (bool) {
        return hasClaimed[user];
    }

    /// @notice Actualiza la cantidad de tokens para el claim (solo owner)
    function updateClaimAmount(uint256 newAmount) external onlyOwner {
        claimAmount = newAmount;
    }

    /// @notice Actualiza la dirección del token RVZ (solo owner)
    function updateRVZToken(address newAddress) external onlyOwner {
        rvzToken = IRVZToken(newAddress);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IRVZToken {
    function burnFrom(address account, uint256 amount) external;
    function mint(address to, uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function burn(uint256 amount) external;
}

// Permit2 interface for signature-based transfers
interface IPermit2 {
    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;
}

// World ID interface for on-chain verification
interface IWorldID {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external;
}

contract PetitionRegistry is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public petitionCount;
    address public rvzTokenAddress;
    address public permit2Address;
    IWorldID public worldIdRouter;
    uint256 public burnAmount;
    uint256 public rewardAmount;
    uint256 public rewardCooldown;
    uint256 public groupId;

    struct Petition {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 goal; // Meta de apoyos
        uint256 supportCount; // Número de personas que han apoyado
        uint256 createdAt;
    }

    mapping(uint256 => Petition) public petitions;
    mapping(address => uint256) public lastRewardAt;

    event PetitionCreated(
        uint256 indexed id,
        address indexed creator,
        string title,
        string description,
        uint256 goal,
        uint256 createdAt
    );

    event PetitionSupported(
        uint256 indexed petitionId,
        address indexed supporter,
        uint256 newSupportCount
    );

    event TokensBurned(
        uint256 indexed petitionId,
        address indexed creator,
        uint256 amount
    );

    event RewardClaimed(
        address indexed supporter,
        uint256 amount,
        uint256 timestamp
    );

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _rvzTokenAddress,
        address _permit2Address,
        address _worldIdRouterAddress,
        uint256 _burnAmount,
        uint256 _rewardAmount
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        rvzTokenAddress = _rvzTokenAddress;
        permit2Address = _permit2Address;
        worldIdRouter = IWorldID(_worldIdRouterAddress);
        burnAmount = _burnAmount;
        rewardAmount = _rewardAmount;
        rewardCooldown = 6 hours;
        groupId = 1;
    }

    function createPetition(
        string memory _title,
        string memory _description,
        uint256 _goal
    ) external {
        // Check user's RVZ balance
        uint256 balance = IRVZToken(rvzTokenAddress).balanceOf(msg.sender);
        require(
            balance >= burnAmount,
            "Insufficient RVZ balance to create petition"
        );

        // Burn tokens directly from user's balance
        // Note: User must have approved this contract to spend their tokens
        IRVZToken(rvzTokenAddress).burnFrom(msg.sender, burnAmount);

        petitionCount++;
        petitions[petitionCount] = Petition({
            id: petitionCount,
            creator: msg.sender,
            title: _title,
            description: _description,
            goal: _goal,
            supportCount: 0,
            createdAt: block.timestamp
        });

        emit PetitionCreated(
            petitionCount,
            msg.sender,
            _title,
            _description,
            _goal,
            block.timestamp
        );

        emit TokensBurned(
            petitionCount,
            msg.sender,
            burnAmount
        );
    }

    function createPetitionWithPermit2(
        string memory _title,
        string memory _description,
        uint256 _goal,
        IPermit2.PermitTransferFrom calldata permit,
        bytes calldata signature
    ) external {
        // Verify the permit parameters
        require(permit.permitted.token == rvzTokenAddress, "Invalid token");
        require(permit.permitted.amount >= burnAmount, "Insufficient amount");
        require(permit.deadline > block.timestamp, "Permit expired");

        // Transfer tokens from user to this contract using Permit2
        IPermit2(permit2Address).permitTransferFrom(
            permit,
            IPermit2.SignatureTransferDetails({
                to: address(this),
                requestedAmount: burnAmount
            }),
            msg.sender,
            signature
        );

        // Burn the tokens
        IRVZToken(rvzTokenAddress).burn(burnAmount);

        petitionCount++;
        petitions[petitionCount] = Petition({
            id: petitionCount,
            creator: msg.sender,
            title: _title,
            description: _description,
            goal: _goal,
            supportCount: 0,
            createdAt: block.timestamp
        });

        emit PetitionCreated(
            petitionCount,
            msg.sender,
            _title,
            _description,
            _goal,
            block.timestamp
        );

        emit TokensBurned(
            petitionCount,
            msg.sender,
            burnAmount
        );
    }

    function supportPetition(
        uint256 _petitionId,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        require(_petitionId > 0 && _petitionId <= petitionCount, "Petition does not exist");

        // Recreate the signal hash from the petition ID string to match the frontend
        uint256 signalHash = uint256(keccak256(abi.encodePacked(uintToString(_petitionId))));

        // Recreate the external nullifier hash from the action string
        uint256 externalNullifierHash = uint256(keccak256(abi.encodePacked("support-petition")));

        worldIdRouter.verifyProof(
            root,
            groupId,
            signalHash,
            nullifierHash,
            externalNullifierHash,
            proof
        );

        petitions[_petitionId].supportCount += 1;

        emit PetitionSupported(
            _petitionId,
            msg.sender,
            petitions[_petitionId].supportCount
        );

        if (block.timestamp >= lastRewardAt[msg.sender] + rewardCooldown) {
            lastRewardAt[msg.sender] = block.timestamp;
            IRVZToken(rvzTokenAddress).mint(msg.sender, rewardAmount);
            emit RewardClaimed(msg.sender, rewardAmount, block.timestamp);
        }
    }

    function uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // Update functions for owner to change parameters
    function updateBurnAmount(uint256 _newBurnAmount) external onlyOwner {
        burnAmount = _newBurnAmount;
    }

    function updateRewardAmount(uint256 _newRewardAmount) external onlyOwner {
        rewardAmount = _newRewardAmount;
    }

    function updateRVZTokenAddress(address _newAddress) external onlyOwner {
        rvzTokenAddress = _newAddress;
    }

    function updatePermit2Address(address _newAddress) external onlyOwner {
        permit2Address = _newAddress;
    }

    function updateWorldIdRouter(address _newAddress) external onlyOwner {
        worldIdRouter = IWorldID(_newAddress);
    }

    function updateRewardCooldown(uint256 _newCooldown) external onlyOwner {
        rewardCooldown = _newCooldown;
    }

    function updateGroupId(uint256 _newGroupId) external onlyOwner {
        groupId = _newGroupId;
    }

    // Emergency function to withdraw tokens (only owner)
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = IRVZToken(rvzTokenAddress).balanceOf(address(this));
        if (balance > 0) {
            IRVZToken(rvzTokenAddress).transfer(owner(), balance);
        }
    }

    // View functions
    function getPetition(uint256 _petitionId) external view returns (Petition memory) {
        require(_petitionId > 0 && _petitionId <= petitionCount, "Petition does not exist");
        return petitions[_petitionId];
    }

    function getContractTokenBalance() external view returns (uint256) {
        return IRVZToken(rvzTokenAddress).balanceOf(address(this));
    }
}

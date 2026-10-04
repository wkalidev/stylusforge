// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract StylusForgeNFT is ERC1155, Ownable, EIP712 {
    struct Lesson {
        string name;
        uint256 xp;
        bool exists;
    }

    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("Claim(address student,uint256 lessonId,uint256 deadline)");

    mapping(uint256 => Lesson) public lessons;
    uint256[] private _lessonIds;
    mapping(address => mapping(uint256 => bool)) public completed;

    /// @notice Backend address whose EIP-712 signatures authorize certificate claims.
    address public signer;

    event LessonAdded(uint256 indexed lessonId, string name, uint256 xp);
    event LessonCompleted(address indexed student, uint256 indexed lessonId);
    event SignerUpdated(address indexed previousSigner, address indexed newSigner);

    error InvalidLesson(uint256 lessonId);
    error LessonAlreadyExists(uint256 lessonId);
    error AlreadyCompleted(address student, uint256 lessonId);
    error SoulBound();
    error InvalidSigner();
    error InvalidSignature();
    error ClaimExpired(uint256 deadline);

    constructor() ERC1155("") Ownable(msg.sender) EIP712("StylusForge", "1") {}

    function addLesson(uint256 lessonId, string calldata name, uint256 xp) external onlyOwner {
        if (lessonId == 0) revert InvalidLesson(lessonId);
        if (lessons[lessonId].exists) revert LessonAlreadyExists(lessonId);
        lessons[lessonId] = Lesson({name: name, xp: xp, exists: true});
        _lessonIds.push(lessonId);
        emit LessonAdded(lessonId, name, xp);
    }

    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidSigner();
        emit SignerUpdated(signer, newSigner);
        signer = newSigner;
    }

    /// @notice Sets the ERC-1155 metadata URI template (clients replace {id} with the hex token id).
    function setURI(string calldata newUri) external onlyOwner {
        _setURI(newUri);
    }

    function getLessonIds() external view returns (uint256[] memory) {
        return _lessonIds;
    }

    /// @notice Claims the certificate of `lessonId` for the caller with a voucher signed by `signer`.
    /// @dev The voucher is the EIP-712 typed data Claim(student, lessonId, deadline), where student is msg.sender.
    function claim(uint256 lessonId, uint256 deadline, bytes calldata signature) external {
        if (block.timestamp > deadline) revert ClaimExpired(deadline);
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, msg.sender, lessonId, deadline)));
        (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, signature);
        if (err != ECDSA.RecoverError.NoError || recovered != signer) revert InvalidSignature();
        _complete(msg.sender, lessonId);
    }

    function mintCertificate(address student, uint256 lessonId) external onlyOwner {
        _complete(student, lessonId);
    }

    function _complete(address student, uint256 lessonId) private {
        if (!lessons[lessonId].exists) revert InvalidLesson(lessonId);
        if (completed[student][lessonId]) revert AlreadyCompleted(student, lessonId);
        completed[student][lessonId] = true;
        _mint(student, lessonId, 1, "");
        emit LessonCompleted(student, lessonId);
    }

    /// @notice Registered lesson ids, in registration order, with the student's completion flag for each.
    function getCompletedLessons(address student)
        external
        view
        returns (uint256[] memory lessonIds, bool[] memory done)
    {
        lessonIds = _lessonIds;
        done = new bool[](lessonIds.length);
        for (uint256 i = 0; i < lessonIds.length; i++) {
            done[i] = completed[student][lessonIds[i]];
        }
    }

    function getTotalXP(address student) external view returns (uint256 total) {
        for (uint256 i = 0; i < _lessonIds.length; i++) {
            uint256 lessonId = _lessonIds[i];
            if (completed[student][lessonId]) {
                total += lessons[lessonId].xp;
            }
        }
    }

    /// @dev Soul-bound: only mints (from == address(0)) are allowed; transfers and burns revert.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        if (from != address(0)) revert SoulBound();
        super._update(from, to, ids, values);
    }
}

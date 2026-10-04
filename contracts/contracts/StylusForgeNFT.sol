// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StylusForgeNFT is ERC1155, Ownable {
    
    mapping(uint256 => string) public lessonNames;
    mapping(address => mapping(uint256 => bool)) public completed;

    event LessonCompleted(address indexed student, uint256 indexed lessonId);

    error InvalidLesson(uint256 lessonId);
    error AlreadyCompleted(address student, uint256 lessonId);

    constructor() ERC1155("") Ownable(msg.sender) {
        lessonNames[1] = "Hello World Stylus";
        lessonNames[2] = "Storage and State";
        lessonNames[3] = "Events and Errors";
        lessonNames[4] = "ERC-20 Token";
        lessonNames[5] = "DeFi Interaction";
    }

    function mintCertificate(address student, uint256 lessonId) external onlyOwner {
        if (lessonId < 1 || lessonId > 5) revert InvalidLesson(lessonId);
        if (completed[student][lessonId]) revert AlreadyCompleted(student, lessonId);
        completed[student][lessonId] = true;
        _mint(student, lessonId, 1, "");
        emit LessonCompleted(student, lessonId);
    }

    function getCompletedLessons(address student) external view returns (bool[] memory) {
        bool[] memory result = new bool[](5);
        for (uint256 i = 0; i < 5; i++) {
            result[i] = completed[student][i + 1];
        }
        return result;
    }

    function getTotalXP(address student) external view returns (uint256) {
        uint256[5] memory xpValues = [uint256(100), 150, 200, 300, 500];
        uint256 total = 0;
        for (uint256 i = 0; i < 5; i++) {
            if (completed[student][i + 1]) {
                total += xpValues[i];
            }
        }
        return total;
    }

    // Soul-bound : bloque tous les transferts
    function safeTransferFrom(address, address, uint256, uint256, bytes memory)
        public pure override {
        revert("StylusForgeNFT: soul-bound, non-transferable");
    }

    function safeBatchTransferFrom(address, address, uint256[] memory, uint256[] memory, bytes memory)
        public pure override {
        revert("StylusForgeNFT: soul-bound, non-transferable");
    }
}
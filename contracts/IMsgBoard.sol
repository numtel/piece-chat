// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

// XXX: Not exhaustive
interface IMsgBoard {
  function name() external view returns(string memory);
  function symbol() external view returns(string memory);
  function owner() external view returns(address);
  function created() external view returns(uint);
  function msgCount() external view returns(uint);
  function listModerators() external view returns(address[] memory);
  function _balanceOf(address account) external view returns(int256);

  struct Msg {
    address author;
    address parent;
    address key;
    uint timestamp;
    uint childIndex;
    uint childCount; // Filled when viewing from msgChildren[].length
    uint versionCount; // Filled when viewing from msgChildren[].length
    uint upvotes;
    uint downvotes;
    uint8 status; // 0 = active, greater number = more suppression
    bytes data;
  }
  function getMsg(address key, uint version) external view returns(Msg memory);
  function msgChildren(address key, uint index) external view returns(address);
  function votes(address voter, address key) external view returns(uint8);
  function childCount(address key) external view returns(uint);
  function versionCount(address key) external view returns(uint);
}

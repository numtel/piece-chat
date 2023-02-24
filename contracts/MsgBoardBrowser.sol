// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

contract MsgBoardBrowser {
  function stats(IMsgBoard board, address account) public view returns(
    string memory name,
    string memory symbol,
    address owner,
    address[] memory moderators,
    int256 balance
  ) {
    name = board.name();
    symbol = board.symbol();
    owner = board.owner();
    moderators = board.listModerators();
    balance = board._balanceOf(account);
  }

  function fetchLatest(IMsgBoard board, address key) public view returns(IMsgBoard.Msg memory) {
    uint versionCount = board.versionCount(key);
    require(versionCount > 0);

    IMsgBoard.Msg memory out = board.getMsg(key, 0);
    out.childCount = board.childCount(key);
    out.versionCount = versionCount;

    if(versionCount > 1) {
      out.data = board.getMsg(key, versionCount - 1).data;
    }
    return out;
  }

  // TODO support passing viewing address for self voting status for frontend
  function fetchChildren(IMsgBoard board, address key, uint8 maxStatus, uint startIndex, uint fetchCount) external view returns(IMsgBoard.Msg[] memory) {
    uint childCount = board.childCount(key);
    if(childCount == 0) return new IMsgBoard.Msg[](0);
    require(startIndex < childCount);
    if(startIndex + fetchCount >= childCount) {
      fetchCount = childCount - startIndex;
    }
    IMsgBoard.Msg[] memory selection = new IMsgBoard.Msg[](fetchCount);
    uint activeCount;
    uint i;
    while(activeCount < fetchCount && i < childCount) {
      selection[i] = fetchLatest(board, board.msgChildren(key, i));
      if(selection[i].status <= maxStatus) activeCount++;
      i++;
    }

    IMsgBoard.Msg[] memory out = new IMsgBoard.Msg[](activeCount);
    uint j;
    for(i=0; i<fetchCount; i++) {
      if(selection[i].status <= maxStatus) {
        out[j++] = selection[i];
      }
    }
    return out;
  }
}

interface IMsgBoard {
  function name() external view returns(string memory);
  function symbol() external view returns(string memory);
  function owner() external view returns(address);
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
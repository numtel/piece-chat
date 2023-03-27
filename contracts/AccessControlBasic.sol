// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./AddressSet.sol";
using AddressSet for AddressSet.Set;

import "./IMsgBoard.sol";

// TODO temporary bans
contract AccessControlBasic {

  IMsgBoard public board;
  AddressSet.Set allowed;
  AddressSet.Set denied;
  bool public canEdit;
  AddressSet.Set blockReplies;
  bool public disallowEmpty;

  event AccountAccessChanged(address indexed account, bool allowed, bool denied);
  event RepliesAllowedChanged(address indexed post, bool allowed);
  event CanEdit(bool allowed);
  event CanPostEmpty(bool allowed);

  constructor(IMsgBoard _board, address[] memory _allowed, address[] memory _denied, bool _canEdit, address[] memory _blockReplies, bool _disallowEmpty) {
    board = _board;
    _roleListInsert(_allowed, _denied, _canEdit, _blockReplies, _disallowEmpty);
  }

  modifier onlyBoardOwner() {
    require(board.owner() == msg.sender, "Caller is not owner");
    _;
  }

  function allowList() external view returns(address[] memory) {
    return allowed.keyList;
  }

  function denyList() external view returns(address[] memory) {
    return denied.keyList;
  }

  function blockedReplies() external view returns(address[] memory) {
    return blockReplies.keyList;
  }

  function _roleListInsert(address[] memory _allowed, address[] memory _denied, bool _canEdit, address[] memory _blockReplies, bool _disallowEmpty) internal {
    for(uint i = 0; i<_allowed.length; i++) {
      allowed.insert(_allowed[i]);
      emit AccountAccessChanged(_allowed[i], true, denied.exists(_allowed[i]));
    }
    for(uint i = 0; i<_denied.length; i++) {
      denied.insert(_denied[i]);
      emit AccountAccessChanged(_denied[i], allowed.exists(_denied[i]), true);
    }
    for(uint i = 0; i<_blockReplies.length; i++) {
      blockReplies.insert(_blockReplies[i]);
      emit RepliesAllowedChanged(_blockReplies[i], false);
    }
    if(canEdit != _canEdit) {
      canEdit = _canEdit;
      emit CanEdit(_canEdit);
    }
    if(disallowEmpty != _disallowEmpty) {
      disallowEmpty = _disallowEmpty;
      emit CanPostEmpty(!disallowEmpty);
    }
  }

  function roleListInsert(address[] memory _allowed, address[] memory _denied, bool _canEdit, address[] memory _blockReplies, bool _disallowEmpty) external onlyBoardOwner {
    _roleListInsert(_allowed, _denied, _canEdit, _blockReplies, _disallowEmpty);
  }

  function roleListRemove(address[] memory _allowed, address[] memory _denied, address[] memory _blockReplies) public onlyBoardOwner {
    for(uint i = 0; i<_allowed.length; i++) {
      allowed.remove(_allowed[i]);
      emit AccountAccessChanged(_allowed[i], false, denied.exists(_allowed[i]));
    }
    for(uint i = 0; i<_denied.length; i++) {
      denied.remove(_denied[i]);
      emit AccountAccessChanged(_denied[i], allowed.exists(_denied[i]), false);
    }
    for(uint i = 0; i<_blockReplies.length; i++) {
      blockReplies.insert(_blockReplies[i]);
      emit RepliesAllowedChanged(_blockReplies[i], false);
    }
  }

  function onPost(address author, address parent, uint timestamp, bytes memory data) external view {
    require(!denied.exists(author));
    require(allowed.count() == 0 || allowed.exists(author));
    require(!blockReplies.exists(parent));
    require(!disallowEmpty || data.length > 0);

    // XXX Shut up compiler warnings
    require(timestamp > 0);
  }

  function onEdit(address author, address parent, uint timestamp, bytes memory data) external view {
    require(canEdit);
    require(!denied.exists(author));
    require(allowed.count() == 0 || allowed.exists(author));
    require(!disallowEmpty || data.length == 0);

    // XXX Shut up compiler warnings
    require(timestamp > 0 && uint160(parent) >= 0);
  }
}


// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./AddressSet.sol";
using AddressSet for AddressSet.Set;

import "./KarmaERC20.sol";
import "./Ownable.sol";

contract MsgRoom is KarmaERC20, Ownable {
  AddressSet.Set moderators;

  string public name;

  enum Status { ACTIVE, SUPPRESSED }
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
    Status status;
    bytes data;
  }
  mapping(address => Msg[]) public msgs;
  mapping(address => address[]) public msgChildren;
  mapping(address => address[]) public msgsByAuthor;
  mapping(address => mapping(address => uint)) public votes;

  event NewMsg(address indexed key);
  event MsgEdited(address indexed key);
  event Vote(address indexed key, uint upvotes, uint downvotes);
  event ModeratorAdded(address indexed moderator);
  event ModeratorRemoved(address indexed moderator);

  constructor(string memory _name) {
    name = _name;
    moderators.insert(msg.sender);
    _transferOwnership(msg.sender);
  }

  modifier onlyModerator() {
    require(moderators.exists(msg.sender));
    _;
  }

  function transferOwnership(address newOwner) external onlyOwner {
    _transferOwnership(newOwner);
  }

  function addModerator(address newModerator) external onlyOwner {
    moderators.insert(newModerator);
    emit ModeratorAdded(newModerator);
  }

  function removeModerator(address moderator) external onlyOwner {
    moderators.remove(moderator);
    emit ModeratorRemoved(moderator);
  }

  function post(address parent, bytes memory data) external {
    address key = address(uint160(uint256(keccak256(abi.encode(msg.sender, childCount(parent), parent)))));

    msgs[key].push(Msg(msg.sender, parent, key, block.timestamp, msgChildren[parent].length, 0, 0, 0, 0, Status.ACTIVE, data));
    msgChildren[parent].push(key);
    msgsByAuthor[msg.sender].push(key);
    emit NewMsg(key);
  }

  function edit(address key, bytes memory data) external {
    require(msg.sender == msgs[key][0].author);
    msgs[key].push(Msg(msg.sender, msgs[key][0].parent, key, block.timestamp, 0, 0, 0, 0, 0, Status.ACTIVE, data));
    emit MsgEdited(key);
  }

  function vote(address key, bool upvote) external {
    require(msgs[key][0].timestamp > 0);
    uint curVote = votes[msg.sender][key];
    require(curVote != (upvote ? 1 : 2));
    if(curVote == 1) {
      msgs[key][0].upvotes--;
      _downvote(msgs[key][0].author);
    } else if(curVote == 2) {
      msgs[key][0].downvotes--;
      _upvote(msgs[key][0].author);
    }
    if(upvote) {
      msgs[key][0].upvotes++;
      votes[msg.sender][key] = 1;
      _upvote(msgs[key][0].author);
    } else {
      msgs[key][0].downvotes++;
      votes[msg.sender][key] = 2;
      _downvote(msgs[key][0].author);
    }
    emit Vote(key, msgs[key][0].upvotes, msgs[key][0].downvotes);
  }

  function versionCount(address key) external view returns(uint) {
    return msgs[key].length;
  }

  function childCount(address key) public view returns(uint) {
    return msgChildren[key].length;
  }

  function fetchLatest(address key) public view returns(Msg memory) {
    require(msgs[key].length > 0);

    Msg memory out = msgs[key][0];
    out.childCount = msgChildren[key].length;
    out.versionCount = msgs[key].length;

    if(msgs[key].length > 1) {
      out.data = msgs[key][msgs[key].length - 1].data;
    }
    return out;
  }

  // TODO support passing viewing address for self voting status for frontend
  function fetchChildren(address key, uint startIndex, uint fetchCount) external view returns(Msg[] memory) {
    require(startIndex < msgChildren[key].length);
    if(startIndex + fetchCount >= msgChildren[key].length) {
      fetchCount = msgChildren[key].length - startIndex;
    }
    Msg[] memory selection = new Msg[](fetchCount);
    uint activeCount;
    uint i;
    while(activeCount < fetchCount && i < msgChildren[key].length) {
      selection[i] = fetchLatest(msgChildren[key][i]);
      if(selection[i].status == Status.ACTIVE) activeCount++;
      i++;
    }

    Msg[] memory out = new Msg[](activeCount);
    uint j;
    for(i=0; i<fetchCount; i++) {
      if(selection[i].status == Status.ACTIVE) {
        out[j++] = selection[i];
      }
    }
    return out;
  }

  function suppressMsg(address key) external onlyModerator {
    msgs[key][0].status = Status.SUPPRESSED;
  }

}

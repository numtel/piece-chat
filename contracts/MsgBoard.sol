// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./AddressSet.sol";
using AddressSet for AddressSet.Set;

import "./KarmaERC20.sol";
import "./Ownable.sol";

contract MsgBoard is KarmaERC20, Ownable {
  AddressSet.Set moderators;

  string public name;
  string public symbol;

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
  mapping(address => Msg[]) public msgs;
  mapping(address => address[]) public msgChildren;
  mapping(address => address[]) public msgsByAuthor;
  mapping(address => mapping(address => uint8)) public votes;

  event NewMsg(address indexed key);
  event MsgEdited(address indexed key);
  event Vote(address indexed key, uint upvotes, uint downvotes);
  event ModeratorAdded(address indexed moderator);
  event ModeratorRemoved(address indexed moderator);

  constructor(string memory _name, string memory _symbol, uint initialMint) {
    name = _name;
    symbol = _symbol;
    moderators.insert(msg.sender);
    _transferOwnership(msg.sender);
    _mint(msg.sender, initialMint);
  }

  modifier onlyModerator() {
    require(moderators.exists(msg.sender));
    _;
  }

  function transferOwnership(address newOwner) external onlyOwner {
    _transferOwnership(newOwner);
  }

  function arbitraryTransfer(address origin, address recipient, uint amount) external onlyOwner {
    _transferAllowNegative(origin, recipient, amount);
  }

  function addModerators(address[] memory newModerator) external onlyOwner {
    for(uint i=0; i<newModerator.length; i++) {
      moderators.insert(newModerator[i]);
      emit ModeratorAdded(newModerator[i]);
    }
  }

  function removeModerators(address[] memory moderator) external onlyOwner {
    for(uint i=0; i<moderator.length; i++) {
      moderators.remove(moderator[i]);
      emit ModeratorRemoved(moderator[i]);
    }
  }

  function post(address parent, bytes memory data) external {
    address key = address(uint160(uint256(keccak256(abi.encode(msg.sender, childCount(parent), parent)))));

    msgs[key].push(Msg(msg.sender, parent, key, block.timestamp, msgChildren[parent].length, 0, 0, 0, 0, 0, data));
    msgChildren[parent].push(key);
    msgsByAuthor[msg.sender].push(key);
    // Author self-upvotes
    msgs[key][0].upvotes++;
    votes[msg.sender][key] = 1;

    emit NewMsg(key);
  }

  function edit(address key, bytes memory data) external {
    require(msg.sender == msgs[key][0].author);
    msgs[key].push(Msg(msg.sender, msgs[key][0].parent, key, block.timestamp, 0, 0, 0, 0, 0, 0, data));
    emit MsgEdited(key);
  }

  function vote(address key, uint8 newVote) external {
    require(msgs[key][0].timestamp > 0);
    uint curVote = votes[msg.sender][key];
    require(curVote != newVote);
    if(curVote == 1) {
      msgs[key][0].upvotes--;
      // User had upvoted the post, but are now not upvoting
      // so burn a token from the author.
      // The voter does not recieve a refund when changing an upvote
      //  because then users could maintain and move tokens continuously
      // XXX: Token is burnt but totalSupply is unchanged?
      _transferAllowNegative(msgs[key][0].author, address(0), 1);
    } else if(curVote == 2) {
      msgs[key][0].downvotes--;
      // User had downvoted the post, but now are not downvoting
      // so mint a token back to the author
      // XXX: totalSupply is not changed?
      _transfer(address(0), msgs[key][0].author, 1);
    }
    if(newVote == 1) {
      msgs[key][0].upvotes++;
      votes[msg.sender][key] = 1;
      // On an upvote, the voter gives the author one of their tokens
      // _transfer() is used here because a user cannot vote themselves into debt
      _transfer(msg.sender, msgs[key][0].author, 1);
    } else {
      msgs[key][0].downvotes++;
      votes[msg.sender][key] = 2;
      // On a downvote, the voter is burning one of the author's tokens
      _transferAllowNegative(msgs[key][0].author, address(0), 1);
      // And burning one for the vote too
      _burn(msg.sender, 1);
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
  function fetchChildren(address key, uint8 maxStatus, uint startIndex, uint fetchCount) external view returns(Msg[] memory) {
    require(startIndex < msgChildren[key].length);
    if(startIndex + fetchCount >= msgChildren[key].length) {
      fetchCount = msgChildren[key].length - startIndex;
    }
    Msg[] memory selection = new Msg[](fetchCount);
    uint activeCount;
    uint i;
    while(activeCount < fetchCount && i < msgChildren[key].length) {
      selection[i] = fetchLatest(msgChildren[key][i]);
      if(selection[i].status <= maxStatus) activeCount++;
      i++;
    }

    Msg[] memory out = new Msg[](activeCount);
    uint j;
    for(i=0; i<fetchCount; i++) {
      if(selection[i].status <= maxStatus) {
        out[j++] = selection[i];
      }
    }
    return out;
  }

  // Moderators can set a non-zero status value in order to set the level of
  //  suppression a post deserves
  function setMsgStatus(address key, uint8 status) external onlyModerator {
    msgs[key][0].status = status;
  }

  // Moderators can mint tokens
  //  a) to themselves in order to provide upvotes to content and fund the economy
  //  b) to individual users in order to reward good behavior
  //  c) to outsiders to invite their participation
  function mint(address[] memory account, uint[] memory amount) external onlyModerator {
    require(account.length == amount.length);
    for(uint i=0; i<account.length; i++) {
      _mint(account[i], amount[i]);
    }
  }

}

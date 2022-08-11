// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

contract Messages {
  struct Msg {
    address author;
    address parent;
    address key;
    uint timestamp;
    uint childCount; // Filled when viewing from msgChildren[].length
    uint versionCount; // Filled when viewing from msgChildren[].length
    bytes data;
  }
  mapping(address => Msg[]) public msgs;
  mapping(address => address[]) public msgChildren;
  mapping(address => address[]) public msgsByAuthor;

  event NewMsg(address indexed key);
  event MsgEdited(address indexed key);

  function post(address parent, bytes memory data) external {
    address key = address(uint160(uint256(keccak256(abi.encode(msg.sender, childCount(parent), parent)))));

    msgs[key].push(Msg(msg.sender, parent, key, block.timestamp, 0, 0, data));
    msgChildren[parent].push(key);
    msgsByAuthor[msg.sender].push(key);
    emit NewMsg(key);
  }

  function edit(address key, bytes memory data) external {
    require(msg.sender == msgs[key][0].author);
    msgs[key].push(Msg(msg.sender, msgs[key][0].parent, key, block.timestamp, 0, 0, data));
    emit MsgEdited(key);
  }

  function versionCount(address key) external view returns(uint) {
    return msgs[key].length;
  }

  function childCount(address key) public view returns(uint) {
    return msgChildren[key].length;
  }

  function fetchLatest(address key) external view returns(Msg memory) {
    Msg memory out = msgs[key][msgs[key].length - 1];
    out.childCount = msgChildren[key].length;
    out.versionCount = msgs[key].length;
    return out;
  }

  function fetchChildren(address key, uint startIndex, uint fetchCount) external view returns(Msg[] memory) {
    require(startIndex < msgChildren[key].length);
    if(startIndex + fetchCount >= msgChildren[key].length) {
      fetchCount = msgChildren[key].length - startIndex;
    }
    Msg[] memory out = new Msg[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      out[i] = msgs[msgChildren[key][i]][msgs[msgChildren[key][i]].length - 1];
      out[i].childCount = msgChildren[msgChildren[key][i]].length;
      out[i].versionCount = msgs[msgChildren[key][i]].length;
    }
    return out;
  }
}

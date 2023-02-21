// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

contract TestPostCallback {
  bool public allow;

  function setAllow(bool _allow) external {
    allow = _allow;
  }

  function onPost(address author, address parent, uint timestamp, bytes memory data) external {
    require(allow);
  }

  function onEdit(address author, address parent, uint timestamp, bytes memory data) external {
    require(allow);
  }
}

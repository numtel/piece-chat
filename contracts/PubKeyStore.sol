// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

contract PubKeyStore {
  mapping(address => bytes32) public pubKey;

  event KeyUpdated(address indexed account, bytes32 oldValue, bytes32 newValue);

  function set(bytes32 newValue) external {
    emit KeyUpdated(msg.sender, pubKey[msg.sender], newValue);
    pubKey[msg.sender] = newValue;
  }
}

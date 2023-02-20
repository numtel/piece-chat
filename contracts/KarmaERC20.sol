// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

contract KarmaERC20 {
  // Actual (i.e. ERC20 standard) values that can go negative
  int256 public _totalSupply;
  mapping(address => int256) public _balanceOf;
  
  uint8 public constant decimals = 0;

  mapping(address => mapping(address => uint)) public allowance;

  event Transfer(address indexed from, address indexed to, uint value);
  event Approval(address indexed owner, address indexed spender, uint value);

  // ERC20 compatible balances that never go below 0
  function totalSupply() external view returns(uint) {
    if(_totalSupply < 0) return 0;
    return uint(_totalSupply);
  }

  function balanceOf(address account) external view returns(uint) {
    if(_balanceOf[account] < 0) return 0;
    return uint(_balanceOf[account]);
  }

  function transfer(address recipient, uint amount) external returns (bool) {
    _transfer(msg.sender, recipient, amount);
    return true;
  }

  function approve(address spender, uint amount) external returns (bool) {
    allowance[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(address sender, address recipient, uint amount) external returns (bool) {
    allowance[sender][msg.sender] -= amount;
    _transfer(sender, recipient, amount);
    return true;
  }

  function _transfer(address sender, address recipient, uint amount) internal {
    require(_balanceOf[sender] >= int256(amount));
    _transferAllowNegative(sender, recipient, amount);
  }

  function _transferAllowNegative(address sender, address recipient, uint amount) internal {
    _balanceOf[sender] -= int256(amount);
    _balanceOf[recipient] += int256(amount);
    emit Transfer(sender, recipient, amount);
  }

  function _mint(address account, uint amount) internal {
    _balanceOf[account] += int256(amount);
    _totalSupply += int256(amount);
    emit Transfer(address(0), account, amount);
  }

  function _burn(address account, uint amount) internal {
    require(_balanceOf[account] >= int256(amount));
    _balanceOf[account] -= int256(amount);
    _totalSupply -= int256(amount);
    emit Transfer(account, address(0), amount);
  }
}

const assert = require('assert');

exports.upvotesEarnTokensAndCanBeTransfered = async function({
  web3, accounts, deployContract, loadContract, throws, ZERO_ADDRESS,
}) {
  const INITIAL_MINT = 1000;
  const msgBoard = await deployContract(accounts[0], 'MsgBoard', 'Test', 'TEST', INITIAL_MINT);
  
  const postAddr = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')).events.NewMsg.returnValues.key;
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), 0);

  const post0 = await msgBoard.methods.fetchLatest(postAddr).call();
  assert.strictEqual(Number(post0.upvotes), 1);
  
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[1]).vote(postAddr, 1)), true);

  await msgBoard.sendFrom(accounts[0]).vote(postAddr, 1);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), 1);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[0]).call()), INITIAL_MINT - 1);

  const post1 = await msgBoard.methods.fetchLatest(postAddr).call();
  assert.strictEqual(Number(post1.upvotes), 2);

  await msgBoard.sendFrom(accounts[1]).transfer(accounts[2], 1);
  await msgBoard.sendFrom(accounts[2]).vote(postAddr, 1);

  const post2 = await msgBoard.methods.fetchLatest(postAddr).call();
  assert.strictEqual(Number(post2.upvotes), 3);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), 1);

  await msgBoard.sendFrom(accounts[0]).arbitraryTransfer(accounts[1], accounts[2], 4);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), -3);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[2]).call()), 4);
}

exports.moderatorSuppressPosts = async function({
  web3, accounts, deployContract, loadContract, throws, ZERO_ADDRESS,
}) {
  const msgBoard = await deployContract(accounts[0], 'MsgBoard', 'Test', 'TEST', 1);
  const postAddr = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')).events.NewMsg.returnValues.key;
  const list0 = await msgBoard.methods.fetchChildren(ZERO_ADDRESS, 0, 0, 10).call();
  assert.strictEqual(list0.length, 1);
  assert.strictEqual(list0[0].key, postAddr);

  await msgBoard.sendFrom(accounts[0]).addModerators([accounts[2]]);
  await msgBoard.sendFrom(accounts[2]).setMsgStatus(postAddr, 1);

  const list1 = await msgBoard.methods.fetchChildren(ZERO_ADDRESS, 0, 0, 10).call();
  assert.strictEqual(list1.length, 0);
  const list2 = await msgBoard.methods.fetchChildren(ZERO_ADDRESS, 1, 0, 10).call();
  assert.strictEqual(list2.length, 1);

  await msgBoard.sendFrom(accounts[0]).removeModerators([accounts[2]]);
  assert.strictEqual(await throws(async () => await
    await msgBoard.sendFrom(accounts[2]).setMsgStatus(postAddr, 2)), true);
}
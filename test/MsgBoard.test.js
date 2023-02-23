const assert = require('assert');

// TODO test a MsgBoard with 0 moderators
exports.upvotesEarnTokensAndCanBeTransfered = async function({
  web3, accounts, deployContract, loadContract, throws, ZERO_ADDRESS,
}) {
  const INITIAL_MINT = 1000;
  const msgBoard = await deployContract(accounts[0], 'MsgBoard', accounts[0], 'Test', 'TEST', INITIAL_MINT, ZERO_ADDRESS);
  const browser = await deployContract(accounts[0], 'MsgBoardBrowser');
  
  const postAddr = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')).events.NewMsg.returnValues.key;
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), 0);

  const post0 = await browser.methods.fetchLatest(msgBoard.options.address, postAddr).call();
  assert.strictEqual(Number(post0.upvotes), 1);
  assert.strictEqual(post0.data, '0xbeef');
  
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[1]).vote(postAddr, 1)), true);

  await msgBoard.sendFrom(accounts[0]).vote(postAddr, 1);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), 1);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[0]).call()), INITIAL_MINT - 1);

  await msgBoard.sendFrom(accounts[1]).edit(postAddr, '0xdeadbeef');

  const post1 = await browser.methods.fetchLatest(msgBoard.options.address, postAddr).call();
  assert.strictEqual(Number(post1.upvotes), 2);
  assert.strictEqual(Number(post1.versionCount), 2);
  assert.strictEqual(post1.data, '0xdeadbeef');

  await msgBoard.sendFrom(accounts[1]).transfer(accounts[2], 1);
  await msgBoard.sendFrom(accounts[2]).vote(postAddr, 1);

  const post2 = await browser.methods.fetchLatest(msgBoard.options.address, postAddr).call();
  assert.strictEqual(Number(post2.upvotes), 3);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), 1);

  // Balances can go negative
  await msgBoard.sendFrom(accounts[0]).arbitraryTransfer(accounts[1], accounts[3], 4);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), -3);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[3]).call()), 4);

  // Upvote, then downvote, then remove vote
  await msgBoard.sendFrom(accounts[3]).vote(postAddr, 1);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), -2);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[3]).call()), 3);

  await msgBoard.sendFrom(accounts[3]).vote(postAddr, 2);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), -4);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[3]).call()), 2);

  await msgBoard.sendFrom(accounts[3]).vote(postAddr, 0);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), -3);
  // Removing a vote doesn't cost a token to the voter
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[3]).call()), 2);
}

exports.moderatorSuppressPosts = async function({
  web3, accounts, deployContract, loadContract, throws, ZERO_ADDRESS,
}) {
  const browser = await deployContract(accounts[0], 'MsgBoardBrowser');
  const msgBoard = await deployContract(accounts[0], 'MsgBoard', accounts[0], 'Test', 'TEST', 1, ZERO_ADDRESS);
  const listBefore = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 0, 0, 10).call();
  assert.strictEqual(listBefore.length, 0);
  const postAddr = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')).events.NewMsg.returnValues.key;
  const list0 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 0, 0, 10).call();
  assert.strictEqual(list0.length, 1);
  assert.strictEqual(list0[0].key, postAddr);

  await msgBoard.sendFrom(accounts[0]).addModerator(accounts[2]);
  await msgBoard.sendFrom(accounts[2]).setMsgStatus([postAddr], [1]);

  const list1 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 0, 0, 10).call();
  assert.strictEqual(list1.length, 0);
  const list2 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 1, 0, 10).call();
  assert.strictEqual(list2.length, 1);

  await msgBoard.sendFrom(accounts[0]).removeModerator(accounts[2]);
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[2]).setMsgStatus(postAddr, 2)), true);
}

exports.callbackCanStopPostsAndEdits = async function({
  web3, accounts, deployContract, loadContract, throws, ZERO_ADDRESS,
}) {
  const callback = await deployContract(accounts[0], 'TestPostCallback');
  const msgBoard = await deployContract(accounts[0], 'MsgBoard', accounts[0], 'Test', 'TEST', 1, ZERO_ADDRESS);

  await msgBoard.sendFrom(accounts[0]).changePostCallback(callback.options.address);

  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')), true);

  await callback.sendFrom(accounts[0]).setAllow(true);

  const postAddr = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')).events.NewMsg.returnValues.key;

  await callback.sendFrom(accounts[0]).setAllow(false);

  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[1]).edit(postAddr, '0xdeadbeef')), true);

  await callback.sendFrom(accounts[0]).setAllow(true);

  await msgBoard.sendFrom(accounts[1]).edit(postAddr, '0xdeadbeef');

}

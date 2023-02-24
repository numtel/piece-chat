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

  const post0 = await browser.methods.fetchLatest(msgBoard.options.address, postAddr, accounts[1]).call();
  assert.strictEqual(Number(post0.item.upvotes), 1);
  assert.strictEqual(post0.item.data, '0xbeef');
  assert.strictEqual(post0.vote, '1');
  
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[1]).vote(postAddr, 1)), true);

  await msgBoard.sendFrom(accounts[0]).vote(postAddr, 1);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), 1);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[0]).call()), INITIAL_MINT - 1);

  await msgBoard.sendFrom(accounts[1]).edit(postAddr, '0xdeadbeef');

  const post1 = await browser.methods.fetchLatest(msgBoard.options.address, postAddr, accounts[0]).call();
  assert.strictEqual(Number(post1.item.upvotes), 2);
  assert.strictEqual(Number(post1.item.versionCount), 2);
  assert.strictEqual(post1.item.data, '0xdeadbeef');

  await msgBoard.sendFrom(accounts[1]).transfer(accounts[2], 1);
  await msgBoard.sendFrom(accounts[2]).vote(postAddr, 1);

  const post2 = await browser.methods.fetchLatest(msgBoard.options.address, postAddr, accounts[0]).call();
  assert.strictEqual(Number(post2.item.upvotes), 3);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), 1);

  // Balances can go negative
  await msgBoard.sendFrom(accounts[0]).arbitraryTransfer(accounts[1], accounts[3], 4);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), -3);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[3]).call()), 4);

  // Upvote, then downvote, then remove vote
  await msgBoard.sendFrom(accounts[3]).vote(postAddr, 1);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), -2);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[3]).call()), 3);
  assert.strictEqual(Number(await msgBoard.methods.votes(accounts[3], postAddr).call()), 1);

  await msgBoard.sendFrom(accounts[3]).vote(postAddr, 2);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), -4);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[3]).call()), 2);
  assert.strictEqual(Number(await msgBoard.methods.votes(accounts[3], postAddr).call()), 2);

  await msgBoard.sendFrom(accounts[3]).vote(postAddr, 0);
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[1]).call()), -3);
  // Removing a vote doesn't cost a token to the voter
  assert.strictEqual(Number(await msgBoard.methods._balanceOf(accounts[3]).call()), 2);
  assert.strictEqual(Number(await msgBoard.methods.votes(accounts[3], postAddr).call()), 0);
}

exports.moderatorSuppressPosts = async function({
  web3, accounts, deployContract, loadContract, throws, ZERO_ADDRESS,
}) {
  const browser = await deployContract(accounts[0], 'MsgBoardBrowser');
  const msgBoard = await deployContract(accounts[0], 'MsgBoard', accounts[0], 'Test', 'TEST', 1, ZERO_ADDRESS);
  const listBefore = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 0, 0, 10, accounts[0], false).call();
  assert.strictEqual(listBefore.length, 0);
  const postAddr = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')).events.NewMsg.returnValues.key;
  const list0 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 0, 0, 10, accounts[0], false).call();
  assert.strictEqual(list0.length, 1);
  assert.strictEqual(list0[0].item.key, postAddr);

  await msgBoard.sendFrom(accounts[0]).addModerator(accounts[2]);
  await msgBoard.sendFrom(accounts[2]).setMsgStatus([postAddr], [1]);

  const list1 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 0, 0, 10, accounts[0], false).call();
//   assert.strictEqual(list1.length, 0);
  const list2 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 1, 0, 10, accounts[0], false).call();
  assert.strictEqual(list2.length, 1);

  await msgBoard.sendFrom(accounts[0]).removeModerator(accounts[2]);
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[2]).setMsgStatus(postAddr, 2)), true);

  // Post again to test retrieving in reverse
  const postAddr2 = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0x1337')).events.NewMsg.returnValues.key;
  const list3 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 1, 0, 10, accounts[0], false).call();
  assert.strictEqual(list3.length, 2);
  assert.strictEqual(list3[0].item.key, postAddr);
  assert.strictEqual(list3[1].item.key, postAddr2);

  const list4 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 1, 0, 10, accounts[0], true).call();
  assert.strictEqual(list4.length, 2);
  assert.strictEqual(list4[1].item.key, postAddr);
  assert.strictEqual(list4[0].item.key, postAddr2);
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

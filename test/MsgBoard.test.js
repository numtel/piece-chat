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
  assert.strictEqual(listBefore.items.length, 0);
  const postAddr = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')).events.NewMsg.returnValues.key;
  const list0 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 0, 0, 10, accounts[0], false).call();
  assert.strictEqual(list0.items.length, 1);
  assert.strictEqual(list0.items[0].item.key, postAddr);

  await msgBoard.sendFrom(accounts[0]).addModerator(accounts[2]);
  await msgBoard.sendFrom(accounts[2]).setMsgStatus([postAddr], [1]);

  const list1 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 0, 0, 10, accounts[0], false).call();
  assert.strictEqual(list1.items.length, 0);
  const list2 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 1, 0, 10, accounts[0], false).call();
  assert.strictEqual(list2.items.length, 1);

  await msgBoard.sendFrom(accounts[0]).removeModerator(accounts[2]);
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[2]).setMsgStatus(postAddr, 2)), true);

  // Post again to test retrieving in reverse
  const postAddr2 = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0x1337')).events.NewMsg.returnValues.key;
  const postAddr3 = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xdeafbeef')).events.NewMsg.returnValues.key;
  const list3 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 1, 0, 2, accounts[0], false).call();
  assert.strictEqual(list3.items.length, 2);
  assert.strictEqual(list3.items[0].item.key, postAddr);
  assert.strictEqual(list3.items[1].item.key, postAddr2);
  assert.strictEqual(Number(list3.totalCount), 3);
  assert.strictEqual(Number(list3.lastScanned), 2);

  const list4 = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 1, 0, 2, accounts[0], true).call();
  assert.strictEqual(list4.items.length, 2);
  assert.strictEqual(list4.items[0].item.key, postAddr3);
  assert.strictEqual(list4.items[1].item.key, postAddr2);
  assert.strictEqual(Number(list4.totalCount), 3);
  assert.strictEqual(Number(list4.lastScanned), 1);

  const list4b = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 1, 1, 2, accounts[0], true).call();
  assert.strictEqual(list4b.items.length, 2);
  assert.strictEqual(list4b.items[0].item.key, postAddr2);
  assert.strictEqual(list4b.items[1].item.key, postAddr);
  assert.strictEqual(Number(list4b.totalCount), 3);
  assert.strictEqual(Number(list4b.lastScanned), 0);

  const list4c = await browser.methods.fetchChildren(msgBoard.options.address, ZERO_ADDRESS, 0, 1, 2, accounts[0], true).call();
  assert.strictEqual(list4c.items.length, 1);
  assert.strictEqual(list4c.items[0].item.key, postAddr2);
  assert.strictEqual(Number(list4c.totalCount), 3);
  assert.strictEqual(Number(list4c.lastScanned), 0);

  const listByAuthor = await browser.methods.fetchByAuthor(msgBoard.options.address, accounts[1], 20, 0, 10, accounts[0], true).call();
  assert.strictEqual(listByAuthor.items.length, 3);
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

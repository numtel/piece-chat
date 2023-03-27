const assert = require('assert');

exports.callbackCanStopPostsAndEdits = async function({
  web3, accounts, deployContract, loadContract, throws, ZERO_ADDRESS,
}) {
  const msgBoard = await deployContract(accounts[0], 'MsgBoard', accounts[0], 'Test', 'TEST', 1, ZERO_ADDRESS);
  const callback = await deployContract(accounts[0], 'AccessControlBasic', msgBoard.options.address, [], [], false, [], true);

  await msgBoard.sendFrom(accounts[0]).changePostCallback(callback.options.address);

  // Cannot post empty
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '')), true);

  // Can post a message with some data
  const postAddr = (await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')).events.NewMsg.returnValues.key;
  // And can post a reply
  await msgBoard.sendFrom(accounts[1]).post(postAddr, '0xbeef')

  // Edits are blocked
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[1]).edit(postAddr, '0xdeadbeef')), true);

  await callback.sendFrom(accounts[0]).roleListInsert([accounts[1]], [accounts[1]], false, [postAddr], true);

  // Deny list supersedes allow list
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')), true);
  // Now that allow list is not empty, post author must be in allow list
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[2]).post(ZERO_ADDRESS, '0xbeef')), true);

  await callback.sendFrom(accounts[0]).roleListRemove([], [accounts[1]], []);

  // User can now post again
  await msgBoard.sendFrom(accounts[1]).post(ZERO_ADDRESS, '0xbeef')
  // But replies are blocked under the original post
  assert.strictEqual(await throws(async () => await
    msgBoard.sendFrom(accounts[1]).post(postAddr, '0xbeef')), true);

  await callback.sendFrom(accounts[0]).roleListRemove([accounts[1]], [], []);

  // Others can now post since allow list is empty
  await msgBoard.sendFrom(accounts[2]).post(ZERO_ADDRESS, '0xbeef')

  // Can now edit posts, and have empty posts
  await callback.sendFrom(accounts[0]).roleListInsert([], [], true, [], false);

  await msgBoard.sendFrom(accounts[1]).edit(postAddr, '0x');
}

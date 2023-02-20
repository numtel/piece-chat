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
}

// TODO moderators can suppress posts and fetchChildren ignores them
// TODO owner can add/remove moderators

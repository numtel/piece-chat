const assert = require('assert');

exports.postAndListMessages = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT,
}) {
  const msgs = await deployContract(accounts[0], 'Messages');

  const retPost = await msgs.sendFrom(accounts[0]).post(BURN_ACCOUNT, '0xbeef');
  const msg0 = retPost.events.NewMsg.returnValues.key;
  await msgs.sendFrom(accounts[0]).post(msg0, '0xbeef01');
  await msgs.sendFrom(accounts[0]).post(msg0, '0xbeef02');
  const retMsg0 = await msgs.methods.fetchLatest(msg0).call();
  assert.strictEqual(retMsg0.author, accounts[0]);
  assert.strictEqual(retMsg0.parent, BURN_ACCOUNT);
  assert.strictEqual(retMsg0.childCount, '2');
  assert.strictEqual(retMsg0.data, '0xbeef');
  assert.strictEqual(retMsg0.versionCount, '1');

  const rootChildren = await msgs.methods.fetchChildren(BURN_ACCOUNT, 0, 10).call();
  assert.strictEqual(rootChildren.length, 1);
  assert.strictEqual(rootChildren[0].key, msg0);
  assert.strictEqual(rootChildren[0].childCount, '2');

  const msg0Children = await msgs.methods.fetchChildren(msg0, 0, 10).call();
  assert.strictEqual(msg0Children.length, 2);
  assert.strictEqual(msg0Children[0].data, '0xbeef01');
  assert.strictEqual(msg0Children[1].data, '0xbeef02');
  assert.strictEqual(msg0Children[1].versionCount, '1');

  await msgs.sendFrom(accounts[0]).edit(msg0Children[1].key, '0xbeef03');
  const msg0Children2 = await msgs.methods.fetchChildren(msg0, 0, 10).call();
  assert.strictEqual(msg0Children2[0].data, '0xbeef01');
  assert.strictEqual(msg0Children2[1].data, '0xbeef03');
  assert.strictEqual(msg0Children2[1].versionCount, '2');

  const childLatest = await msgs.methods.fetchLatest(msg0Children[1].key).call();
  assert.strictEqual(childLatest.data, '0xbeef03');
  assert.strictEqual(childLatest.versionCount, '2');
  
};

exports.voting = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT,
}) {
  const msgs = await deployContract(accounts[0], 'Messages');

  const retPost = await msgs.sendFrom(accounts[0]).post(BURN_ACCOUNT, '0xbeef');
  const msg0 = retPost.events.NewMsg.returnValues.key;
  await msgs.sendFrom(accounts[0]).vote(msg0, true);
  let childLatest = await msgs.methods.fetchLatest(msg0).call();
  assert.strictEqual(childLatest.upvotes, '1');
  assert.strictEqual(childLatest.downvotes, '0');

  await msgs.sendFrom(accounts[0]).vote(msg0, false);
  childLatest = await msgs.methods.fetchLatest(msg0).call();
  assert.strictEqual(childLatest.upvotes, '0');
  assert.strictEqual(childLatest.downvotes, '1');

  await msgs.sendFrom(accounts[1]).vote(msg0, false);
  await msgs.sendFrom(accounts[2]).vote(msg0, true);
  childLatest = await msgs.methods.fetchLatest(msg0).call();
  assert.strictEqual(childLatest.upvotes, '1');
  assert.strictEqual(childLatest.downvotes, '2');
}

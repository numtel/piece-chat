const assert = require('assert');

// TODO upvotes and downvotes earn tokens to the poster
// TODO moderators can suppress posts and fetchChildren ignores them
// TODO owner can add/remove moderators
exports.upvotesEarnTokensAndCanBeTransfered = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT,
}) {
  const msgRoom = await deployContract(accounts[0], 'MsgRoom');
  console.log(await msgRoom.methods.castNegative().call());
}


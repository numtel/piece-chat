import {AsyncTemplate, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress} from '/utils.js';
import Header from '/components/Header.js';
import CreatePost from '/components/CreatePost.js';
import Posts from '/components/Posts.js';
import MintWidget from '/components/MintWidget.js';
import ArbitraryTransferWidget from '/components/ArbitraryTransferWidget.js';
import AddModeratorWidget from '/components/AddModeratorWidget.js';

export default class Board extends AsyncTemplate {
  constructor(address, key) {
    super();
    this.set('address', address);
    this.set('key', key);
    this.set('data', null);
    document.title = 'Board Details';
  }
  async init() {
    if(!this.data) {
      this.set('data', true); // Default race condition
      const browserABI = await (await fetch('/MsgBoardBrowser.abi')).json();
      this.browser = new app.web3.eth.Contract(browserABI, config.contracts.MsgBoardBrowser.address);

      this.set('data', await Promise.all([
        this.stats(),
        // TODO pagination
        this.browser.methods.fetchChildren(this.address, this.key || ZERO_ACCOUNT, 0, 0, 10).call(),
        this.key ? this.browser.methods.fetchLatest(this.address, this.key).call() : null,
      ]));
      this.set('isOwner', this.data[0].owner === app.currentAccount);
      this.set('isModerator', this.data[0].moderators.indexOf(app.currentAccount) !== -1);
    }
  }
  stats() {
    return this.browser.methods.stats(this.address, app.currentAccount).call();
  }
  async refreshStats() {
    this.set(['data', 0], await this.stats());
  }
  async render() {
    return html`
      ${new Header}
      <h2><a href="/${this.address}" $${this.link}>${userInput(this.data[0].name)} (${userInput(this.data[0].symbol)})</a></h2>
      <p>
        Owner: ${displayAddress(this.data[0].owner)}, moderators:
        ${this.data[0].moderators.length === 0 ? 'none' : this.data[0].moderators.map(mod => html`
          <span class="moderator">
            ${displayAddress(mod)}
            ${this.isOwner ? html`<button onclick="tpl(this).removeModerator('${mod}')">Remove</button>` : ''}
          </span>
        `)}
      </p>
      <p>My Balance: ${this.data[0].balance}</p>
      ${this.isOwner ? new AddModeratorWidget(this) : ''}
      ${this.isOwner ? new ArbitraryTransferWidget(this) : ''}
      ${this.isModerator ? new MintWidget(this) : ''}
      ${this.key ? new Posts(this, this.data[2].parent, [this.data[2]], true):''}
      ${new CreatePost(this.address, this.key)}
      ${new Posts(this, null, this.data[1])}
    `;
  }
  async removeModerator(mod) {
    const boardABI = await (await fetch('/MsgBoard.abi')).json();
    const board = new app.web3.eth.Contract(boardABI, this.address);
    let response;
    try {
      response = await app.wallet.send(board.methods.removeModerator(mod));
    } catch(error) {
      alert(error);
      return;
    }
    this.set('showForm', false);
    await this.refreshStats();
  }
}

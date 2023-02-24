import {AsyncTemplate, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress} from '/utils.js';
import Header from '/components/Header.js';
import CreatePost from '/components/CreatePost.js';
import Posts from '/components/Posts.js';

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
        this.browser.methods.stats(this.address, app.currentAccount).call(),
        // TODO pagination
        this.browser.methods.fetchChildren(this.address, this.key || ZERO_ACCOUNT, 0, 0, 10).call(),
        this.key ? this.browser.methods.fetchLatest(this.address, this.key).call() : null,
      ]));
    }
  }
  async render() {
    return html`
      ${new Header}
      <h2><a href="/${this.address}" $${this.link}>${userInput(this.data[0].name)} (${userInput(this.data[0].symbol)})</a></h2>
      <p>Owner: ${displayAddress(this.data[0].owner)}, moderators: ${this.data[0].moderators.length === 0 ? 'none' : this.data[0].moderators.map(displayAddress)}</p>
      <p>My Balance: ${this.data[0].balance}</p>
      ${this.key ? new Posts(this.address, this.data[2].parent, [this.data[2]], true):''}
      ${new CreatePost(this.address, this.key)}
      ${new Posts(this.address, null, this.data[1])}
    `;
  }
}

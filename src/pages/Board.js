import {AsyncTemplate, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress} from '/utils.js';
import Header from '/components/Header.js';
import CreatePost from '/components/CreatePost.js';
import Posts from '/components/Posts.js';

export default class Board extends AsyncTemplate {
  constructor(address) {
    super();
    this.set('address', address);
    this.set('data', null);
    document.title = 'Board Details';
  }
  async init() {
    if(!this.data) {
      this.set('data', true); // Default race condition
      const browserABI = await (await fetch('/MsgBoardBrowser.abi')).json();
      this.browser = new app.web3.eth.Contract(browserABI, config.contracts.MsgBoardBrowser.address);
      const accounts = await app.wallet.fetchAccounts();

      this.set('data', await Promise.all([
        this.browser.methods.stats(this.address, accounts[0]).call(),
        this.browser.methods.fetchChildren(this.address, ZERO_ACCOUNT, 0, 0, 10).call(),
      ]));
    }
  }
  async render() {
    return html`
      ${new Header}
      <h2>${userInput(this.data[0].name)} (${userInput(this.data[0].symbol)})</h2>
      <p>Owner: ${displayAddress(this.data[0].owner)}, moderators: ${this.data[0].moderators.length === 0 ? 'none' : this.data[0].moderators.map(displayAddress)}</p>
      <p>My Balance: ${this.data[0].balance}</p>
      ${new CreatePost(this.address)}
      ${new Posts(this.address, null, this.data[1])}
    `;
  }
}

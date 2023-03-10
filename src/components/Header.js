import {Template, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress} from '/utils.js';

export default class Header extends Template {
  constructor() {
    super();
    app.wallet.onStatusChange = this.walletChanged.bind(this);
    app.wallet.triggerStatusHandler();
  }
  render() {
    return html`
      <a class="cornerBanner" href="https://docs.shardeum.org/faucet/claim" onclick="window.open(event.target.href); return false">Beta Version: Get Shardeum Sphinx coin free for gas!</a>
      <header class="top">
      <h1><a href="/" $${this.link}>piece.chat</a></h1>
      <a href="javascript:void 0" onclick="tpl(this).toggleWallet()" class="wallet">${app.wallet.connected ? html`
        <span class="address">${displayAddress(this.account || app.currentAccount || ZERO_ACCOUNT, true)}</span>
        <span class="hover">Disconnect</span>
      `: 'Connect Wallet'}</a>
      </header>
      <div class="sep"></div>
    `;
  }
  toggleWallet() {
    if(app.wallet.connected) {
      app.wallet.disconnect();
    } else {
      app.wallet.connect();
    }
  }
  walletChanged(accounts) {
    this.set('account', accounts[0]);
  }
}

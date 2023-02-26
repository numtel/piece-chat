import {Template, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress} from '/utils.js';

export default class Header extends Template {
  constructor() {
    super();
  }
  render() {
    return html`
      <a class="cornerBanner" href="https://docs.shardeum.org/faucet/claim" onclick="window.open(event.target.href); return false">Beta Version: Get Shardeum Sphinx coin free for gas!</a>
      <h1><a href="/" $${this.link}>piece.chat</a></h1>
    `;
  }
}

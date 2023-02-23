import {Template, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress} from '/utils.js';

export default class Header extends Template {
  constructor() {
    super();
  }
  render() {
    return html`
      <h1><a href="/" $${this.link}>piece.chat</a></h1>
    `;
  }
}

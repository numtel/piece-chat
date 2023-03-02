import {AsyncTemplate, Template, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress, explorer} from '/utils.js';

import Header from '/components/Header.js';

export default class Account extends Template {
  constructor(address) {
    super();
    this.set('address', address);
    document.title = 'Account Details';
  }
  render() {
    return html`
      ${new Header}
      <section>
      <h2>${displayAddress(this.address, true)}</h2>
      <p><a href="${explorer(this.address)}" $${this.link}>View on explorer...</a></p>
      </section>
    `;
  }
}

import {Template, html} from '/Template.js';

export default class ErrorWindow extends Template {
  render() {
    return html`
      <div class="white window">
        <h2>Error!</h2>
        <a href="/" $${this.link} class="button">Go Home...</a>
      </div>
    `;
  }
}



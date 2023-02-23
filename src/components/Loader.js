import {Template, html} from '/Template.js';

export default class Loader extends Template {
  render() {
    return html`
      <div class="loader">
        <span class="loader">Loadage!</span>
      </div>
    `;
  }
  new() {
    return new Loader;
  }
}


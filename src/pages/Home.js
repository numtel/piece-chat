import {Template, html} from '/Template.js';
import {ZERO_ACCOUNT} from '/utils.js';
import Header from '/components/Header.js';
import NewBoardWidget from '/components/NewBoardWidget.js';
import BoardSearch from '/components/BoardSearch.js';

export default class Home extends Template {
  constructor() {
    super();
    document.title = 'Message Board';
  }
  render() {
    return html`
      ${new Header}
      <header>
      ${new NewBoardWidget}
      </header>
      ${new BoardSearch}
    `;
  }
}

import {Template, html, userInput} from '/Template.js';
import {ZERO_ACCOUNT, displayAddress, remaining} from '/utils.js';

export default class Posts extends Template {
  constructor(boardAddr, parent, posts) {
    super();
    this.set('boardAddr', boardAddr);
    this.set('parent', parent);
    // TODO support other sort methods
    this.set('data', posts.map(formatMsg).sort(sortByScore));
  }
  render() {
    return html`
      ${this.data && this.data.length > 0 ? html`
        <ul class="children">
          ${this.data.map(child => this.renderMsg(child, true))}
        </ul>
      ` : ''}
    `;
  }
  renderMsg(msg, displayAsChild, displayAsReply) {
    // TODO allow unvoting
    return html`
      <div class="msg">
        <div class="score">
          <button class="up" onclick="tpl(this).vote('${msg.key}', 1)">Upvote</button>
          <button class="down" onclick="tpl(this).vote('${msg.key}', 2)">Downvote</button>
        </div>
        <div>
          <div class="metadata">
            <span class="author"><a href="/account/${msg.author}">${displayAddress(msg.author)}</a></span>
            <span class="score">${msg.upvotes - msg.downvotes} ${Math.abs(msg.upvotes - msg.downvotes)===1 ? 'point' : 'points'}<!-- Age: ${msg.age}, Score: ${msg.score}, Up: ${msg.upvotes} Down: ${msg.downvotes} --></span>
            <span class="time"><time title="${msg.timestamp.toLocaleString()}" datetime="${msg.timestamp.toJSON()}">${msg.ago} ago</time> ${msg.versionCount > 1 ? '(Edited)' : ''}</time></span>
          </div>
          <div class="text">
            ${userInput(msg.data)}
          </div>
          ${displayAsReply ? '' : html`<a class="control" href="/${msg.key}/reply">reply</a>`}
          ${displayAsChild ? (msg.childCount > 0 ? html`<div class="children"><a href="/${msg.key}">Load ${msg.childCount} child${msg.childCount === 1 ? '' : 'ren'}...</a></div>` : '') : html`<a class="control" href="/${msg.parent}">parent</a>`}
        </div>
      </div>
    `;
  }
  async vote(key, newVote) {
    const boardABI = await (await fetch('/MsgBoard.abi')).json();
    const board = new app.web3.eth.Contract(boardABI, this.boardAddr);
    try {
      await app.wallet.send(board.methods.vote(key, newVote));
    } catch(error) {
      console.log(error);
      alert(error.message || error);
      return;
    }
    const browserABI = await (await fetch('/MsgBoardBrowser.abi')).json();
    const browser = new app.web3.eth.Contract(browserABI, config.contracts.MsgBoardBrowser.address);
    const latest = await browser.methods.fetchLatest(this.boardAddr, key).call();
    let index=0;
    for(;this.data[index].key !== key; index++);
    this.set(['data', index], formatMsg(latest));
  }
}


function calcScore(upvotes, downvotes, age) {
  if(upvotes === 0 && downvotes === 0) return 0;
  let positive = upvotes, negative = downvotes;
  if(downvotes > upvotes) {
    // Equation doesn't work with <0
    positive = downvotes;
    negative = upvotes;
  }
  // From http://www.evanmiller.org/how-not-to-sort-by-average-rating.html
  let score = ((positive + 1.9208) / (positive + negative) -
     1.96 * Math.sqrt((positive * negative) / (positive + negative) + 0.9604) /
        (positive + negative)) / (1 + 3.8416 / (positive + negative))

  if(downvotes > upvotes) {
    score *= -1 * age;
  } else {
    score /= age;
  }
  return score;
}

function formatMsg(msgRaw) {
  if(!msgRaw) return msgRaw;
  const gunzip = new Zlib.Gunzip(Uint8Array.from(msgRaw.data.slice(2).match(/.{1,2}/g).map((byte) => parseInt(byte, 16))));
  const upvotes = Number(msgRaw.upvotes);
  const downvotes = Number(msgRaw.downvotes);
  const age = Math.floor(Date.now() / 1000) - msgRaw.timestamp;
  return {
    author: msgRaw.author,
    parent: msgRaw.parent,
    key: msgRaw.key,
    timestamp: new Date(msgRaw.timestamp * 1000),
    ago: remaining(Math.floor(Date.now()/1000) - msgRaw.timestamp, true),
    childCount: Number(msgRaw.childCount),
    versionCount: Number(msgRaw.versionCount),
    upvotes,
    downvotes,
    score: calcScore(upvotes, downvotes, age),
    age,
    data: new TextDecoder().decode(gunzip.decompress()),
  };
}

function sortByScore(a, b) {
  return a.score > b.score ? -1 :
    b.score > a.score ? 1 : 0;
}


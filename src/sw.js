const window = {};
importScripts('/deps/gunzip.min.js', '/deps/web3.min.js');
const Web3 = window.Web3;
const hostable = [
  'publish.html',
  'username.html',
  'tvision.css',
  'wallet.js',
  'utils.js',
  'sw.js',
  'config.json',
  'deps/coinbase.min.js',
  'deps/gzip.min.js',
  'deps/web3.min.js',
  'deps/web3modal.min.js',
  'Messages.abi',
];

self.addEventListener('fetch', (event) => {
  event.respondWith(loader(event.request));
});

const routes = [
  { pattern: /^\/(0x[a-f0-9]{40})$/i, handler: messagesPage },
];

async function loader(request) {
  const config = await (await fetch('/config.json')).json();
  if(!request.url.startsWith(config.root)) return fetch(request);
  const url = new URL(request.url);
  if(hostable.indexOf(url.pathname.slice(1)) !== -1) return fetch(request);

  for(let route of routes) {
    const match = url.pathname.match(route.pattern);
    if(match) {
      try {
        return await route.handler(match, config);
      } catch(error) {
        console.error(error);
      }
    }
  }
  return new Response(`<p>Unable to load document</p>`, {
    headers: { 'Content-Type': 'text/html' }
  });
}

async function messagesPage(match, config) {
  const root = match ? match[1] : '0x0000000000000000000000000000000000000000';
  const web3 = new Web3(config.rpc);
  const msgsABI = await (await fetch('/Messages.abi')).json();
  const msgs = new web3.eth.Contract(msgsABI, config.contracts.Messages.address);
  let rootResult = null, result = [];

  try {
    rootResult = await msgs.methods.fetchLatest(root).call();
  } catch(error) {}
  try {
    result = [rootResult].concat(await msgs.methods.fetchChildren(root, 0, 10).call());
  } catch(error) {}

  const doc = result.map(msgRaw => {
    if(!msgRaw) return msgRaw;
    const gunzip = new Zlib.Gunzip(Uint8Array.from(msgRaw.data.slice(2).match(/.{1,2}/g).map((byte) => parseInt(byte, 16))));
    return {
      author: msgRaw.author,
      parent: msgRaw.parent,
      key: msgRaw.key,
      timestamp: new Date(msgRaw.timestamp * 1000),
      childCount: Number(msgRaw.childCount),
      versionCount: Number(msgRaw.versionCount),
      data: new TextDecoder().decode(gunzip.decompress()),
    };
  });
  if(doc) {
    return new Response(renderMsgs(doc), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}


function renderMsgs(data) {
  return `
    ${data[0] ? `
      <div class="root">
        ${renderMsg(data[0])}
      </div>
    ` : ''}
    ${data.length > 1 ? `
      <ul class="children">
        ${data.slice(1).map(child => renderMsg(child)).join('')}
      </ul>
    ` : ''}
  `;
}

function renderMsg(msg) {
  return `
    <div class="msg">
      <dl>
        <dt>Author</dt>
        <dd><a href="/account/${msg.author}">${msg.author}</a></dd>
        <dt>Parent</dt>
        <dd><a href="/${msg.parent}">${msg.parent}</a></dd>
        <dt>Timestamp</dt>
        <dd>${msg.timestamp.toLocaleString()} ${msg.versionCount > 1 ? '(Edited)' : ''}</dd>
        <dt>Text</dt>
        <dd>${msg.data}</dd>
      </dl>
      <a href="/${msg.key}">View ${msg.childCount} child${msg.childCount === 1 ? '' : 'ren'}...</a>
      <a href="/${msg.key}/reply">Post reply...</a>
    </div>
  `;
}

const ROOT_ADDR = '0x0000000000000000000000000000000000000000';

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
  { pattern: /^\/$/, handler: homePage },
  { pattern: /^\/(0x[a-f0-9]{40})$/i, handler: messagesPage },
  { pattern: /^\/(0x[a-f0-9]{40})\/reply$/i, handler: replyPage },
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

function formatMsg(msgRaw) {
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
}

async function messagesPage(match, config) {
  const root = match ? match[1] : ROOT_ADDR;
  const web3 = new Web3(config.rpc);
  const msgsABI = await (await fetch('/Messages.abi')).json();
  const msgs = new web3.eth.Contract(msgsABI, config.contracts.Messages.address);
  let rootResult = null, result = [null];

  try {
    result = [await msgs.methods.fetchLatest(root).call()];
  } catch(error) {}
  try {
    result = result.concat(await msgs.methods.fetchChildren(root, 0, 10).call());
  } catch(error) {}

  const doc = result.map(formatMsg);
  if(doc) {
    return new Response(renderMsgs(doc, root), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

async function homePage(match, config) {
  return messagesPage(null, config);
}

async function replyPage(match, config) {
  const root = match ? match[1] : ROOT_ADDR;
  const web3 = new Web3(config.rpc);
  const msgsABI = await (await fetch('/Messages.abi')).json();
  const msgs = new web3.eth.Contract(msgsABI, config.contracts.Messages.address);
  let result;

  try {
    result = formatMsg(await msgs.methods.fetchLatest(root).call());
  } catch(error) {}

  return new Response(`
    ${result ? `
      <div class="root">
        ${renderMsg(result)}
      </div>
    ` : ''}
    <form>
      <input id="parent" type="hidden" value="${root}">
      <textarea id="text"></textarea>
      <button type="submit">Submit</button>
    </form>
    <script src="/deps/web3.min.js"></script>
    <script src="/deps/coinbase.min.js"></script>
    <script src="/deps/web3modal.min.js"></script>
    <script src="/deps/gzip.min.js"></script>
    <script src="/wallet.js"></script>
    <script>
      async function submit(event) {
        event.preventDefault();
        const {accounts,web3,config} = await wallet();
        const parent = document.getElementById('parent').value;
        const text = document.getElementById('text').value;
        const gzip = new Zlib.Gzip(new TextEncoder().encode(text));
        const zipped = Array.from(gzip.compress())
          .map(byte => ('0' + byte.toString(16)).slice(-2))
          .join('');
        let result;
        try {
          const tx = {
            to: config.contracts.Messages.address,
            from: accounts[0],
            data: web3.eth.abi.encodeFunctionCall({
              name: 'post', type: 'function',
              inputs: [
                { type: 'address', name: 'parent' },
                { type: 'bytes', name: 'data' }
              ],
            }, [ parent, '0x' + zipped ])
          };
          tx.gas = await web3.eth.estimateGas(tx);
          result = await web3.eth.sendTransaction(tx);
        } catch(error) {
          console.log(error);
          alert(error.message || error);
          return;
        }
        window.location.pathname = '/0x' + result.logs[0].topics[1].slice(-40);
      }
      document.querySelector('form').addEventListener('submit', submit);
    </script>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}


function renderMsgs(data, root) {
  return `
    ${data[0] ? `
      <div class="root">
        ${renderMsg(data[0])}
      </div>
    ` : `
      <div class="root empty">
        <a href="/${root}/reply">Post reply...</a>
      </div>
    `}
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

import {Template, html} from '/Template.js';
import {ZERO_ACCOUNT} from '/utils.js';

// TODO show more than just address
export default class Address extends Template {
  constructor(address, noLink) {
    super();
    this.set('address', address);
    this.set('noLink', noLink);
    this.checkENS();
  }
  async checkENS() {
    const name = await ensReverse(this.address);
    if(name) this.set('name', name);
  }
  render() {
    return html`${!this.noLink ? html`<a href="/account/${this.address}" $${this.link}>`:''}${this.name ? this.name : this.address.slice(0, 6) + '...' + this.address.slice(-4)}${!this.noLink ? html`</a>` :''}`;
  }
}

async function ensReverse(address) {
  if(localStorage['ens:' + address]) {
    return localStorage['ens:' + address];
  }
  const web3 = new Web3('https://eth.public-rpc.com/');
  const namehash = await web3.eth.call({
    to: '0x084b1c3c81545d370f3634392de611caabff8148', // ENS: Reverse Registrar
    data: web3.eth.abi.encodeFunctionCall({
      name: 'node', type: 'function',
      inputs: [{type: 'address', name: 'addr'}]
    }, [address])
  });
  const result = web3.eth.abi.decodeParameter('string', await web3.eth.call({
    to: '0xa2c122be93b0074270ebee7f6b7292c7deb45047', // ENS: Default Reverse Resolver
    data: web3.eth.abi.encodeFunctionCall({
      name: 'name', type: 'function',
      inputs: [{type: 'bytes32', name: 'hash'}]
    }, [namehash])
  }));
  if(result) {
    localStorage['ens:' + address] = result;
  }
  return result;
}

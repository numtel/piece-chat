import Address from '/components/Address.js';

export function explorer(address) {
  return window.config.blockExplorer + '/address/' + address;
}

export function isAddress(address) {
  return typeof address === 'string' && address.match(/^0x[a-f0-9]{40}$/i);
}

export function isFunSig(value) {
  return typeof value === 'string' && value.match(/^0x[a-f0-9]{8}$/i);
}

export function displayAddress(address, noLink) {
  return new Address(address, noLink);
}


export function remaining(seconds, onlyFirst) {
  const units = [
    { value: 1, unit: 'second' },
    { value: 60, unit: 'minute' },
    { value: 60 * 60, unit: 'hour' },
    { value: 60 * 60 * 24, unit: 'day' },
  ];
  let remaining = Number(seconds);
  let out = [];
  for(let i = units.length - 1; i >= 0;  i--) {
    if(remaining >= units[i].value) {
      const count = Math.floor(remaining / units[i].value);
      out.push(count.toString(10) + ' ' + units[i].unit + (count !== 1 ? 's' : ''));
      if(onlyFirst) return out[0];
      remaining = remaining - (count * units[i].value);
    }
  }
  return out.join(', ');
}

export const ZERO_ACCOUNT = '0x0000000000000000000000000000000000000000';

export function delay(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}

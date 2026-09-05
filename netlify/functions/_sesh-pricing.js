'use strict';

/* One server-owned source for private-session pricing and Payment Links.
   The calendar, confirmation page, checkout ticket and Stripe webhook all
   refer to these values; the browser never supplies a trusted amount/rate. */
const LINKS = {
  standard: {
    '1':  process.env.SESH_LINK_1  || 'https://buy.stripe.com/28E7sK4HR75rbBh5BC7IY00',
    '4':  process.env.SESH_LINK_4  || 'https://buy.stripe.com/5kQ28qa2b0H3fRx0hi7IY01',
    '8':  process.env.SESH_LINK_8  || 'https://buy.stripe.com/4gM4gy7U34Xjaxd0hi7IY02',
    '12': process.env.SESH_LINK_12 || 'https://buy.stripe.com/00w8wOb6f61neNt4xy7IY03'
  },
  extended: {
    '1':  process.env.SESH_LINK_EXT_1  || 'https://buy.stripe.com/3cI00ib6ffBX20H9RS7IY06',
    '4':  process.env.SESH_LINK_EXT_4  || 'https://buy.stripe.com/aFa5kCfmv1L77l19RS7IY07',
    '8':  process.env.SESH_LINK_EXT_8  || 'https://buy.stripe.com/28E5kC8Y7exTbBh8NO7IY08',
    '12': process.env.SESH_LINK_EXT_12 || 'https://buy.stripe.com/7sYcN4gqzahD8p53tu7IY09'
  },
  distance: {
    '1':  process.env.SESH_LINK_DIS_1  || 'https://buy.stripe.com/7sYdR8den9dzgVB8NO7IY0a',
    '4':  process.env.SESH_LINK_DIS_4  || 'https://buy.stripe.com/28E7sK6PZfBX20H1lm7IY0b',
    '8':  process.env.SESH_LINK_DIS_8  || 'https://buy.stripe.com/3cI9ASden1L70WD9RS7IY0c',
    '12': process.env.SESH_LINK_DIS_12 || 'https://buy.stripe.com/fZu6oG5LV2PbeNtaVW7IY0d'
  }
};

const PRICE_CENTS = {
  standard: { '1': 12000, '4': 46000, '8': 90000, '12': 130000 },
  extended: { '1': 13200, '4': 50600, '8': 99000, '12': 143000 },
  distance: { '1': 14160, '4': 54280, '8': 106200, '12': 153400 }
};
const PACKS = [1, 4, 8, 12];
const RANGES = ['standard', 'extended', 'distance'];

function range(value) { return RANGES.includes(String(value || '')) ? String(value) : 'standard'; }
function pack(value) { const n = Number(value); return PACKS.includes(n) ? n : 0; }
function cents(rate, quantity) {
  const r = range(rate), q = pack(quantity);
  return q ? PRICE_CENTS[r][String(q)] : 0;
}
function link(rate, quantity) {
  const r = range(rate), q = pack(quantity);
  return q ? LINKS[r][String(q)] || '' : '';
}
function publicPacks(rate) {
  const r = range(rate);
  return PACKS.map(function (q) {
    return { quantity: q, priceCents: PRICE_CENTS[r][String(q)], price: PRICE_CENTS[r][String(q)] / 100 };
  });
}

module.exports = { LINKS, PRICE_CENTS, PACKS, RANGES, range, pack, cents, link, publicPacks };

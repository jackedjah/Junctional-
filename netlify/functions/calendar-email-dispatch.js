'use strict';
const Mail = require('./_calendar-email');

exports.handler = async function () {
  try {
    const reconciled = await Mail.reconcilePending(process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://fob.systems', 40);
    const result = await Mail.retryPending(25);
    return { statusCode:200, body:JSON.stringify({ ok:true, reconciled:reconciled, delivery:result }) };
  } catch (error) {
    console.error('calendar email retry failed', error && error.message);
    return { statusCode:500, body:JSON.stringify({ ok:false }) };
  }
};

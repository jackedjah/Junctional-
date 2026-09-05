import { withLambda } from '@netlify/aws-lambda-compat';
import mygym from './mygym.js';

export default withLambda(async (event, context) => {
  event.__netlifyModernAiRuntime = true;
  return mygym.handler(event, context);
});

export const config = {
  path: '/api/mygym',
};

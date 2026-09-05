import { withLambda } from '@netlify/aws-lambda-compat';
import mealGradient from './meal-gradient.js';

export default withLambda(async (event, context) => {
  event.__netlifyModernAiRuntime = true;
  return mealGradient.handler(event, context);
});

export const config = {
  path: '/api/meal-gradient',
};

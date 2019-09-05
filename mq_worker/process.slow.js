const process = require('./process')

module.exports = async (message) => {
  const user = await getUserInfo(message);
  const product = await getProductInfo(message);
  const category = await getCategoryInfo(message);
  const campaign = await getCampaignInfo(message);
  return sendEmail({ user, product, category, campaign });
};
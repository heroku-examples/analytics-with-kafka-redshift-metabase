const process = require('./process')

module.exports = async (message) => {
  const [user, product, category, campaign] = await Promise.all([
    getUserInfo(message),
    getProductInfo(message),
    getCategoryInfo(message),
    getCampaignInfo(message)
  ]);
  return sendEmail({ user, product, category, campaign });
};
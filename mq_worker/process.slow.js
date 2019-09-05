const processMessage = require('./process')

module.exports = async (message) => {
  const user = await processMessage.getUserInfo(message)
  const product = await processMessage.getProductInfo(message)
  const category = await processMessage.getCategoryInfo(message)
  const campaign = await processMessage.getCampaignInfo(message)
  return processMessage.sendEmail({ user, product, category, campaign })
}

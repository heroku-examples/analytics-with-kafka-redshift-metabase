const processMessage = require('./process')

module.exports = async (message) => {
  const [user, product, category, campaign] = await Promise.all([
    processMessage.getUserInfo(message),
    processMessage.getProductInfo(message),
    processMessage.getCategoryInfo(message),
    processMessage.getCampaignInfo(message)
  ])
  return processMessage.sendEmail({ user, product, category, campaign })
}

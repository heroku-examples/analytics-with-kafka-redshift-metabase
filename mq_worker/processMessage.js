const api = require('./api')

// eslint-disable-next-line no-unused-vars
const processAsync = async (message) => {
  const [user, product, category, campaign] = await Promise.all([
    api.getUserInfo(message),
    api.getProductInfo(message),
    api.getCategoryInfo(message),
    api.getCampaignInfo(message)
  ])
  return api.sendEmail({ user, product, category, campaign })
}

// eslint-disable-next-line no-unused-vars
const processSync = async (message) => {
  const user = await api.getUserInfo(message)
  const product = await api.getProductInfo(message)
  const category = await api.getCategoryInfo(message)
  const campaign = await api.getCampaignInfo(message)
  return api.sendEmail({ user, product, category, campaign })
}

module.exports = processSync

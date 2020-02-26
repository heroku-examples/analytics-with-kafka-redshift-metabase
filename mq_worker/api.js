function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function getUserInfo(message) {
  await wait(random(400, 500))
  return message.session
}

async function getProductInfo(message) {
  await wait(random(400, 500))
  return message.product
}

async function getCategoryInfo(message) {
  await wait(random(400, 500))
  return message.category
}

async function getCampaignInfo(message) {
  await wait(random(400, 500))
  return message.campaign
}

async function sendEmail(options) {
  await wait(random(400, 500))
  return options
}

module.exports = {
  getUserInfo,
  getProductInfo,
  getCategoryInfo,
  getCampaignInfo,
  sendEmail
}

module.exports = () => {
  const $ = require('jquery')

  let ajaxing = false

  const generateAjaxHandler = (command) => {
    return (e) => {
      e.preventDefault()
      if (ajaxing) {
        return
      }
      ajaxing = true

      $.ajax({
        type: 'POST',
        url: '/demand/command',
        data: JSON.stringify({ command }),
        dataType: 'json',
        contentType: 'application/json'
      })
        .then((data) => {
          console.log(data)
          ajaxing = false
          alert(`${command} order has been sent. Please check the log.`)
        })
        .catch((e) => {
          console.log(e)
          ajaxing = false
          alert('Error: ' + e)
        })
    }
  }

  ;['start', 'stop', 'reset'].forEach((key) => {
    $(`[${key}-button]`).click(generateAjaxHandler(key))
  })
}

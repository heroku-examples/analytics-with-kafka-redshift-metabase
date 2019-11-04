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
          alert(`${command} comamnd has been sent. Check the status.`)
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

  let prevClass = ''
  let prevState = null
  const bodyClassList = document.body.classList

  const updateStatus = () => {
    $.get('/demand/worker-status')
      .then( (res) =>{
        if (prevState === res.state) {
          return
        }

        let state = res.state || ''
        if (prevClass) {
          bodyClassList.remove(prevClass)
        }
        prevState = res.state
        prevClass = `worker-${state.toLowerCase()}`
        bodyClassList.add(prevClass)
        $('[status]').text(res.state)
      })
  }

  setInterval(updateStatus, 3000)

  updateStatus()

}

($ => {

  let ajaxing = false
  let $status = $('[status]')


  const handleError = e => {
    console.log(e)
    ajaxing = false
    $status.text('Unknown')
    alert('Error: ' + e.msg)
  }

  const setState = (status) => {
    $status.text(status.running? 'Running' : 'Stopped')
    toggleClass(status.running)
  }

  
  $('[start-button]').click( (e) => {
    e.preventDefault()
    if (ajaxing) {
      return
    }
    ajaxing = true
    $.post('/start-orders')
      .then( data => {
        setState(data.status)
        ajaxing = false
      }).catch(handleError)
  })


  $('[stop-button]').click( (e) => {
    e.preventDefault()
    if (ajaxing) {
      return
    }
    ajaxing = true
    $.post('/stop-orders')
      .then( data => {
        console.log(data)
        setState(data.status)
        ajaxing = false
      }).catch(handleError)
  })


  $('[refresh-button]').click( (e) => {
    e.preventDefault()
    if (ajaxing) {
      return
    }
    $status.text('Checking...')
    ajaxing = true
    $.get('/status')
      .then( status => {
        setState(status)
        ajaxing = false
      }).catch(handleError)
  })


  $('[reset-button]').click( (e) => {
    e.preventDefault()
    if (ajaxing) {
      return
    }
    let confirmation = confirm('This will delete all orders and might take around 5 mins or so. Do you want to continue?')
    if (!confirmation) {
      return
    }

    $status.text('Deleting all orders...')
    ajaxing = true
    $.post('/delete-orders', {timeout: 300000})
      .then( data => {
        console.log(data)
        alert('All orders have been deleted')
        setState(data.status)
        ajaxing = false
      }).catch(handleError)
  })

  $('[refresh-button]').click()


  const toggleClass = (running) => {
    document.body.classList.toggle('worker-running', running)
  }

})(jQuery)
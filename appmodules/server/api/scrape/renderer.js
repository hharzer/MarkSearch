'use strict';

var electron = require('electron')
var url = require('url')

var ipcRenderer = electron.ipcRenderer

function removeWebview(webViewElem){
  document.body.removeChild(webViewElem)
}

function sendErrorToMainProcess(data){
  ipcRenderer.send('webview-error', JSON.stringify(data))
}

function sendLogToMainProcess(data){
  ipcRenderer.send('webview-log', JSON.stringify(data))
}

module.exports = function () {

  ipcRenderer.on('createAndLoadWebview', (event, urlToScrape) => {
    sendLogToMainProcess(`createAndLoadWebview`)
    sendLogToMainProcess(urlToScrape)

    var numTimesRedirected = 0

    var webview = document.createElement('webview')
    webview.setAttribute('src', urlToScrape)
    webview.setAttribute('preload', './webviewPreload.js')

    var oldwebview = document.querySelector('webview')
    if(oldwebview){
      removeWebview(oldwebview)
      oldwebview = null
    }

    /****
     * Cant set webview.setAudioMuted(true) until dom-ready
     */
    webview.addEventListener('dom-ready', event => {
      webview.setAudioMuted(true)
    })
    /****
     * 'did-finish-load' fires when the onload event was dispatched
     * note: 'did-finish-load' fires at the end of all 'did-get-redirect-request'
     * events
     */
    webview.addEventListener('did-finish-load', event => {
      sendLogToMainProcess('did-finish-load')
      /****
       * Ask webviewPreload.js to send back the page data
       */
      webview.send('sendPageData')
    })
    /****
     * note: did-fail-load seems to get called after certificate-error,
     * so just let did-fail-load handle certificate-error if it occurs.
     * Also, 'did-fail-load' will emit on any resource on the page not loading
     * as well, so only send back error and destroy window when its the webview
     * url that failed to load. note: this might mess up if a resource has
     * the same url that the BrowserWindow is going to.
     */
    webview.addEventListener('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if(validatedURL === urlToScrape){
        sendErrorToMainProcess(`
          webContents: did-fail-load
          errorCode: ${errorCode}
          errorDescription: ${errorDescription}
          validatedURL: ${validatedURL}
          urlToScrape: ${urlToScrape}
        `)
        removeWebview(webview)
        webview = null
      }
    })
    webview.addEventListener('crashed', () => {
      sendErrorToMainProcess('webContents: crashed')
      removeWebview(webview)
      webview = null
    })
    /****
     * 'did-get-redirect-request' will fire on any resource on the page that
     * is redirected, so only update the urlToScrape when its the
     * BrowserWindow url that's being redirected. note: this might mess up
     * if a resource has the same url that the BrowserWindow is going to.
     */
    webview.addEventListener('did-get-redirect-request', (event, oldURL, newURL) => {
      if(oldURL === urlToScrape){
        numTimesRedirected = numTimesRedirected + 1
        /****
         * So we dont get into an infinite redirect loop
         */
        if(numTimesRedirected < 6){
          /****
           * Update the urlToScrape to the new redirected location so we can
           * re-check it against oldURL in next redirect (if it happens). We
           * need to do this check as resources on page can also emit a redirect event.
           * We just want to make sure we dont get into an infinite redirect loop.
           * Using url.parse to add a trailing slash just in case.
           */
          urlToScrape = url.parse(newURL).href
        }
        else{
          sendErrorToMainProcess('webContents: infinite redirect loop')
          removeWebview(webview)
          webview = null
        }
      }
    })
    webview.addEventListener('ipc-message', event => {
      if(event.channel === 'returnDocDetails'){
        ipcRenderer.send('returnDocDetails', JSON.stringify(event.args[0]))
      }
      else if(event.channel === 'returnDocDetailsError'){
        sendErrorToMainProcess(`webviewPreload error: ${JSON.stringify(event.args)}`)
      }
      removeWebview(webview)
      webview = null
    })
    document.body.appendChild(webview)
  })
}
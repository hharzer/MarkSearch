'use strict';

var fs = require('fs')
var url = require('url')
var path = require('path')

var electron = require('electron')
var BrowserWindow = electron.BrowserWindow
var ipcMain = electron.ipcMain

var addPage = require('../addPage')

/****
 * A generator on the front end is calling scrapeAndAddPage, so
 * shouldn't have any issues with req, res, next etc. being overwritten
 * by subsequent calls while event listeners are still running
 *
 * browserWindow calls the webviewScript which preloads the webviewPreload.js and
 * then loads the urlToScrape we passed in to webviewScript. When the page has loaded in
 * the webview element, webviewPreload.js sends webviewScript the data from the page,
 * and webviewScript in turn sends the data back to browserWindow here.
 * Doing it this way as using a wwbview tag is a bit more secure than a regular
 * BrowserWindow. http://bit.ly/218pBce
 *
 * TODO: Maybe refactor this a bit, bit of duplicate code
 */
function scrapeAndAddPage(req, res, next) {

  /****
   * Using url.parse to put a trailing slash on the end of urls
   * that have no path. This is to remain consistent, so dont end
   * up saving http://foo.com and http://foo.com/ as different
   * pages - we are also doing it in addPage for the times when
   * we are not scraping (e.g. when addPage gets page data
   * from a browser extension)
   */
  var urlToScrape = url.parse(req.params.pageUrl).href
  var devMode = process.env.NODE_ENV === 'development'

  var browserWindow = new BrowserWindow({show: devMode})
  browserWindow.loadURL(path.join('file://', __dirname, 'webviewContainerWindow.html'))

  //TODO remember to do browserWindow.on('closed' and also destroy on error
  // also see what else from below should use
  // make sure i remove all ipcMain listeners http://bit.ly/218oSrx


  browserWindow.on('closed', () => {
    console.log('browserWindow closed')
    browserWindow = null
    webContents = null
  })
  browserWindow.on('unresponsive', () => {
    res.status(500).json({errorMessage: 'BrowserWindow: unresponsive'})
    browserWindow.destroy()
  })

  var webContents = browserWindow.webContents
  webContents.setAudioMuted(true)
  if(devMode){
    webContents.openDevTools()
  }

  webContents.once('did-finish-load', event => {
    console.log('browserWindow webContents did-finish-load')
    /****
     * Tell webviewScript to start loading urlToScrape
     */
    browserWindow.send('createAndLoadWebview', 1, urlToScrape)
  })
  webContents.once('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`
      BrowserWindow webContents: did-fail-load
      errorCode: ${errorCode}
      errorDescription: ${errorDescription}
      validatedURL: ${validatedURL}
      req.params.pageUrl: ${req.params.pageUrl}
    `)
    res.status(500).json({errorMessage: 'BrowserWindow webContents: did-fail-load'})
    browserWindow.destroy()
  })
  webContents.once('crashed', event => {
    console.log('crashed')
    res.status(500).json({errorMessage: 'BrowserWindow webContents: crashed'})
    browserWindow.destroy()
  })


















  //  var numTimesRedirected = 0

//check out the webview events

  //
  //var webContents = browserWindow.webContents
  //webContents.setAudioMuted(true)
  //if(devMode){
  //  webContents.openDevTools()
  //}
  //
  ///****
  // * 'did-finish-load' fires when the onload event was dispatched
  // * note: 'did-finish-load' fires at the end of all 'did-get-redirect-request'
  // * events
  // */
  //webContents.on('did-finish-load', event => {
  //  /****
  //   * Ask scrapePreload.js to send back the docDetails
  //   */
  //  webContents.send('sendDocDetails', '')
  //})
  ///****
  // * note: did-fail-load seems to get called after certificate-error,
  // * so just let did-fail-load handle certificate-error if it occurs.
  // * Also, 'did-fail-load' will emit on any resource on the page not loading
  // * as well, so only send back error and destroy window when its the BrowserWindow
  // * url that failed to load. This might mess up if a resource has the
  // * same url that the BrowserWindow is going to.
  // */
  //webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
  //  console.error(`
  //    webContents: did-fail-load
  //    errorCode: ${errorCode}
  //    errorDescription: ${errorDescription}
  //    validatedURL: ${validatedURL}
  //    req.params.pageUrl: ${req.params.pageUrl}
  //  `)
  //  /****
  //   *  note: validatedURL seems to put a trailing slash on the end if its a url with no
  //   *  path - e.g. http://foo.com would be http://foo.com/
  //   *  Should be ok as we are using url.parse().href which adds a trailing slash
  //   *  at the start of scrapeAndAddPage and on did-get-redirect-request
  //   */
  //  if(validatedURL === urlToScrape){
  //    res.status(500).json({errorMessage: 'webContents: did-fail-load'})
  //    browserWindow.destroy()
  //  }
  //})
  //webContents.on('crashed', event => {
  //  console.log('crashed')
  //  res.status(500).json({errorMessage: 'webContents: crashed'})
  //  browserWindow.destroy()
  //})
  ///****
  // * 'did-get-redirect-request' will fire on any resource on the page that
  // * is redirected, so only update the req.params.pageUrl when its the
  // * BrowserWindow url that's being redirected. This might mess up
  // * if a resource has the same url that the BrowserWindow is going to.
  // */
  //webContents.on('did-get-redirect-request', (event, oldURL, newURL) => {
  //  if(oldURL === req.params.pageUrl){
  //    numTimesRedirected = numTimesRedirected + 1
  //    /****
  //     * So we dont get into an infinite redirect loop
  //     */
  //    if(numTimesRedirected < 6){
  //      /****
  //       * Update the req.params.pageUrl to the new location redirected to so
  //       * it's the url it redirected to when we send req through to addPage.
  //       * Using url.parse to add a trailing slash if its a url with no path
  //       */
  //      urlToScrape = url.parse(newURL).href
  //      req.params.pageUrl = urlToScrape
  //    }
  //    else{
  //      console.log('webContents: infinite redirect loop ')
  //      res.status(500).json({errorMessage: 'webContents: infinite redirect loop'})
  //      browserWindow.destroy()
  //    }
  //  }
  //})
  //
  ///****
  // * Here we receive the document text, title etc. that scrapePreload.js
  // * messaged us.
  // */
  //ipcMain.on('returnDocDetails', function(event, arg) {
  //  var docDetails = JSON.parse(arg)
  //  /****
  //   * Dont need to collapse whitespace here as doing that in addPage.js
  //   */
  //  req.body.pageTitle = docDetails.documentTitle
  //  req.body.pageText = docDetails.documentText
  //  req.body.pageDescription = docDetails.documentDescription
  //  browserWindow.destroy()
  //  addPage(req, res, next)
  //})
  //
  //ipcMain.on('returnDocDetailsError', function(event, arg) {
  //  console.error(`returnDocDetailsError: ${JSON.stringify(arg)}`)
  //  res.status(500).json({errorMessage: JSON.stringify(arg)})
  //  browserWindow.destroy()
  //})
  //
  //webContents.loadURL(urlToScrape, {"extraHeaders" : "pragma: no-cache\n"})
}

module.exports = scrapeAndAddPage

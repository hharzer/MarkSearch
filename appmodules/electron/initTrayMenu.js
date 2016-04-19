'use strict'

var path = require('path')

var electron = require('electron')

var checkScreenSize = require('./checkScreenSize')

var electronApp = electron.app
var Menu = electron.Menu
var Tray = electron.Tray
var shell = electron.shell
var settingsWindow = null
var appTrayMenu = null
var devMode = process.env.NODE_ENV === 'development'
var logsFolder = path.join(electronApp.getPath('appData'), 'MarkSearch', 'logs')

function trayMenu() {
  var BrowserWindow = electron.BrowserWindow

  appTrayMenu = new Tray(path.join(__dirname, 'icons', 'MS-iconTemplate.png'))

  var contextMenu = Menu.buildFromTemplate([
    {
      label: 'Search',
      click: function() {
        shell.openExternal(global.msServerAddr.combined)
      }
    },
    {
      label: 'Settings',
      click: function() {
        if(settingsWindow){
          settingsWindow.show()
        }
        else{
          var windowSize = checkScreenSize()
          if(devMode){
            windowSize.width = 1050
            windowSize.height = 1200
          }

          settingsWindow = new BrowserWindow(
              {
                width: windowSize.width,
                height: windowSize.height,
                title: 'MarkSearch Settings',
                autoHideMenuBar: true,
                webPreferences: {
                  nodeIntegration: false
                }
              }
          )
          settingsWindow.loadURL(`${ global.msServerAddr.combined }/settings`)
          if(devMode){
            settingsWindow.openDevTools()
          }

          settingsWindow.on('closed', () => {
            settingsWindow = null
          })
        }
      }
    },
    {
      label: 'Help',
      click: function() {
        shell.openExternal(`${ global.msServerAddr.combined }/help`)
      }
    },
    {
      label: 'About',
      click: function() {
        shell.openExternal(`${ global.msServerAddr.combined }/about`)
      }
    },
    {
      label: 'Logs',
      click: function() {
        shell.showItemInFolder(logsFolder)
      }
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit MarkSearch',
      click: function() {
        electronApp.quit()
      }
    }
  ])
  appTrayMenu.setToolTip('MarkSearch Settings & Help')
  appTrayMenu.setContextMenu(contextMenu)
}

module.exports = trayMenu
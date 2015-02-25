var {Cu} = require("chrome");
//Cu.import("resource://gre/modules/devtools/Console.jsm");
Cu.import("resource://gre/modules/Downloads.jsm");
Cu.import("resource://gre/modules/osfile.jsm")
Cu.import("resource://gre/modules/Task.jsm");

var {ToggleButton} = require("sdk/ui/button/toggle");
var Panels = require("sdk/panel")
var self = require("sdk/self");

var preferences = require("sdk/simple-prefs").prefs; //access to preferences
if (preferences.pathsList == null) preferences.pathsList = ""; //create preference "pathsList" in first time
if (preferences.closeTabs == null) preferences.closeTabs = false; //create preference "closeTabs" in first time
var pathsList = preferences.pathsList.split("|"); //array for downloads paths

//toolbar button
var button = ToggleButton({
  id: "poulpeimagesaver",
  label: "Poulpe image saver",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "48": "./icon-48.png"},
  onChange: handleChange
});

//panel
var panel = Panels.Panel({
  width: 200,
  position: button,
  contentURL: self.data.url("panel.html"),
  onHide: handleHide
});

//generate random string
function generateStr(length)
{
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for( var i=0; i < length; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

//recreate buttons in panel after changing settings
function onPathsListChange(prefName)
{
  pathsList = preferences.pathsList.split("|");
  panel.height = 41;
  var namesList = [];
  //generate array of names for buttons
  if ((pathsList.length > 1)||(pathsList[0] != ""))
  {
    for (var i = 0; i < pathsList.length; i ++)
      namesList.push(OS.Path.basename(pathsList[i]));
    panel.height += (pathsList.length * 25) + 8;
  }
  panel.port.emit("links-array", namesList); //send data to panel
}

//download images from tabs
function listTabs(path)
{
  var tabs = require("sdk/tabs");
  var imagesUrls = [];
  //get tabs urls
  for (let tab of tabs)
    if (tab.url.match(new RegExp("https?://.*\.(jpg|jpe|jpeg|gif|png|webp|bmp|svg|tif|tiff|tga)")))
    {
      imagesUrls.push(decodeURI(tab.url));
      if (preferences.closeTabs) tab.close();
    }
  //download images  
  for (let imageUrl of imagesUrls)
    downloadImage(imageUrl, path, imageUrl.substr(imageUrl.lastIndexOf("/") + 1));  
}

//save file 
function downloadImage(sDownloadUrl, sPath, sFileName)
{
  Task.spawn(function () {        
    let list = yield Downloads.getList(Downloads.ALL);
    try {
      let download = yield Downloads.createDownload({
      source: sDownloadUrl,
      target: OS.Path.join(sPath,sFileName)});        
      console.log('OS.Constants.Path.tmpDir='+OS.Constants.Path.tmpDir);
      list.add(download);
      try {
        download.start();
      } finally {}
    } finally {}
  }).then(null, Cu.reportError);    
}

//show panel
function handleChange(state)
{
  if (state.checked)
    panel.show();
}

//uncheck button after hiding panel
function handleHide()
{
  button.state('window', {checked: false});
}

//create content of panel
require("sdk/simple-prefs").on("pathsList", onPathsListChange);
onPathsListChange("pathsList");

//handler click links in panel
panel.port.on("click-link", function(linkIndex) {
  if (linkIndex == "0")
    Downloads.getPreferredDownloadsDirectory().then(function(result) { listTabs(result); }); //download to default path
  else listTabs(pathsList[parseInt(linkIndex) - 1]);
});

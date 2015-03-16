var {Cu} = require("chrome");
//Cu.import("resource://gre/modules/devtools/Console.jsm");
Cu.import("resource://gre/modules/Downloads.jsm");
Cu.import("resource://gre/modules/Task.jsm");

const PathIO = require('sdk/fs/path');
const FileIO = require('sdk/io/file');

var {ToggleButton} = require("sdk/ui/button/toggle");
var Panels = require("sdk/panel")
var self = require("sdk/self");

var preferences = require("sdk/simple-prefs").prefs; //access to preferences
if (preferences.pathsList == null) preferences.pathsList = ""; //create preference "pathsList" in first time
if (preferences.imagesTypes == null)
  preferences.imagesTypes = "jpg|jpe|jpeg|gif|png|webp|bmp|svg|tif|tiff|tga"; //create preference "imagesTypes" in first time
if (preferences.closeTabs == null) preferences.closeTabs = false; //create preference "closeTabs" in first time
if (preferences.ifFileExists == null) preferences.ifFileExists = 0; //create preference "ifFileExists" in first time
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

//add random suffix to string
function addRandom(filename)
{
  var dot = filename.lastIndexOf(".");
  return (filename.substring(0, dot) + "_" + generateStr(10) + filename.substr(dot));
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
      namesList.push(PathIO.basename(pathsList[i]));
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
    if (tab.url.match(new RegExp("https?://.*\.(" + preferences.imagesTypes + ")")))
    {
      imagesUrls.push(decodeURI(tab.url));
      if (preferences.closeTabs)
      {
      	if (tabs.length > 1) tab.close();
        else tab.url = "about:blank";
      }
    }
  //download images  
  for (let imageUrl of imagesUrls)
  {
    var fileName = imageUrl.substr(imageUrl.lastIndexOf("/") + 1);
    //if preference "ifFileExists" equal "Rename" and saving file exists then add random string to name
    if (!preferences.ifFileExists)
      if (FileIO.exists(PathIO.join(path, fileName)))
      	fileName = addRandom(fileName);
    downloadImage(imageUrl, path, fileName);
  }
}

//save file 
function downloadImage(sDownloadUrl, sPath, sFileName)
{
  Task.spawn(function () {        
    let list = yield Downloads.getList(Downloads.ALL);
    try {
      let download = yield Downloads.createDownload({
      source: sDownloadUrl,
      target: PathIO.join(sPath,sFileName)});        
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
  panel.hide();
});

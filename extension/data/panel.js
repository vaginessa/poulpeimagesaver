function createButton(element, index, array) //create button in panel
{
  if (element != "")
  {
    var eDiv = document.createElement("div");
    var eLink = document.createElement("a");
    var eText = document.createTextNode(element);
    eDiv.align = "center";
    if (index == 0)
      eDiv.className = "defaultdownload";  
    eLink.name = index + 1;
    eLink.className = "button";
    eLink.href = "##";
    eLink.appendChild(eText);
    eDiv.appendChild(eLink);
    document.body.appendChild(eDiv);
  }
}

//recreate all buttons in panel
addon.port.on("links-array", function(namesList) {
  document.body.innerHTML = "";
  createButton("default Downloads", -1, []);
  namesList.forEach(createButton);
});

//handler click links
window.addEventListener("click", function(event) {
	var t = event.target;
	if (t.nodeName == "A")
		addon.port.emit("click-link", t.name.toString());
}, false);
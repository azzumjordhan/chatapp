const btnAdd = document.querySelector("#btnAdd");
const btnRemove = document.querySelector("#btnRemove");
const sb = document.querySelector("#room");
const addRoom = document.querySelector("#addRoom");

const socket = io();

//add room to option
btnAdd.onclick = (e) => {
  e.preventDefault();

  // validate the option
  if (addRoom.value == "") {
    alert("Please enter the name.");
    return;
  } else {
    let roomChat = addRoom.value;
    socket.emit("createRoom", roomChat);
  }
  // create a new option
  const option = new Option(addRoom.value, addRoom.value);
  // add it to the list
  sb.add(option, undefined);

  // reset the value of the input
  addRoom.value = "";
  $("#exampleModalCenter").modal("hide");
  //addRoom.focus();
};

socket.on("createdRoom", (roomName) => {
  const select = document.getElementById("room");
  const options = roomName.optionRoomName;

  console.log(options);

  select.innerHTML = "";

  // Populate: Clear all existing options first
  for (var i = 0; i < options.length; i++) {
    var opt = options[i];
    var el = document.createElement("option");
    el.textContent = opt;
    el.value = opt;
    select.appendChild(el);
  }
});

//remove room from option
btnRemove.onclick = (e) => {
  e.preventDefault();

  // save the selected option
  let selected = [];

  for (let i = 0; i < sb.options.length; i++) {
    selected[i] = sb.options[i].selected;
  }

  // remove all selected option
  let index = sb.options.length;
  while (index--) {
    if (selected[index]) {
      sb.remove(index);
    }
  }
};

//save room into database

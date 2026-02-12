function getIDfromURL(url) {
  const regExp =
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;

  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }

  alert("The supplied URL is not a valid youtube URL");

  return "";
}

function show_clip() {
  const idclip = getIDfromURL(document.getElementById("plan_clip").value);
  const url_embed = "https://www.youtube.com/embed/" + idclip + "?&autoplay=1";
  document.getElementById("iframe_clip").setAttribute("src", url_embed);
  document.getElementById("id_clip").setAttribute("value", idclip);
}

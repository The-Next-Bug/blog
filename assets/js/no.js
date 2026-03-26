(function () {
  var API = "https://no.thenextbug.com/no";

  function show(entry) {
    var el = document.getElementById("no-result");
    if (!el) return;
    if (entry) {
      el.innerHTML =
        "<p><strong>" + entry.no + "</strong></p>" +
        "<p>" + entry.reason + "</p>" +
        "<p><a class='no-permalink' href='?i=" + entry.index + "'>#" + entry.index + "</a></p>";
    } else {
      el.innerHTML = "<p><strong>No.</strong></p>";
    }
  }

  function fetchAndShow(url) {
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("not ok");
        return r.json();
      })
      .then(show)
      .catch(function () { show(null); });
  }

  document.getElementById("no-again").addEventListener("click", function () {
    fetchAndShow(API);
  });

  var params = new URLSearchParams(window.location.search);
  var i = params.get("i");
  fetchAndShow(i !== null ? API + "/" + encodeURIComponent(i) : API);
})();

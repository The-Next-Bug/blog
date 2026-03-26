(function () {
  var nos = null;
  var last = -1;

  function pick() {
    if (!nos || nos.length === 0) return null;
    var idx;
    do { idx = Math.floor(Math.random() * nos.length); } while (nos.length > 1 && idx === last);
    last = idx;
    return nos[idx];
  }

  function show(entry) {
    var el = document.getElementById("no-result");
    if (!el) return;
    if (entry) {
      el.innerHTML =
        "<p><strong>" + entry.no + "</strong></p>" +
        "<p>" + entry.reason + "</p>";
    } else {
      el.innerHTML = "<p><strong>No.</strong></p>";
    }
  }

  document.getElementById("no-again").addEventListener("click", function () {
    show(pick());
  });

  fetch("/data/no.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      nos = data;
      show(pick());
    })
    .catch(function () {
      show(null);
    });
})();

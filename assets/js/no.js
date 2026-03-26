(function () {
  fetch("/data/no.json")
    .then(function (r) { return r.json(); })
    .then(function (nos) {
      var entry = nos[Math.floor(Math.random() * nos.length)];
      var el = document.getElementById("no-result");
      if (el && entry) {
        el.innerHTML =
          "<p><strong>" + entry.no + "</strong></p>" +
          "<p>" + entry.reason + "</p>";
      }
    })
    .catch(function () {
      var el = document.getElementById("no-result");
      if (el) el.innerHTML = "<p><strong>No.</strong></p>";
    });
})();

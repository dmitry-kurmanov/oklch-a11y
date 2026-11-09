(function () {
  document.addEventListener('click', function (e) {
    if (!e.altKey) return;
    var el = e.target.closest('[id]');
    if (!el) return;
    e.preventDefault();
    var on = el.getAttribute('data-focus') === 'on';
    document.querySelectorAll('[data-focus="on"]').forEach(function (n) {
      n.removeAttribute('data-focus');
    });
    if (!on) el.setAttribute('data-focus', 'on');
    console.log('#' + el.id);
  });
})();

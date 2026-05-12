// ===== SWIPE CARDS =====
(function() {
  var THRESHOLD_RATIO = 0.55; // % do painel para confirmar o swipe
  var SNAP_DELETE = 88;
  var SNAP_STATUS = 224;

  var _activeCard = null;

  function initSwipeCards() {
    document.querySelectorAll('.rel-card[data-cot-id]').forEach(function(card) {
      if(card.dataset.swipeInit) return;
      card.dataset.swipeInit = '1';
      _bind(card, SNAP_DELETE, SNAP_STATUS);
    });
  }

  function initSwipeAtividades() {
    document.querySelectorAll('.acc-item[data-aid]').forEach(function(card) {
      if(card.dataset.swipeInit) return;
      card.dataset.swipeInit = '1';
      _bind(card, SNAP_DELETE, SNAP_DELETE);
    });
  }

  function _bind(card, snapRight, snapLeft) {
    var startX, startY, dx, isH, dragging;

    function start(x, y) {
      if(_activeCard && _activeCard !== card) {
        _snap(_activeCard);
        _activeCard = null;
      }
      startX = x; startY = y; dx = 0; isH = null; dragging = true;
      card.style.transition = 'none';
    }

    function move(x, y) {
      if(!dragging) return;
      var dxNow = x - startX;
      var dyNow = y - startY;

      if(isH === null) {
        if(Math.abs(dxNow) > 18 || Math.abs(dyNow) > 18) {
          isH = Math.abs(dxNow) > Math.abs(dyNow) * 2;
          if(!isH) { dragging = false; return; }
        }
        return;
      }

      dx = dxNow < 0
        ? Math.max(dxNow, -(snapLeft + 12))
        : Math.min(dxNow,  (snapRight + 12));

      card.style.transform = 'translateX(' + dx + 'px)';
    }

    function end() {
      if(!dragging) return;
      dragging = false;
      card.style.transition = 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)';

      if(isH === null || Math.abs(dx) < 6) {
        if(_activeCard === card) { _snap(card); _activeCard = null; }
        return;
      }

      var thL = snapLeft  * THRESHOLD_RATIO;
      var thR = snapRight * THRESHOLD_RATIO;

      if(dx < -thL) {
        card.style.transform = 'translateX(-' + snapLeft + 'px)';
        _activeCard = card;
      } else if(dx > thR) {
        card.style.transform = 'translateX(' + snapRight + 'px)';
        _activeCard = card;
      } else {
        _snap(card); _activeCard = null;
      }
    }

    card.addEventListener('touchstart', function(e) {
      start(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    card.addEventListener('touchmove', function(e) {
      if(isH) e.preventDefault();
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    card.addEventListener('touchend', end);

    card.addEventListener('mousedown', function(e) {
      start(e.clientX, e.clientY);
      function onMove(e) { move(e.clientX, e.clientY); }
      function onUp() { end(); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function _snap(card) {
    card.style.transition = 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)';
    card.style.transform = 'translateX(0)';
  }

  window.initSwipeCards      = initSwipeCards;
  window.initSwipeAtividades = initSwipeAtividades;
  window.fecharSwipeAtivo    = function() { if(_activeCard) { _snap(_activeCard); _activeCard = null; } };
})();

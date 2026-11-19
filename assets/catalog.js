// ============================================
// 客户展示选品页：纯前端，不提交订单
// 选品后生成文字清单，可复制/分享给销售
// ============================================
(function () {
  'use strict';

  var CART_KEY = 'fw_catalog_cart_v1';
  var cat = { products: [], cart: {} };  // cart = { productId: qty, ... }

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var dom = {
    products:  $('catProducts'),
    empty:     $('catEmpty'),
    search:    $('catSearch'),
    reset:     $('catReset'),
    barCnt:    $('catBarCnt'),
    barTotal:  $('catBarTotal'),
    listBtn:   $('catListBtn'),
    listMask:  $('catListMask'),
    listClose: $('catListClose'),
    listCancel:$('catListCancel'),
    listText:  $('catListText'),
    copyBtn:   $('catCopyBtn'),
    shareBtn:  $('catShareBtn'),
    toast:     $('catToast'),
    videoMask: $('catVideoMask'),
    videoClose:$('catVideoClose'),
    videoPlayer:$('catVideoPlayer')
  };

  // ---------- 工具 ----------
  function q(id) {
    return cat.cart[String(id)] || 0;
  }
  function setQ(id, n) {
    n = Math.max(0, parseInt(n, 10) || 0);
    var key = String(id);
    if (n === 0) delete cat.cart[key];
    else cat.cart[key] = n;
    saveCart();
    renderBar();
    renderList();
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cat.cart)); } catch (e) {}
  }
  function loadCart() {
    try {
      var s = localStorage.getItem(CART_KEY);
      if (s) cat.cart = JSON.parse(s) || {};
    } catch (e) { cat.cart = {}; }
  }
  function fmtPrice(n) {
    return '¥' + (Number(n) || 0).toFixed(0);
  }

  // ---------- 商品卡片渲染 ----------
  function render() {
    var kw = (dom.search.value || '').trim().toLowerCase();
    var list = cat.products;
    if (kw) list = list.filter(function (p) { return (p.name || '').toLowerCase().indexOf(kw) >= 0; });

    if (!list.length) {
      dom.products.innerHTML = '';
      dom.empty.hidden = false;
      return;
    }
    dom.empty.hidden = true;

    var html = '';
    list.forEach(function (p) {
      var qty = q(p.id);
      var picked = qty > 0;
      html +=
        '<div class="cat-card' + (picked ? ' cat-picked' : '') + '" data-id="' + p.id + '">' +
          '<div class="cat-img-wrap">' +
            renderMedia(p) +
          '</div>' +
          '<div class="cat-info">' +
            '<div class="cat-name">' + escapeHtml(p.name) + '</div>' +
            '<div class="cat-unit">' + escapeHtml(p.unit || '') + '</div>' +
            '<div class="cat-price">' + fmtPrice(p.price) + '</div>' +
            (p.detail_url
              ? '<a class="cat-detail" href="' + escapeHtml(p.detail_url) + '" target="_blank" rel="noopener noreferrer">点击查看演示图片或视频 ›</a>'
              : '') +
          '</div>' +
          '<div class="cat-ctrl">' +
            '<button class="cat-btn-minus" data-act="minus" aria-label="减少">−</button>' +
            '<div class="cat-qty">' + qty + '</div>' +
            '<button class="cat-btn-plus" data-act="plus" aria-label="增加">+</button>' +
          '</div>' +
        '</div>';
    });
    dom.products.innerHTML = html;
  }

  function renderMedia(p) {
    var hasVideo = !!(p.video_url && p.video_url.trim());
    var hasImg = !!(p.image_url && p.image_url.trim());

    if (hasImg) {
      return '<img class="cat-img" src="' + escapeHtml(p.image_url) + '" alt="' + escapeHtml(p.name) + '" loading="lazy">' +
        (hasVideo ? '<button class="cat-video-btn" data-act="video" aria-label="播放视频">▶</button>' : '');
    }
    // 占位
    return '<div class="cat-ph">🎆</div>' +
      (hasVideo ? '<button class="cat-video-btn" data-act="video" aria-label="播放视频">▶</button>' : '');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // ---------- 底部栏 ----------
  function renderBar() {
    var ids = Object.keys(cat.cart);
    var count = 0, total = 0;
    ids.forEach(function (kid) {
      var p = cat.products.find(function (x) { return String(x.id) === kid; });
      if (!p) return;
      var n = cat.cart[kid];
      if (!(n > 0)) return;
      count += n;
      total += Number(p.price) * n;
    });
    dom.barCnt.textContent = '已选 ' + count + ' 件';
    dom.barTotal.textContent = fmtPrice(total);
    dom.listBtn.disabled = count === 0;
  }

  // ---------- 清单文字 ----------
  function buildText() {
    var lines = ['烟花清单', ''];
    var count = 0, total = 0;
    // 按商品编号排序，清单上带编号，方便销售对应商品
    var picked = cat.products.filter(function (p) {
      return q(p.id) > 0;
    }).sort(function (a, b) {
      return (Number(a.seq) || 0) - (Number(b.seq) || 0);
    });
    picked.forEach(function (p) {
      var n = q(p.id);
      count += n;
      total += Number(p.price) * n;
      var no = ('0' + (p.seq != null ? p.seq : '')).slice(-2);
      lines.push(no + '  ' + p.name + ' ×' + n + '  ' + fmtPrice(p.price));
    });
    lines.push('');
    lines.push('合计：' + count + ' 件，' + fmtPrice(total));
    return lines.join('\n');
  }

  function renderList() {
    dom.listText.textContent = Object.keys(cat.cart).length ? buildText() : '还没选商品';
  }

  // ---------- 复制 / 分享 ----------
  function toast(msg) {
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { dom.toast.classList.remove('show'); }, 2000);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  // ---------- 事件 ----------
  dom.products.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;  // 详情链接走默认跳转，不加数量
    var card = e.target.closest('.cat-card');
    if (!card) return;
    var id = card.dataset.id;
    var act = e.target.dataset.act;

    if (act === 'minus') {
      setQ(id, q(id) - 1);
      render();
      return;
    }
    if (act === 'plus') {
      setQ(id, q(id) + 1);
      render();
      return;
    }
    if (act === 'video') {
      var p = cat.products.find(function (x) { return String(x.id) === id; });
      if (p && p.video_url) {
        dom.videoPlayer.src = p.video_url;
        dom.videoMask.hidden = false;
        dom.videoPlayer.play().catch(function () {});
      }
      return;
    }
  });

  dom.videoClose.addEventListener('click', function () {
    dom.videoMask.hidden = true;
    dom.videoPlayer.pause();
    dom.videoPlayer.removeAttribute('src');
    dom.videoPlayer.load();
  });
  dom.videoMask.addEventListener('click', function (e) {
    if (e.target === dom.videoMask) dom.videoClose.click();
  });

  dom.search.addEventListener('input', render);
  dom.reset.addEventListener('click', function () {
    cat.cart = {};
    saveCart();
    render();
    renderBar();
    renderList();
  });

  dom.listBtn.addEventListener('click', function () {
    renderList();
    dom.listMask.hidden = false;
  });
  dom.listClose.addEventListener('click', function () { dom.listMask.hidden = true; });
  dom.listCancel.addEventListener('click', function () { dom.listMask.hidden = true; });

  dom.copyBtn.addEventListener('click', function () {
    copyText(buildText()).then(function () {
      toast('已复制，粘贴发给老板即可');
    }).catch(function () {
      toast('复制失败，请长按上面的文字手动复制');
    });
  });

  // 手机端支持系统分享时显示「分享」按钮
  if (navigator.share) dom.shareBtn.hidden = false;
  dom.shareBtn.addEventListener('click', function () {
    var text = buildText();
    navigator.share({ title: '烟花清单', text: text }).catch(function () {});
  });

  // ---------- 数据加载（客户端独立，不依赖 store.js） ----------
  function loadProducts() {
    var cfg = window.CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      return Promise.reject(new Error('未配置数据源'));
    }
    var base = String(cfg.SUPABASE_URL).replace(/\/+$/, '') + '/rest/v1/products';
    var headers = {
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY
    };
    var full = 'select=id,seq,name,unit,price,stock,alert_stock,rating,active,image_url,video_url,detail_url,description&active=eq.true&order=seq';
    var basic = 'select=id,seq,name,unit,price,stock,alert_stock,rating,active&active=eq.true&order=seq';

    return fetch(base + '?' + full, { headers: headers }).then(function (r) {
      if (r.ok) return r.json();
      // 迁移未执行时降级为原字段，页面仍可用，只是没有图和详情链接
      return fetch(base + '?' + basic, { headers: headers }).then(function (r2) {
        if (!r2.ok) throw new Error('HTTP ' + r2.status);
        return r2.json();
      });
    });
  }

  // ---------- 启动 ----------
  loadCart();
  loadProducts().then(function (list) {
    cat.products = list || [];
    render();
    renderBar();
  }).catch(function (err) {
    console.error('加载商品失败', err);
    dom.products.innerHTML =
      '<div class="cat-net-err">' +
        '<div>商品加载失败，请检查网络后刷新</div>' +
        '<button class="btn small ghost" id="catRetry">重试</button>' +
      '</div>';
    var retryBtn = document.getElementById('catRetry');
    if (retryBtn) retryBtn.addEventListener('click', location.reload.bind(location));
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  initPDP();
  initQtyButtons();
});

if (window.Shopify) {
  document.addEventListener('shopify:section:load', e => {
    initPDP(e.target);
    initQtyButtons();
  });
}

function initPDP(root = document) {
  root.querySelectorAll('.product-swiper').forEach(wrap => {
    if (wrap.__pdpWired) return;
    wrap.__pdpWired = true;

    const swiperEl = wrap.querySelector('.swiper');
    if (!swiperEl || !window.Swiper) return;

    const norm = s => String(s || '').trim().toLowerCase();

    const source = Array.from(swiperEl.querySelectorAll('.swiper-slide')).map(el => ({
      html: el.outerHTML, 
      colors: (el.dataset.colors || '')
        .split('|')
        .map(norm)
        .filter(Boolean)
    }));
    const colorTokens = new Set(source.flatMap(s => s.colors));

    const swiper = new Swiper(swiperEl, {
      slidesPerView: 1,
      spaceBetween: Number(wrap.dataset.mobileSpace || 10),
      pagination: { el: wrap.querySelector('.swiper-pagination'), clickable: true },
      navigation: {
        nextEl: wrap.querySelector('.swiper-button-next'),
        prevEl: wrap.querySelector('.swiper-button-prev')
      },
      zoom: {             
        maxRatio: 3,
        minRatio: 1,
        toggle: true      
      },
      observer: true,
      observeParents: true
    });
    swiperEl.classList.add('is-ready');

    const zoomBtn = wrap.closest('.product-media')?.querySelector('.zoom-toggle');
    function updateZoomBtn() {
      const scale = swiper.zoom?.scale || 1;
      if (zoomBtn) zoomBtn.classList.toggle('is-zoomed', scale > 1);
      swiper.allowTouchMove = scale <= 1;
    }
    zoomBtn?.addEventListener('click', () => {
      (swiper.zoom?.scale || 1) > 1 ? swiper.zoom.out() : swiper.zoom.in();
      setTimeout(updateZoomBtn, 0);
    });
    swiper.on('zoomChange', updateZoomBtn);
    swiper.on('slideChange', () => { swiper.zoom?.out(); updateZoomBtn(); });

    function renderFor(value) {
      const v = norm(value);
      const list = v && colorTokens.size && colorTokens.has(v)
        ? source.filter(s => s.colors.includes(v))
        : source;

      swiper.zoom?.out();            
      swiper.removeAllSlides();
      swiper.appendSlide((list.length ? list : source).map(s => s.html));
      swiper.update();
      swiper.slideTo(0, 0);
      updateZoomBtn();
    }

    const colorOptionName = wrap.dataset.colorOption || 'Color';
    const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s);

    const radioInputs = Array.from(
      root.querySelectorAll(`.option-pills[data-option-name="${esc(colorOptionName)}"] input[type="radio"]`)
    );
    const colorSelect = root.querySelector(`select[data-option-name="${esc(colorOptionName)}"]`);

    if (radioInputs.length) {
      radioInputs.forEach(r => r.addEventListener('change', () => {
        renderFor(r.value);
        updateAddToCart(root);
      }));
      const checked = radioInputs.find(r => r.checked) || radioInputs[0];
      renderFor(checked?.value);
    } else if (colorSelect) {
      colorSelect.addEventListener('change', e => {
        renderFor(e.target.value);
        updateAddToCart(root);
      });
      renderFor(colorSelect.value || colorSelect.getAttribute('value') || '');
    } else {
      renderFor('');
    }

    updateAddToCart(root);
  });

  if (!window.__pdpAccordionWired) {
    window.__pdpAccordionWired = true;
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.acc-toggle');
      if (!btn) return;
      const wrap = btn.closest('.product-accordion');
      const item = btn.closest('.acc-item');
      const content = item && item.querySelector('.acc-content');
      if (!wrap || !content) return;

      const allowMulti = String(wrap.dataset.allowMultiple).toLowerCase() === 'true';
      const isOpen = item.classList.contains('is-open');

      if (!allowMulti) {
        wrap.querySelectorAll('.acc-item.is-open').forEach(i => {
          i.classList.remove('is-open');
          i.querySelector('.acc-content')?.setAttribute('hidden', '');
        });
      }
      if (isOpen) {
        item.classList.remove('is-open');
        content.setAttribute('hidden', '');
      } else {
        item.classList.add('is-open');
        content.removeAttribute('hidden');
      }
    });
  }
}

function updateAddToCart(root = document) {
  const form = root.querySelector('form[action^="/cart"]');
  if (!form) return;

  const opts = [];
  form.querySelectorAll('[name^="options["]').forEach(input => {
    if (input.type === 'radio') { if (input.checked) opts.push(input.value); }
    else { opts.push(input.value); }
  });

  const jsonScript = root.querySelector('[id^="ProductJson-"]');
  if (!jsonScript) return;

  let productData = null;
  try { productData = JSON.parse(jsonScript.textContent || '{}'); } catch(e) { productData = {}; }

  const variants = productData.variants || [];
  const match = variants.find(v => v.options.every((val, i) => val === opts[i]));

  const btn = form.querySelector('.add-to-cart');
  const idInput = form.querySelector('input[name="id"]');

  if (match) {
    if (idInput) idInput.value = match.id;
    if (btn) {
      if (!match.available) { btn.setAttribute('disabled',''); btn.textContent = 'Sold out'; }
      else { btn.removeAttribute('disabled'); btn.textContent = 'Add to cart'; }
    }
  } else if (btn) {
    btn.setAttribute('disabled',''); btn.textContent = 'Unavailable';
  }
}

function initQtyButtons() {
  document.querySelectorAll('.qty-row').forEach(row => {
    const input = row.querySelector('.qty-input');
    row.querySelector('[data-dec]')?.addEventListener('click', () => {
      const cur = parseInt(input.value, 10) || 1;
      if (cur > 1) input.value = cur - 1;
    });
    row.querySelector('[data-inc]')?.addEventListener('click', () => {
      const cur = parseInt(input.value, 10) || 1;
      input.value = cur + 1;
    });
  });
}

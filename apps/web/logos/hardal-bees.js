/** Hardal Arıcılık — 10 bee logo variants for brand strip (36×36 btn, 30×30 svg) */
(function (root, factory) {
  var logos = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = logos;
    module.exports.meta = logos.meta;
  } else {
    root.HARDAL_BEE_LOGOS = logos;
    root.HARDAL_BEE_META = logos.meta;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  var LOGOS = [
    /* 1 — Klasik önden arı */
    '<svg class="bee-3d" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="hb1-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe566"/><stop offset="55%" stop-color="#e8b923"/><stop offset="100%" stop-color="#8a6508"/></linearGradient>' +
        '<linearGradient id="hb1-wing" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity=".98"/><stop offset="100%" stop-color="#b8c4d4" stop-opacity=".72"/></linearGradient>' +
      '</defs>' +
      '<ellipse cx="10" cy="11.5" rx="6.5" ry="4.4" fill="url(#hb1-wing)" stroke="#8a9ab0" stroke-width=".65" transform="rotate(-30 10 11.5)"/>' +
      '<ellipse cx="22" cy="11.5" rx="6.5" ry="4.4" fill="url(#hb1-wing)" stroke="#8a9ab0" stroke-width=".65" transform="rotate(30 22 11.5)"/>' +
      '<ellipse cx="16" cy="18.8" rx="7.4" ry="8.6" fill="url(#hb1-body)" stroke="#5c3a1f" stroke-width=".55"/>' +
      '<path d="M9 14.6h14M8.8 18.8h14.4M9.4 22.8h13.2" stroke="#2a1a10" stroke-width="1.7" stroke-linecap="round"/>' +
      '<circle cx="16" cy="8" r="3.3" fill="url(#hb1-body)" stroke="#5c3a1f" stroke-width=".5"/>' +
      '<circle cx="14.6" cy="7.5" r=".7" fill="#1a1008"/><circle cx="17.4" cy="7.5" r=".7" fill="#1a1008"/>' +
      '<path d="M13.5 5L12 2.8M18.5 5L20 2.8" stroke="#2a1a10" stroke-width="1.25" stroke-linecap="round"/>' +
    '</svg>',

    /* 2 — Yan profil uçuş */
    '<svg class="bee-3d" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="hb2-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe066"/><stop offset="60%" stop-color="#c9920f"/><stop offset="100%" stop-color="#6b4e08"/></linearGradient>' +
        '<linearGradient id="hb2-wing" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#a8b8cc" stop-opacity=".65"/><stop offset="100%" stop-color="#fff" stop-opacity=".95"/></linearGradient>' +
      '</defs>' +
      '<ellipse cx="17" cy="9.5" rx="7.2" ry="4.8" fill="url(#hb2-wing)" stroke="#8a9ab0" stroke-width=".65" transform="rotate(-16 17 9.5)"/>' +
      '<ellipse cx="18" cy="19" rx="9.2" ry="6.4" fill="url(#hb2-body)" stroke="#5c3a1f" stroke-width=".55"/>' +
      '<path d="M10.5 15.8h15M10 19.2h16M11 22.4h14" stroke="#1f140c" stroke-width="1.65" stroke-linecap="round"/>' +
      '<circle cx="9" cy="17" r="3.5" fill="url(#hb2-body)" stroke="#5c3a1f" stroke-width=".5"/>' +
      '<circle cx="7.9" cy="16.1" r=".7" fill="#1a1008"/>' +
      '<path d="M7 13.8L5 11.2" stroke="#2a1a10" stroke-width="1.2" stroke-linecap="round"/>' +
      '<path d="M26.5 19.2l2.6.5" stroke="#2a1a10" stroke-width="1.3" stroke-linecap="round"/>' +
    '</svg>',

    /* 3 — Altıgen petek rozet */
    '<svg class="bee-3d" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="hb3-hex" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff6d0"/><stop offset="100%" stop-color="#d4a017"/></linearGradient>' +
        '<linearGradient id="hb3-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe566"/><stop offset="100%" stop-color="#8f6a00"/></linearGradient>' +
      '</defs>' +
      '<path d="M16 2.2 L26.8 8.4 V19.8 L16 26 L5.2 19.8 V8.4 Z" fill="url(#hb3-hex)" stroke="#8a6508" stroke-width="1.3"/>' +
      '<ellipse cx="11.2" cy="12.8" rx="4.4" ry="2.9" fill="#f4f7fb" stroke="#8a9ab0" stroke-width=".55" transform="rotate(-24 11.2 12.8)"/>' +
      '<ellipse cx="20.8" cy="12.8" rx="4.4" ry="2.9" fill="#f4f7fb" stroke="#8a9ab0" stroke-width=".55" transform="rotate(24 20.8 12.8)"/>' +
      '<ellipse cx="16" cy="17.8" rx="5.6" ry="6.3" fill="url(#hb3-body)" stroke="#5c3a1f" stroke-width=".45"/>' +
      '<path d="M11 14.9h10M10.8 17.8h10.4M11.4 20.6h9.2" stroke="#1f140c" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="16" cy="10" r="2.5" fill="url(#hb3-body)" stroke="#5c3a1f" stroke-width=".4"/>' +
      '<circle cx="15" cy="9.6" r=".5" fill="#1a1008"/><circle cx="17" cy="9.6" r=".5" fill="#1a1008"/>' +
    '</svg>',

    /* 4 — Tombul sevimli */
    '<svg class="bee-3d" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="hb4-body" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#fff3b0"/><stop offset="50%" stop-color="#f0c43a"/><stop offset="100%" stop-color="#7a5a08"/></radialGradient>' +
        '<linearGradient id="hb4-wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#9eafc4"/></linearGradient>' +
      '</defs>' +
      '<ellipse cx="8.5" cy="10.5" rx="7.2" ry="5.2" fill="url(#hb4-wing)" stroke="#8a9ab0" stroke-width=".6" transform="rotate(-36 8.5 10.5)"/>' +
      '<ellipse cx="23.5" cy="10.5" rx="7.2" ry="5.2" fill="url(#hb4-wing)" stroke="#8a9ab0" stroke-width=".6" transform="rotate(36 23.5 10.5)"/>' +
      '<ellipse cx="16" cy="19.2" rx="8.6" ry="7.4" fill="url(#hb4-body)" stroke="#5c3a1f" stroke-width=".55"/>' +
      '<path d="M8.2 16h15.6M7.8 19.4h16.4M9 22.6h14" stroke="#1f140c" stroke-width="1.75" stroke-linecap="round"/>' +
      '<circle cx="16" cy="9.2" r="3.5" fill="url(#hb4-body)" stroke="#5c3a1f" stroke-width=".5"/>' +
      '<circle cx="14.5" cy="8.7" r=".85" fill="#1a1008"/><circle cx="17.5" cy="8.7" r=".85" fill="#1a1008"/>' +
      '<path d="M14.8 10.2q1.2.8 2.4 0" stroke="#5c3a1f" stroke-width=".6" fill="none" stroke-linecap="round"/>' +
      '<path d="M13.6 6L11.8 3.6M18.4 6L20.2 3.6" stroke="#2a1a10" stroke-width="1.25" stroke-linecap="round"/>' +
    '</svg>',

    /* 5 — Minimal geometrik */
    '<svg class="bee-3d" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="hb5-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0c43a"/><stop offset="100%" stop-color="#b8860b"/></linearGradient>' +
      '</defs>' +
      '<circle cx="16" cy="16" r="13" fill="#fff8e8" stroke="#d4a017" stroke-width="1.2"/>' +
      '<circle cx="11" cy="13" r="4.5" fill="none" stroke="#c8d0dc" stroke-width="1.4" opacity=".85"/>' +
      '<circle cx="21" cy="13" r="4.5" fill="none" stroke="#c8d0dc" stroke-width="1.4" opacity=".85"/>' +
      '<ellipse cx="16" cy="18.5" rx="6" ry="7" fill="url(#hb5-gold)" stroke="#5c3a1f" stroke-width=".8"/>' +
      '<path d="M11 16h10M10.5 19h11M11.5 22h9" stroke="#2a1a10" stroke-width="1.5" stroke-linecap="round"/>' +
      '<circle cx="16" cy="10.5" r="2.8" fill="url(#hb5-gold)" stroke="#5c3a1f" stroke-width=".6"/>' +
      '<circle cx="15.1" cy="10.1" r=".45" fill="#1a1008"/><circle cx="16.9" cy="10.1" r=".45" fill="#1a1008"/>' +
    '</svg>',

    /* 6 — Petek arka plan */
    '<svg class="bee-3d" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="hb6-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe880"/><stop offset="100%" stop-color="#c9920f"/></linearGradient>' +
      '</defs>' +
      '<path d="M8 6h6l3 5.2H11L8 6zm10 0h6l-3 5.2h-6l3-5.2zM13 16.4h6l3 5.2h-6l-3-5.2z" fill="#f4e3b0" stroke="#d4a017" stroke-width=".5" opacity=".9"/>' +
      '<ellipse cx="9.5" cy="12" rx="5" ry="3.2" fill="#eef2f8" stroke="#9aacbe" stroke-width=".55" transform="rotate(-28 9.5 12)"/>' +
      '<ellipse cx="22.5" cy="12" rx="5" ry="3.2" fill="#eef2f8" stroke="#9aacbe" stroke-width=".55" transform="rotate(28 22.5 12)"/>' +
      '<ellipse cx="16" cy="19" rx="6.8" ry="7.5" fill="url(#hb6-body)" stroke="#5c3a1f" stroke-width=".5"/>' +
      '<path d="M10 16h12M9.8 19.2h12.4M10.5 22.2h11" stroke="#1f140c" stroke-width="1.55" stroke-linecap="round"/>' +
      '<circle cx="16" cy="9.5" r="3" fill="url(#hb6-body)" stroke="#5c3a1f" stroke-width=".45"/>' +
      '<circle cx="14.8" cy="9.1" r=".6" fill="#1a1008"/><circle cx="17.2" cy="9.1" r=".6" fill="#1a1008"/>' +
    '</svg>',

    /* 7 — Bal damlası */
    '<svg class="bee-3d" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="hb7-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe566"/><stop offset="100%" stop-color="#a87808"/></linearGradient>' +
        '<linearGradient id="hb7-drop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0c43a"/><stop offset="100%" stop-color="#8a6508"/></linearGradient>' +
      '</defs>' +
      '<path d="M24 26c0 3.3-2.7 6-6 6s-6-2.7-6-6c0-4 6-10 6-10s6 6 6 10z" fill="url(#hb7-drop)" stroke="#6b4e08" stroke-width=".7" opacity=".92"/>' +
      '<ellipse cx="12" cy="11" rx="5.5" ry="3.8" fill="#f0f4fa" stroke="#9aacbe" stroke-width=".55" transform="rotate(-32 12 11)"/>' +
      '<ellipse cx="20" cy="11" rx="5.5" ry="3.8" fill="#f0f4fa" stroke="#9aacbe" stroke-width=".55" transform="rotate(32 20 11)"/>' +
      '<ellipse cx="16" cy="17.5" rx="6.2" ry="6.8" fill="url(#hb7-body)" stroke="#5c3a1f" stroke-width=".5"/>' +
      '<path d="M10.5 15h11M10.2 18h11.6M11 21h10" stroke="#1f140c" stroke-width="1.45" stroke-linecap="round"/>' +
      '<circle cx="16" cy="9" r="2.8" fill="url(#hb7-body)" stroke="#5c3a1f" stroke-width=".45"/>' +
      '<circle cx="15" cy="8.6" r=".55" fill="#1a1008"/><circle cx="17" cy="8.6" r=".55" fill="#1a1008"/>' +
    '</svg>',

    /* 8 — İzometrik kovan */
    '<svg class="bee-3d" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="hb8-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe566"/><stop offset="100%" stop-color="#9a7208"/></linearGradient>' +
        '<linearGradient id="hb8-hive" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8c48e"/><stop offset="100%" stop-color="#a87840"/></linearGradient>' +
      '</defs>' +
      '<path d="M4 22l12-7 12 7v5l-12 7-12-7v-5z" fill="url(#hb8-hive)" stroke="#6b4e2a" stroke-width=".7"/>' +
      '<path d="M16 15v14M4 22l12 7 12-7" stroke="#5c3a1f" stroke-width=".5" opacity=".45"/>' +
      '<ellipse cx="16" cy="10" rx="5.5" ry="3.5" fill="#eef2f8" stroke="#9aacbe" stroke-width=".5" transform="rotate(-20 16 10)"/>' +
      '<ellipse cx="16" cy="13.5" rx="4.8" ry="5.2" fill="url(#hb8-body)" stroke="#5c3a1f" stroke-width=".45"/>' +
      '<path d="M12.5 12.5h7M12.2 14.8h7.6M12.8 17h6.4" stroke="#1f140c" stroke-width="1.2" stroke-linecap="round"/>' +
      '<circle cx="16" cy="7.5" r="2.2" fill="url(#hb8-body)" stroke="#5c3a1f" stroke-width=".4"/>' +
      '<circle cx="15.2" cy="7.2" r=".4" fill="#1a1008"/><circle cx="16.8" cy="7.2" r=".4" fill="#1a1008"/>' +
    '</svg>',

    /* 9 — Monogram H kanat */
    '<svg class="bee-3d" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="hb9-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff6df"/><stop offset="100%" stop-color="#ebd9a0"/></linearGradient>' +
        '<linearGradient id="hb9-h" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0c43a"/><stop offset="100%" stop-color="#8a6508"/></linearGradient>' +
      '</defs>' +
      '<rect x="3" y="3" width="26" height="26" rx="8" fill="url(#hb9-bg)" stroke="#d4a017" stroke-width="1"/>' +
      '<ellipse cx="9" cy="12" rx="4.5" ry="3" fill="#eef2f8" stroke="#9aacbe" stroke-width=".5" transform="rotate(-25 9 12)"/>' +
      '<ellipse cx="23" cy="12" rx="4.5" ry="3" fill="#eef2f8" stroke="#9aacbe" stroke-width=".5" transform="rotate(25 23 12)"/>' +
      '<path d="M11 10v14M21 10v14M11 17h10" stroke="url(#hb9-h)" stroke-width="2.8" stroke-linecap="round"/>' +
      '<circle cx="16" cy="22" r="2.2" fill="#ffe566" stroke="#5c3a1f" stroke-width=".4"/>' +
      '<path d="M14.8 21.5h2.4" stroke="#1f140c" stroke-width=".8" stroke-linecap="round"/>' +
    '</svg>',

    /* 10 — Mühür damga */
    '<svg class="bee-3d" viewBox="0 0 32 32" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="hb10-ring" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0c43a"/><stop offset="100%" stop-color="#8a6508"/></linearGradient>' +
        '<linearGradient id="hb10-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe880"/><stop offset="100%" stop-color="#b8860b"/></linearGradient>' +
      '</defs>' +
      '<circle cx="16" cy="16" r="14" fill="none" stroke="url(#hb10-ring)" stroke-width="2.2"/>' +
      '<circle cx="16" cy="16" r="11.5" fill="#fff8e8" stroke="#d4a017" stroke-width=".6"/>' +
      '<ellipse cx="10.5" cy="12.5" rx="4.8" ry="3.2" fill="#eef2f8" stroke="#9aacbe" stroke-width=".5" transform="rotate(-30 10.5 12.5)"/>' +
      '<ellipse cx="21.5" cy="12.5" rx="4.8" ry="3.2" fill="#eef2f8" stroke="#9aacbe" stroke-width=".5" transform="rotate(30 21.5 12.5)"/>' +
      '<ellipse cx="16" cy="18.5" rx="5.8" ry="6.5" fill="url(#hb10-body)" stroke="#5c3a1f" stroke-width=".45"/>' +
      '<path d="M11.2 16h9.6M11 18.8h10M11.6 21.5h8.8" stroke="#1f140c" stroke-width="1.35" stroke-linecap="round"/>' +
      '<circle cx="16" cy="10.5" r="2.6" fill="url(#hb10-body)" stroke="#5c3a1f" stroke-width=".4"/>' +
      '<circle cx="15.1" cy="10.1" r=".5" fill="#1a1008"/><circle cx="16.9" cy="10.1" r=".5" fill="#1a1008"/>' +
      '<path d="M8.5 16a7.5 7.5 0 0 1 15 0" fill="none" stroke="#8a6508" stroke-width=".7" opacity=".55"/>' +
    '</svg>'
  ];

  LOGOS.meta = [
    { id: 1, title: 'Klasik önden', desc: 'Sıcak hardal gradyanlı, net çizgili klasik arı' },
    { id: 2, title: 'Yan profil uçuş', desc: 'Dinamik yan görünüm, hafif perspektif kanat' },
    { id: 3, title: 'Altıgen rozet', desc: 'Petek altıgen çerçeve içinde rozet arı' },
    { id: 4, title: 'Tombul sevimli', desc: 'Yuvarlak form, gülümseyen sevimli maskot' },
    { id: 5, title: 'Minimal geometrik', desc: 'İnce çizgiler, dairesel minimal stil' },
    { id: 6, title: 'Petek arka plan', desc: 'Arka planda petek deseni, önde arı' },
    { id: 7, title: 'Bal damlası', desc: 'Altında bal damlası vurgusu, sıcak tonlar' },
    { id: 8, title: 'İzometrik kovan', desc: '3D kovan üzerinde oturan arı' },
    { id: 9, title: 'Monogram H', desc: 'Hardal H harfi + kanat detayı' },
    { id: 10, title: 'Mühür damga', desc: 'Dairesel mühür çerçevesi, kurumsal damga' }
  ];

  return LOGOS;
}));

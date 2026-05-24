import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import "../css/TablePage.css";

export default function TablePage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const api = import.meta.env.VITE_API_URL;

  const [menu, setMenu] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // cart: { [itemId]: { itemId, name, price, qty, note } }
  const [cart, setCart] = useState({});
  const [placing, setPlacing] = useState(false);
  const [placedMsg, setPlacedMsg] = useState("");
  const [callMsg, setCallMsg] = useState("");
  const [orderPopupOpen, setOrderPopupOpen] = useState(false);
  const [staffPopupOpen, setStaffPopupOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Token + language from RoomLanguagePage
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category");

  const urlToken = searchParams.get("token") || "";
  const langCode = searchParams.get("lang") || "bs";

  //URL HIDDING
  const tokenStorageKey = `room-token-${tableId}`;

  if (urlToken) {
    sessionStorage.setItem(tokenStorageKey, urlToken);
  }

  const token = urlToken || sessionStorage.getItem(tokenStorageKey) || "";

  useEffect(() => {
  if (urlToken) {
    window.history.replaceState({}, "", `/t/${tableId}?lang=${langCode}`);
  }
}, [urlToken, tableId, langCode]);

  const langMap = {
    bs: 0,
    en: 1,
    de: 2,
    ar: 3,
    tr: 4,
  };

  // jezik: 0 = osnovni name, 1 = name1, 2 = name2, 3 = name3, 4 = name4
  const lang = langMap[langCode] ?? 0;

  const text = {
    bs: {
      roomService: "Posluga u sobu",
      room: "Soba",
      subtitleCategory: "Odaberite artikle za svoju narudžbu",
      subtitleHome: "Pregledajte meni i kontaktirajte osoblje po potrebi",
      callStaff: "Pozovi osoblje",
      error: "Greška",
      back: "Nazad",
      allCategories: "Sve kategorije",
      category: "Kategorija",
      menu: "Meni",
      total: "ukupno",
      items: "artikala",
      add: "Dodaj",
      added: "Dodano",
      emptyCart: "Korpa je prazna.",
      orderSuccess: "Vaša narudžba je uspješno poslana.",
      staffCalled:
        "Hotelsko osoblje je obaviješteno i uskoro će doći do Vaše sobe.",
      billRequested: "Račun je zatražen.",
      yourOrder: "Vaša narudžba",
      cart: "Korpa",
      closeCart: "Zatvori korpu",
      close: "Zatvori",
      noItems: "Još nema artikala",
      addSomething: "Dodajte nešto iz menija.",
      decreaseQty: "Smanji količinu",
      increaseQty: "Povećaj količinu",
      note: "Napomena (opcionalno)",
      notePlaceholder: "npr. zobeno mlijeko, bez šećera…",
      totalLabel: "Ukupno",
      sending: "Slanje…",
      finishOrder: "Završi narudžbu",
      finePrint: "Vaša narudžba se odmah šalje hotelskom osoblju.",
      viewCart: "Vidi korpu",
      openCart: "Otvori korpu",
      orderSent: "Narudžba poslana",
      staffNotified: "Osoblje je obaviješteno",
      ok: "U redu",
      footerHint:
        "Nakon dodavanja artikla, dolje će se pojaviti pregled korpe.",
    },
    en: {
      roomService: "Room service",
      room: "Room",
      subtitleCategory: "Choose items for your order",
      subtitleHome: "Browse the menu and contact staff if needed",
      callStaff: "Call staff",
      error: "Error",
      back: "Back",
      allCategories: "All categories",
      category: "Category",
      menu: "Menu",
      total: "total",
      items: "items",
      add: "Add",
      added: "Added",
      emptyCart: "Your cart is empty.",
      orderSuccess: "Your order has been sent successfully.",
      staffCalled:
        "Hotel staff has been notified and will come to your room shortly.",
      billRequested: "The bill has been requested.",
      yourOrder: "Your order",
      cart: "Cart",
      closeCart: "Close cart",
      close: "Close",
      noItems: "No items yet",
      addSomething: "Add something from the menu.",
      decreaseQty: "Decrease quantity",
      increaseQty: "Increase quantity",
      note: "Note (optional)",
      notePlaceholder: "e.g. oat milk, no sugar…",
      totalLabel: "Total",
      sending: "Sending…",
      finishOrder: "Place order",
      finePrint: "Your order is sent directly to hotel staff.",
      viewCart: "View cart",
      openCart: "Open cart",
      orderSent: "Order sent",
      staffNotified: "Staff has been notified",
      ok: "OK",
      footerHint:
        "After adding an item, your cart preview will appear at the bottom.",
    },
    de: {
      roomService: "Zimmerservice",
      room: "Zimmer",
      subtitleCategory: "Wählen Sie Artikel für Ihre Bestellung",
      subtitleHome:
        "Durchsuchen Sie das Menü und kontaktieren Sie bei Bedarf das Personal",
      callStaff: "Personal rufen",
      error: "Fehler",
      back: "Zurück",
      allCategories: "Alle Kategorien",
      category: "Kategorie",
      menu: "Menü",
      total: "insgesamt",
      items: "Artikel",
      add: "Hinzufügen",
      added: "Hinzugefügt",
      emptyCart: "Der Warenkorb ist leer.",
      orderSuccess: "Ihre Bestellung wurde erfolgreich gesendet.",
      staffCalled:
        "Das Hotelpersonal wurde benachrichtigt und kommt bald zu Ihrem Zimmer.",
      billRequested: "Die Rechnung wurde angefordert.",
      yourOrder: "Ihre Bestellung",
      cart: "Warenkorb",
      closeCart: "Warenkorb schließen",
      close: "Schließen",
      noItems: "Noch keine Artikel",
      addSomething: "Fügen Sie etwas aus dem Menü hinzu.",
      decreaseQty: "Menge verringern",
      increaseQty: "Menge erhöhen",
      note: "Hinweis (optional)",
      notePlaceholder: "z.B. Hafermilch, ohne Zucker…",
      totalLabel: "Gesamt",
      sending: "Wird gesendet…",
      finishOrder: "Bestellung abschließen",
      finePrint: "Ihre Bestellung wird direkt an das Hotelpersonal gesendet.",
      viewCart: "Warenkorb anzeigen",
      openCart: "Warenkorb öffnen",
      orderSent: "Bestellung gesendet",
      staffNotified: "Personal wurde benachrichtigt",
      ok: "OK",
      footerHint:
        "Nach dem Hinzufügen eines Artikels erscheint unten die Warenkorbübersicht.",
    },
    ar: {
      roomService: "خدمة الغرف",
      room: "غرفة",
      subtitleCategory: "اختر العناصر لطلبك",
      subtitleHome: "تصفح القائمة واتصل بالموظفين عند الحاجة",
      callStaff: "استدعاء الموظفين",
      error: "خطأ",
      back: "رجوع",
      allCategories: "كل الفئات",
      category: "الفئة",
      menu: "القائمة",
      total: "الإجمالي",
      items: "عناصر",
      add: "إضافة",
      added: "تمت الإضافة",
      emptyCart: "السلة فارغة.",
      orderSuccess: "تم إرسال طلبك بنجاح.",
      staffCalled: "تم إبلاغ موظفي الفندق وسيصلون إلى غرفتك قريبًا.",
      billRequested: "تم طلب الفاتورة.",
      yourOrder: "طلبك",
      cart: "السلة",
      closeCart: "إغلاق السلة",
      close: "إغلاق",
      noItems: "لا توجد عناصر بعد",
      addSomething: "أضف شيئًا من القائمة.",
      decreaseQty: "تقليل الكمية",
      increaseQty: "زيادة الكمية",
      note: "ملاحظة (اختياري)",
      notePlaceholder: "مثلاً: بدون سكر…",
      totalLabel: "المجموع",
      sending: "جارٍ الإرسال…",
      finishOrder: "إتمام الطلب",
      finePrint: "يتم إرسال طلبك مباشرة إلى موظفي الفندق.",
      viewCart: "عرض السلة",
      openCart: "فتح السلة",
      orderSent: "تم إرسال الطلب",
      staffNotified: "تم إبلاغ الموظفين",
      ok: "حسنًا",
      footerHint: "بعد إضافة عنصر، ستظهر معاينة السلة في الأسفل.",
    },
    tr: {
      roomService: "Oda servisi",
      room: "Oda",
      subtitleCategory: "Siparişiniz için ürünleri seçin",
      subtitleHome: "Menüyü inceleyin ve gerekirse personelle iletişime geçin",
      callStaff: "Personeli çağır",
      error: "Hata",
      back: "Geri",
      allCategories: "Tüm kategoriler",
      category: "Kategori",
      menu: "Menü",
      total: "toplam",
      items: "ürün",
      add: "Ekle",
      added: "Eklendi",
      emptyCart: "Sepetiniz boş.",
      orderSuccess: "Siparişiniz başarıyla gönderildi.",
      staffCalled:
        "Otel personeline haber verildi ve kısa süre içinde odanıza gelecektir.",
      billRequested: "Hesap istendi.",
      yourOrder: "Siparişiniz",
      cart: "Sepet",
      closeCart: "Sepeti kapat",
      close: "Kapat",
      noItems: "Henüz ürün yok",
      addSomething: "Menüden bir ürün ekleyin.",
      decreaseQty: "Miktarı azalt",
      increaseQty: "Miktarı artır",
      note: "Not (isteğe bağlı)",
      notePlaceholder: "örn. şekersiz, ekstra buz…",
      totalLabel: "Toplam",
      sending: "Gönderiliyor…",
      finishOrder: "Siparişi gönder",
      finePrint: "Siparişiniz doğrudan otel personeline gönderilir.",
      viewCart: "Sepeti görüntüle",
      openCart: "Sepeti aç",
      orderSent: "Sipariş gönderildi",
      staffNotified: "Personele haber verildi",
      ok: "Tamam",
      footerHint:
        "Bir ürün ekledikten sonra sepet önizlemesi altta görünecektir.",
    },
  };

  const t = text[langCode] || text.bs;

  const getItemName = (item) => {
    if (!item) return "";
    if (lang === 1 && item.name1) return item.name1;
    if (lang === 2 && item.name2) return item.name2;
    if (lang === 3 && item.name3) return item.name3;
    if (lang === 4 && item.name4) return item.name4;
    return item.name;
  };

  const getCategoryName = (category) => {
    if (!category) return "";

    if (lang === 1 && category.name1) return category.name1;
    if (lang === 2 && category.name2) return category.name2;
    if (lang === 3 && category.name3) return category.name3;
    if (lang === 4 && category.name4) return category.name4;

    return category.name;
  };

  const openCategory = (cat) => {
    const params = new URLSearchParams(searchParams);
    params.set("category", cat);
    setSearchParams(params);
  };

  const goBackToRoomChoice = () => {
    navigate(`/t/${tableId}?token=${token}&lang=${langCode}`);
  };

  const goBackToMenu = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("category");
    setSearchParams(params);
  };

  useEffect(() => {
    fetch(`${api}/menu`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setMenu(data))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [api]);

  const categories = useMemo(() => menu, [menu]);

  const selectedCategoryObject = useMemo(() => {
    if (!selectedCategory) return null;
    return menu.find((c) => c.name === selectedCategory) || null;
  }, [menu, selectedCategory]);

  const itemsForSelected = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = menu.find((c) => c.name === selectedCategory);
    const items = cat?.items || [];
    return items.map((it) => ({ ...it, category: selectedCategory }));
  }, [menu, selectedCategory]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);

  const total = useMemo(
    () => cartItems.reduce((sum, it) => sum + it.price * it.qty, 0),
    [cartItems]
  );

  const cartQty = useMemo(
    () => cartItems.reduce((s, x) => s + x.qty, 0),
    [cartItems]
  );

  const [toast, setToast] = useState({ open: false, text: "" });

  const showToast = (text) => {
    setToast({ open: true, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      setToast({ open: false, text: "" });
    }, 1500);
  };

  const hasItems = cartItems.length > 0;

  const addItem = (it) => {
    setPlacedMsg("");
    setErr("");
    setCallMsg("");

    const translatedName = getItemName(it);
    showToast(`${t.added} “${translatedName}”`);

    setCart((prev) => {
      const existing = prev[it.id];
      const qty = existing ? existing.qty + 1 : 1;
      return {
        ...prev,
        [it.id]: {
          itemId: it.id,
          name: translatedName,
          price: it.price,
          qty,
          note: existing?.note ?? "",
        },
      };
    });
  };

  const removeOne = (itemId) => {
    setPlacedMsg("");
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;

      if (existing.qty <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }

      return { ...prev, [itemId]: { ...existing, qty: existing.qty - 1 } };
    });
  };

  const setNote = (itemId, note) => {
    setPlacedMsg("");
    setCart((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], note },
    }));
  };

  const placeOrder = async () => {
    setErr("");
    setPlacedMsg("");
    setCallMsg("");

    if (!hasItems) {
      setErr(t.emptyCart);
      return;
    }

    const payloadItems = cartItems.map((it) => ({
      itemId: it.itemId,
      name: it.name,
      price: it.price,
      qty: it.qty,
      note: it.note || "",
    }));

    setPlacing(true);
    try {
      const body = { tableId, items: payloadItems };
      if (token) body.token = token;

      const res = await fetch(`${api}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setCart({});
      setPlacedMsg(t.orderSuccess);
      setOrderPopupOpen(true);
      setCartOpen(false);

      const params = new URLSearchParams(searchParams);
      params.delete("category");
      setSearchParams(params);
    } catch (e) {
      setErr(e.message);
    } finally {
      setPlacing(false);
    }
  };

  const callWaiter = async () => {
    setErr("");
    setCallMsg("");
    setPlacedMsg("");

    try {
      const body = { tableId, type: "waiter" };
      if (token) body.token = token;

      const res = await fetch(`${api}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setCallMsg(t.staffCalled);
      setStaffPopupOpen(true);
    } catch (e) {
      setErr(e.message);
    }
  };

  const requestBill = async () => {
    setErr("");
    setCallMsg("");
    setPlacedMsg("");

    try {
      const body = { tableId, type: "bill" };
      if (token) body.token = token;

      const res = await fetch(`${api}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setCallMsg(t.billRequested);
    } catch (e) {
      setErr(e.message);
    }
  };

  const accentFromName = (name) => {
    const str = String(name || "");
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    const hue = (h % 60) + 25;
    return `hsl(${hue} 70% 55%)`;
  };

  return (
    <div className="tp-page">
      <div className="tp-ambient" aria-hidden="true" />
      <div className="tp-shell">
        <button
          className="guestBackBtn"
          type="button"
          onClick={goBackToRoomChoice}
        >
          ← {t.back}
        </button>

        <div className="tp-header">
          <div>
            <div className="tp-kicker">{t.roomService}</div>
            <h1 className="tp-h1">
              {t.room} {tableId}
            </h1>
            <div className="tp-sub">
              {selectedCategory ? t.subtitleCategory : t.subtitleHome}
            </div>
          </div>

          <div className="tp-headerActions tp-headerActions--vertical">
            <button onClick={callWaiter} className="tp-btn tp-btn--secondary">
              {t.callStaff}
            </button>

            {/* Language is selected only once on RoomLanguagePage */}
          </div>
        </div>

        {toast.open && (
          <div className="tp-toast" role="status" aria-live="polite">
            {toast.text}
          </div>
        )}

        <div className="tp-alerts">
          {err && (
            <div className="tp-alert tp-alert--error">
              <div className="tp-alertTitle">{t.error}</div>
              <div className="tp-alertBody">{err}</div>
            </div>
          )}
        </div>

        <div className="tp-card">
          {selectedCategory && (
            <button className="tp-backButton" onClick={goBackToMenu}>
              ← {t.allCategories}
            </button>
          )}

          <div className="tp-cardHeader">
            {selectedCategory ? (
              <div>
                <div className="tp-kicker">{t.category}</div>
                <h2 className="tp-h2" style={{ marginTop: 6 }}>
                  {getCategoryName(selectedCategoryObject)}
                </h2>
              </div>
            ) : (
              <>
                <h2 className="tp-h2">{t.menu}</h2>
                <div className="tp-badge">
                  {categories.length} {t.total}
                </div>
              </>
            )}
          </div>

          {loading && (
            <div className="tp-loading" style={{ padding: 14 }}>
              <div className="tp-skeletonRow" />
              <div className="tp-skeletonRow" />
              <div className="tp-skeletonRow" />
            </div>
          )}

          {!loading && !selectedCategory && (
            <div className="tp-categoriesGrid">
              {categories.map((cat) => {
                const count = cat?.items?.length || 0;
                const accent = accentFromName(cat.name);

                return (
                  <button
                    key={cat.id}
                    className="tp-categoryCard"
                    onClick={() => openCategory(cat.name)}
                    style={{ "--tp-accent": accent }}
                  >
                    <div className="tp-categoryName">{getCategoryName(cat)}</div>
                    <div className="tp-categoryMeta">
                      {count} {t.items}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && selectedCategory && (
            <div className="tp-menuList">
              {itemsForSelected.map((it) => (
                <div key={it.id} className="tp-menuItem">
                  <div className="tp-itemMedia">
                    {it.imageUrl ? (
                      <img src={it.imageUrl} alt={getItemName(it)} />
                    ) : (
                      <span>
                        {String(getItemName(it) || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="tp-itemLeft">
                    <div className="tp-itemName">{getItemName(it)}</div>
                    <div className="tp-itemMeta">
                      <span className="tp-metaPill">
                        {getCategoryName(selectedCategoryObject)}
                      </span>
                    </div>
                  </div>

                  <div className="tp-itemRight">
                    <div className="tp-price">{it.price.toFixed(2)} KM</div>
                    <button
                      onClick={() => addItem(it)}
                      className="tp-btn tp-btn--primary"
                    >
                      {t.add}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartOpen && (
          <div className="tp-drawerOverlay" onClick={() => setCartOpen(false)}>
            <div className="tp-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="tp-drawerHeader">
                <div>
                  <div className="tp-kicker">{t.yourOrder}</div>
                  <h2 className="tp-h2" style={{ marginTop: 6 }}>
                    {t.cart}
                  </h2>
                </div>

                <button
                  className="tp-btn tp-btn--icon"
                  onClick={() => setCartOpen(false)}
                  aria-label={t.closeCart}
                  title={t.close}
                >
                  ✕
                </button>
              </div>

              <div className="tp-drawerBody">
                {!hasItems ? (
                  <div className="tp-empty">
                    <div className="tp-emptyTitle">{t.noItems}</div>
                    <div className="tp-muted">{t.addSomething}</div>
                  </div>
                ) : (
                  <div className="tp-cartList">
                    {cartItems.map((ci) => (
                      <div key={ci.itemId} className="tp-cartItem">
                        <div className="tp-cartTop">
                          <div className="tp-cartName">
                            {ci.name} <span className="tp-qty">× {ci.qty}</span>
                          </div>
                          <div className="tp-cartPrice">
                            {(ci.price * ci.qty).toFixed(2)} KM
                          </div>
                        </div>

                        <div className="tp-qtyRow">
                          <button
                            onClick={() => removeOne(ci.itemId)}
                            className="tp-btn tp-btn--icon"
                            aria-label={t.decreaseQty}
                          >
                            −
                          </button>

                          <button
                            onClick={() =>
                              addItem({
                                id: ci.itemId,
                                name: ci.name,
                                price: ci.price,
                              })
                            }
                            className="tp-btn tp-btn--icon"
                            aria-label={t.increaseQty}
                          >
                            +
                          </button>
                        </div>

                        <div className="tp-noteBlock">
                          <div className="tp-inputLabel">{t.note}</div>
                          <input
                            value={ci.note}
                            onChange={(e) => setNote(ci.itemId, e.target.value)}
                            placeholder={t.notePlaceholder}
                            className="tp-input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="tp-drawerFooter">
                <div className="tp-totalRow">
                  <div className="tp-totalLabel">{t.totalLabel}</div>
                  <div className="tp-totalValue">{total.toFixed(2)} KM</div>
                </div>

                <button
                  onClick={placeOrder}
                  disabled={placing || !hasItems}
                  className="tp-btn tp-btn--checkout"
                >
                  {placing ? t.sending : t.finishOrder}
                </button>

                <div className="tp-finePrint">{t.finePrint}</div>
              </div>
            </div>
          </div>
        )}

        {hasItems && !cartOpen && (
          <button
            type="button"
            className="tp-stickyCartBar"
            onClick={() => setCartOpen(true)}
            aria-label={t.openCart}
          >
            <span className="tp-stickyCartCount">{cartQty}</span>
            <span className="tp-stickyCartLabel">{t.viewCart}</span>
            <span className="tp-stickyCartPrice">{total.toFixed(2)} KM</span>
          </button>
        )}

        {orderPopupOpen && (
          <div
            className="tp-modalOverlay"
            onClick={() => setOrderPopupOpen(false)}
          >
            <div className="tp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="tp-modalIcon">✓</div>
              <h3 className="tp-modalTitle">{t.orderSent}</h3>
              <p className="tp-modalText">{placedMsg}</p>

              <button
                className="tp-btn tp-btn--checkout"
                onClick={() => setOrderPopupOpen(false)}
              >
                {t.ok}
              </button>
            </div>
          </div>
        )}

        {staffPopupOpen && (
          <div
            className="tp-modalOverlay"
            onClick={() => setStaffPopupOpen(false)}
          >
            <div className="tp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="tp-modalIcon">✓</div>
              <h3 className="tp-modalTitle">{t.staffNotified}</h3>
              <p className="tp-modalText">{callMsg}</p>

              <button
                className="tp-btn tp-btn--checkout"
                onClick={() => setStaffPopupOpen(false)}
              >
                {t.ok}
              </button>
            </div>
          </div>
        )}

        <div className="tp-footerHint">{t.footerHint}</div>

        <div className="guestPoweredBy">
          Digital ordering powered by{" "}
          <a href="https://tap2order.ba" target="_blank" rel="noreferrer">
            Tap2Order
          </a>
        </div>
      </div>
    </div>
  );
}

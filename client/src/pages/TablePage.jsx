import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { isRoomSessionError, lockRoomSession } from "../roomSession";
import "../css/TablePage.css";

export default function TablePage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const api = import.meta.env.VITE_API_URL;

  const [menu, setMenu] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // cart: { [itemId]: { itemId, name, price, qty, note } }
  const cartStorageKey = `hotel_guest_cart_${tableId}`;
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(cartStorageKey) || "{}"); } catch { return {}; }
  });
  const [placing, setPlacing] = useState(false);
  const [calling, setCalling] = useState("");
  const [placedMsg, setPlacedMsg] = useState("");
  const [callMsg, setCallMsg] = useState("");
  const [orderPopupOpen, setOrderPopupOpen] = useState(false);
  const [staffPopupOpen, setStaffPopupOpen] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [sessionLocked, setSessionLocked] = useState(false);
  const orderKeyRef = useRef("");
  const locationRef = useRef(location);
  const searchParamsRef = useRef(null);
  const backActionRef = useRef(null);

  // Token + language from RoomLanguagePage
  const [searchParams, setSearchParams] = useSearchParams();
  locationRef.current = location;
  searchParamsRef.current = searchParams;
  const selectedCategory = searchParams.get("category");
  const cartOpen = searchParams.get("cart") === "open";
  const closedModalOpen = location.state?.guestFlowOverlay === "closed";

  const requestedLang = searchParams.get("lang") || "bs";
  const langCode = ["bs", "en", "de", "tr", "ar"].includes(requestedLang) ? requestedLang : "bs";

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
    params.delete("cart");
    setSearchParams(params, {
      replace: false,
      state: { ...location.state, guestFlowParent: "menu-categories", guestFlowOverlay: undefined },
    });
  };

  const goBackToRoomChoice = () => {
    navigate(`/t/${tableId}?lang=${langCode}`);
  };

  const goBackToCategories = () => {
    if (location.state?.guestFlowParent === "menu-categories") {
      navigate(-1);
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.delete("category");
    params.delete("cart");
    setSearchParams(params, { replace: true });
  };

  const openCart = () => {
    const params = new URLSearchParams(searchParams);
    params.set("cart", "open");
    setSearchParams(params, {
      replace: false,
      state: { ...location.state, guestFlowOverlay: "cart" },
    });
  };

  const closeCart = ({ replace = false } = {}) => {
    if (!replace && location.state?.guestFlowOverlay === "cart") {
      navigate(-1);
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.delete("cart");
    setSearchParams(params, {
      replace: true,
      state: { ...location.state, guestFlowOverlay: undefined },
    });
  };

  const openClosedModal = useCallback(() => {
    const currentLocation = locationRef.current;
    if (currentLocation.state?.guestFlowOverlay === "closed") return;
    setSearchParams(new URLSearchParams(searchParamsRef.current), {
      replace: false,
      state: { ...currentLocation.state, guestFlowOverlay: "closed" },
    });
  }, [setSearchParams]);

  const closeClosedModal = () => {
    if (location.state?.guestFlowOverlay === "closed") {
      navigate(-1);
      return;
    }
  };

  const handleBack = () => {
    if (orderPopupOpen) {
      setOrderPopupOpen(false);
      return;
    }
    if (staffPopupOpen) {
      setStaffPopupOpen(false);
      return;
    }
    if (closedModalOpen) {
      closeClosedModal();
      return;
    }
    if (cartOpen) {
      closeCart();
      return;
    }
    if (selectedCategory) {
      goBackToCategories();
      return;
    }
    goBackToRoomChoice();
  };
  backActionRef.current = handleBack;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      backActionRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const clearInvalidSession = useCallback(() => {
    sessionStorage.removeItem(cartStorageKey);
    setCart({});
    setSessionLocked(true);
  }, [cartStorageKey]);

  const loadAvailability = useCallback(async () => {
    const response = await fetch(`${api}/api/public/room-service/availability`, { credentials: "include" });
    if (response.status === 401 || response.status === 403) {
      const data = await response.json().catch(() => ({}));
      clearInvalidSession();
      if (isRoomSessionError(data.code)) lockRoomSession(data.code);
      throw new Error("Sesija je istekla. Ponovo skenirajte QR kod sobe.");
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    setAvailability(data);
    if (!data.isOpen) openClosedModal();
    return data;
  }, [api, clearInvalidSession, openClosedModal]);

  useEffect(() => {
    fetch(`${api}/api/public/menu`, { credentials: "include" })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (isRoomSessionError(data.code)) lockRoomSession(data.code);
          throw new Error(data.message || `HTTP ${r.status}`);
        }
        return data;
      })
      .then((data) => setMenu(data))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
    fetch(`${api}/api/guest/room-session`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Sesija je istekla. Ponovo skenirajte QR kod sobe.");
        const data = await response.json();
        if (data.status !== "verified" || String(data?.roomId) !== String(tableId)) throw new Error("QR sesija pripada drugoj sobi.");
      })
      .catch((error) => { clearInvalidSession(); setErr(error.message); });
    loadAvailability().catch((error) => setErr(error.message));
  }, [api, tableId, loadAvailability, clearInvalidSession]);

  useEffect(() => {
    sessionStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart, cartStorageKey]);

  const categories = useMemo(() => menu, [menu]);

  const selectedCategoryObject = useMemo(() => {
    if (!selectedCategory) return null;
    return menu.find((c) => c.id === selectedCategory) || null;
  }, [menu, selectedCategory]);

  const itemsForSelected = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = menu.find((c) => c.id === selectedCategory);
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
    if (!availability?.isOpen || sessionLocked) {
      openClosedModal();
      return;
    }
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

    if (!hasItems || placing || sessionLocked) {
      setErr(t.emptyCart);
      return;
    }

    const payloadItems = cartItems.map((it) => ({
      itemId: it.itemId,
      qty: it.qty,
      note: it.note || "",
    }));

    setPlacing(true);
    try {
      if (!availability?.isOpen) {
        openClosedModal();
        return;
      }
      if (!orderKeyRef.current) orderKeyRef.current = crypto.randomUUID();
      const body = { items: payloadItems };

      const res = await fetch(`${api}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": orderKeyRef.current,
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const responseBody = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        if (isRoomSessionError(responseBody.code)) lockRoomSession(responseBody.code);
        clearInvalidSession();
        throw new Error("Sesija je istekla. Ponovo skenirajte QR kod sobe.");
      }
      if (res.status === 409 && responseBody.code === "ROOM_SERVICE_CLOSED") {
        setAvailability(responseBody);
        openClosedModal();
        throw new Error(responseBody.message || "Room service trenutno ne radi.");
      }
      if (!res.ok) throw new Error(responseBody.message || responseBody.error || `HTTP ${res.status}`);

      setCart({});
      sessionStorage.removeItem(cartStorageKey);
      orderKeyRef.current = "";
      setPlacedMsg(t.orderSuccess);
      setOrderPopupOpen(true);

      const params = new URLSearchParams(searchParams);
      params.delete("category");
      params.delete("cart");
      setSearchParams(params, {
        replace: true,
        state: { ...location.state, guestFlowParent: undefined, guestFlowOverlay: undefined },
      });
    } catch (error) {
      setErr(error.message || t.error);
    } finally {
      setPlacing(false);
    }
  };

  const callWaiter = async () => {
    if (calling) return;
    setErr("");
    setCallMsg("");
    setPlacedMsg("");

    try {
      setCalling("waiter");
      const body = { type: "waiter" };

      const res = await fetch(`${api}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setCallMsg(t.staffCalled);
      setStaffPopupOpen(true);
    } catch {
      setErr(t.error);
    } finally {
      setCalling("");
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
    <div className="tp-page" dir={langCode === "ar" ? "rtl" : "ltr"}>
      <div className="tp-ambient" aria-hidden="true" />
      <div className="tp-shell">
        <button
          className="guestBackBtn"
          type="button"
          onClick={handleBack}
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
            <button disabled={Boolean(calling)} onClick={callWaiter} className="tp-btn tp-btn--secondary">
              {calling === "waiter" ? t.sending : t.callStaff}
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
            <button className="tp-backButton" onClick={goBackToCategories}>
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
                    onClick={() => openCategory(cat.id)}
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
                      disabled={!availability?.isOpen || sessionLocked || it.isAvailable === false}
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
          <div className="tp-drawerOverlay" role="presentation" onClick={() => closeCart()}>
            <div className="tp-drawer" role="dialog" aria-modal="true" aria-label={t.cart} onClick={(e) => e.stopPropagation()}>
              <div className="tp-drawerHeader">
                <div>
                  <div className="tp-kicker">{t.yourOrder}</div>
                  <h2 className="tp-h2" style={{ marginTop: 6 }}>
                    {t.cart}
                  </h2>
                </div>

                <button
                  className="tp-btn tp-btn--icon"
                  onClick={() => closeCart()}
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
                            disabled={!availability?.isOpen || sessionLocked}
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
                  disabled={placing || !hasItems || !availability?.isOpen || sessionLocked}
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
            onClick={openCart}
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
            role="presentation"
            onClick={() => setOrderPopupOpen(false)}
          >
            <div className="tp-modal" role="dialog" aria-modal="true" aria-label={t.orderSent} onClick={(e) => e.stopPropagation()}>
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

        {closedModalOpen && (
          <div className="tp-modalOverlay" role="presentation" onClick={closeClosedModal}>
            <div className="tp-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="tp-modalIcon">i</div>
              <h3 className="tp-modalTitle">
                {sessionLocked ? t.error : "Room service trenutno ne radi"}
              </h3>
              <p className="tp-modalText">
                {sessionLocked
                  ? "Sesija je istekla. Ponovo skenirajte QR kod sobe."
                  : `${availability?.message || "Room service trenutno ne radi."}${
                      availability?.todayHours
                        ? ` Radno vrijeme: ${availability.todayHours.opensAt}–${availability.todayHours.closesAt}.`
                        : ""
                    }`}
              </p>
              <button className="tp-btn tp-btn--checkout" onClick={closeClosedModal}>
                {t.ok}
              </button>
            </div>
          </div>
        )}

        {staffPopupOpen && (
          <div
            className="tp-modalOverlay"
            role="presentation"
            onClick={() => setStaffPopupOpen(false)}
          >
            <div className="tp-modal" role="dialog" aria-modal="true" aria-label={t.staffNotified} onClick={(e) => e.stopPropagation()}>
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

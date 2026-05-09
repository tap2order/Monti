import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/AdminMenuPage.css";
import mockMenu from "../mock/adminMenuMock.json";

export default function AdminMenuPage() {
  const api = import.meta.env.VITE_API_URL;
  const nav = useNavigate();

  function getAuth() {
    return localStorage.getItem("adminAuth") || "";
  }

  function clearAuthAndGoLogin() {
    localStorage.removeItem("adminAuth");
    nav("/admin");
  }

  async function authedFetch(url, options = {}) {
    const auth = getAuth();
    if (!auth) {
      clearAuthAndGoLogin();
      throw new Error("Niste prijavljeni");
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: auth,
    };

    const r = await fetch(url, { ...options, headers });

    if (r.status === 401) {
      clearAuthAndGoLogin();
      throw new Error("Sesija je istekla. Prijavite se ponovo.");
    }

    return r;
  }

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const [newCat, setNewCat] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [categoryDraftName, setCategoryDraftName] = useState("");

  const [newItemName, setNewItemName] = useState("");
  const [newItemName1, setNewItemName1] = useState("");
  const [newItemName2, setNewItemName2] = useState("");
  const [newItemName3, setNewItemName3] = useState("");
  const [newItemName4, setNewItemName4] = useState("");
  const [newItemImage, setNewItemImage] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");

  const [showNewTranslations, setShowNewTranslations] = useState(false);
  const [openItemId, setOpenItemId] = useState("");
  const [mobileTab, setMobileTab] = useState("category");

  const [itemDrafts, setItemDrafts] = useState({});
  const [savingItemId, setSavingItemId] = useState("");
  const [deletingItemId, setDeletingItemId] = useState("");
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState("");

  const selectedCat = useMemo(
    () => menu.find((c) => c.id === selectedCatId) || null,
    [menu, selectedCatId]
  );

  function resetMessages() {
    setErr("");
    setSuccess("");
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------
  // 1) MOCK verzija za lokalni UI rad
  // ---------------------------------------------------------
  async function loadMenuMock() {
    setLoading(true);
    setErr("");

    try {
      const data = mockMenu;
      setMenu(data);

      setSelectedCatId((prev) => {
        if (prev && data.some((c) => c.id === prev)) return prev;
        return data[0]?.id || "";
      });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // 2) PRAVA API verzija
  // Ostavljena ovdje da je ne brišemo
  // ---------------------------------------------------------
  async function loadMenuApi() {
    setLoading(true);
    setErr("");

    try {
      const r = await fetch(`${api}/menu`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();

      setMenu(data);

      setSelectedCatId((prev) => {
        if (prev && data.some((c) => c.id === prev)) return prev;
        return data[0]?.id || "";
      });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // AKTIVNA loadMenu funkcija
  // Ovdje samo biraj koju želiš koristiti
  // ---------------------------------------------------------
  async function loadMenu() {
    //await loadMenuMock();
     await loadMenuApi();
  }

  useEffect(() => {
    if (!getAuth()) {
      nav("/admin");
      return;
    }
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    setCategoryDraftName(selectedCat?.name || "");

    const drafts = {};
    for (const item of selectedCat?.items || []) {
      drafts[item.id] = {
        name: item.name || "",
        name1: item.name1 || "",
        name2: item.name2 || "",
        name3: item.name3 || "",
        name4: item.name4 || "",
        imageUrl: item.imageUrl || "",
        price: item.price != null ? String(item.price) : "",
      };
    }
    setItemDrafts(drafts);
    setOpenItemId("");
  }, [selectedCat]);

  function updateDraft(itemId, field, value) {
    setItemDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [field]: value,
      },
    }));
  }

  function getItemDraft(item) {
    return (
      itemDrafts[item.id] || {
        name: item.name || "",
        name1: item.name1 || "",
        name2: item.name2 || "",
        name3: item.name3 || "",
        name4: item.name4 || "",
        imageUrl: item.imageUrl || "",
        price: item.price != null ? String(item.price) : "",
      }
    );
  }

  async function createCategory() {
    const name = newCat.trim();
    if (!name) return;

    resetMessages();
    setIsCreatingCategory(true);

    try {
      const r = await authedFetch(`${api}/menu-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setNewCat("");
      setSuccess("Kategorija je uspješno dodana.");
      await loadMenu();

      if (data?.id) {
        setSelectedCatId(data.id);
        setMobileTab("category");
      }
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setIsCreatingCategory(false);
    }
  }

  async function saveCategoryName() {
    const newName = String(categoryDraftName || "").trim();
    if (!selectedCat) return;
    if (!newName) return setErr("Naziv kategorije je obavezan.");
    if (newName === selectedCat.name) return;

    resetMessages();
    setIsSavingCategory(true);

    try {
      const r = await authedFetch(`${api}/menu-category/${selectedCat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setSuccess("Kategorija je uspješno izmijenjena.");
      await loadMenu();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function deleteCategory(id) {
    if (!confirm("Obrisati ovu kategoriju? (Svi artikli će biti obrisani)")) return;

    resetMessages();
    setDeletingCategoryId(id);

    try {
      const r = await authedFetch(`${api}/menu-category/${id}`, {
        method: "DELETE",
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      if (id === selectedCatId) setSelectedCatId("");
      setSuccess("Kategorija je obrisana.");
      await loadMenu();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setDeletingCategoryId("");
    }
  }

  async function createItem() {
    const name = newItemName.trim();
    const price = Number(newItemPrice);

    if (!selectedCatId) return setErr("Prvo odaberite kategoriju.");
    if (!name) return setErr("Osnovni naziv artikla je obavezan.");
    if (!Number.isFinite(price) || price <= 0) {
      return setErr("Cijena mora biti veća od 0.");
    }

    resetMessages();
    setIsCreatingItem(true);

    try {
      const r = await authedFetch(`${api}/menu-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          name1: newItemName1.trim(),
          name2: newItemName2.trim(),
          name3: newItemName3.trim(),
          name4: newItemName4.trim(),
          imageUrl: newItemImage.trim(),
          price,
          categoryId: selectedCatId,
        }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setNewItemName("");
      setNewItemName1("");
      setNewItemName2("");
      setNewItemName3("");
      setNewItemName4("");
      setNewItemImage("");
      setNewItemPrice("");
      setShowNewTranslations(false);
      setSuccess("Artikal je uspješno dodan.");
      await loadMenu();
      setMobileTab("items");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setIsCreatingItem(false);
    }
  }

  async function saveItem(item) {
    const draft = getItemDraft(item);
    const price = Number(draft.price);

    if (!draft.name.trim()) return setErr("Osnovni naziv artikla je obavezan.");
    if (!Number.isFinite(price) || price <= 0) {
      return setErr("Cijena mora biti veća od 0.");
    }

    const patch = {
      name: draft.name.trim(),
      name1: draft.name1.trim(),
      name2: draft.name2.trim(),
      name3: draft.name3.trim(),
      name4: draft.name4.trim(),
      imageUrl: draft.imageUrl.trim(),
      price,
    };

    resetMessages();
    setSavingItemId(item.id);

    try {
      const r = await authedFetch(`${api}/menu-item/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setSuccess(`Artikal "${patch.name}" je sačuvan.`);
      await loadMenu();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSavingItemId("");
    }
  }

  async function deleteItem(id) {
    if (!confirm("Obrisati ovaj artikal?")) return;

    resetMessages();
    setDeletingItemId(id);

    try {
      const r = await authedFetch(`${api}/menu-item/${id}`, {
        method: "DELETE",
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setSuccess("Artikal je obrisan.");
      await loadMenu();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setDeletingItemId("");
    }
  }

  return (
    <div className="adminMenuPage">
      <div className="adminMenuShell">
        <div className="adminMenuTopbar">
          <div>
            <div className="adminMenuKicker">Tap2Order Monti</div>
            <h1 className="adminMenuTitle">Room Service Menu</h1>
            <p className="adminMenuSubtitle">
              Čišći pregled kategorija i artikala, sa manje haosa na ekranu.
            </p>
          </div>

          <button className="adminMenuBtn adminMenuBtnGhost" onClick={loadMenu}>
            Osvježi
          </button>
        </div>

        {err && <div className="adminMenuAlert adminMenuAlertError">{err}</div>}
        {success && (
          <div className="adminMenuAlert adminMenuAlertSuccess">{success}</div>
        )}

        {loading ? (
          <div className="adminMenuPanel">Učitavanje…</div>
        ) : (
          <>
            <section className="adminMenuPanel adminMenuCategoriesPanel">
              <div className="adminMenuSectionHead">
                <h2 className="adminMenuSectionTitle">Kategorije</h2>
                <span className="adminMenuMuted">{menu.length} ukupno</span>
              </div>

              <div className="adminMenuToolbarGrid">
                <div className="adminMenuField">
                  <label className="adminMenuLabel">Odaberi kategoriju</label>
                  <select
                    className="adminMenuSelect"
                    value={selectedCatId}
                    onChange={(e) => setSelectedCatId(e.target.value)}
                  >
                    <option value="">Odaberi kategoriju</option>
                    {menu.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.items?.length ?? 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="adminMenuField">
                  <label className="adminMenuLabel">Dodaj kategoriju</label>
                  <div className="adminMenuInlineRow">
                    <input
                      className="adminMenuInput"
                      placeholder="Nova kategorija"
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                    />
                    <button
                      className="adminMenuBtn adminMenuBtnPrimary"
                      onClick={createCategory}
                      disabled={isCreatingCategory}
                    >
                      {isCreatingCategory ? "..." : "Dodaj"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="adminMenuMobileTabs">
              <button
                className={`adminMenuMobileTab ${mobileTab === "category" ? "is-active" : ""}`}
                onClick={() => setMobileTab("category")}
              >
                Kategorija
              </button>
              <button
                className={`adminMenuMobileTab ${mobileTab === "new" ? "is-active" : ""}`}
                onClick={() => setMobileTab("new")}
              >
                Novi artikal
              </button>
              <button
                className={`adminMenuMobileTab ${mobileTab === "items" ? "is-active" : ""}`}
                onClick={() => setMobileTab("items")}
              >
                Artikli
              </button>
            </div>

            <div className="adminMenuContentGrid">
              <div className="adminMenuLeftColumn">
                <section
                  className={`adminMenuPanel ${
                    mobileTab === "category"
                      ? "is-mobile-section-visible"
                      : "is-mobile-section-hidden"
                  }`}
                >
                  <div className="adminMenuSectionHead">
                    <h2 className="adminMenuSectionTitle">Odabrana kategorija</h2>
                    <span className="adminMenuMuted">
                      {selectedCat ? `${selectedCat.items?.length || 0} artikala` : "—"}
                    </span>
                  </div>

                  {!selectedCat ? (
                    <div className="adminMenuEmpty">Odaberi kategoriju iznad.</div>
                  ) : (
                    <div className="adminMenuCategoryEdit">
                      <div className="adminMenuField">
                        <label className="adminMenuLabel">Naziv kategorije</label>
                        <input
                          className="adminMenuInput"
                          value={categoryDraftName}
                          onChange={(e) => setCategoryDraftName(e.target.value)}
                          placeholder="Naziv kategorije"
                        />
                      </div>

                      <div className="adminMenuActionRow">
                        <button
                          className="adminMenuBtn adminMenuBtnPrimary"
                          onClick={saveCategoryName}
                          disabled={isSavingCategory}
                        >
                          {isSavingCategory ? "Čuvanje..." : "Sačuvaj"}
                        </button>

                        <button
                          className="adminMenuBtn adminMenuBtnDanger"
                          onClick={() => deleteCategory(selectedCat.id)}
                          disabled={deletingCategoryId === selectedCat.id}
                        >
                          {deletingCategoryId === selectedCat.id ? "Brisanje..." : "Obriši"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section
                  className={`adminMenuPanel ${
                    mobileTab === "new"
                      ? "is-mobile-section-visible"
                      : "is-mobile-section-hidden"
                  }`}
                >
                  <div className="adminMenuSectionHead">
                    <h2 className="adminMenuSectionTitle">Dodaj novi artikal</h2>
                    <span className="adminMenuMuted">
                      {selectedCat ? selectedCat.name : "Odaberi kategoriju"}
                    </span>
                  </div>

                  {!selectedCat ? (
                    <div className="adminMenuEmpty">
                      Odaberi kategoriju da bi dodao artikal.
                    </div>
                  ) : (
                    <>
                      <div className="adminMenuCompactGrid">
                        <div className="adminMenuField adminMenuFieldSpan2">
                          <label className="adminMenuLabel">Naziv (BHS)</label>
                          <input
                            className="adminMenuInput"
                            placeholder="npr. Palačinke Nutella"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                          />
                        </div>

                        <div className="adminMenuField">
                          <label className="adminMenuLabel">Cijena</label>
                          <input
                            className="adminMenuInput"
                            placeholder="npr. 7.5"
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                          />
                        </div>

                        <div className="adminMenuField">
                          <label className="adminMenuLabel">Slika artikla</label>
                          <input
                            className="adminMenuInput adminMenuFileInput"
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const base64 = await fileToBase64(file);
                                setNewItemImage(base64);
                              } catch {
                                setErr("Upload slike nije uspio.");
                              }
                            }}
                          />
                          {newItemImage && (
                            <div className="adminMenuUploadPreview">
                              <img
                                src={newItemImage}
                                alt="Preview"
                                className="adminMenuPreviewImage"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="adminMenuToggleBtn"
                        onClick={() => setShowNewTranslations((v) => !v)}
                      >
                        {showNewTranslations ? "Sakrij prevode" : "Prikaži prevode"}
                      </button>

                      {showNewTranslations && (
                        <div className="adminMenuTranslationsBox">
                          <div className="adminMenuCompactGrid">
                            <div className="adminMenuField">
                              <label className="adminMenuLabel">English</label>
                              <input
                                className="adminMenuInput"
                                value={newItemName1}
                                onChange={(e) => setNewItemName1(e.target.value)}
                              />
                            </div>

                            <div className="adminMenuField">
                              <label className="adminMenuLabel">Deutsch</label>
                              <input
                                className="adminMenuInput"
                                value={newItemName2}
                                onChange={(e) => setNewItemName2(e.target.value)}
                              />
                            </div>

                            <div className="adminMenuField">
                              <label className="adminMenuLabel">Italiano</label>
                              <input
                                className="adminMenuInput"
                                value={newItemName3}
                                onChange={(e) => setNewItemName3(e.target.value)}
                              />
                            </div>

                            <div className="adminMenuField">
                              <label className="adminMenuLabel">Français</label>
                              <input
                                className="adminMenuInput"
                                value={newItemName4}
                                onChange={(e) => setNewItemName4(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="adminMenuActionRow">
                        <button
                          className="adminMenuBtn adminMenuBtnPrimary"
                          onClick={createItem}
                          disabled={isCreatingItem}
                        >
                          {isCreatingItem ? "Dodavanje..." : "Dodaj artikal"}
                        </button>
                      </div>
                    </>
                  )}
                </section>
              </div>

              <div className={`adminMenuRightColumn ${mobileTab === "items" ? "is-mobile-visible" : ""}`}>
                <section className="adminMenuPanel">
                  <div className="adminMenuSectionHead">
                    <h2 className="adminMenuSectionTitle">Postojeći artikli</h2>
                    <span className="adminMenuMuted">
                      {selectedCat
                        ? `${selectedCat.items?.length || 0} u kategoriji`
                        : "Odaberi kategoriju"}
                    </span>
                  </div>

                  {!selectedCat ? (
                    <div className="adminMenuEmpty">Odaberi kategoriju iznad.</div>
                  ) : (selectedCat.items || []).length === 0 ? (
                    <div className="adminMenuEmpty">
                      Još nema artikala u ovoj kategoriji.
                    </div>
                  ) : (
                    <div className="adminMenuItemsList">
                      {(selectedCat.items || []).map((it, index) => {
                        const draft = getItemDraft(it);
                        const isSaving = savingItemId === it.id;
                        const isDeleting = deletingItemId === it.id;
                        const isOpen = openItemId === it.id;

                        return (
                          <article key={it.id} className="adminMenuItemCard">
                            <div className="adminMenuItemHeadCompact">
                              <div>
                                <div className="adminMenuItemIndex">
                                  {index + 1}. {draft.name || it.name}
                                </div>
                                <div className="adminMenuItemMeta">ID: {it.id}</div>
                              </div>

                              <div className="adminMenuItemHeadRight">
                                <div className="adminMenuPriceBadge">
                                  {draft.price || it.price} KM
                                </div>
                                <button
                                  type="button"
                                  className="adminMenuToggleBtn adminMenuToggleBtnSmall"
                                  onClick={() =>
                                    setOpenItemId((prev) => (prev === it.id ? "" : it.id))
                                  }
                                >
                                  {isOpen ? "Sakrij detalje" : "Uredi"}
                                </button>
                              </div>
                            </div>

                            {isOpen && (
                              <>
                                <div className="adminMenuItemEditorGrid">
                                  <div className="adminMenuField adminMenuFieldSpan2">
                                    <label className="adminMenuLabel">Naziv (BHS)</label>
                                    <input
                                      className="adminMenuInput"
                                      value={draft.name}
                                      onChange={(e) =>
                                        updateDraft(it.id, "name", e.target.value)
                                      }
                                    />
                                  </div>

                                  <div className="adminMenuField">
                                    <label className="adminMenuLabel">Cijena</label>
                                    <input
                                      className="adminMenuInput"
                                      value={draft.price}
                                      onChange={(e) =>
                                        updateDraft(it.id, "price", e.target.value)
                                      }
                                    />
                                  </div>

                                  <div className="adminMenuField">
                                    <label className="adminMenuLabel">Slika artikla</label>
                                    <input
                                      className="adminMenuInput adminMenuFileInput"
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                          const base64 = await fileToBase64(file);
                                          updateDraft(it.id, "imageUrl", base64);
                                        } catch {
                                          setErr("Upload slike nije uspio.");
                                        }
                                      }}
                                    />
                                    {draft.imageUrl && (
                                      <div className="adminMenuUploadPreview">
                                        <img
                                          src={draft.imageUrl}
                                          alt={draft.name || it.name}
                                          className="adminMenuPreviewImage"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="adminMenuTranslationsBox">
                                  <div className="adminMenuCompactGrid">
                                    <div className="adminMenuField">
                                      <label className="adminMenuLabel">English</label>
                                      <input
                                        className="adminMenuInput"
                                        value={draft.name1}
                                        onChange={(e) =>
                                          updateDraft(it.id, "name1", e.target.value)
                                        }
                                      />
                                    </div>

                                    <div className="adminMenuField">
                                      <label className="adminMenuLabel">Deutsch</label>
                                      <input
                                        className="adminMenuInput"
                                        value={draft.name2}
                                        onChange={(e) =>
                                          updateDraft(it.id, "name2", e.target.value)
                                        }
                                      />
                                    </div>

                                    <div className="adminMenuField">
                                      <label className="adminMenuLabel">Italiano</label>
                                      <input
                                        className="adminMenuInput"
                                        value={draft.name3}
                                        onChange={(e) =>
                                          updateDraft(it.id, "name3", e.target.value)
                                        }
                                      />
                                    </div>

                                    <div className="adminMenuField">
                                      <label className="adminMenuLabel">Français</label>
                                      <input
                                        className="adminMenuInput"
                                        value={draft.name4}
                                        onChange={(e) =>
                                          updateDraft(it.id, "name4", e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="adminMenuActionRow">
                                  <button
                                    className="adminMenuBtn adminMenuBtnPrimary"
                                    onClick={() => saveItem(it)}
                                    disabled={isSaving}
                                  >
                                    {isSaving ? "Čuvanje..." : "Sačuvaj"}
                                  </button>

                                  <button
                                    className="adminMenuBtn adminMenuBtnDanger"
                                    onClick={() => deleteItem(it.id)}
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? "Brisanje..." : "Obriši"}
                                  </button>
                                </div>
                              </>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
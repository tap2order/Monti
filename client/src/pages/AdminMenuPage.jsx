import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/AdminMenuPage.css";

const emptyCategoryForm = {
  name: "",
  name1: "",
  name2: "",
  name3: "",
  name4: "",
};

const emptyItemForm = {
  id: "",
  name: "",
  name1: "",
  name2: "",
  name3: "",
  name4: "",
  imageUrl: "",
  price: "",
};

export default function AdminMenuPage() {
  const api = import.meta.env.VITE_API_URL;
  const nav = useNavigate();

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedCatId, setSelectedCatId] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState("create");
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalMode, setItemModalMode] = useState("create");
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [showItemTranslations, setShowItemTranslations] = useState(false);

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState("");

  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [savingItemId, setSavingItemId] = useState("");
  const [deletingItemId, setDeletingItemId] = useState("");

  const dropdownRef = useRef(null);

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

  const selectedCat = useMemo(
    () => menu.find((c) => c.id === selectedCatId) || null,
    [menu, selectedCatId]
  );

  const totalItems = useMemo(
    () => menu.reduce((sum, cat) => sum + (cat.items?.length || 0), 0),
    [menu]
  );

  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCategoriesOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (!getAuth()) {
      nav("/admin");
      return;
    }
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

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

  async function loadMenu() {
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

  function openCreateCategoryModal() {
    resetMessages();
    setCategoryModalMode("create");
    setCategoryForm(emptyCategoryForm);
    setCategoryModalOpen(true);
    setCategoriesOpen(false);
  }

  function openEditCategoryModal(category) {
    if (!category) return;
    resetMessages();
    setCategoryModalMode("edit");
    setCategoryForm({
      name: category.name || "",
      name1: category.name1 || "",
      name2: category.name2 || "",
      name3: category.name3 || "",
      name4: category.name4 || "",
    });
    setCategoryModalOpen(true);
    setCategoriesOpen(false);
  }

  function closeCategoryModal() {
    setCategoryModalOpen(false);
    setCategoryForm(emptyCategoryForm);
  }

  function openCreateItemModal() {
    if (!selectedCat) {
      setErr("Prvo odaberite kategoriju.");
      return;
    }

    resetMessages();
    setItemModalMode("create");
    setItemForm(emptyItemForm);
    setShowItemTranslations(false);
    setItemModalOpen(true);
  }

  function openEditItemModal(item) {
    if (!item) return;

    resetMessages();
    setItemModalMode("edit");
    setItemForm({
      id: item.id || "",
      name: item.name || "",
      name1: item.name1 || "",
      name2: item.name2 || "",
      name3: item.name3 || "",
      name4: item.name4 || "",
      imageUrl: item.imageUrl || "",
      price: item.price != null ? String(item.price) : "",
    });
    setShowItemTranslations(
      Boolean(item.name1 || item.name2 || item.name3 || item.name4)
    );
    setItemModalOpen(true);
  }

  function closeItemModal() {
    setItemModalOpen(false);
    setItemForm(emptyItemForm);
    setShowItemTranslations(false);
  }

  async function createCategory() {
    const name = categoryForm.name.trim();
    if (!name) return setErr("Naziv kategorije je obavezan.");

    resetMessages();
    setIsCreatingCategory(true);

    try {
      const r = await authedFetch(`${api}/menu-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          name1: categoryForm.name1.trim(),
          name2: categoryForm.name2.trim(),
          name3: categoryForm.name3.trim(),
          name4: categoryForm.name4.trim(),
        }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setSuccess("Kategorija je uspješno dodana.");
      closeCategoryModal();
      await loadMenu();
      if (data?.id) setSelectedCatId(data.id);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setIsCreatingCategory(false);
    }
  }

  async function saveCategory() {
    if (!selectedCat) return;

    const name = categoryForm.name.trim();
    if (!name) return setErr("Naziv kategorije je obavezan.");

    resetMessages();
    setIsSavingCategory(true);

    try {
      const r = await authedFetch(`${api}/menu-category/${selectedCat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          name1: categoryForm.name1.trim(),
          name2: categoryForm.name2.trim(),
          name3: categoryForm.name3.trim(),
          name4: categoryForm.name4.trim(),
        }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setSuccess("Kategorija je uspješno izmijenjena.");
      closeCategoryModal();
      await loadMenu();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function deleteCategory(id) {
    if (!window.confirm("Obrisati ovu kategoriju? Svi artikli u njoj će biti obrisani.")) {
      return;
    }

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
    const name = itemForm.name.trim();
    const price = Number(itemForm.price);

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
          name1: itemForm.name1.trim(),
          name2: itemForm.name2.trim(),
          name3: itemForm.name3.trim(),
          name4: itemForm.name4.trim(),
          imageUrl: itemForm.imageUrl.trim(),
          price,
          categoryId: selectedCatId,
        }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setSuccess("Artikal je uspješno dodan.");
      closeItemModal();
      await loadMenu();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setIsCreatingItem(false);
    }
  }

  async function saveItem() {
    const name = itemForm.name.trim();
    const price = Number(itemForm.price);

    if (!itemForm.id) return;
    if (!name) return setErr("Osnovni naziv artikla je obavezan.");
    if (!Number.isFinite(price) || price <= 0) {
      return setErr("Cijena mora biti veća od 0.");
    }

    resetMessages();
    setSavingItemId(itemForm.id);

    try {
      const r = await authedFetch(`${api}/menu-item/${itemForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          name1: itemForm.name1.trim(),
          name2: itemForm.name2.trim(),
          name3: itemForm.name3.trim(),
          name4: itemForm.name4.trim(),
          imageUrl: itemForm.imageUrl.trim(),
          price,
        }),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      setSuccess(`Artikal "${name}" je sačuvan.`);
      closeItemModal();
      await loadMenu();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSavingItemId("");
    }
  }

  async function deleteItem(id) {
    if (!window.confirm("Obrisati ovaj artikal?")) return;

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
        <header className="adminMenuTopbar">
          <div>
            <div className="adminMenuKicker">Tap2Order Admin</div>
            <h1 className="adminMenuTitle">Room Service Menu</h1>
            <p className="adminMenuSubtitle">
              Uredi kategorije, artikle, cijene, slike i prevode za hotelski meni.
            </p>
          </div>

          <div className="adminMenuTopActions">
            <button
              type="button"
              className="adminMenuBtn adminMenuBtnGhost"
              onClick={loadMenu}
              disabled={loading}
            >
              {loading ? "Učitavanje..." : "Osvježi"}
            </button>

            <button
              type="button"
              className="adminMenuBtn adminMenuBtnPrimary"
              onClick={openCreateCategoryModal}
            >
              + Kategorija
            </button>
          </div>
        </header>

        {err && <div className="adminMenuAlert adminMenuAlertError">{err}</div>}
        {success && (
          <div className="adminMenuAlert adminMenuAlertSuccess">{success}</div>
        )}

        <section className="adminMenuStatsGrid" aria-label="Pregled menija">
          <div className="adminMenuStatCard">
            <span>Kategorije</span>
            <strong>{menu.length}</strong>
          </div>

          <div className="adminMenuStatCard">
            <span>Artikli</span>
            <strong>{totalItems}</strong>
          </div>

          <div className="adminMenuStatCard adminMenuStatCardWide">
            <span>Trenutno otvoreno</span>
            <strong>{selectedCat ? selectedCat.name : "Nema kategorije"}</strong>
          </div>
        </section>

        <main className="adminMenuLayout">
          <section className="adminMenuPanel adminMenuCategoryPanel">
            <div className="adminMenuSectionHead">
              <div>
                <h2 className="adminMenuSectionTitle">Kategorije</h2>
                <div className="adminMenuMuted">
                  Izaberi kategoriju koju želiš uređivati.
                </div>
              </div>
            </div>

            <div className="adminMenuDropdownWrap" ref={dropdownRef}>
              <button
                type="button"
                className="adminMenuCategoryButton"
                onClick={() => setCategoriesOpen((v) => !v)}
                aria-expanded={categoriesOpen}
              >
                <span>{selectedCat ? selectedCat.name : "Odaberi kategoriju"}</span>
                <span className="adminMenuChevron">▾</span>
              </button>

              {categoriesOpen && (
                <>
                  <div
                    className="adminMenuDropdownBackdrop"
                    onClick={() => setCategoriesOpen(false)}
                  />

                  <div className="adminMenuDropdownMenu">
                    <button
                      type="button"
                      className="adminMenuDropdownAdd"
                      onClick={openCreateCategoryModal}
                    >
                      + Dodaj kategoriju
                    </button>

                    <div className="adminMenuDropdownList">
                      {menu.length === 0 ? (
                        <div className="adminMenuEmpty adminMenuEmptySmall">
                          Nema kategorija. Dodaj prvu kategoriju.
                        </div>
                      ) : (
                        menu.map((cat) => (
                          <div key={cat.id} className="adminMenuDropdownItem">
                            <button
                              type="button"
                              className={`adminMenuDropdownSelect ${selectedCatId === cat.id ? "is-active" : ""
                                }`}
                              onClick={() => {
                                setSelectedCatId(cat.id);
                                setCategoriesOpen(false);
                              }}
                            >
                              <span className="adminMenuDropdownName">{cat.name}</span>
                              <span className="adminMenuDropdownMeta">
                                {cat.items?.length || 0}
                              </span>
                            </button>

                            <div className="adminMenuDropdownActions">
                              <button
                                type="button"
                                className="adminMenuMiniBtn"
                                onClick={() => openEditCategoryModal(cat)}
                              >
                                Uredi
                              </button>

                              <button
                                type="button"
                                className="adminMenuMiniBtn adminMenuMiniBtnDanger"
                                onClick={() => deleteCategory(cat.id)}
                                disabled={deletingCategoryId === cat.id}
                              >
                                {deletingCategoryId === cat.id ? "..." : "Obriši"}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              className="adminMenuBtn adminMenuBtnPrimary adminMenuFullButton"
              onClick={openCreateCategoryModal}
            >
              + Nova kategorija
            </button>
          </section>

          <section className="adminMenuPanel adminMenuItemsPanel">
            <div className="adminMenuSectionHead">
              <div>
                <h2 className="adminMenuSectionTitle">Artikli</h2>
                <div className="adminMenuMuted">
                  {selectedCat
                    ? `${selectedCat.name} • ${selectedCat.items?.length || 0} artikala`
                    : "Odaberi kategoriju da vidiš artikle"}
                </div>
              </div>

              <button
                type="button"
                className="adminMenuBtn adminMenuBtnPrimary"
                onClick={openCreateItemModal}
                disabled={!selectedCat}
              >
                + Artikal
              </button>
            </div>

            {loading ? (
              <div className="adminMenuEmpty adminMenuEmptyBox">Učitavam meni...</div>
            ) : !selectedCat ? (
              <div className="adminMenuEmpty adminMenuEmptyBox">
                Prvo odaberi kategoriju sa lijeve strane.
              </div>
            ) : (selectedCat.items || []).length === 0 ? (
              <div className="adminMenuEmpty adminMenuEmptyBox">
                Ova kategorija još nema artikala.
              </div>
            ) : (
              <div className="adminMenuItemsList">
                {(selectedCat.items || []).map((it, index) => (
                  <article key={it.id} className="adminMenuItemCard">
                    <div className="adminMenuItemMedia">
                      {it.imageUrl ? (
                        <img src={it.imageUrl} alt={it.name} />
                      ) : (
                        <span>{String(it.name || "?").charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="adminMenuItemContent">
                      <div className="adminMenuItemIndex">
                        {index + 1}. {it.name}
                      </div>
                      <div className="adminMenuItemMeta">
                        {it.name1 || it.name2 || it.name3 || it.name4
                          ? "Prevodi uneseni"
                          : "Bez prevoda"}
                      </div>
                    </div>

                    <div className="adminMenuItemRight">
                      <div className="adminMenuPrice">{it.price} KM</div>

                      <div className="adminMenuItemActions">
                        <button
                          type="button"
                          className="adminMenuBtn adminMenuBtnGhost"
                          onClick={() => openEditItemModal(it)}
                        >
                          Uredi
                        </button>

                        <button
                          type="button"
                          className="adminMenuBtn adminMenuBtnDanger"
                          onClick={() => deleteItem(it.id)}
                          disabled={deletingItemId === it.id}
                        >
                          {deletingItemId === it.id ? "Brisanje..." : "Obriši"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        {categoryModalOpen && (
          <div className="adminMenuModalOverlay" onClick={closeCategoryModal}>
            <div className="adminMenuModal" onClick={(e) => e.stopPropagation()}>
              <div className="adminMenuModalHead">
                <div>
                  <h3 className="adminMenuModalTitle">
                    {categoryModalMode === "create"
                      ? "Dodaj kategoriju"
                      : "Uredi kategoriju"}
                  </h3>
                  <div className="adminMenuMuted">Osnovni naziv je obavezan.</div>
                </div>

                <button
                  type="button"
                  className="adminMenuModalClose"
                  onClick={closeCategoryModal}
                >
                  ✕
                </button>
              </div>

              <div className="adminMenuModalBody">
                <div className="adminMenuField adminMenuFieldFull">
                  <label className="adminMenuLabel">Osnovni naziv</label>
                  <input
                    className="adminMenuInput"
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="npr. Pića"
                  />
                </div>

                <div className="adminMenuFormGrid">
                  <div className="adminMenuField">
                    <label className="adminMenuLabel">English</label>
                    <input
                      className="adminMenuInput"
                      value={categoryForm.name1}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          name1: e.target.value,
                        }))
                      }
                      placeholder="Drinks"
                    />
                  </div>

                  <div className="adminMenuField">
                    <label className="adminMenuLabel">Deutsch</label>
                    <input
                      className="adminMenuInput"
                      value={categoryForm.name2}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          name2: e.target.value,
                        }))
                      }
                      placeholder="Getränke"
                    />
                  </div>

                  <div className="adminMenuField">
                    <label className="adminMenuLabel">Arabic</label>
                    <input
                      className="adminMenuInput"
                      value={categoryForm.name3}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          name3: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="adminMenuField">
                    <label className="adminMenuLabel">Turkish</label>
                    <input
                      className="adminMenuInput"
                      value={categoryForm.name4}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({
                          ...prev,
                          name4: e.target.value,
                        }))
                      }
                      placeholder="İçecekler"
                    />
                  </div>
                </div>
              </div>

              <div className="adminMenuModalFooter">
                <button
                  type="button"
                  className="adminMenuBtn adminMenuBtnGhost"
                  onClick={closeCategoryModal}
                >
                  Otkaži
                </button>

                <button
                  type="button"
                  className="adminMenuBtn adminMenuBtnPrimary"
                  onClick={
                    categoryModalMode === "create" ? createCategory : saveCategory
                  }
                  disabled={
                    categoryModalMode === "create"
                      ? isCreatingCategory
                      : isSavingCategory
                  }
                >
                  {categoryModalMode === "create"
                    ? isCreatingCategory
                      ? "Dodavanje..."
                      : "Dodaj"
                    : isSavingCategory
                      ? "Čuvanje..."
                      : "Sačuvaj"}
                </button>
              </div>
            </div>
          </div>
        )}

        {itemModalOpen && (
          <div className="adminMenuModalOverlay" onClick={closeItemModal}>
            <div
              className="adminMenuModal adminMenuModalWide"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="adminMenuModalHead">
                <div>
                  <h3 className="adminMenuModalTitle">
                    {itemModalMode === "create" ? "Dodaj artikal" : "Uredi artikal"}
                  </h3>
                  <div className="adminMenuMuted">
                    {selectedCat ? selectedCat.name : "Room service menu"}
                  </div>
                </div>

                <button
                  type="button"
                  className="adminMenuModalClose"
                  onClick={closeItemModal}
                >
                  ✕
                </button>
              </div>

              <div className="adminMenuModalBody">
                <div className="adminMenuFormGrid">
                  <div className="adminMenuField adminMenuFieldFull">
                    <label className="adminMenuLabel">Naziv artikla</label>
                    <input
                      className="adminMenuInput"
                      value={itemForm.name}
                      onChange={(e) =>
                        setItemForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="npr. Palačinke Nutella"
                    />
                  </div>

                  <div className="adminMenuField">
                    <label className="adminMenuLabel">Cijena</label>
                    <input
                      className="adminMenuInput"
                      value={itemForm.price}
                      onChange={(e) =>
                        setItemForm((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="npr. 7.50"
                      inputMode="decimal"
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
                          setItemForm((prev) => ({
                            ...prev,
                            imageUrl: base64,
                          }));
                        } catch {
                          setErr("Upload slike nije uspio.");
                        }
                      }}
                    />
                  </div>

                  {itemForm.imageUrl && (
                    <div className="adminMenuUploadPreview adminMenuFieldFull">
                      <img
                        src={itemForm.imageUrl}
                        alt={itemForm.name || "Preview"}
                        className="adminMenuPreviewImage"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="adminMenuToggleBtn"
                  onClick={() => setShowItemTranslations((v) => !v)}
                >
                  {showItemTranslations ? "Sakrij prevode" : "Prikaži prevode"}
                </button>

                {showItemTranslations && (
                  <div className="adminMenuTranslationsBox">
                    <div className="adminMenuFormGrid">
                      <div className="adminMenuField">
                        <label className="adminMenuLabel">English</label>
                        <input
                          className="adminMenuInput"
                          value={itemForm.name1}
                          onChange={(e) =>
                            setItemForm((prev) => ({
                              ...prev,
                              name1: e.target.value,
                            }))
                          }
                          placeholder="English name"
                        />
                      </div>

                      <div className="adminMenuField">
                        <label className="adminMenuLabel">Deutsch</label>
                        <input
                          className="adminMenuInput"
                          value={itemForm.name2}
                          onChange={(e) =>
                            setItemForm((prev) => ({
                              ...prev,
                              name2: e.target.value,
                            }))
                          }
                          placeholder="Deutscher Name"
                        />
                      </div>

                      <div className="adminMenuField">
                        <label className="adminMenuLabel">Arabic</label>
                        <input
                          className="adminMenuInput"
                          value={itemForm.name3}
                          onChange={(e) =>
                            setItemForm((prev) => ({
                              ...prev,
                              name3: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="adminMenuField">
                        <label className="adminMenuLabel">Turkish</label>
                        <input
                          className="adminMenuInput"
                          value={itemForm.name4}
                          onChange={(e) =>
                            setItemForm((prev) => ({
                              ...prev,
                              name4: e.target.value,
                            }))
                          }
                          placeholder="Türkçe isim"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="adminMenuModalFooter">
                <button
                  type="button"
                  className="adminMenuBtn adminMenuBtnGhost"
                  onClick={closeItemModal}
                >
                  Otkaži
                </button>

                <button
                  type="button"
                  className="adminMenuBtn adminMenuBtnPrimary"
                  onClick={itemModalMode === "create" ? createItem : saveItem}
                  disabled={
                    itemModalMode === "create"
                      ? isCreatingItem
                      : savingItemId === itemForm.id
                  }
                >
                  {itemModalMode === "create"
                    ? isCreatingItem
                      ? "Dodavanje..."
                      : "Dodaj"
                    : savingItemId === itemForm.id
                      ? "Čuvanje..."
                      : "Sačuvaj"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

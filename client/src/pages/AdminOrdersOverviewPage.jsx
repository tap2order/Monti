import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAdminLoggedIn, getAdminAuth } from "../adminAuth";
import "../css/AdminOrdersOverviewPage.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("bs-BA");
}

function formatDateForInput(date) {
  return date.toISOString().slice(0, 10);
}

function statusLabel(status) {
  if (status === "UNCLAIMED") return "Na čekanju";
  if (status === "CLAIMED") return "Preuzeta";
  if (status === "COMPLETED") return "Završena";
  return status || "—";
}

function getOrderTotal(order) {
  return (order.items || []).reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.qty || 0);
  }, 0);
}

function getItemsSummary(order) {
  return (order.items || [])
    .map((item) => `${item.qty}x ${item.name}`)
    .join(", ");
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStartOfYesterday() {
  const today = getStartOfToday();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

function downloadCsv(filename, rows) {
  const csvContent = rows
    .map((row) =>
      row
        .map((value) => {
          const safe = String(value ?? "").replace(/"/g, '""');
          return `"${safe}"`;
        })
        .join(";")
    )
    .join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
}

export default function AdminOrdersOverviewPage() {
  const nav = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [range, setRange] = useState("today");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(formatDateForInput(getStartOfToday()));
  const [toDate, setToDate] = useState(formatDateForInput(new Date()));

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      nav("/admin");
      return;
    }

    let cancelled = false;

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/admin/orders`, {
          headers: {
            Authorization: getAdminAuth(),
          },
        });

        if (!res.ok) {
          throw new Error("Neuspjelo učitavanje narudžbi.");
        }

        const data = await res.json();

        if (!cancelled) {
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Došlo je do greške.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [nav]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStart = getStartOfToday();
    const yesterdayStart = getStartOfYesterday();

    return [...orders]
      .filter((order) => {
        const createdAt = new Date(order.createdAt);
        if (Number.isNaN(createdAt.getTime())) return false;

        if (range === "today") {
          return createdAt >= todayStart;
        }

        if (range === "yesterday") {
          return createdAt >= yesterdayStart && createdAt < todayStart;
        }

        if (range === "7days") {
          const sevenDaysAgo = new Date(todayStart);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
          return createdAt >= sevenDaysAgo && createdAt <= now;
        }

        if (range === "custom") {
          const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
          const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

          if (from && createdAt < from) return false;
          if (to && createdAt > to) return false;
        }

        return true;
      })
      .filter((order) => {
        if (statusFilter === "ALL") return true;
        return order.status === statusFilter;
      })
      .filter((order) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;

        const itemsText = (order.items || [])
          .map((item) => `${item.name} ${item.note || ""}`)
          .join(" ")
          .toLowerCase();

        const tableText = String(order.tableId || "").toLowerCase();
        const statusText = String(statusLabel(order.status)).toLowerCase();

        return (
          itemsText.includes(q) ||
          tableText.includes(q) ||
          statusText.includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, range, statusFilter, search, fromDate, toDate]);

  const stats = useMemo(() => {
    return {
      totalOrders: filteredOrders.length,
      unclaimed: filteredOrders.filter((o) => o.status === "UNCLAIMED").length,
      claimed: filteredOrders.filter((o) => o.status === "CLAIMED").length,
      completed: filteredOrders.filter((o) => o.status === "COMPLETED").length,
    };
  }, [filteredOrders]);

  const filteredOrderIds = useMemo(
    () => filteredOrders.map((order) => order.id),
    [filteredOrders]
  );

  const allFilteredSelected =
    filteredOrderIds.length > 0 &&
    filteredOrderIds.every((id) => selectedOrderIds.includes(id));

  useEffect(() => {
    setSelectedOrderIds((current) =>
      current.filter((id) => filteredOrderIds.includes(id))
    );
  }, [filteredOrderIds]);

  function handleToggleOrder(orderId) {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId]
    );
  }

  function handleToggleAllFiltered() {
    setSelectedOrderIds((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !filteredOrderIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredOrderIds]));
    });
  }

  function handleExportCsv() {
    const rows = [
      [
        "Order ID",
        "Soba/Sto",
        "Status",
        "Kreirana",
        "Preuzeta",
        "Zavrsena",
        "Stavke",
        "Ukupno KM",
      ],
      ...filteredOrders.map((order) => [
        order.id,
        order.tableId,
        statusLabel(order.status),
        formatDateTime(order.createdAt),
        formatDateTime(order.claimedAt),
        formatDateTime(order.completedAt),
        (order.items || [])
          .map((item) => `${item.qty}x ${item.name}${item.note ? ` (${item.note})` : ""}`)
          .join(" | "),
        getOrderTotal(order).toFixed(2),
      ]),
    ];

    downloadCsv("historija-narudzbi.csv", rows);
  }

  async function handleDeleteSelected() {
    if (selectedOrderIds.length === 0 || deleting) return;

    const confirmed = window.confirm(
      `Izbrisati ${selectedOrderIds.length} odabranih narudzbi? Ova akcija se ne moze ponistiti.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setDeleteError("");

      const idsToDelete = [...selectedOrderIds];

      await Promise.all(
        idsToDelete.map(async (orderId) => {
          const res = await fetch(
            `${API_BASE}/orders/${encodeURIComponent(orderId)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: getAdminAuth(),
              },
            }
          );

          if (!res.ok) {
            throw new Error("Brisanje narudzbi nije uspjelo.");
          }
        })
      );

      setOrders((current) =>
        current.filter((order) => !idsToDelete.includes(order.id))
      );
      setSelectedOrderIds([]);
      setExpandedOrderId((current) =>
        idsToDelete.includes(current) ? "" : current
      );
    } catch (err) {
      setDeleteError(err.message || "Doslo je do greske pri brisanju.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="ordersOverviewPage">
      <div className="ordersOverviewShell">
        <div className="ordersOverviewHeader">
          <div>
            <div className="ordersOverviewEyebrow">Admin Overview</div>
            <h1 className="ordersOverviewTitle">Historija narudžbi</h1>
          </div>

          <div className="ordersOverviewHeaderActions">
            <button
              type="button"
              className="ordersOverviewBtn ordersOverviewBtnGhost"
              onClick={() => nav("/admin/home")}
            >
              Nazad
            </button>

            <button
              type="button"
              className="ordersOverviewBtn ordersOverviewBtnPrimary"
              onClick={handleExportCsv}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="ordersOverviewStats">
          <div className="ordersOverviewStatCard">
            <div className="ordersOverviewStatLabel">Ukupno</div>
            <div className="ordersOverviewStatValue">{stats.totalOrders}</div>
          </div>

          <div className="ordersOverviewStatCard">
            <div className="ordersOverviewStatLabel">Na čekanju</div>
            <div className="ordersOverviewStatValue">{stats.unclaimed}</div>
          </div>

          <div className="ordersOverviewStatCard">
            <div className="ordersOverviewStatLabel">Preuzete</div>
            <div className="ordersOverviewStatValue">{stats.claimed}</div>
          </div>

          <div className="ordersOverviewStatCard">
            <div className="ordersOverviewStatLabel">Završene</div>
            <div className="ordersOverviewStatValue">{stats.completed}</div>
          </div>
        </div>

        <div className="ordersOverviewFilters">
          <div className="ordersOverviewFilterGroup">
            <label className="ordersOverviewLabel">Period</label>
            <select
              className="ordersOverviewInput"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="today">Danas</option>
              <option value="yesterday">Jučer</option>
              <option value="7days">Zadnjih 7 dana</option>
              <option value="all">Sve</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="ordersOverviewFilterGroup">
            <label className="ordersOverviewLabel">Status</label>
            <select
              className="ordersOverviewInput"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Svi statusi</option>
              <option value="UNCLAIMED">Na čekanju</option>
              <option value="CLAIMED">Preuzeta</option>
              <option value="COMPLETED">Završena</option>
            </select>
          </div>

          <div className="ordersOverviewFilterGroup ordersOverviewFilterSearch">
            <label className="ordersOverviewLabel">Pretraga</label>
            <input
              className="ordersOverviewInput"
              type="text"
              placeholder="Soba, stavka, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {range === "custom" && (
            <>
              <div className="ordersOverviewFilterGroup">
                <label className="ordersOverviewLabel">Od</label>
                <input
                  className="ordersOverviewInput"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="ordersOverviewFilterGroup">
                <label className="ordersOverviewLabel">Do</label>
                <input
                  className="ordersOverviewInput"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {loading && (
          <div className="ordersOverviewStateCard">Učitavanje narudžbi...</div>
        )}

        {!loading && error && (
          <div className="ordersOverviewStateCard ordersOverviewStateCardError">
            {error}
          </div>
        )}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="ordersOverviewStateCard">
            Nema narudžbi za odabrane filtere.
          </div>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <div className="ordersOverviewResults">
            <div className="ordersOverviewSelectionBar">
              <label className="ordersOverviewSelectAll">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={handleToggleAllFiltered}
                  disabled={deleting}
                />
                <span>Odaberi sve prikazane</span>
              </label>

              <div className="ordersOverviewSelectionActions">
                <span className="ordersOverviewSelectedCount">
                  Odabrano: {selectedOrderIds.length}
                </span>
                <button
                  type="button"
                  className="ordersOverviewBtn ordersOverviewBtnDanger"
                  onClick={handleDeleteSelected}
                  disabled={selectedOrderIds.length === 0 || deleting}
                >
                  {deleting ? "Brisanje..." : "Izbrisi odabrane"}
                </button>
              </div>
            </div>

            {deleteError && (
              <div className="ordersOverviewDeleteError">{deleteError}</div>
            )}

            <div className="ordersOverviewTableWrap">
              <table className="ordersOverviewTable">
              <thead>
                <tr>
                  <th className="ordersOverviewSelectCol">Odaberi</th>
                  <th>Soba / Sto</th>
                  <th>Status</th>
                  <th>Kreirana</th>
                  <th>Preuzeta</th>
                  <th>Završena</th>
                  <th>Stavke</th>
                  <th>Ukupno</th>
                  <th>Detalji</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const expanded = expandedOrderId === order.id;
                  const selected = selectedOrderIds.includes(order.id);

                  return (
                    <Fragment key={order.id}>
                      <tr>
                        <td className="ordersOverviewSelectCol">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleToggleOrder(order.id)}
                            disabled={deleting}
                            aria-label={`Odaberi narudzbu ${order.id}`}
                          />
                        </td>
                        <td className="ordersOverviewCellStrong">{order.tableId}</td>
                        <td>
                          <span
                            className={`ordersOverviewStatusBadge ordersOverviewStatusBadge--${order.status?.toLowerCase()}`}
                          >
                            {statusLabel(order.status)}
                          </span>
                        </td>
                        <td>{formatDateTime(order.createdAt)}</td>
                        <td>{formatDateTime(order.claimedAt)}</td>
                        <td>{formatDateTime(order.completedAt)}</td>
                        <td className="ordersOverviewItemsSummary">
                          {getItemsSummary(order) || "—"}
                        </td>
                        <td className="ordersOverviewCellStrong">
                          {getOrderTotal(order).toFixed(2)} KM
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ordersOverviewExpandBtn"
                            onClick={() =>
                              setExpandedOrderId(expanded ? "" : order.id)
                            }
                          >
                            {expanded ? "Sakrij" : "Prikaži"}
                          </button>
                        </td>
                      </tr>

                      {expanded && (
                        <tr className="ordersOverviewDetailsRow">
                          <td colSpan="9">
                            <div className="ordersOverviewDetailsBox">
                              <div className="ordersOverviewDetailsTitle">
                                Detalji narudžbe
                              </div>

                              <div className="ordersOverviewDetailsItems">
                                {(order.items || []).map((item) => (
                                  <div key={item.id} className="ordersOverviewDetailsItem">
                                    <div>
                                      <strong>{item.qty}x</strong> {item.name}
                                      {item.note ? (
                                        <span className="ordersOverviewItemNote">
                                          {" "}
                                          — {item.note}
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="ordersOverviewDetailsPrice">
                                      {(Number(item.price) * Number(item.qty)).toFixed(2)} KM
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { Outlet, Routes, Route } from "react-router-dom";
import TablePage from "./pages/TablePage";
import WaiterPage from "./pages/WaiterPage";
import TablesDemoPage from "./pages/TablesDemoPage";
import AdminHome from "./pages/AdminHome";
import AdminLogin from "./pages/AdminLogin";
import AdminMenuPage from "./pages/AdminMenuPage";
import RoomScreenPage from "./pages/RoomScreenPage";
import RoomLanguagePage from "./pages/RoomLanguagePage";
import HotelServicesPage from "./pages/HotelServicesPage";
import AdminOrdersOverviewPage from "./pages/AdminOrdersOverviewPage";
import AdminRoomServiceHoursPage from "./pages/AdminRoomServiceHoursPage";
import RoomSessionGate from "./components/RoomSessionGate";

function GuestRoomLayout() {
  return (
    <RoomSessionGate>
      <Outlet />
    </RoomSessionGate>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/t/:tableId" element={<GuestRoomLayout />}>
        <Route index element={<RoomLanguagePage />} />
        <Route path="menu" element={<TablePage />} />
        <Route path="services" element={<HotelServicesPage />} />
      </Route>
      <Route path="/waiter" element={<WaiterPage accessMode="staff" />} />
      <Route path="/admin/waiter" element={<WaiterPage accessMode="admin" />} />
      <Route path="/admin/tables" element={<TablesDemoPage />} />
      <Route path="/admin/home" element={<AdminHome />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/menu" element={<AdminMenuPage />} />
      <Route path="/t/:tableId/screen" element={<RoomScreenPage />} />
      <Route path="/admin/orders-overview" element={<AdminOrdersOverviewPage />} />
      <Route path="/admin/room-service-hours" element={<AdminRoomServiceHoursPage />} />
      <Route
        path="*"
        element={
          <div
            style={{
              minHeight: "100vh",
              backgroundColor: "#dddddd", // 👈 promijenjeno (nije vise crno)
              color: "#111",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "40px",
            }}
          >
            <h1
              style={{
                fontSize: "56px",
                fontWeight: "900",
                marginBottom: "30px",
              }}
            >
              {/* tekst ako treba */}
            </h1>

            <img
              src="/images/bg.jpg"
              alt="MMA"
              style={{
                width: "80%",
                maxWidth: "900px",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)", // 👈 mekši shadow
                backgroundColor: "",

              }}
            />
          </div>
        }
      />
    </Routes>
  );
}

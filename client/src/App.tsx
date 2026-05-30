import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
      </Route>
    </Routes>
  );
}

function HomePage() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Helpdesk</h1>
      <p>
        Server status:{" "}
        <span className={status === "ok" ? "text-green-600" : "text-red-600"}>
          {status ?? "checking..."}
        </span>
      </p>
    </div>
  );
}

export default App;

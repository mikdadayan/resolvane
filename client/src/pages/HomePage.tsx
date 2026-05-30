import { useEffect, useState } from "react";

export default function HomePage() {
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

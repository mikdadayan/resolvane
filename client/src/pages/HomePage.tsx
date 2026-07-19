import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchHealth(): Promise<string> {
  const res = await axios.get(`${import.meta.env.VITE_SERVER_BASE_URL}/health`);
  return res.data.status;
}

export default function HomePage() {
  const { data: status, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Helpdesk</h1>
      <p>
        Server status:{" "}
        {isPending ? (
          <Skeleton className="inline-block h-4 w-8 align-middle" />
        ) : (
          <span className={status === "ok" ? "text-green-600" : "text-red-600"}>
            {status}
          </span>
        )}
      </p>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  isPending: boolean;
};

export default function StatCard({ label, value, icon: Icon, isPending }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
        <CardAction>
          <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-3.5" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="font-sans text-3xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

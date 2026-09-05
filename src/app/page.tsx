import { CompassHome } from "@/components/compass-home";
import { CompassNext } from "@/components/compass-next";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <CompassNext />
      <CompassHome />
    </div>
  );
}

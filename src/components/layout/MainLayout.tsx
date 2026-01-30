import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ObjectBrowser } from "@/features/objects/components/ObjectBrowser";
import { WelcomeScreen } from "./WelcomeScreen";
import { TransferQueue } from "@/features/transfers/components/TransferQueue";

export function MainLayout() {
  const { activeConnectionId, activeBucket, setConnections } =
    useConnectionStore();

  const { data: connections } = useQuery({
    queryKey: ["connections"],
    queryFn: commands.listConnections,
  });

  useEffect(() => {
    if (connections) {
      setConnections(connections);
    }
  }, [connections, setConnections]);

  const showBrowser = activeConnectionId && activeBucket;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          {showBrowser ? <ObjectBrowser /> : <WelcomeScreen />}
        </main>
      </div>
      <TransferQueue />
    </div>
  );
}

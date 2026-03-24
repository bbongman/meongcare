import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Home from "./pages/home";
import Map from "./pages/map";
import Health from "./pages/health";
import AiTools from "./pages/ai-tools";
import Schedule from "./pages/schedule";
import Diary from "./pages/diary";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Since it's local storage, no need to aggressively refetch
      staleTime: Infinity,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/map" component={Map} />
      <Route path="/health" component={Health} />
      <Route path="/ai" component={AiTools} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/diary" component={Diary} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "@/pages/Admin";
import Legal from "@/pages/Legal";
import ToolPage from "./pages/ToolPage";
import Member from "./pages/Member";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/member" component={Member} />
      <Route path="/tools/:toolId" component={ToolPage} />
      <Route path="/privacy"><Legal kind="privacy" /></Route>
      <Route path="/terms"><Legal kind="terms" /></Route>
      <Route path="/contact"><Legal kind="contact" /></Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const verification = trpc.site.verification.useQuery();
  useEffect(() => {
    const publisherId = verification.data?.adsensePublisherId;
    if (!publisherId) return;
    const existing = document.querySelector('script[data-ad-client="' + publisherId + '"]');
    if (existing) return;
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.adClient = publisherId;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${publisherId}`;
    document.head.appendChild(script);
  }, [verification.data?.adsensePublisherId]);
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

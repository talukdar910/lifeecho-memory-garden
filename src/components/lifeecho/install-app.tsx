import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const nav = navigator as Navigator & { standalone?: boolean };
    const update = () => setInstalled(standalone.matches || nav.standalone === true);
    update();
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setEmbedded(window.self !== window.top);
    const beforeInstall = (event: Event) => {
      if (!("prompt" in event) || !("userChoice" in event)) return;
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); setOpen(false); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    standalone.addEventListener("change", update);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      standalone.removeEventListener("change", update);
    };
  }, []);

  async function install() {
    if (!prompt) { setOpen(true); return; }
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } catch {
      setOpen(true);
    } finally { setBusy(false); }
  }

  return { installed, busy, install, open, setOpen, embedded, ios };
}

export function InstallApp({ state, showGuide = false }: { state: ReturnType<typeof useInstallApp>; showGuide?: boolean }) {
  const { installed, busy, install, open, setOpen, embedded, ios } = state;
  if (installed) return null;
  return (
    <>
      <Button variant="glass" size="sm" disabled={busy} onClick={() => void install()} className="w-full justify-start">
        <Download /> Add to home screen
      </Button>
      {showGuide && <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <Smartphone className="mb-3 size-7 text-primary" />
            <DialogTitle className="text-3xl">LifeEcho on your phone</DialogTitle>
            <DialogDescription>Add LifeEcho to your home screen to open it from its own app icon.</DialogDescription>
          </DialogHeader>
          {embedded ? (
            <p className="text-sm leading-relaxed text-muted-foreground">Open the published LifeEcho site in Safari or Chrome first, then choose Add to Home Screen from the browser menu.</p>
          ) : ios ? (
            <p className="text-sm leading-relaxed text-muted-foreground">In Safari, tap <Share className="inline size-4 text-primary" aria-label="Share" /> Share, then Add to Home Screen and Add.</p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">Open your browser menu and choose Install app or Add to Home screen. If neither appears, open LifeEcho in Chrome on your phone.</p>
          )}
          <p className="text-xs text-muted-foreground">An internet connection is needed to view and save memories.</p>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogContent>
      </Dialog>}
    </>
  );
}
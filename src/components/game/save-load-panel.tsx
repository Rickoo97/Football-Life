"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Save, Trash2, Upload } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCompactCurrency, formatSeason } from "@/lib/game/formatters";
import { useGameStore } from "@/store/game-store";
import type { SaveSlotMetadata } from "@/types/save";

function formatSavedAt(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SaveLoadPanel() {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<SaveSlotMetadata[]>([]);
  const [label, setLabel] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentWeek = useGameStore((state) => state.currentWeek);
  const currentSeason = useGameStore((state) => state.season);
  const saveToSlot = useGameStore((state) => state.saveToSlot);
  const loadFromSlot = useGameStore((state) => state.loadFromSlot);
  const deleteSlot = useGameStore((state) => state.deleteSlot);
  const listSlots = useGameStore((state) => state.listSlots);
  const exportSave = useGameStore((state) => state.exportSave);
  const importSave = useGameStore((state) => state.importSave);

  const refreshSlots = () => setSlots(listSlots());

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setLabel(`Week ${currentWeek} · Seizoen ${formatSeason(currentSeason)}`);
      setFeedback(null);
      refreshSlots();
    }
  };

  const handleSave = () => {
    const metadata = saveToSlot(label);
    if (metadata) {
      setFeedback(`Opgeslagen als "${metadata.label}".`);
      refreshSlots();
    } else {
      setFeedback(
        "Opslaan is mislukt. Is LocalStorage beschikbaar in deze browser?"
      );
    }
  };

  const handleLoad = (slotId: string) => {
    const success = loadFromSlot(slotId);
    setFeedback(success ? "Save geladen." : "Laden is mislukt.");
    if (success) {
      setOpen(false);
    }
  };

  const handleDelete = (slotId: string) => {
    deleteSlot(slotId);
    refreshSlots();
  };

  const handleExport = () => {
    const json = exportSave();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `football-life-sim-week${currentWeek}-seizoen${currentSeason}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setFeedback("Save geëxporteerd als JSON-bestand.");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const success = importSave(text);
      setFeedback(
        success ? "Save geïmporteerd." : "Dit bestand kon niet worden ingeladen."
      );
      if (success) {
        setOpen(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Button
        variant="outline"
        className="border-white/15 bg-white/5 text-slate-100 backdrop-blur-xl hover:bg-white/10"
        onClick={() => handleOpenChange(true)}
      >
        <Save className="size-4" />
        Opslaan &amp; laden
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Opslaan &amp; laden</DialogTitle>
            <DialogDescription className="text-slate-400">
              Beheer je save-slots of exporteer/importeer je spel als
              JSON-bestand.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="slots">
            <TabsList className="w-full border border-white/10 bg-white/5">
              <TabsTrigger
                value="slots"
                className="flex-1 text-slate-300 data-active:bg-white/10 data-active:text-white"
              >
                Save-slots
              </TabsTrigger>
              <TabsTrigger
                value="transfer"
                className="flex-1 text-slate-300 data-active:bg-white/10 data-active:text-white"
              >
                Exporteren/importeren
              </TabsTrigger>
            </TabsList>

            <TabsContent value="slots" className="flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label
                    htmlFor="save-slot-label"
                    className="mb-1 block text-xs text-slate-400"
                  >
                    Naam van de save
                  </Label>
                  <Input
                    id="save-slot-label"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="Bijv. Voor de derby"
                    className="border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                >
                  <Save className="size-4" />
                  Opslaan
                </Button>
              </div>

              <ScrollArea className="h-56 rounded-xl border border-white/10 bg-black/10">
                <ul className="flex flex-col gap-2 p-3">
                  {slots.length === 0 ? (
                    <li className="text-sm text-slate-400">
                      Nog geen save-slots. Sla je voortgang op om hier terug te
                      keren.
                    </li>
                  ) : (
                    slots.map((slot) => (
                      <li
                        key={slot.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">
                            {slot.label}
                          </p>
                          <p className="text-xs text-slate-400">
                            Week {slot.week} · Seizoen{" "}
                            {formatSeason(slot.season)} ·{" "}
                            {formatCompactCurrency(slot.balance)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatSavedAt(slot.savedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/15"
                            onClick={() => handleLoad(slot.id)}
                          >
                            Laden
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-slate-400 hover:bg-white/10 hover:text-slate-100"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              }
                            />
                            <AlertDialogContent className="border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">
                                  Save verwijderen?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  &quot;{slot.label}&quot; wordt permanent
                                  verwijderd. Dit kan niet ongedaan worden
                                  gemaakt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/15">
                                  Annuleren
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(slot.id)}
                                >
                                  Verwijderen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="transfer" className="flex flex-col gap-3">
              <p className="text-sm text-slate-400">
                Exporteer je volledige save als JSON-bestand om buiten deze
                browser te bewaren, of importeer een eerder geëxporteerd
                bestand.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/15"
                  onClick={handleExport}
                >
                  <Download className="size-4" />
                  Exporteer als JSON
                </Button>
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/15"
                  onClick={handleImportClick}
                >
                  <Upload className="size-4" />
                  Importeer JSON
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </TabsContent>
          </Tabs>

          {feedback ? (
            <p
              aria-live="polite"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"
            >
              {feedback}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

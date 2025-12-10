import { useState, useEffect } from "react";
import { CloudUpload, FileText, Check, Bell, Clock, Send, Bot, Loader2, Shield } from "lucide-react";

interface Invoice {
  id: string;
  client: string;
  amount: string;
  status: "Paid" | "Overdue" | "Pending" | "Reminded";
  date: string;
}

export function InteractiveDemo() {
  const [step, setStep] = useState<"upload" | "list">("upload");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reminding, setReminding] = useState<number | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: "#INV-2044", client: "Rénovation Martin", amount: "4 250,00 €", status: "Paid", date: "2 oct" },
    { id: "#INV-2043", client: "Café du Centre", amount: "1 200,00 €", status: "Overdue", date: "28 sep" },
  ]);

  const simulateUpload = () => {
    setUploading(true);
    setProgress(0);
  };

  useEffect(() => {
    if (!uploading) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setStep("list");
          setInvoices((prevInvoices) => [
            { id: "#INV-2045", client: "Cuisine Dupont", amount: "2 800,00 €", status: "Pending", date: "Aujourd'hui" },
            ...prevInvoices,
          ]);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [uploading]);

  const sendReminder = (index: number) => {
    setReminding(index);
    setTimeout(() => {
      setInvoices((prevInvoices) =>
        prevInvoices.map((inv, i) => (i === index ? { ...inv, status: "Reminded" as const } : inv))
      );
      setReminding(null);
    }, 1500);
  };

  const resetDemo = () => {
    setStep("upload");
    setProgress(0);
    setUploading(false);
  };

  return (
    <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-w-md mx-auto animate-float">
      {/* Mac Window Dots */}
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
        <div className="w-3 h-3 rounded-full bg-green-400"></div>
        <div className="ml-auto text-xs font-medium text-slate-400">RelanceZen Dashboard</div>
      </div>

      <div className="p-6 min-h-[400px] flex flex-col">
        {/* STEP 1: Upload View */}
        {step === "upload" && (
          <div className="transition-opacity duration-300">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Nouvelle Facture</h3>
            <p className="text-sm text-slate-500 mb-6">Importez votre facture PDF ou image pour commencer le suivi.</p>

            <div
              id="upload-area"
              className="border-2 border-dashed border-brand-300 bg-brand-50 rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-100 transition-colors group relative overflow-hidden"
              onClick={simulateUpload}
            >
              {/* Content */}
              {!uploading && (
                <div className="text-center p-6 transition-opacity">
                  <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center mx-auto mb-4 text-brand-500 text-2xl group-hover:scale-110 transition-transform">
                    <CloudUpload className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-brand-700">Cliquer pour importer</p>
                  <p className="text-xs text-brand-600 mt-1">PDF, JPG, PNG supportés</p>
                </div>
              )}

              {/* Progress Bar */}
              {uploading && (
                <div className="w-3/4 text-center z-10">
                  <div className="flex justify-between text-xs font-semibold text-brand-700 mb-1">
                    <span>Analyse en cours...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-white h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-500 h-full transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between items-center text-xs text-slate-400">
              <span>Analyse IA intégrée</span>
              <Shield className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* STEP 2: Dashboard View */}
        {step === "list" && (
          <div className="transition-opacity duration-300">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Factures</h3>
                <p className="text-xs text-slate-500">
                  Total en attente : <span className="text-slate-800 font-bold">4 000,00 €</span>
                </p>
              </div>
              <button
                onClick={resetDemo}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md font-medium transition-colors"
              >
                + Nouveau
              </button>
            </div>

            {/* Invoice List */}
            <div className="space-y-3">
              {invoices.map((inv, index) => (
                <div
                  key={index}
                  className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 bg-slate-100">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{inv.client}</div>
                      <div className="text-xs text-slate-500">
                        {inv.id} • {inv.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">{inv.amount}</div>

                    {/* Status / Action Button */}
                    <div className="mt-1">
                      {inv.status === "Paid" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                          <Check className="w-3 h-3" /> Payée
                        </span>
                      )}
                      {inv.status === "Overdue" && (
                        <button
                          onClick={() => sendReminder(index)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          disabled={reminding === index}
                        >
                          {reminding !== index ? (
                            <>
                              <Bell className="w-3 h-3" /> Relancer
                            </>
                          ) : (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" /> Envoi
                            </>
                          )}
                        </button>
                      )}
                      {inv.status === "Pending" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">
                          <Clock className="w-3 h-3" /> En attente
                        </span>
                      )}
                      {inv.status === "Reminded" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          <Send className="w-3 h-3" /> Envoyée
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Automation Banner */}
            <div className="mt-4 bg-brand-50 border border-brand-100 rounded-lg p-3 flex items-start gap-3">
              <div className="text-brand-500 mt-0.5">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-brand-800">Pilote automatique activé</p>
                <p className="text-[10px] text-brand-600 leading-tight">
                  Relances envoyées automatiquement 3 jours après l'échéance.
                </p>
              </div>
              <div className="ml-auto">
                <div className="w-8 h-4 bg-brand-200 rounded-full relative">
                  <div className="w-4 h-4 bg-brand-500 rounded-full absolute right-0 top-0 shadow-sm"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

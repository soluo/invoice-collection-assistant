import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientName: string;
  amountTTC: number;
  paidAmount?: number;
}

interface PaymentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onConfirm: (payments: Array<{
    type: "bank_transfer" | "check";
    amount: number;
    receivedDate?: string;
    expectedDepositDate?: string;
    notes?: string;
  }>) => void;
}

interface CheckPayment {
  id: string;
  amount: string;
  date: Date;
}

export function PaymentRecordModal({
  isOpen,
  onClose,
  invoice,
  onConfirm,
}: PaymentRecordModalProps) {
  const [activeTab, setActiveTab] = useState<"bank_transfer" | "check">("bank_transfer");

  // État pour virement
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState<Date>(new Date());

  // État pour chèques
  const [checks, setChecks] = useState<CheckPayment[]>([]);
  const [checkCounter, setCheckCounter] = useState(0);

  const balanceDue = invoice.amountTTC - (invoice.paidAmount ?? 0);

  // Charger les paiements existants (chèques en attente uniquement)
  const existingPayments = useQuery(api.payments.getPaymentsByInvoice, { invoiceId: invoice._id });

  // Charger les chèques en attente au montage de la modale
  useEffect(() => {
    if (existingPayments && isOpen) {
      const pendingChecks = existingPayments.filter(
        (p) => p.type === "check" && p.status === "pending"
      );

      if (pendingChecks.length > 0) {
        const loadedChecks: CheckPayment[] = pendingChecks.map((payment, index) => ({
          id: `check-${index}`,
          amount: payment.amount.toString(),
          date: payment.expectedDepositDate ? new Date(payment.expectedDepositDate) : new Date(),
        }));
        setChecks(loadedChecks);
        setCheckCounter(pendingChecks.length);
        setActiveTab("check"); // Ouvrir l'onglet chèques automatiquement
      }
    }
  }, [existingPayments, isOpen]);

  const handleAddCheck = () => {
    const newCheck: CheckPayment = {
      id: `check-${checkCounter}`,
      amount: "",
      date: new Date(),
    };
    setChecks([...checks, newCheck]);
    setCheckCounter(checkCounter + 1);
  };

  const handleRemoveCheck = (id: string) => {
    setChecks(checks.filter(check => check.id !== id));
  };

  const handleCheckAmountChange = (id: string, amount: string) => {
    setChecks(checks.map(check =>
      check.id === id ? { ...check, amount } : check
    ));
  };

  const handleCheckDateChange = (id: string, date: Date | undefined) => {
    if (date) {
      setChecks(checks.map(check =>
        check.id === id ? { ...check, date } : check
      ));
    }
  };

  const getTotalChecks = () => {
    return checks.reduce((sum, check) => {
      const amount = parseFloat(check.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleConfirm = () => {
    if (activeTab === "bank_transfer") {
      const amount = parseFloat(transferAmount);

      if (!amount || amount <= 0) {
        alert("Veuillez saisir un montant valide");
        return;
      }

      if (amount > balanceDue + 0.01) {
        alert(`Le montant ne peut pas dépasser le solde dû (${balanceDue.toFixed(2)} €)`);
        return;
      }

      onConfirm([{
        type: "bank_transfer",
        amount,
        receivedDate: formatDate(transferDate),
      }]);
    } else {
      // Chèques
      if (checks.length === 0) {
        alert("Veuillez ajouter au moins un chèque");
        return;
      }

      const totalChecks = getTotalChecks();

      if (totalChecks <= 0) {
        alert("Veuillez saisir des montants valides");
        return;
      }

      if (totalChecks > balanceDue + 0.01) {
        alert(`Le total des chèques ne peut pas dépasser le solde dû (${balanceDue.toFixed(2)} €)`);
        return;
      }

      const payments = checks.map(check => ({
        type: "check" as const,
        amount: parseFloat(check.amount),
        expectedDepositDate: formatDate(check.date),
      }));

      onConfirm(payments);
    }

    // Reset state
    setTransferAmount("");
    setTransferDate(new Date());
    setChecks([]);
    setActiveTab("bank_transfer");
  };

  const handleClose = () => {
    // Reset state
    setTransferAmount("");
    setTransferDate(new Date());
    setChecks([]);
    setActiveTab("bank_transfer");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>

        {/* Infos facture */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-500">Facture</span>
            <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-500">Client</span>
            <span className="font-semibold text-gray-900">{invoice.clientName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-500">Montant total</span>
            <span className="font-semibold text-gray-900">
              {invoice.amountTTC.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium text-gray-700">Solde dû</span>
            <span className="text-xl font-bold text-red-600">
              {balanceDue.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </span>
          </div>
        </div>

        {/* Onglets */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "bank_transfer" | "check")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bank_transfer">Virement</TabsTrigger>
            <TabsTrigger value="check">Chèque(s)</TabsTrigger>
          </TabsList>

          {/* Onglet Virement */}
          <TabsContent value="bank_transfer" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-date">Date de réception</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !transferDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transferDate ? format(transferDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={transferDate}
                    onSelect={(date) => date && setTransferDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={2020}
                    toYear={new Date().getFullYear()}
                    classNames={{
                      months: "space-y-4",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      cell: "h-10 w-10 text-center text-sm p-0 relative",
                      day: "h-10 w-10 p-0 font-normal",
                      head_cell: "text-muted-foreground rounded-md w-10 font-normal text-[0.8rem]",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Montant reçu</Label>
              <div className="relative">
                <Input
                  id="transfer-amount"
                  type="number"
                  step="0.01"
                  placeholder={balanceDue.toFixed(2)}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              </div>
            </div>
          </TabsContent>

          {/* Onglet Chèques */}
          <TabsContent value="check" className="space-y-4">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {checks.map((check) => (
                <div key={check.id} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Montant"
                      value={check.amount}
                      onChange={(e) => handleCheckAmountChange(check.id, e.target.value)}
                      className="pl-8"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(check.date, "dd/MM/yyyy", { locale: fr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={check.date}
                        onSelect={(date) => handleCheckDateChange(check.id, date)}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={2020}
                        toYear={new Date().getFullYear() + 5}
                        classNames={{
                          months: "space-y-4",
                          month: "space-y-4",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-sm font-medium",
                          nav: "space-x-1 flex items-center",
                          cell: "h-10 w-10 text-center text-sm p-0 relative",
                          day: "h-10 w-10 p-0 font-normal",
                          head_cell: "text-muted-foreground rounded-md w-10 font-normal text-[0.8rem]",
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCheck(check.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddCheck}
              className="w-full border-dashed border-2"
            >
              + Ajouter un chèque
            </Button>

            {checks.length > 0 && (
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-700">Total des chèques :</span>
                <span className="font-bold text-gray-900">
                  {getTotalChecks().toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </span>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Enregistrer le paiement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";

interface MarkAsSentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
  defaultDate: string; // Format: "YYYY-MM-DD"
}

export function MarkAsSentModal({
  isOpen,
  onClose,
  onConfirm,
  defaultDate,
}: MarkAsSentModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Convert "YYYY-MM-DD" string to Date object
    return new Date(defaultDate + "T00:00:00");
  });

  // No min date (can be sent before invoice date), Max date = today
  const maxDate = new Date();

  const handleConfirm = () => {
    // Convert Date object back to "YYYY-MM-DD" format (avoid timezone issues)
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    onConfirm(dateString);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Marquer comme envoyée</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            captionLayout="dropdown"
            disabled={(date) => date > maxDate}
            endMonth={maxDate}
            defaultMonth={selectedDate}
            fixedWeeks
            classNames={{
              root: "w-full max-w-72",
              nav: "flex items-center justify-between absolute inset-x-0 top-0 w-full gap-1",
              button_previous: "h-8 w-8",
              button_next: "h-8 w-8",
            }}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors"
          >
            Confirmer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

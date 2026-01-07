import { ShieldX, ArrowLeft } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ForbiddenPageProps {
  message?: string;
  returnPath?: string;
  returnLabel?: string;
}

export function ForbiddenPage({
  message = "Vous n'avez pas les permissions pour accéder à cette page.",
  returnPath = "/invoices",
  returnLabel = "Retour aux factures",
}: ForbiddenPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-6">
          <ShieldX className="w-8 h-8 text-amber-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Accès refusé
        </h1>

        {/* Error code */}
        <p className="text-sm text-gray-500 mb-4">
          Erreur 403
        </p>

        {/* Message */}
        <p className="text-gray-600 mb-8">
          {message}
        </p>

        {/* Return button */}
        <NavLink to={returnPath}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {returnLabel}
          </Button>
        </NavLink>
      </div>
    </div>
  );
}

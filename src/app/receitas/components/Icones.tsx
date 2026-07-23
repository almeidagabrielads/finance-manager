import {
  Banknote,
  Ticket,
  TrendingUp,
  Gift,
  CirclePlus,
  Save,
  Search,
  Pencil,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { labelSubtipoReceita } from "@/lib/domain/receitas";
import { SUBTIPOS_RECEITA_UI, type SubtipoReceita } from "./types";

export function IconeSalario({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return <Banknote className={className} />;
}

export function IconeVoucher({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return <Ticket className={className} />;
}

export function IconeInvestimento({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return <TrendingUp className={className} />;
}

export function IconeOutros({ className = "h-4 w-4" }: { className?: string }) {
  return <Gift className={className} />;
}

export function IconePlusCirculo() {
  return <CirclePlus className="h-5 w-5" />;
}

export function IconeSalvar() {
  return <Save className="h-4 w-4" />;
}

export function IconeBusca() {
  return <Search className="h-4 w-4" />;
}

export function IconeLapis() {
  return <Pencil className="h-4 w-4" />;
}

export function IconeCheck() {
  return <Check className="h-4 w-4" />;
}

export function IconeX() {
  return <X className="h-4 w-4" />;
}

export function IconeLixeira() {
  return <Trash2 className="h-4 w-4" />;
}

const ICONES_SUBTIPO: Record<SubtipoReceita, typeof IconeSalario> = {
  SALARIO: IconeSalario,
  VOUCHER: IconeVoucher,
  INVESTIMENTO: IconeInvestimento,
  OUTROS: IconeOutros,
};

export function infoSubtipo(subtipo: string) {
  const valido = SUBTIPOS_RECEITA_UI.some((s) => s.value === subtipo)
    ? (subtipo as SubtipoReceita)
    : "OUTROS";
  return {
    label: labelSubtipoReceita(valido),
    Icone: ICONES_SUBTIPO[valido],
  };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { corPessoa } from "../components/PessoaBadge";
import { useConfirmDialog } from "../components/ConfirmDialog";
import { ColumnHeader } from "../components/ColumnHeader";
import { Select } from "../components/Select";
import { useTabela, type ColunaTabela } from "../components/useTabela";

const PAPEIS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "EDITOR", label: "Editor" },
  { value: "VISUALIZADOR", label: "Visualizador" },
] as const;

type Papel = "PROPRIETARIO" | "ADMIN" | "EDITOR" | "VISUALIZADOR";

function labelPapel(papel: Papel): string {
  if (papel === "PROPRIETARIO") return "Proprietário(a)";
  return PAPEIS.find((p) => p.value === papel)?.label ?? papel;
}

type Membro = {
  id: string;
  nome: string;
  email: string;
  role: Papel;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  lastDevice: string | null;
};

type Atividade = {
  id: string;
  acao: string;
  dispositivo: string | null;
  createdAt: string;
  user: { id: string; nome: string } | null;
};

const LIMITE_ATIVO_MS = 5 * 60 * 1000;

function statusAcesso(lastSeenAt: string | null): {
  online: boolean;
  label: string;
} {
  if (!lastSeenAt) return { online: false, label: "Nunca acessou" };
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  if (diffMs < LIMITE_ATIVO_MS)
    return { online: true, label: "Ativo(a) agora" };

  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 60)
    return { online: false, label: `Último acesso: ${minutos}min atrás` };
  const horas = Math.floor(minutos / 60);
  if (horas < 24)
    return { online: false, label: `Último acesso: ${horas}h atrás` };
  const dias = Math.floor(horas / 24);
  return { online: false, label: `Último acesso: ${dias}d atrás` };
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

export function AcessoClient() {
  const [membros, setMembros] = useState<Membro[] | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [euId, setEuId] = useState<string | null>(null);
  const [euRole, setEuRole] = useState<Papel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const { confirmar, dialog: dialogConfirmacao } = useConfirmDialog();

  function recarregar() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    let cancelado = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((eu) => {
        if (!cancelado && eu) {
          setEuId(eu.id);
          setEuRole(eu.role);
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      fetch("/api/membros").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/atividades").then((r) => (r.ok ? r.json() : null)),
    ]).then(([m, a]) => {
      if (cancelado) return;
      if (m) setMembros(m);
      if (a) setAtividades(a);
    });
    return () => {
      cancelado = true;
    };
  }, [reloadToken]);

  const souGestor = euRole === "PROPRIETARIO" || euRole === "ADMIN";

  const colunasAtividades = useMemo<ColunaTabela<Atividade>[]>(
    () => [
      { chave: "acao", tipo: "texto", acessor: (a) => a.acao },
      { chave: "usuario", tipo: "opcoes", acessor: (a) => a.user?.nome ?? "—" },
      { chave: "data", tipo: "data", acessor: (a) => a.createdAt.slice(0, 10) },
      {
        chave: "dispositivo",
        tipo: "opcoes",
        acessor: (a) => a.dispositivo ?? "—",
      },
    ],
    [],
  );

  const {
    linhas: atividadesProcessadas,
    ordenacao,
    alternarOrdenacao,
    filtros,
    definirFiltro,
    limparFiltro,
  } = useTabela(atividades, colunasAtividades);

  const opcoesColunasAtividades = useMemo(() => {
    const unicos = (valores: string[]) =>
      [...new Set(valores)].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return {
      usuario: unicos(atividades.map((a) => a.user?.nome ?? "—")),
      dispositivo: unicos(atividades.map((a) => a.dispositivo ?? "—")),
    };
  }, [atividades]);

  async function alterarPapel(id: string, role: string) {
    setErro(null);
    const response = await fetch(`/api/membros/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    recarregar();
  }

  async function removerMembro(membro: Membro) {
    if (
      !(await confirmar(
        `Remover o acesso de "${membro.nome}"? Essa ação não pode ser desfeita.`,
      ))
    ) {
      return;
    }
    setErro(null);
    const response = await fetch(`/api/membros/${membro.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    recarregar();
  }

  return (
    <div className="gap-lg flex flex-col">
      {dialogConfirmacao}

      <div className="flex justify-end gap-2">
        {souGestor && (
          <button
            onClick={() => setModalAberto(true)}
            className="bg-primary px-md text-on-primary w-fit shrink-0 rounded-full py-1.5 text-xs font-semibold hover:opacity-90"
          >
            Convidar membro
          </button>
        )}
      </div>

      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}

      <div className="gap-sm grid grid-cols-1 sm:grid-cols-2">
        {membros?.map((membro) => {
          const status = statusAcesso(membro.lastSeenAt);
          return (
            <div
              key={membro.id}
              className="border-outline-variant bg-surface-container-lowest p-lg flex flex-col gap-2 rounded-xl border"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${corPessoa(membro.id)}`}
                  >
                    {membro.nome.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h3 className="text-on-surface text-base font-semibold">
                      {membro.nome}
                    </h3>
                    <span className="text-on-surface-variant text-xs font-semibold">
                      {labelPapel(membro.role)}
                    </span>
                  </div>
                </div>
                {souGestor &&
                  membro.role !== "PROPRIETARIO" &&
                  membro.id !== euId && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={membro.role}
                        onChange={(v) => alterarPapel(membro.id, v)}
                        options={PAPEIS.map((p) => ({
                          value: p.value,
                          label: p.label,
                        }))}
                      />
                      <button
                        className="text-danger text-xs font-medium"
                        onClick={() => removerMembro(membro)}
                      >
                        Remover
                      </button>
                    </div>
                  )}
              </div>

              <p className="text-on-surface-variant text-sm">{membro.email}</p>

              <div className="text-on-surface-variant flex items-center gap-1.5 text-xs">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status.online ? "bg-success" : "bg-outline"}`}
                />
                <span className="font-medium tracking-wide uppercase">
                  {status.label}
                </span>
                {membro.lastDevice && <span>· {membro.lastDevice}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {atividades.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
            Logs de atividade recentes
          </h3>
          <div className="border-outline-variant overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant text-left text-xs font-semibold">
                <tr>
                  <ColumnHeader
                    label="Ação"
                    chave="acao"
                    tipo="texto"
                    ordenacao={ordenacao}
                    onOrdenar={alternarOrdenacao}
                    filtro={filtros.acao}
                    onFiltrar={definirFiltro}
                    onLimparFiltro={limparFiltro}
                  />
                  <ColumnHeader
                    label="Usuário"
                    chave="usuario"
                    tipo="opcoes"
                    opcoes={opcoesColunasAtividades.usuario}
                    ordenacao={ordenacao}
                    onOrdenar={alternarOrdenacao}
                    filtro={filtros.usuario}
                    onFiltrar={definirFiltro}
                    onLimparFiltro={limparFiltro}
                  />
                  <ColumnHeader
                    label="Data"
                    chave="data"
                    tipo="data"
                    ordenacao={ordenacao}
                    onOrdenar={alternarOrdenacao}
                    filtro={filtros.data}
                    onFiltrar={definirFiltro}
                    onLimparFiltro={limparFiltro}
                  />
                  <ColumnHeader
                    label="Dispositivo"
                    chave="dispositivo"
                    tipo="opcoes"
                    opcoes={opcoesColunasAtividades.dispositivo}
                    ordenacao={ordenacao}
                    onOrdenar={alternarOrdenacao}
                    filtro={filtros.dispositivo}
                    onFiltrar={definirFiltro}
                    onLimparFiltro={limparFiltro}
                  />
                </tr>
              </thead>
              <tbody>
                {atividadesProcessadas.map((a) => (
                  <tr key={a.id} className="border-outline-variant border-t">
                    <td className="p-sm">{a.acao}</td>
                    <td className="p-sm text-on-surface-variant">
                      {a.user?.nome ?? "—"}
                    </td>
                    <td className="p-sm text-on-surface-variant">
                      {formatarData(a.createdAt)}
                    </td>
                    <td className="p-sm text-on-surface-variant">
                      {a.dispositivo ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {atividadesProcessadas.length === 0 && (
            <p className="p-sm text-on-surface-variant text-sm">
              Nenhuma atividade corresponde aos filtros das colunas.
            </p>
          )}
        </div>
      )}

      {modalAberto && (
        <ConvidarMembroModal
          onFechar={() => setModalAberto(false)}
          onConvidado={() => {
            setModalAberto(false);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

function ConvidarMembroModal({
  onFechar,
  onConvidado,
}: {
  onFechar: () => void;
  onConvidado: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("EDITOR");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const response = await fetch("/api/membros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, password, role }),
    });
    setEnviando(false);
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    onConvidado();
  }

  return (
    <div className="p-lg fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={enviar}
        className="gap-sm border-outline-variant bg-surface-container-lowest p-lg flex w-full max-w-[26rem] flex-col rounded-xl border"
      >
        <h3 className="text-on-surface text-base font-semibold">
          Convidar membro
        </h3>
        <p className="text-on-surface-variant text-xs">
          Crie uma conta de acesso e compartilhe a senha provisória com a pessoa
          — ainda não há envio automático de convite por e-mail.
        </p>

        {erro && (
          <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
            {erro}
          </p>
        )}

        <label className="text-on-surface-variant flex flex-col gap-1 text-xs font-semibold">
          Nome
          <input
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-lg border px-2 py-1 text-sm font-normal"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </label>
        <label className="text-on-surface-variant flex flex-col gap-1 text-xs font-semibold">
          Email
          <input
            type="email"
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-lg border px-2 py-1 text-sm font-normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="text-on-surface-variant flex flex-col gap-1 text-xs font-semibold">
          Senha provisória
          <input
            type="text"
            minLength={8}
            className="border-outline-variant bg-surface-container-lowest text-on-surface rounded-lg border px-2 py-1 text-sm font-normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <div className="text-on-surface-variant flex flex-col gap-1 text-xs font-semibold">
          Papel
          <Select
            value={role}
            onChange={setRole}
            options={PAPEIS.map((p) => ({ value: p.value, label: p.label }))}
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onFechar}
            className="px-md text-on-surface-variant rounded-full py-1.5 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="bg-primary px-md text-on-primary rounded-full py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? "Enviando…" : "Convidar"}
          </button>
        </div>
      </form>
    </div>
  );
}

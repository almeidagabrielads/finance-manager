-- O índice gerado pela migration anterior não trata NULL como igual,
-- pois PostgreSQL considera NULL != NULL em unique indexes por padrão.
-- Substituímos pelo mesmo índice com NULLS NOT DISTINCT (PG 15+) para
-- impedir duplicatas mesmo quando pessoaId ou subcategoriaId são nulos.

DROP INDEX "OrcamentoPlanejado_householdId_pessoaId_categoriaId_subcate_key";

CREATE UNIQUE INDEX "OrcamentoPlanejado_unique_key"
  ON "OrcamentoPlanejado" ("householdId", "pessoaId", "categoriaId", "subcategoriaId", "mes", "ano")
  NULLS NOT DISTINCT;

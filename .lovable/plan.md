

# Atualizar Valores Recomendados de Troca (iPhones)

## O que sera feito

Substituir os 18 registros atuais de iPhone (VR-001 a VR-018) no arquivo `valoresRecomendadosTrocaApi.ts` pelos novos valores fornecidos, mantendo os registros de Samsung (VR-019 a VR-027) e Xiaomi (VR-028 a VR-031) intactos.

## Dados a serem inseridos

Todos os registros serao condicao **Semi-novo**, marca **Apple**. Como foi fornecido um unico valor por modelo/armazenamento, os campos `valorMin`, `valorMax` e `valorSugerido` terao o mesmo valor.

| # | Modelo | Valor |
|---|--------|-------|
| 1 | iPhone 7 – 32 GB | R$ 50 |
| 2 | iPhone 7 Plus – 32 GB | R$ 100 |
| 3 | iPhone 7 Plus – 128 GB | R$ 200 |
| 4 | iPhone 8 – 64 GB | R$ 50 |
| 5 | iPhone 8 – 256 GB | R$ 100 |
| 6 | iPhone 8 Plus – 64 GB | R$ 200 |
| 7 | iPhone 8 Plus – 256 GB | R$ 300 |
| 8 | iPhone X – 64 GB | R$ 200 |
| 9 | iPhone X – 256 GB | R$ 400 |
| 10 | iPhone XR – 64 GB | R$ 400 |
| 11 | iPhone XR – 128 GB | R$ 500 |
| 12 | iPhone XR – 256 GB | R$ 600 |
| 13 | iPhone XS Max – 64 GB | R$ 500 |
| 14 | iPhone XS Max – 256 GB | R$ 700 |
| 15 | iPhone 11 – 64 GB | R$ 600 |
| 16 | iPhone 11 – 128 GB | R$ 800 |
| 17 | iPhone 11 – 256 GB | R$ 1.000 |
| 18 | iPhone 11 Pro – 64 GB | R$ 900 |
| 19 | iPhone 11 Pro – 256 GB | R$ 1.100 |
| 20 | iPhone 11 Pro Max – 64 GB | R$ 1.000 |
| 21 | iPhone 11 Pro Max – 256 GB | R$ 1.200 |
| 22 | iPhone 11 Pro Max – 512 GB | R$ 1.400 |
| 23 | iPhone 12 – 64 GB | R$ 1.200 |
| 24 | iPhone 12 – 128 GB | R$ 1.300 |
| 25 | iPhone 12 – 256 GB | R$ 1.500 |
| 26 | iPhone 12 Pro – 128 GB | R$ 1.750 |
| 27 | iPhone 12 Pro – 256 GB | R$ 1.900 |
| 28 | iPhone 12 Pro Max – 128 GB | R$ 2.200 |
| 29 | iPhone 12 Pro Max – 256 GB | R$ 2.300 |
| 30 | iPhone 12 Pro Max – 512 GB | R$ 2.450 |
| 31 | iPhone 13 – 128 GB | R$ 1.700 |
| 32 | iPhone 13 – 256 GB | R$ 2.000 |
| 33 | iPhone 13 Pro – 128 GB | R$ 2.400 |
| 34 | iPhone 13 Pro – 256 GB | R$ 2.500 |
| 35 | iPhone 13 Pro Max – 128 GB | R$ 2.700 |
| 36 | iPhone 13 Pro Max – 256 GB | R$ 2.900 |
| 37 | iPhone 14 – 128 GB | R$ 2.000 |
| 38 | iPhone 14 – 256 GB | R$ 2.200 |
| 39 | iPhone 14 Plus – 128 GB | R$ 2.150 |
| 40 | iPhone 14 Plus – 256 GB | R$ 2.400 |
| 41 | iPhone 14 Pro – 128 GB | R$ 2.700 |
| 42 | iPhone 14 Pro – 256 GB | R$ 2.900 |
| 43 | iPhone 14 Pro Max – 128 GB | R$ 3.200 |
| 44 | iPhone 14 Pro Max – 256 GB | R$ 3.400 |
| 45 | iPhone 15 – 128 GB | R$ 2.700 |
| 46 | iPhone 15 – 256 GB | R$ 3.000 |
| 47 | iPhone 15 Plus – 128 GB | R$ 2.900 |
| 48 | iPhone 15 Plus – 256 GB | R$ 3.300 |
| 49 | iPhone 15 Pro – 128 GB | R$ 3.400 |
| 50 | iPhone 15 Pro – 256 GB | R$ 3.600 |
| 51 | iPhone 15 Pro Max – 256 GB | R$ 4.000 |
| 52 | iPhone 15 Pro Max – 512 GB | R$ 4.300 |
| 53 | iPhone 16 – 128 GB | R$ 3.500 |
| 54 | iPhone 16 – 256 GB | R$ 3.800 |
| 55 | iPhone 16 Plus – 128 GB | R$ 3.700 |
| 56 | iPhone 16 Plus – 256 GB | R$ 4.000 |
| 57 | iPhone 16 Pro – 128 GB | R$ 4.500 |
| 58 | iPhone 16 Pro – 256 GB | R$ 4.700 |
| 59 | iPhone 16 Pro Max – 256 GB | R$ 5.400 |
| 60 | iPhone 16 Pro Max – 512 GB | R$ 5.600 |

**Total: 60 registros iPhone** (substituindo os 18 anteriores)

## Detalhes tecnicos

### Arquivo a editar
- `src/utils/valoresRecomendadosTrocaApi.ts`

### Alteracoes
1. Substituir as linhas 27-45 (18 entradas iPhone) por 60 novas entradas com IDs VR-001 a VR-060
2. Reindexar Samsung para VR-061 a VR-069 e Xiaomi para VR-070 a VR-073
3. Atualizar `nextId` para 74
4. Todos os registros com condicao "Semi-novo", `ultimaAtualizacao: '2026-02-23'`
5. `valorMin = valorMax = valorSugerido` = valor fornecido (valor unico por modelo)


# Pokrycie metodologii przez kontrakt Stock Monitor v1.0

Celem audytu jest sprawdzenie, czy informacje wymagane przez istniejący `SKILL.md` mają miejsce w kanonicznym eksporcie JSON. Metodologia inwestycyjna nie została uproszczona ani zastąpiona modelem aplikacji.

| Sekcja SKILL.md | Wymagana informacja | Pole / struktura JSON | Status |
|---|---|---|---|
| 1. Cel i filozofia | selektywność, jakość, EPS/FCF, cena, asymetria | `marketRegime`, `classification`, `score`, `valuation`, `expectedReturn`, `thesis` | Pokryte |
| 2. Profil domyślny | PLN, horyzont, ryzyko, ochrona kapitału, transze, max deep dive, ograniczenia użytkownika | `profile.*` | Pokryte |
| 3. Reżim rynkowy | wycena rynku, faza, szerokość, ryzyka, konsekwencje | `marketRegime.*`, `marketSources[]` | Pokryte |
| 4. Źródła | provenance, daty, bieżąca cena, jakość danych | `marketSources[]`, `companies[].sources[]`, `marketData`, `dataQuality` | Pokryte |
| 5. Screening | typ poszukiwanej okazji | `classification.opportunityCategory`, `screeningAssessment`, `thesis` | Pokryte |
| 6. Koszyki tematyczne | specyficzne mechanizmy wzrostu i ryzyka | `businessQuality`, `financialQuality`, `narrativeToNumbers`, `thesis`; pola tekstowe pozwalają zachować miary sektorowe | Pokryte |
| 7. Twarde filtry | 13 kryteriów odrzucających | `screeningAssessment.hardFilterBreaches[]`, `riskFlags[]` | Pokryte |
| 8. Narracja → liczby | pełny most ekonomiczno-finansowy | `narrativeToNumbers[]` | Pokryte |
| 9.1 Model biznesowy | przychody, recurring, klienci, geografia, cykliczność, pricing power, przewaga, TAM | `businessQuality.*` | Pokryte |
| 9.2 Finanse | min. 5 lat + ostatni okres, CAGR, marże, CFO/FCF, ROE/ROIC, CAPEX, WC, dług, akcje, EPS drivers | `financialQuality.*` | Pokryte |
| 9.3 Zarząd i akcjonariat | prognozy, strategia, alokacja, M&A, buyback/emisje, insider, właściciel, RPT, mniejszości, polityka | `managementAndOwnership.*` | Pokryte |
| 10. Dywidenda | yield, payout, FCF coverage, historia, wzrost, CAPEX/dług, regulacje, bezpieczeństwo | `dividend.*` | Pokryte |
| 11. Wycena | min. 2 metody, bear/base/bull, fair value, total/annual return, decomposition | `valuation`, `scenarios`, `expectedReturn.returnDrivers` | Pokryte |
| 12. Asymetria | base/bull/bear, prawdopodobieństwa, ważony zwrot, ratio | `scenarios.*.probabilityPct`, `expectedReturn.*` | Pokryte |
| 13. Anomalia podażowa | status, źródło, dowody, wygaszenie | `supplyAnomaly.*` | Pokryte |
| 14. Small/mid caps | obrót, free float, spread, zmienność, koncentracja, governance, emisje, coverage, płynność pozycji | `smallMidCapRisk.*` | Pokryte |
| 15. Trend i timing | trend, MA50/200, drawdown, relative strength, strefy, reakcja cena/wolumen, driver korekty | `timing.*` | Pokryte |
| 16. Cena wejścia i transze | range i 1–3+ transz zależnych od ceny/zdarzeń | `valuation.attractiveEntryZone`, `positionPlan.*` | Pokryte |
| 17. Scoring | 12 komponentów i 100 pkt z właściwymi maksimami | `score.total`, `score.components.*` | Pokryte + walidacja semantyczna sumy |
| 18. Kategorie | 8 kategorii finalistów | `classification.opportunityCategory` | Pokryte |
| 19. Kill the Thesis | mierzalne warunki, metryka/zdarzenie, próg, źródło | `thesis.killCriteria[]` | Pokryte |
| 20. Raport dla człowieka | tabela + status + risk level | raport pozostaje w rozmowie; JSON: `decision`, `classification`, `riskAssessment` | Pokryte |
| 21. Lista obserwacyjna | cena, EPS/FCF, wydarzenie, podaż, raport, reanaliza | `positionPlan`, `monitoringPlan.watchConditions`, `nextExpectedReportDate`, `nextReviewTriggers`, `supplyAnomaly.fadeSignals` | Pokryte |
| 22. Dyscyplina behawioralna | fundamenty/wycena/EPS-FCF/podaż/asymetria przy ruchach kursu | wnioski rozproszone w `thesis`, `valuation`, `timing`, `supplyAnomaly`, `expectedReturn`; brak sztucznego pola behawioralnego | Pokryte bez dublowania |
| 23. Zastrzeżenie | charakter analityczny i edukacyjny | pozostaje w raporcie i instrukcji skilla; nie jest daną domenową spółki | Pokryte poza JSON |

## Weryfikacja listy wymaganej dla finalisty

- reżim rynku → `marketRegime`
- scoring 0–100 → `score`
- kategoria okazji → `classification.opportunityCategory`
- cena → `marketData.price`
- fair value → `valuation.fairValueBase` oraz `scenarios.*.fairValue`
- 3Y total return → `expectedReturn.horizonYears` + `baseTotalReturnPct`
- annualized return → `expectedReturn.baseAnnualizedReturnPct` i `scenarios.*.annualizedReturnPct`
- bear downside → `expectedReturn.bearDownsidePct`
- asymmetry → `expectedReturn.asymmetryRatio`
- entry range → `valuation.attractiveEntryZone` + `positionPlan.attractiveEntryZone`
- EPS/FCF drivers → `financialQuality.epsGrowthDrivers`, `thesis.epsFcfGrowthDrivers`
- narrative → numbers → `narrativeToNumbers[]`
- jakość biznesu → `businessQuality`
- finanse → `financialQuality`
- dywidenda → `dividend`
- valuation scenarios → `scenarios`
- return decomposition → `expectedReturn.returnDrivers`
- catalysts → `thesis.catalysts` + `narrativeToNumbers`
- supply anomaly → `supplyAnomaly`
- risks → `riskAssessment`, `thesis.risks`, `screeningAssessment.riskFlags`
- Kill the Thesis → `thesis.killCriteria`
- tranches → `positionPlan.tranches`
- monitoring conditions → `monitoringPlan`
- sources → `sources[]` + `marketSources[]`

## Polityka brakujących danych

Nieznana wartość pojedyncza jest reprezentowana przez `null`, brak elementów kolekcji przez `[]`. `dataQuality` przechowuje jawnie braki i konflikty. Schema nie wymusza pozornej precyzji.

## Walidacje poza JSON Schema

JSON Schema v1.0 waliduje strukturę, enumy, typy, formaty dat i maksima punktów. Skill dodatkowo sprawdza relacje, których JSON Schema nie wyraża arytmetycznie:

1. `scanSummary.companiesExported == companies.length`,
2. `score.total == suma 12 components`, gdy total jest znany,
3. suma znanych `probabilityPct` bear/base/bull ≈ 100%,
4. zgodność strefy wejścia w `valuation` i `positionPlan`,
5. brak suffixu providera w tickerze.

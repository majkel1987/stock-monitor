# Zmiany — Stock Monitor contract v1.0

1. Zachowano dotychczasową metodologię inwestycyjną `Monitoruj GPW Okazje`; nie zmieniono filtrów, scoringu, zasad wyceny, asymetrii, timingu ani Kill the Thesis.
2. Zmieniono nazwę sekcji 20 na „Format odpowiedzi dla człowieka”, aby odróżnić raport rozmowy od kanonicznego eksportu maszynowego.
3. Dodano obowiązkowy eksport: jedno pełne uruchomienie monitoringu → jeden plik JSON → wiele spółek w `companies[]`.
4. Dodano wersjonowany kontrakt `schemaVersion: 1.0` i `exportType: gpw_opportunity_monitoring`.
5. Rozdzielono `decision.action` od `classification.status`; `PORTFOLIO` nie jest statusem analitycznym.
6. Zachowano oryginalny scoring 0–100 z 12 komponentami i ich rzeczywistymi maksimami.
7. Dodano struktury dla reżimu rynku, screeningu, danych rynkowych, wyceny, scenariuszy, expected return, narracja→liczby, jakości biznesu, finansów, zarządu, dywidendy, timingu, anomalii podażowej, small/mid caps, ryzyka, tezy, transz, monitoringu, źródeł i jakości danych.
8. Dodano regułę `null` / `[]` zamiast sztucznego uzupełniania braków.
9. Dodano provenance źródeł osobno dla rynku (`marketSources`) i każdej spółki (`sources`).
10. Dodano JSON Schema Draft 2020-12 z `additionalProperties: false`, required fields, nullable fields, enumami, formatami dat i limitami scoringu.
11. Dodano obowiązkową walidację semantyczną relacji niemożliwych do wyrażenia samym JSON Schema.
12. Minimalnie zaktualizowano dwa dostarczone warianty `openai.yaml`, aby komunikowały / uruchamiały nowy eksport JSON bez zmiany pozostałej konfiguracji.
13. Dodano dwa poprawne przykłady: eksport z 3 fikcyjnymi spółkami i eksport z pustym `companies`.

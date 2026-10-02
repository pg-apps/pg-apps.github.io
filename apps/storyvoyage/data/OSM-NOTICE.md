# OpenStreetMap reference geometry / Referenzgeometrien

© OpenStreetMap contributors — https://www.openstreetmap.org/copyright

Database license / Datenbanklizenz: ODbL 1.0 — https://opendatacommons.org/licenses/odbl/1-0/

Research candidates, not exact linguistic boundaries or evidence of a visit. Recherchekandidaten, keine exakten Sprachgrenzen oder Besuchsnachweise.

Conversion: join outer ways by endpoint node IDs; retain coordinates; normalize exterior winding to counterclockwise; omit editor metadata.

Sao Nicolau exception: OpenStreetMap / Wambacher via geoBoundaries; select the two independently anchored main-island components, retain their coordinates unchanged and exclude the three western components; add scope and attribution metadata. São Nicolau: Auswahl der zwei durch Ortsanker bestimmten Hauptinsel-Teilflächen; Koordinaten unverändert, drei westliche Teilflächen ausgeschlossen.

Bonaire: main island and Klein Bonaire coast relations4266671/v36 and5176051/v8; 26 + 2 outer coast ways joined by node identity; five Klein inland-water holes retained. Two islands/7rings/6215coordinates, original coordinates retained; outerCCW/innerCW. No12nm maritime buffer, Saba, Sint Eustatius, Aruba, Curacao or European Netherlands. Bonaire: zwei getrennte Landflächen; keine automatische exakte Ortsbestätigung.

The exact machine-readable derivatives below are freely available under ODbL1.0, without additional fee or reuse restrictions. App/portal terms do not add restrictions to these files. Die nachfolgenden maschinenlesbaren Geometriedaten stehen kostenlos unter ODbL1.0 ohne zusätzliche Nutzungsbeschränkungen bereit; App-/Portalbedingungen schränken sie nicht zusätzlich ein.

These files contain geometry and provenance only, no private collection or visit data. Publication is not an import approval: each geometry requires its separate catalog gates.

- [mazouna_osm_reference.geojson](mazouna_osm_reference.geojson) — SHA-256 `072684ba27489f9c88d10ff4237775cf5d38be703b5b143f73603a3701f5085d`; source: https://api.openstreetmap.org/api/0.6/relation/6559405/full.json
- [tlemcen_osm_reference.geojson](tlemcen_osm_reference.geojson) — SHA-256 `2cc1913241a445ff4d919544d67e31fa53ccd48d9c09de092503b18270a13bb4`; source: https://api.openstreetmap.org/api/0.6/relation/4291172/full.json
- [sao_nicolau_island_reference_20260913.geojson](sao_nicolau_island_reference_20260913.geojson) — SHA-256 `2e2251c0d1a925871fede2ee456b9e5a3723c0597f4717179f6ce8e473d4f402`; source: https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/CPV/ADM1/geoBoundaries-CPV-ADM1.geojson
- [bonaire_land_reference_20261002.geojson](bonaire_land_reference_20261002.geojson) — SHA-256 `f5ef1cc3be6cb80581c0f1a6406ccd1368cbf7bc338f270361a87ff9bbcfba31`; source: https://www.openstreetmap.org/relation/4266671

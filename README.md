# Auto servis Hunter, Niš: sajt

Statički sajt (HTML, CSS, JS), bez backenda i bez build koraka.
Otvorite `index.html` u pregledaču ili postavite ceo folder na bilo koji hosting.

## Struktura
- `index.html` sadržaj i strukturirani podaci (JSON-LD za Google)
- `css/style.css` ceo dizajn, boje su na vrhu fajla (`:root`)
- `js/main.js` meni, "Otvoreno sada", filter galerije, prikaz reglaže
- `img/` optimizovane fotografije (tablice na vozilima su zamućene)
- `fonts/` Archivo (samostalno hostovan, nema poziva ka Google Fonts)

## Šta izmeniti pre objave
1. **Radno vreme**: `CONFIG.hours` na vrhu `js/main.js`, tabela u `#kontakt` i tekst u hero i footer delu `index.html`, kao i `openingHoursSpecification` u JSON-LD bloku.
2. **Telefoni**: pretražite `693726` i `563736` u `index.html` i `main.js`.
3. **Domen**: kada se zna adresa sajta, dodati `<link rel="canonical">` i zameniti `og:image` punim URL-om.
4. **Mapa**: koristi se Google Maps embed po adresi (bez API ključa).

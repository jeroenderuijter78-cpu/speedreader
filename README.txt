SPEED READER WEBAPP v8

Ondersteunde invoer
- EPUB
- PDF
- Word (.docx)
- Apple Pages (.pages), wanneer het bestand een PDF-preview bevat
- Handmatig geplakte tekst

Niet ondersteund
- Oud Word-formaat .doc
- Gesloten/DRM-beveiligde documenten
- Scans/PDF's zonder tekstlaag (geen OCR)
- Pages-bestanden zonder ingebouwde PDF-preview; exporteer die eerst als PDF of .docx

BELANGRIJK VOOR PDF
PDF-import gebruikt PDF.js vanaf cdnjs. De eerste keer dat een PDF wordt geopend
is dus een internetverbinding nodig om de PDF-engine te laden. Daarna kan de
browser/service worker deze bron doorgaans cachen.

INSTALLEREN OP GITHUB PAGES
Vervang in je bestaande speed-reader repository de oude bestanden door ALLE
bestanden uit deze map:
- index.html
- app.js
- manifest.webmanifest
- sw.js
- icon-192.png
- icon-512.png

Open daarna je bestaande GitHub Pages-adres opnieuw.

BELANGRIJK BIJ EEN UPDATE
Safari kan de oude webapp nog uit cache tonen. Zie je niet 'webapp v8' bovenaan:
1. laad de pagina opnieuw;
2. sluit de webapp volledig en open opnieuw;
3. indien nodig verwijder de beginscherm-app en voeg hem opnieuw toe.

CONTROLE
Naast 'webapp v8' moet groen '● actief' staan. Dan draait JavaScript correct.

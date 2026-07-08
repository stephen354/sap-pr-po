# SAP PR Creator

Web dashboard untuk membuat **Purchase Requisition (PR)** di SAP melalui BAPI endpoint.

![Dashboard](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS-blue) ![SAP](https://img.shields.io/badge/backend-SAP%20ICF-orange)

## Fitur

- **Dynamic Form** — Tambah/hapus baris item secara dinamis
- **Auto Uppercase** — Material number otomatis diubah ke huruf besar
- **Basic Auth** — Input username & password SAP langsung di form
- **Response Handling** — Notifikasi sukses (hijau) / error (merah) dari SAP
- **CORS-Free** — Proxy via `server.js` (lokal) atau Netlify `_redirects` (production)
- **Responsive** — Tampil baik di desktop maupun mobile

## Format Data

Data dikirim sebagai `text/plain` dengan format:

```
NB#MATERIAL1|QTY1|PLANT1;MATERIAL2|QTY2|PLANT2
```

- `NB` — Header (tipe dokumen)
- `#` — Pemisah header dan item
- `|` — Pemisah field (material, quantity, plant)
- `;` — Pemisah antar item

## Cara Pakai (Lokal)

```bash
# 1. Clone repo
git clone https://github.com/stephen354/sap-pr-po.git
cd sap-pr-po

# 2. Jalankan dev server (butuh Node.js)
node server.js

# 3. Buka browser
# http://localhost:3001
```

`server.js` berfungsi sebagai:
- Static file server untuk `index.html`, `style.css`, `app.js`
- Proxy `/api/create-pr` → SAP endpoint (menghindari CORS)

## Deploy ke Netlify

1. Connect repo GitHub ke Netlify
2. Tidak perlu build command atau publish directory khusus (root = `/`)
3. File `_redirects` otomatis membuat Netlify proxy request ke SAP server

```
/api/create-pr  http://45.127.134.174:8000/bootcamp/STEV_TEST/CREATE_PR  200
```

> **Catatan:** `server.js` tidak digunakan di Netlify — digantikan oleh `_redirects`.

## Struktur File

```
├── index.html      # Halaman utama (form + UI)
├── style.css       # Styling (dark professional theme)
├── app.js          # Logic: dynamic form, fetch API, notifikasi
├── server.js       # Dev server + proxy (lokal only)
├── _redirects      # Netlify proxy config
└── .gitignore      # Ignore test files dengan credentials
```

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla, tanpa framework)
- **Font:** [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts
- **Backend:** SAP ICF (ABAP class `ZCL_STEV_TEST_PR`)
- **Hosting:** Netlify (static) + proxy redirect

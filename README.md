# SAP PR / PO Creator

Web dashboard untuk membuat **Purchase Requisition (PR)** dan **Purchase Order (PO)** di SAP melalui BAPI endpoint.

![Dashboard](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JS-blue) ![SAP](https://img.shields.io/badge/backend-SAP%20ICF-orange)

## Fitur

- **Dual Mode** — Pilih antara membuat PR atau PO lewat toggle di UI
- **PO dari PR** — Buat PO dengan referensi nomor PR yang sudah ada
- **PO Direct** — Buat PO langsung dengan input material, quantity, dan plant
- **Dynamic Form** — Tambah/hapus baris item secara dinamis
- **Auto Uppercase** — Material number otomatis diubah ke huruf besar
- **Basic Auth** — Input username & password SAP langsung di form
- **Response Handling** — Notifikasi sukses (hijau) / error (merah) dari SAP
- **CORS-Free** — Proxy via `server.js` (lokal) atau Netlify `_redirects` (production)
- **Responsive** — Tampil baik di desktop maupun mobile

## Format Data

Data dikirim sebagai `text/plain`.

### Purchase Requisition (PR)

```
NB#MATERIAL1|QTY1|PLANT1;MATERIAL2|QTY2|PLANT2
```

Contoh: `NB#STEPHEN|10|3000;JOSHUA|5|3000`

### Purchase Order (PO) — dari PR

```
COMP_CODE#DOC_TYPE#VENDOR#PURCH_ORG#PUR_GROUP#PR_NUMBER#ITEM1;ITEM2
```

Contoh: `3000#NB#3005#3000#001#0010013924#10;20`

### Purchase Order (PO) — Direct

```
COMP_CODE#DOC_TYPE#VENDOR#PURCH_ORG#PUR_GROUP#MATERIAL1|QTY1|PLANT1;MATERIAL2|QTY2|PLANT2
```

Contoh: `3000#NB#3005#3000#001#STEPHEN|10|3000;STEPHEN|5|3000`

### Keterangan Separator

| Simbol | Fungsi |
|--------|--------|
| `#` | Pemisah antar field header / section |
| `\|` | Pemisah field dalam item (material, qty, plant) |
| `;` | Pemisah antar item |

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
- Proxy `/api/create-pr` → SAP endpoint PR
- Proxy `/api/create-po` → SAP endpoint PO

## Deploy ke Netlify

1. Connect repo GitHub ke Netlify
2. Tidak perlu build command atau publish directory khusus (root = `/`)
3. File `_redirects` otomatis membuat Netlify proxy request ke SAP server

```
/api/create-pr  http://45.127.134.174:8000/bootcamp/STEV_TEST/CREATE_PR  200
/api/create-po  http://45.127.134.174:8000/bootcamp/STEV_TEST/CREATE_PO  200
```

> **Catatan:** `server.js` tidak digunakan di Netlify — digantikan oleh `_redirects`.

## Struktur File

```
├── index.html      # Halaman utama (form + UI dengan mode PR/PO)
├── style.css       # Styling (dark theme, amber accent untuk PO)
├── app.js          # Logic: mode switcher, dynamic form, fetch API
├── server.js       # Dev server + proxy (lokal only)
├── _redirects      # Netlify proxy config (PR + PO)
├── BAPI_PO.abap    # Source ABAP untuk PO (BAPI_PO_CREATE1)
└── .gitignore      # Ignore test files dengan credentials
```

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla, tanpa framework)
- **Font:** [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts
- **Backend:** SAP ICF — `CREATE_PR` (BAPI_PR_CREATE) & `CREATE_PO` (BAPI_PO_CREATE1)
- **Hosting:** Netlify (static) + proxy redirect

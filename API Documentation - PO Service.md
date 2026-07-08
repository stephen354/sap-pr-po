# SAP API Specification: Create Purchase Order (PO Service)

Dokumentasi API untuk pembuatan **Purchase Order (PO)** di SAP ECC menggunakan BAPI `BAPI_PO_CREATE1`. Layanan ini mendukung dua jenis skenario pembuatan PO: dengan referensi **Purchase Requisition (PR)** (Adopt PR) dan **Direct PO** (tanpa PR).

## 1. Informasi Umum API

| Parameter              | Keterangan                                                |
| :--------------------- | :-------------------------------------------------------- |
| **HTTP Method**        | POST                                                      |
| **URL Endpoint**       | `http://45.127.134.174:8000/bootcamp/STEV_TEST/CREATE_PO` |
| **Content-Type**       | `text/plain`                                              |
| **Authentication**     | Basic Authentication (SAP Username & Password)            |
| **HTTP Handler Class** | `ZCL_STEV_TEST_PO` (atau handler BAPI PO terkait)         |

---

## 2. Format Request Payload

Request body dikirim berupa plain text dengan separator karakter `#`, `|`, dan `;`. API akan mendeteksi tipe pembuatan PO secara otomatis berdasarkan struktur payload di bagian body.

### A. Skenario 1: PO dengan Referensi PR (Adopt PR)

Digunakan ketika ingin membuat PO berdasarkan nomor PR dan nomor item PR yang sudah ada di SAP.

#### Format:

```text
<COMP_CODE>#<DOC_TYPE>#<VENDOR>#<PURCH_ORG>#<PUR_GROUP>#<PR_NO>#<PR_ITEM_1>;<PR_ITEM_2>;...
```

#### Contoh Payload:

```text
3000#NB#3005#3000#001#0010013924#10;20
```

---

### B. Skenario 2: Direct PO (Tanpa PR)

Digunakan ketika ingin membuat PO langsung dengan memasukkan detail material, quantity, dan plant secara manual tanpa referensi dokumen PR.

#### Format:

```text
<COMP_CODE>#<DOC_TYPE>#<VENDOR>#<PURCH_ORG>#<PUR_GROUP>#<MATERIAL_1>|<QTY_1>|<PLANT_1>;<MATERIAL_2>|<QTY_2>|<PLANT_2>;...
```

#### Contoh Payload:

```text
3000#NB#3005#3000#001#STEPHEN|10|3000;STEPHEN|5|3000
```

---

## 3. Detail Parameter (Field Breakdown)

### A. Parameter Header (Bagian Sebelum Data Item/PR)

| Field Name  | Tipe Data | Panjang | Keterangan                               | Contoh |
| :---------- | :-------- | :-----: | :--------------------------------------- | :----- |
| `COMP_CODE` | CHAR      |    4    | Company Code (Mandatory)                 | `3000` |
| `DOC_TYPE`  | CHAR      |    4    | Purchase Order Document Type (Mandatory) | `NB`   |
| `VENDOR`    | CHAR      |   10    | Vendor Code (Mandatory)                  | `3005` |
| `PURCH_ORG` | CHAR      |    4    | Purchasing Organization (Mandatory)      | `3000` |
| `PUR_GROUP` | CHAR      |    3    | Purchasing Group (Mandatory)             | `001`  |

### B. Parameter Body untuk Skenario 1: Adopt PR

| Field Name | Tipe Data | Panjang | Keterangan                                                                                                                              | Contoh       |
| :--------- | :-------- | :-----: | :-------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| `PR_NO`    | CHAR      |   10    | Nomor Purchase Requisition di SAP                                                                                                       | `0010013924` |
| `PR_ITEM`  | NUMC      |    5    | Nomor item PR (dipisahkan `;` jika lebih dari satu). Input pendek seperti `10` akan otomatis dikonversi ke format internal SAP `00010`. | `10`         |

### C. Parameter Body untuk Skenario 2: Direct PO

| Field Name | Tipe Data | Panjang | Keterangan                                                | Contoh    |
| :--------- | :-------- | :-----: | :-------------------------------------------------------- | :-------- |
| `MATERIAL` | CHAR      |   18    | Kode Material SAP (akan otomatis di-convert ke UPPERCASE) | `STEPHEN` |
| `QUANTITY` | QUAN      |   13    | Jumlah barang yang dipesan                                | `10`      |
| `PLANT`    | CHAR      |    4    | Plant code penerima barang                                | `3000`    |

---

## 4. Response Handling

API akan mengembalikan respon text/plain tergantung hasil eksekusi BAPI.

### A. Response Sukses

Ketika PO berhasil dibuat dan di-commit di SAP.

- **HTTP Status:** `200 OK`
- **Format Response:**
  ```text
  Sukses! Nomor PO berhasil dibuat: <PO_NUMBER>
  ```
- **Contoh:** `Sukses! Nomor PO berhasil dibuat: 4500018247`

### B. Response Error / Gagal

Jika validasi BAPI gagal (misal vendor tidak valid, plant tidak ada, atau otorisasi kurang). Transaksi otomatis di-rollback oleh program ABAP.

- **HTTP Status:** `200 OK` (atau error response dari server web jika terjadi network error)
- **Format Response:**
  ```text
  Error : <PESAN_ERROR_1> | <PESAN_ERROR_2> | ...
  ```
- **Contoh:** `Error : Vendor 3005 tidak terdaftar di Purchasing Org 3000 | Enter Plant`

---

## 5. Prosedur Pengujian (Testing)

### Pengujian Menggunakan cURL

#### Test Skenario 1 (Adopt PR):

```bash
curl -X POST http://45.127.134.174:8000/bootcamp/STEV_TEST/CREATE_PO \
  -H "Content-Type: text/plain" \
  -H "Authorization: Basic <BASE64_CREDENTIALS>" \
  -d "3000#NB#3005#3000#001#0010013924#10;20"
```

#### Test Skenario 2 (Direct PO):

```bash
curl -X POST http://45.127.134.174:8000/bootcamp/STEV_TEST/CREATE_PO \
  -H "Content-Type: text/plain" \
  -H "Authorization: Basic <BASE64_CREDENTIALS>" \
  -d "3000#NB#3005#3000#001#STEPHEN|10|3000;STEPHEN|5|3000"
```

# SAP API Specification: Create Purchase Requisition (PR Service)

Dokumentasi API untuk pembuatan **Purchase Requisition (PR)** di SAP ECC menggunakan BAPI `BAPI_PR_CREATE`.

## 1. Informasi Umum API

| Parameter              | Keterangan                                                |
| :--------------------- | :-------------------------------------------------------- |
| **HTTP Method**        | POST                                                      |
| **URL Endpoint**       | `http://45.127.134.174:8000/bootcamp/STEV_TEST/CREATE_PR` |
| **Content-Type**       | `text/plain`                                              |
| **Authentication**     | Basic Authentication (SAP Username & Password)            |
| **HTTP Handler Class** | `ZCL_STEV_TEST_PR` (atau handler BAPI PR terkait)         |

---

## 2. Format Request Payload

Request body dikirim berupa plain text dengan separator karakter `#`, `|`, dan `;`.

#### Format:

```text
<DOC_TYPE>#<MATERIAL_1>|<QTY_1>|<PLANT_1>;<MATERIAL_2>|<QTY_2>|<PLANT_2>;...
```

#### Contoh Payload:

```text
NB#STEPHEN|10|3000;STEPHEN|5|3000
```

---

## 3. Detail Parameter (Field Breakdown)

### A. Parameter Header

| Field Name | Tipe Data | Panjang | Keterangan                                     | Contoh |
| :--------- | :-------- | :-----: | :--------------------------------------------- | :----- |
| `DOC_TYPE` | CHAR      |    4    | Purchase Requisition Document Type (Mandatory) | `NB`   |

### B. Parameter Items (Dipisahkan oleh `;`)

| Field Name | Tipe Data | Panjang | Keterangan                                                | Contoh    |
| :--------- | :-------- | :-----: | :-------------------------------------------------------- | :-------- |
| `MATERIAL` | CHAR      |   18    | Kode Material SAP (akan otomatis di-convert ke UPPERCASE) | `STEPHEN` |
| `QUANTITY` | QUAN      |   13    | Jumlah barang yang diminta                                | `10`      |
| `PLANT`    | CHAR      |    4    | Plant code penerima barang                                | `3000`    |

---

## 4. Response Handling

API akan mengembalikan respon text/plain tergantung hasil eksekusi BAPI.

### A. Response Sukses

Ketika PR berhasil dibuat dan di-commit di SAP.

- **HTTP Status:** `200 OK`
- **Format Response:**
  ```text
  Sukses! Nomor PR berhasil dibuat: <PR_NUMBER>
  ```
- **Contoh:** `Sukses! Nomor PR berhasil dibuat: 0010013924`

### B. Response Error / Gagal

Jika validasi BAPI gagal (misal material tidak valid, plant tidak ada, atau otorisasi kurang). Transaksi otomatis di-rollback.

- **HTTP Status:** `200 OK` (atau error response dari server web jika terjadi network error)
- **Format Response:**
  ```text
  Error : <PESAN_ERROR_1> | <PESAN_ERROR_2> | ...
  ```
- **Contoh:** `Error : Material STEPHEN tidak ditemukan pada plant 3000`

---

## 5. Prosedur Pengujian (Testing)

### Pengujian Menggunakan cURL

```bash
curl -X POST http://45.127.134.174:8000/bootcamp/STEV_TEST/CREATE_PR \
  -H "Content-Type: text/plain" \
  -H "Authorization: Basic <BASE64_CREDENTIALS>" \
  -d "NB#STEPHEN|10|3000;STEPHEN|5|3000"
```

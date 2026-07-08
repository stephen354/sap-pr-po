METHOD IF_HTTP_EXTENSION~HANDLE_REQUEST.
  " =========================================================================
  " DEKLARASI VARIABEL
  " =========================================================================
  DATA: LV_RAW_DATA   TYPE STRING,
        LV_VENDOR     TYPE STRING,
        LV_COMP_CODE  TYPE STRING,
        LV_DOC_TYPE   TYPE STRING,
        LV_PURCH_ORG  TYPE STRING,
        LV_PUR_GROUP  TYPE STRING,
        LV_BODY       TYPE STRING,
        LV_PR_NO      TYPE STRING,
        LV_ITEM_STR   TYPE STRING.

  DATA: LT_ITEMS      TYPE TABLE OF STRING,
        LV_ITEM       TYPE STRING,
        LV_MAT        TYPE STRING,
        LV_QTY        TYPE STRING,
        LV_PLANT      TYPE STRING.

  DATA: LS_POHEADER   TYPE BAPIMEPOHEADER,
        LS_POHEADERX  TYPE BAPIMEPOHEADERX,
        LT_POITEM     TYPE TABLE OF BAPIMEPOITEM,
        LS_POITEM     TYPE BAPIMEPOITEM,
        LT_POITEMX    TYPE TABLE OF BAPIMEPOITEMX,
        LS_POITEMX    TYPE BAPIMEPOITEMX,
        LT_RETURN     TYPE TABLE OF BAPIRET2,
        LS_RETURN     TYPE BAPIRET2,
        LV_PO_NUMBER  TYPE BAPIMEPOHEADER-PO_NUMBER.

  DATA: LV_ITEM_NO    TYPE EBELP VALUE '00010',
        LV_PREQ_ITEM  TYPE EBELP,
        LV_RESPONSE   TYPE STRING,
        LV_ERROR_FLAG TYPE C.

  " =========================================================================
  " DATA DARI POSTMAN
  " =========================================================================
  LV_RAW_DATA = SERVER->REQUEST->GET_CDATA( ).

  " Vendor dari sisa payload (Contoh: 1000#NB#0010#1000#001#0010013916#10;20)
  SPLIT LV_RAW_DATA AT '#' INTO LV_COMP_CODE LV_DOC_TYPE LV_VENDOR LV_PURCH_ORG LV_PUR_GROUP LV_BODY.

  " =========================================================================
  " HEADER PO
  " =========================================================================
  LS_POHEADER-COMP_CODE  = LV_COMP_CODE.
  LS_POHEADER-DOC_TYPE   = LV_DOC_TYPE.
  LS_POHEADER-VENDOR     = LV_VENDOR.
  LS_POHEADER-PURCH_ORG  = LV_PURCH_ORG.
  LS_POHEADER-PUR_GROUP  = LV_PUR_GROUP.

  LS_POHEADERX-COMP_CODE = 'X'.
  LS_POHEADERX-DOC_TYPE  = 'X'.
  LS_POHEADERX-VENDOR    = 'X'.
  LS_POHEADERX-PURCH_ORG  = 'X'.
  LS_POHEADERX-PUR_GROUP = 'X'.

  " =========================================================================
  " ROUTING (REFERENSI PR vs DIRECT PO)
  " =========================================================================
  IF LV_BODY CS '#'.

    " --- PO DARI PR (Contoh: 0010013916#10;20) ---
    SPLIT LV_BODY AT '#' INTO LV_PR_NO LV_ITEM_STR.
    SPLIT LV_ITEM_STR AT ';' INTO TABLE LT_ITEMS.

    LOOP AT LT_ITEMS INTO LV_ITEM.
      IF LV_ITEM IS NOT INITIAL.
        CLEAR: LS_POITEM, LS_POITEMX.

        LS_POITEM-PO_ITEM = LV_ITEM_NO.
        LS_POITEM-PREQ_NO = LV_PR_NO.

        " Ubah '10' menjadi '00010'
        LV_PREQ_ITEM = LV_ITEM.
        UNPACK LV_PREQ_ITEM TO LS_POITEM-PREQ_ITEM.

        APPEND LS_POITEM TO LT_POITEM.

        LS_POITEMX-PO_ITEM   = LV_ITEM_NO.
        LS_POITEMX-PO_ITEMX  = 'X'.
        LS_POITEMX-PREQ_NO   = 'X'.
        LS_POITEMX-PREQ_ITEM = 'X'.
        APPEND LS_POITEMX TO LT_POITEMX.

        LV_ITEM_NO = LV_ITEM_NO + 10.
      ENDIF.
    ENDLOOP.

  ELSE.

    " --- DIRECT PO (Contoh: STEPHEN|10|3000;JOSHUA|5|3000) ---
    SPLIT LV_BODY AT ';' INTO TABLE LT_ITEMS.

    LOOP AT LT_ITEMS INTO LV_ITEM.
      IF LV_ITEM IS NOT INITIAL.
        SPLIT LV_ITEM AT '|' INTO LV_MAT LV_QTY LV_PLANT.
        CLEAR: LS_POITEM, LS_POITEMX.

        TRANSLATE LV_MAT TO UPPER CASE.

        LS_POITEM-PO_ITEM   = LV_ITEM_NO.
        LS_POITEM-MATERIAL  = LV_MAT.
        LS_POITEM-QUANTITY  = LV_QTY.
        LS_POITEM-PLANT     = LV_PLANT.
        LS_POITEM-NET_PRICE = '100.00'.

        APPEND LS_POITEM TO LT_POITEM.

        LS_POITEMX-PO_ITEM   = LV_ITEM_NO.
        LS_POITEMX-PO_ITEMX  = 'X'.
        LS_POITEMX-MATERIAL  = 'X'.
        LS_POITEMX-QUANTITY  = 'X'.
        LS_POITEMX-PLANT     = 'X'.
        LS_POITEMX-NET_PRICE = 'X'.
        APPEND LS_POITEMX TO LT_POITEMX.

        LV_ITEM_NO = LV_ITEM_NO + 10.
      ENDIF.
    ENDLOOP.

  ENDIF.

  " =========================================================================
  " EKSEKUSI BAPI PO
  " =========================================================================
  CALL FUNCTION 'BAPI_PO_CREATE1'
    EXPORTING
      POHEADER         = LS_POHEADER
      POHEADERX        = LS_POHEADERX
    IMPORTING
      EXPPURCHASEORDER = LV_PO_NUMBER
    TABLES
      RETURN           = LT_RETURN
      POITEM           = LT_POITEM
      POITEMX          = LT_POITEMX.

  " =========================================================================
  " PENANGANAN ERROR & RESPONSE KE POSTMAN
  " =========================================================================
  CLEAR LV_ERROR_FLAG.
  LOOP AT LT_RETURN INTO LS_RETURN WHERE TYPE = 'E' OR TYPE = 'A'.
    LV_ERROR_FLAG = 'X'.
    CONCATENATE LV_RESPONSE LS_RETURN-MESSAGE '|' INTO LV_RESPONSE SEPARATED BY SPACE.
*    LV_RESPONSE = LV_RESPONSE && LS_RETURN-MESSAGE && ' | '
  ENDLOOP.

  IF LV_ERROR_FLAG = 'X'.
    CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
    CONCATENATE 'Error :' LV_RESPONSE INTO LV_RESPONSE SEPARATED BY SPACE.
    SERVER->RESPONSE->SET_CDATA( LV_RESPONSE ).
  ELSE.
    CALL FUNCTION 'BAPI_TRANSACTION_COMMIT'
      EXPORTING
        WAIT = 'X'.
    CONCATENATE 'Sukses! Nomor PO berhasil dibuat:' LV_PO_NUMBER INTO LV_RESPONSE SEPARATED BY SPACE.
    SERVER->RESPONSE->SET_CDATA( LV_RESPONSE ).
  ENDIF.


ENDMETHOD.
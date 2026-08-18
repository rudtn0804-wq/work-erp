/* =========================================================================
 * ORIX.AC_BON_REPORT_SUB2_01 ~ 06
 * PK(SITE_CODE, KJ_YYYYMM, SEQ) 기준으로 존재하면 UPDATE, 없으면 INSERT
 * ========================================================================= */

/* ---------------------------------------------------------------
 * 1. AC_BON_REPORT_SUB2_01
 * --------------------------------------------------------------- */
MERGE INTO ORIX.AC_BON_REPORT_SUB2_01 T
USING (
    SELECT :SITE_CODE     AS SITE_CODE
         , :KJ_YYYYMM     AS KJ_YYYYMM
         , :SEQ           AS SEQ
      FROM DUAL
) S
   ON (    T.SITE_CODE = S.SITE_CODE
       AND T.KJ_YYYYMM = S.KJ_YYYYMM
       AND T.SEQ       = S.SEQ )
WHEN MATCHED THEN
    UPDATE SET T.KUBUN        = :KUBUN
             , T.OBJECT_NAME  = :OBJECT_NAME
             , T.INFO_CHANGED = :INFO_CHANGED
             , T.COMPANY_NAME = :COMPANY_NAME
             , T.BLANK_JAPAN  = :BLANK_JAPAN
             , T.REG_ADDRESS  = :REG_ADDRESS
             , T.TOTAL_SHARES = :TOTAL_SHARES
             , T.FIX_YN       = NVL(:FIX_YN, 'N')
             , T.FIX_DATE     = CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN NVL(T.FIX_DATE, SYSDATE) END
             , T.UPDATE_DATE  = SYSDATE
             , T.UPDATE_IDNO  = :USER_ID
WHEN NOT MATCHED THEN
    INSERT ( SITE_CODE, KJ_YYYYMM, SEQ
           , KUBUN, OBJECT_NAME, INFO_CHANGED, COMPANY_NAME, BLANK_JAPAN
           , REG_ADDRESS, TOTAL_SHARES
           , FIX_YN, FIX_DATE, ENTRY_DATE, ENTRY_IDNO )
    VALUES ( S.SITE_CODE, S.KJ_YYYYMM, S.SEQ
           , :KUBUN, :OBJECT_NAME, :INFO_CHANGED, :COMPANY_NAME, :BLANK_JAPAN
           , :REG_ADDRESS, :TOTAL_SHARES
           , NVL(:FIX_YN, 'N')
           , CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN SYSDATE END
           , SYSDATE, :USER_ID );


/* ---------------------------------------------------------------
 * 2. AC_BON_REPORT_SUB2_02
 * --------------------------------------------------------------- */
MERGE INTO ORIX.AC_BON_REPORT_SUB2_02 T
USING (
    SELECT :SITE_CODE     AS SITE_CODE
         , :KJ_YYYYMM     AS KJ_YYYYMM
         , :SEQ           AS SEQ
      FROM DUAL
) S
   ON (    T.SITE_CODE = S.SITE_CODE
       AND T.KJ_YYYYMM = S.KJ_YYYYMM
       AND T.SEQ       = S.SEQ )
WHEN MATCHED THEN
    UPDATE SET T.KUBUN        = :KUBUN
             , T.OBJECT_NAME  = :OBJECT_NAME
             , T.INFO_CHANGED = :INFO_CHANGED
             , T.VDB_VK_SEL   = :VDB_VK_SEL
             , T.COMPANY_NAME = :COMPANY_NAME
             , T.BLANK_JAPAN  = :BLANK_JAPAN
             , T.COUNTRY_NAME = :COUNTRY_NAME
             , T.REG_ADDRESS  = :REG_ADDRESS
             , T.TOTAL_SHARES = :TOTAL_SHARES
             , T.SHARES_HELD  = :SHARES_HELD
             , T.EQUITY_PCT   = :EQUITY_PCT
             , T.CHECK_EQUITY = :CHECK_EQUITY
             , T.EQUITY_AMT   = :EQUITY_AMT
             , T.COMMON_STOCK = :COMMON_STOCK
             , T.PERIOD_END   = :PERIOD_END
             , T.FIX_YN       = NVL(:FIX_YN, 'N')
             , T.FIX_DATE     = CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN NVL(T.FIX_DATE, SYSDATE) END
             , T.UPDATE_DATE  = SYSDATE
             , T.UPDATE_IDNO  = :USER_ID
WHEN NOT MATCHED THEN
    INSERT ( SITE_CODE, KJ_YYYYMM, SEQ
           , KUBUN, OBJECT_NAME, INFO_CHANGED, VDB_VK_SEL
           , COMPANY_NAME, BLANK_JAPAN, COUNTRY_NAME, REG_ADDRESS
           , TOTAL_SHARES, SHARES_HELD, EQUITY_PCT, CHECK_EQUITY
           , EQUITY_AMT, COMMON_STOCK, PERIOD_END
           , FIX_YN, FIX_DATE, ENTRY_DATE, ENTRY_IDNO )
    VALUES ( S.SITE_CODE, S.KJ_YYYYMM, S.SEQ
           , :KUBUN, :OBJECT_NAME, :INFO_CHANGED, :VDB_VK_SEL
           , :COMPANY_NAME, :BLANK_JAPAN, :COUNTRY_NAME, :REG_ADDRESS
           , :TOTAL_SHARES, :SHARES_HELD, :EQUITY_PCT, :CHECK_EQUITY
           , :EQUITY_AMT, :COMMON_STOCK, :PERIOD_END
           , NVL(:FIX_YN, 'N')
           , CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN SYSDATE END
           , SYSDATE, :USER_ID );


/* ---------------------------------------------------------------
 * 3. AC_BON_REPORT_SUB2_03
 * --------------------------------------------------------------- */
MERGE INTO ORIX.AC_BON_REPORT_SUB2_03 T
USING (
    SELECT :SITE_CODE     AS SITE_CODE
         , :KJ_YYYYMM     AS KJ_YYYYMM
         , :SEQ           AS SEQ
      FROM DUAL
) S
   ON (    T.SITE_CODE = S.SITE_CODE
       AND T.KJ_YYYYMM = S.KJ_YYYYMM
       AND T.SEQ       = S.SEQ )
WHEN MATCHED THEN
    UPDATE SET T.KUBUN          = :KUBUN
             , T.OBJECT_NAME    = :OBJECT_NAME
             , T.INFO_CHANGED   = :INFO_CHANGED
             , T.VDB_VK_SEL     = :VDB_VK_SEL
             , T.COMPANY_CODE   = :COMPANY_CODE
             , T.COMPANY_NAME   = :COMPANY_NAME
             , T.BLANK_JAPAN    = :BLANK_JAPAN
             , T.COUNTRY_NAME   = :COUNTRY_NAME
             , T.REG_ADDRESS    = :REG_ADDRESS
             , T.ENDING_BALANCE = :ENDING_BALANCE
             , T.WRITEDOWN_AMT  = :WRITEDOWN_AMT
             , T.TOTAL_SHARES   = :TOTAL_SHARES
             , T.SHARES_HELD    = :SHARES_HELD
             , T.EQUITY_PCT     = :EQUITY_PCT
             , T.CHECK_EQUITY   = :CHECK_EQUITY
             , T.EQUITY_AMT     = :EQUITY_AMT
             , T.COMMON_STOCK   = :COMMON_STOCK
             , T.PERIOD_END     = :PERIOD_END
             , T.FIX_YN         = NVL(:FIX_YN, 'N')
             , T.FIX_DATE       = CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN NVL(T.FIX_DATE, SYSDATE) END
             , T.UPDATE_DATE    = SYSDATE
             , T.UPDATE_IDNO    = :USER_ID
WHEN NOT MATCHED THEN
    INSERT ( SITE_CODE, KJ_YYYYMM, SEQ
           , KUBUN, OBJECT_NAME, INFO_CHANGED, VDB_VK_SEL
           , COMPANY_CODE, COMPANY_NAME, BLANK_JAPAN, COUNTRY_NAME, REG_ADDRESS
           , ENDING_BALANCE, WRITEDOWN_AMT, TOTAL_SHARES, SHARES_HELD
           , EQUITY_PCT, CHECK_EQUITY, EQUITY_AMT, COMMON_STOCK, PERIOD_END
           , FIX_YN, FIX_DATE, ENTRY_DATE, ENTRY_IDNO )
    VALUES ( S.SITE_CODE, S.KJ_YYYYMM, S.SEQ
           , :KUBUN, :OBJECT_NAME, :INFO_CHANGED, :VDB_VK_SEL
           , :COMPANY_CODE, :COMPANY_NAME, :BLANK_JAPAN, :COUNTRY_NAME, :REG_ADDRESS
           , :ENDING_BALANCE, :WRITEDOWN_AMT, :TOTAL_SHARES, :SHARES_HELD
           , :EQUITY_PCT, :CHECK_EQUITY, :EQUITY_AMT, :COMMON_STOCK, :PERIOD_END
           , NVL(:FIX_YN, 'N')
           , CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN SYSDATE END
           , SYSDATE, :USER_ID );


/* ---------------------------------------------------------------
 * 4. AC_BON_REPORT_SUB2_04
 * --------------------------------------------------------------- */
MERGE INTO ORIX.AC_BON_REPORT_SUB2_04 T
USING (
    SELECT :SITE_CODE     AS SITE_CODE
         , :KJ_YYYYMM     AS KJ_YYYYMM
         , :SEQ           AS SEQ
      FROM DUAL
) S
   ON (    T.SITE_CODE = S.SITE_CODE
       AND T.KJ_YYYYMM = S.KJ_YYYYMM
       AND T.SEQ       = S.SEQ )
WHEN MATCHED THEN
    UPDATE SET T.INV_CODE        = :INV_CODE
             , T.INV_NAME        = :INV_NAME
             , T.BEG_BALANCE     = :BEG_BALANCE
             , T.INCREASE_AMT    = :INCREASE_AMT
             , T.DECREASE_AMT    = :DECREASE_AMT
             , T.GAIN_ON_SALES   = :GAIN_ON_SALES
             , T.RECLASS_AMT     = :RECLASS_AMT
             , T.TRANS_ADJ       = :TRANS_ADJ
             , T.CONSOL_MOVEMENT = :CONSOL_MOVEMENT
             , T.EQUITY_INCOME   = :EQUITY_INCOME
             , T.DIVIDEND_AMT    = :DIVIDEND_AMT
             , T.OCI_AMT         = :OCI_AMT
             , T.WRITEOFF_AMT    = :WRITEOFF_AMT
             , T.END_BALANCE     = :END_BALANCE
             , T.BEG_BALANCE_TOT = :BEG_BALANCE_TOT
             , T.FIX_YN          = NVL(:FIX_YN, 'N')
             , T.FIX_DATE        = CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN NVL(T.FIX_DATE, SYSDATE) END
             , T.UPDATE_DATE     = SYSDATE
             , T.UPDATE_IDNO     = :USER_ID
WHEN NOT MATCHED THEN
    INSERT ( SITE_CODE, KJ_YYYYMM, SEQ
           , INV_CODE, INV_NAME
           , BEG_BALANCE, INCREASE_AMT, DECREASE_AMT, GAIN_ON_SALES
           , RECLASS_AMT, TRANS_ADJ, CONSOL_MOVEMENT, EQUITY_INCOME
           , DIVIDEND_AMT, OCI_AMT, WRITEOFF_AMT, END_BALANCE, BEG_BALANCE_TOT
           , FIX_YN, FIX_DATE, ENTRY_DATE, ENTRY_IDNO )
    VALUES ( S.SITE_CODE, S.KJ_YYYYMM, S.SEQ
           , :INV_CODE, :INV_NAME
           , :BEG_BALANCE, :INCREASE_AMT, :DECREASE_AMT, :GAIN_ON_SALES
           , :RECLASS_AMT, :TRANS_ADJ, :CONSOL_MOVEMENT, :EQUITY_INCOME
           , :DIVIDEND_AMT, :OCI_AMT, :WRITEOFF_AMT, :END_BALANCE, :BEG_BALANCE_TOT
           , NVL(:FIX_YN, 'N')
           , CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN SYSDATE END
           , SYSDATE, :USER_ID );


/* ---------------------------------------------------------------
 * 5. AC_BON_REPORT_SUB2_05
 * --------------------------------------------------------------- */
MERGE INTO ORIX.AC_BON_REPORT_SUB2_05 T
USING (
    SELECT :SITE_CODE     AS SITE_CODE
         , :KJ_YYYYMM     AS KJ_YYYYMM
         , :SEQ           AS SEQ
      FROM DUAL
) S
   ON (    T.SITE_CODE = S.SITE_CODE
       AND T.KJ_YYYYMM = S.KJ_YYYYMM
       AND T.SEQ       = S.SEQ )
WHEN MATCHED THEN
    UPDATE SET T.INFO_CHANGED    = :INFO_CHANGED
             , T.COMPANY_NAME    = :COMPANY_NAME
             , T.COMPANY_CODE    = :COMPANY_CODE
             , T.IS_AFFILIATE    = :IS_AFFILIATE
             , T.TOTAL_SHARES    = :TOTAL_SHARES
             , T.SHARES_HELD     = :SHARES_HELD
             , T.EQUITY_RATIO    = :EQUITY_RATIO
             , T.VOTING_RIGHTS   = :VOTING_RIGHTS
             , T.COUNTRY_NAME    = :COUNTRY_NAME
             , T.LISTED_YN       = :LISTED_YN
             , T.STOCK_EXCHANGE  = :STOCK_EXCHANGE
             , T.LISTED_FV       = :LISTED_FV
             , T.ACQ_DATE        = :ACQ_DATE
             , T.A_BEG_BALANCE   = :A_BEG_BALANCE
             , T.A_INCREASE_AMT  = :A_INCREASE_AMT
             , T.A_SALES_AMT     = :A_SALES_AMT
             , T.A_GAIN_ON_SALES = :A_GAIN_ON_SALES
             , T.A_RECLASS_AMT   = :A_RECLASS_AMT
             , T.A_TRANS_ADJ     = :A_TRANS_ADJ
             , T.A_CONSOL_MVMT   = :A_CONSOL_MVMT
             , T.A_END_BALANCE   = :A_END_BALANCE
             , T.B_BEG_BALANCE   = :B_BEG_BALANCE
             , T.B_EQUITY_INCOME = :B_EQUITY_INCOME
             , T.B_DIVIDEND_AMT  = :B_DIVIDEND_AMT
             , T.B_RECLASS_AMT   = :B_RECLASS_AMT
             , T.B_TRANS_ADJ     = :B_TRANS_ADJ
             , T.B_OCI_AMT       = :B_OCI_AMT
             , T.B_CONSOL_MVMT   = :B_CONSOL_MVMT
             , T.B_END_BALANCE   = :B_END_BALANCE
             , T.WRITEOFF_AMT    = :WRITEOFF_AMT
             , T.TOTAL_END_BAL   = :TOTAL_END_BAL
             , T.GOODWILL_AMT    = :GOODWILL_AMT
             , T.RECLASS_INS_AMT = :RECLASS_INS_AMT
             , T.REASON_ZERO     = :REASON_ZERO
             , T.COMPANY_EXISTS  = :COMPANY_EXISTS
             , T.FIX_YN          = NVL(:FIX_YN, 'N')
             , T.FIX_DATE        = CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN NVL(T.FIX_DATE, SYSDATE) END
             , T.UPDATE_DATE     = SYSDATE
             , T.UPDATE_IDNO     = :USER_ID
WHEN NOT MATCHED THEN
    INSERT ( SITE_CODE, KJ_YYYYMM, SEQ
           , INFO_CHANGED, COMPANY_NAME, COMPANY_CODE, IS_AFFILIATE
           , TOTAL_SHARES, SHARES_HELD, EQUITY_RATIO, VOTING_RIGHTS
           , COUNTRY_NAME, LISTED_YN, STOCK_EXCHANGE, LISTED_FV, ACQ_DATE
           , A_BEG_BALANCE, A_INCREASE_AMT, A_SALES_AMT, A_GAIN_ON_SALES
           , A_RECLASS_AMT, A_TRANS_ADJ, A_CONSOL_MVMT, A_END_BALANCE
           , B_BEG_BALANCE, B_EQUITY_INCOME, B_DIVIDEND_AMT, B_RECLASS_AMT
           , B_TRANS_ADJ, B_OCI_AMT, B_CONSOL_MVMT, B_END_BALANCE
           , WRITEOFF_AMT, TOTAL_END_BAL, GOODWILL_AMT, RECLASS_INS_AMT
           , REASON_ZERO, COMPANY_EXISTS
           , FIX_YN, FIX_DATE, ENTRY_DATE, ENTRY_IDNO )
    VALUES ( S.SITE_CODE, S.KJ_YYYYMM, S.SEQ
           , :INFO_CHANGED, :COMPANY_NAME, :COMPANY_CODE, :IS_AFFILIATE
           , :TOTAL_SHARES, :SHARES_HELD, :EQUITY_RATIO, :VOTING_RIGHTS
           , :COUNTRY_NAME, :LISTED_YN, :STOCK_EXCHANGE, :LISTED_FV, :ACQ_DATE
           , :A_BEG_BALANCE, :A_INCREASE_AMT, :A_SALES_AMT, :A_GAIN_ON_SALES
           , :A_RECLASS_AMT, :A_TRANS_ADJ, :A_CONSOL_MVMT, :A_END_BALANCE
           , :B_BEG_BALANCE, :B_EQUITY_INCOME, :B_DIVIDEND_AMT, :B_RECLASS_AMT
           , :B_TRANS_ADJ, :B_OCI_AMT, :B_CONSOL_MVMT, :B_END_BALANCE
           , :WRITEOFF_AMT, :TOTAL_END_BAL, :GOODWILL_AMT, :RECLASS_INS_AMT
           , :REASON_ZERO, :COMPANY_EXISTS
           , NVL(:FIX_YN, 'N')
           , CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN SYSDATE END
           , SYSDATE, :USER_ID );


/* ---------------------------------------------------------------
 * 6. AC_BON_REPORT_SUB2_06
 * --------------------------------------------------------------- */
MERGE INTO ORIX.AC_BON_REPORT_SUB2_06 T
USING (
    SELECT :SITE_CODE     AS SITE_CODE
         , :KJ_YYYYMM     AS KJ_YYYYMM
         , :SEQ           AS SEQ
      FROM DUAL
) S
   ON (    T.SITE_CODE = S.SITE_CODE
       AND T.KJ_YYYYMM = S.KJ_YYYYMM
       AND T.SEQ       = S.SEQ )
WHEN MATCHED THEN
    UPDATE SET T.ROW_TYPE        = :ROW_TYPE
             , T.COMPANY_NAME    = :COMPANY_NAME
             , T.COMPANY_CODE    = :COMPANY_CODE
             , T.REVENUES        = :REVENUES
             , T.OPER_INCOME     = :OPER_INCOME
             , T.INC_BEFORE_TAX  = :INC_BEFORE_TAX
             , T.NET_INCOME      = :NET_INCOME
             , T.TOTAL_ASSETS    = :TOTAL_ASSETS
             , T.TOTAL_LIAB      = :TOTAL_LIAB
             , T.REDEEMABLE_NCI  = :REDEEMABLE_NCI
             , T.STOCKHOLDERS_EQ = :STOCKHOLDERS_EQ
             , T.NON_CTRL_INT    = :NON_CTRL_INT
             , T.FIX_YN          = NVL(:FIX_YN, 'N')
             , T.FIX_DATE        = CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN NVL(T.FIX_DATE, SYSDATE) END
             , T.UPDATE_DATE     = SYSDATE
             , T.UPDATE_IDNO     = :USER_ID
WHEN NOT MATCHED THEN
    INSERT ( SITE_CODE, KJ_YYYYMM, SEQ
           , ROW_TYPE, COMPANY_NAME, COMPANY_CODE
           , REVENUES, OPER_INCOME, INC_BEFORE_TAX, NET_INCOME
           , TOTAL_ASSETS, TOTAL_LIAB, REDEEMABLE_NCI, STOCKHOLDERS_EQ, NON_CTRL_INT
           , FIX_YN, FIX_DATE, ENTRY_DATE, ENTRY_IDNO )
    VALUES ( S.SITE_CODE, S.KJ_YYYYMM, S.SEQ
           , :ROW_TYPE, :COMPANY_NAME, :COMPANY_CODE
           , :REVENUES, :OPER_INCOME, :INC_BEFORE_TAX, :NET_INCOME
           , :TOTAL_ASSETS, :TOTAL_LIAB, :REDEEMABLE_NCI, :STOCKHOLDERS_EQ, :NON_CTRL_INT
           , NVL(:FIX_YN, 'N')
           , CASE WHEN NVL(:FIX_YN, 'N') = 'Y' THEN SYSDATE END
           , SYSDATE, :USER_ID );

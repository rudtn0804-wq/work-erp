--------------------------------------------------------------------------------
-- AC_BON_REPORT_B02_ADJ : 2026년 3월(202603) 기준 조정값 UPDATE
--------------------------------------------------------------------------------
-- 테이블 : ORIX.AC_BON_REPORT_B02_ADJ
-- PK     : SITE_CODE, K1_YYYYMM, ADJ_CODE, SEQ
-- 금액   : B02_A01~B02_A05
--          (일반: A01=1Q, A02=2Q, A03=3Q, A04=4Q, A05=당기합계/당기금액)
--          (AD30002 잔액손상: A01=기초금액, A02=기준잔액, A03=당기증감)
-- ADJ_CODE: AD30001 신규실행금액 / AD30002 잔액손상 / AD30003 개발소비세매각
--           AD30004 운용행탈수수료매각 / AD30005 품별차이대체
--           AD30006 감가상각(Automobile) / AD30007 감가상각(ICT) / AD30008 처분손익
--
-- ※ SITE_CODE 는 화면상 'AA10001' 로 읽었으나 운영값으로 반드시 확인할 것.
-- ※ SEQ 는 화면 표시 순서(001,002,...) 기준으로 매핑함. 실제 SEQ 와 대조 후 실행.
-- ※ 실행 전 대상 확인:
--      SELECT * FROM AC_BON_REPORT_B02_ADJ WHERE K1_YYYYMM='202603' ORDER BY ADJ_CODE, SEQ;
--------------------------------------------------------------------------------

DEFINE site = 'AA10001'      -- TODO: 운영 SITE_CODE 확인
DEFINE ym   = '202603'

--==============================================================================
-- [AD30001] 당기 신규실행 금액   (A01=1Q, A02=2Q, A03=3Q, A04=4Q, A05=당기합계)
--==============================================================================

-- 001  운용 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 65000000000, B02_A02 = 70000000000, B02_A03 = 72500000000,
   B02_A04 = 73893629243, B02_A05 = 281393629243, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30001' AND SEQ='001';

-- 002  렌탈 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 65000000000, B02_A02 = 70000000000, B02_A03 = 72500000000,
   B02_A04 = 75000000000, B02_A05 = 282500000000, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30001' AND SEQ='002';

-- 003  ICT / Measuring and Information-Related Equipment
--      (분기 합 101,414,084,000 vs 당기합계 101,414,284,000 : 약 20만 차이 -> 분기값 재확인 요)
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 24572847000, B02_A02 = 27954349000, B02_A03 = 26751588000,
   B02_A04 = 22135300000, B02_A05 = 101414284000, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30001' AND SEQ='003';

-- 004  개발소비세 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 1000000000, B02_A02 = 1100000000, B02_A03 = 1200000000,
   B02_A04 = 1492544433, B02_A05 = 4792544433, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30001' AND SEQ='004';

-- 005  IDC(렌탈) / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 1500000000, B02_A02 = 2000000000, B02_A03 = 2000000000,
   B02_A04 = 2657040710, B02_A05 = 8157040710, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30001' AND SEQ='005';

-- 006  IDC(ICT) / Measuring and Information-Related Equipment
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 2500000000, B02_A02 = 3000000000, B02_A03 = 3400000000,
   B02_A04 = 3671421004, B02_A05 = 12571421004, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30001' AND SEQ='006';


--==============================================================================
-- [AD30002] 잔액손상 조정   (A01=기초금액, A02=기준잔액, A03=당기증감)
--==============================================================================

-- 001  운용 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 1066079506, B02_A02 = 1633980942, B02_A03 = -567901436,
   UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30002' AND SEQ='001';

-- 002  렌탈 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 544978851, B02_A02 = 1041107181, B02_A03 = -496128630,
   UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30002' AND SEQ='002';

-- 003  ICT / Measuring and Information-Related Equipment
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 420237092, B02_A02 = 488891426, B02_A03 = -68654334,
   UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30002' AND SEQ='003';


--==============================================================================
-- [AD30003] 당기 개발소비세 매각금액   (A01~A04=1Q~4Q, A05=당기합계)
--==============================================================================

-- 001  취득원가 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 860666320, B02_A02 = 1141218871, B02_A03 = 1082784242,
   B02_A04 = 987106706, B02_A05 = 4071776139, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30003' AND SEQ='001';

-- 002  전기상각누계액 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 813113893, B02_A02 = 988037865, B02_A03 = 863760456,
   B02_A04 = 732829300, B02_A05 = 3397741514, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30003' AND SEQ='002';

-- 003  장부가액 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 47552427, B02_A02 = 153181006, B02_A03 = 219023786,
   B02_A04 = 254277400, B02_A05 = 674034619, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30003' AND SEQ='003';


--==============================================================================
-- [AD30004] 당기 운용행탈수수료 매각금액   (4Q 및 당기합계에만 값)
--==============================================================================

-- 001  취득원가 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 0, B02_A02 = 0, B02_A03 = 0,
   B02_A04 = 18160851023, B02_A05 = 18160851023, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30004' AND SEQ='001';

-- 002  전기상각누계액 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 0, B02_A02 = 0, B02_A03 = 0,
   B02_A04 = 18160851023, B02_A05 = 18160851023, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30004' AND SEQ='002';

-- 003  장부가액 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 0, B02_A02 = 0, B02_A03 = 0, B02_A04 = 0, B02_A05 = 0,
   UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30004' AND SEQ='003';

-- 004  취득원가 / Measuring and Information-Related Equipment
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 0, B02_A02 = 0, B02_A03 = 0, B02_A04 = 0, B02_A05 = 0,
   UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30004' AND SEQ='004';

-- 005  전기상각누계액 / Measuring and Information-Related Equipment
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 0, B02_A02 = 0, B02_A03 = 0, B02_A04 = 0, B02_A05 = 0,
   UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30004' AND SEQ='005';

-- 006  장부가액 / Measuring and Information-Related Equipment
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 0, B02_A02 = 0, B02_A03 = 0, B02_A04 = 0, B02_A05 = 0,
   UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30004' AND SEQ='006';


--==============================================================================
-- [AD30005] 당기 운용행자산-품별차이 대체   (A01=1Q, A02=2Q, A05=당기합계)
--==============================================================================

-- 001  취득원가 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 20204545, B02_A02 = 85267605, B02_A03 = 0, B02_A04 = 0,
   B02_A05 = 105472150, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30005' AND SEQ='001';

-- 002  전기상각누계액 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 7576700, B02_A02 = 52158471, B02_A03 = 0, B02_A04 = 0,
   B02_A05 = 59735171, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30005' AND SEQ='002';

-- 003  장부가액 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A01 = 12627845, B02_A02 = 33109134, B02_A03 = 0, B02_A04 = 0,
   B02_A05 = 45736979, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30005' AND SEQ='003';


--==============================================================================
-- [AD30008] 처분손익 U-GAAP잔액   (A04=4Q, A05=당기금액)
--==============================================================================

-- 001  운용리스처분이익 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 9212088648, B02_A05 = 9212088648, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='001';

-- 002  렌탈자산처분이익 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 8901499935, B02_A05 = 8901499935, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='002';

-- 003  렌탈자산처분이익(엔택) / Measuring and Information-Related Equipment
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 1317854656, B02_A05 = 1317854656, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='003';

-- 004  운용리스처분손실 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 3074952074, B02_A05 = 3074952074, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='004';

-- 005  렌탈자산처분손실 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 1310798723, B02_A05 = 1310798723, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='005';

-- 006  렌탈자산처분손실(엔택) / Measuring and Information-Related Equipment
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 1263589851, B02_A05 = 1263589851, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='006';

-- 007  운용리스감액손실(환입) / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 0, B02_A05 = 0, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='007';

-- 008  운용리스감액손실(정상) / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 2639546, B02_A05 = 2639546, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='008';

-- 009  렌탈자산감액손실(정상) / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 208841327, B02_A05 = 208841327, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='009';

-- 010  PKG수정분개_차량 / Automobile
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 0, B02_A05 = 0, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='010';

-- 011  PKG수정분개_ICT / Measuring and Information-Related Equipment
UPDATE AC_BON_REPORT_B02_ADJ SET
   B02_A04 = 0, B02_A05 = 0, UPDATE_DATE = SYSDATE
 WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30008' AND SEQ='011';


--==============================================================================
-- [AD30006] 감가상각누계액 조정 (Automobile)
-- [AD30007] 감가상각누계액 조정 (Measuring/ICT)
--   ※ 해당 사진(80f87e68) 해상도가 낮아 11자리 금액 정밀 판독 불가.
--     아래는 상위 2개 행 추정치이며, 반드시 원본/선명한 캡처로 검증 후 사용할 것.
--     나머지 행(매각분 감가비, DC감가비 등)은 판독 보류.
--==============================================================================

-- AD30006 001  운용리스(U-GAAP) / Automobile  [추정-검증요]
-- UPDATE AC_BON_REPORT_B02_ADJ SET
--    B02_A01 = 28851469176, B02_A02 = 77287287475, B02_A03 = 115228472124,
--    B02_A04 = 152808542752, B02_A05 = 152808542752, UPDATE_DATE = SYSDATE
--  WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30006' AND SEQ='001';

-- AD30006 002  운용리스(감가상각비) / Automobile  [추정-검증요]
-- UPDATE AC_BON_REPORT_B02_ADJ SET
--    B02_A01 = 23189149016, B02_A02 = 46564526465, B02_A03 = 70401144754,
--    B02_A04 = 95373713149, B02_A05 = 95373713149, UPDATE_DATE = SYSDATE
--  WHERE SITE_CODE='&site' AND K1_YYYYMM='&ym' AND ADJ_CODE='AD30006' AND SEQ='002';

-- COMMIT;   -- 전체 검증 후 수동 커밋

# TPS Dashboard — Project Brief

ระบบ TPS (Total Performance Score) ของสำนักปลัดกระทรวงสาธารณสุข
ครอบคลุม 903 โรงพยาบาล 23 ไตรมาส (2563Q4–2569Q2)

---

## Stack

- **Next.js 15** + React 19 + TypeScript
- **Tailwind CSS** v3 (utility-first)
- **Recharts** 2.15 (กราฟ/chart ทั้งหมด)
- Font: **Sarabun** (ไทย+อังกฤษ ทุกหน้า)
- Deploy: Static export (`next build`) บน **Vercel**

---

## ⚠️⚠️ สำคัญมาก — มี 2 โฟลเดอร์ ต้องแก้ทั้งคู่

| โฟลเดอร์ | ใช้ทำอะไร |
|---|---|
| `D:\Dashboard AI\TPS-Next.js` | โฟลเดอร์ dev (รัน `npm run dev` ทดสอบ) |
| `D:\Github\Rh1-TPS-V.3.1` | โฟลเดอร์ git (push ขึ้น Vercel) |

**ทุกครั้งที่แก้โค้ด ต้องแก้ให้เหมือนกันทั้ง 2 โฟลเดอร์** ไม่งั้น dev กับ production จะไม่ตรงกัน

### Deployment (Vercel)
- **Live URL**: https://rh1-tps-v-3-1.vercel.app
- **GitHub repo**: `PitakNan/Rh1-TPS-V.3.1` (branch `main`)
- **Workflow อัปเดต**: แก้โค้ดใน `D:\Github\Rh1-TPS-V.3.1` → GitHub Desktop → Commit → Push → Vercel build อัตโนมัติ
- **next.config.ts**: `output: 'export'` + `trailingSlash: true` + `images.unoptimized: true`

### ⚠️ Static export ห้ามมี API routes
- `output: 'export'` ไม่รองรับ `/api/*` route handlers → build fail
- **ลบโฟลเดอร์ `src/app/api/` ออกแล้ว** (เคยมี dashboard/indicators/test) — ข้อมูลโหลดจาก `/public/data/` โดยตรงผ่าน fetchData อยู่แล้ว ไม่ต้องใช้ API
- ถ้าจะเพิ่มฟีเจอร์ใหม่ อย่าสร้าง API route — ให้ใช้ client-side fetch แทน

### .gitignore ใน git repo
```
node_modules/
.next/
out/
*.log
```

---

## โครงสร้างโปรเจกต์

```
src/
  app/
    page.tsx          ← หน้าหลัก Overview ✅
    layout.tsx        ← Layout ครอบทุกหน้า
    globals.css       ← Global styles
    trend/page.tsx    ← Trend & Compare ✅
    hospital/         ← รายโรงพยาบาล ❌ ยังไม่ทำ
    compare/page.tsx  ← โค้ดเก่า (ยังไม่ rebuild)
    grades/page.tsx   ← โค้ดเก่า
    matrix/page.tsx   ← โค้ดเก่า
    ranking/page.tsx  ← โค้ดเก่า
  lib/
    types.ts          ← TypeScript interfaces ทั้งหมด
    fetchData.ts      ← ดึง + normalize ข้อมูลจาก /public/data/
    exportData.ts     ← export ข้อมูล

public/data/          ← JSON ข้อมูลจริง (อย่าแก้ไขโดยตรง)
  hospitals.json         903 รพ. — hospital_code เป็น int (normalize เป็น string ใน fetchData)
  periods.json           23 ไตรมาส
  tps_scores.json        คะแนน TPS + grade + group (20,714 records) — ค่าตัวเลขเก็บเป็น string
  indicators.json        ตัวชี้วัดย่อย 20 ตัว (14 MB) — ค่าตัวเลขเก็บเป็น string
  financial_ratios.json  อัตราส่วนการเงิน (11 MB)
  financial_performance.json  รายได้/ค่าใช้จ่าย vs แผน (6 MB)
  quality_metrics.json   Unit Cost + ต้นทุน (5 MB)
  risk_profile.json      Risk profile + bo_rate + sa_value (ครองเตียง/adjRW จริง)

tps_export/           ← ต้นฉบับ CSV+JSON (source of truth)
```

---

## Design System

### สี (อย่าเปลี่ยนโดยพลการ)
```
Header/Footer: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)
Background:    #f1f5f9 (bg-slate-50)
Card:          #ffffff + shadow-sm + border-slate-100
Primary:       #3b82f6 (blue-500)
Gold accent:   #f59e0b → #d97706
Section bar:   w-1 h-5 rounded-full gradient gold (ด้านซ้ายหัวข้อ)
```

### Grade Colors (ใช้สม่ำเสมอทุกหน้า)
```
A = text-green-700  bg-green-100  border-green-300
B = text-blue-700   bg-blue-100   border-blue-300
C = text-yellow-700 bg-yellow-100 border-yellow-300
D = text-orange-700 bg-orange-100 border-orange-300
F = text-red-700    bg-red-100    border-red-300
```

### Highlight Pass Rate (ใช้ทั้ง หน้า Overview และ Trend)
```
≥ 60%      → bg-green-50  + text-green-700
50–59.99%  → bg-yellow-50 + text-yellow-700
< 50%      → ไม่มี bg    + text-red-600
```

### Typography
- หัวข้อหลัก: `text-xl font-bold text-white` (ใน header)
- section: `text-base font-semibold text-slate-800`
- body: `text-sm text-slate-600`
- Font Sarabun โหลดใน layout.tsx ผ่าน Google Fonts

---

## Data Model (สำคัญ)

### ⚠️ JSON Type Issues — แก้ไขแล้วใน fetchData.ts
```
hospitals.json       hospital_code = int  (แต่ทุกไฟล์อื่นเป็น string → normalize ใน getHospitals)
tps_scores.json      ค่าตัวเลขทุก field เก็บเป็น string เช่น "5.5" → toNum() ใน getTpsScores
indicators.json      เช่นเดียวกัน → toNum() ใน getIndicators
```
**ใช้ฟังก์ชัน `toNum(v)` ใน fetchData.ts เสมอเมื่อ normalize ค่าตัวเลขจาก JSON**

### Key relationships
```
hospitals.hospital_code  ←→  tps_scores.hospital_code  (ทั้งสองเป็น string หลัง normalize)
hospitals.hospital_code  ←→  indicators.hospital_code
periods.period_id        ←→  tps_scores.period_id       format: "2563Q4"
tps_scores.group         ← period-specific (เปลี่ยนได้ตามเวลา)
```

### TPS Score structure
```
tps_score = score_process + score_outcome
score_process = score_1_1 + score_1_2 + score_1_3
score_1_3     = score_1_3_1 + score_1_3_2 + score_1_3_3
score_outcome = score_2_1 + score_2_2
```

### ประเภท รพ.
- **A** = โรงพยาบาลศูนย์ (รพศ.)
- **S** = โรงพยาบาลทั่วไปขนาดใหญ่ (รพท.)
- **M1, M2** = โรงพยาบาลทั่วไป (รพท.)
- **F1, F2, F3** = โรงพยาบาลชุมชน (รพช.)

### Zone = เขตสุขภาพ 1–12

### ลักษณะค่าในตัวชี้วัดย่อย (indicators.json)
```
0 หรือ 1   : ind_revenue, ind_expense*, ind_app_d, ind_aip, ind_qm_op, ind_qm_ip,
               ind_trial_bal, ind_bed_occ*, ind_sum_adjrw*, ind_opm, ind_roa,
               ind_ebitda*, ind_nwc*, ind_cash
0 หรือ 0.5 : ind_lc, ind_drug, ind_sci_mat, ind_non_drug, ind_acp_uc, ind_acp_cs
* = ช่วง 2563Q4–2564Q2 เก็บค่าจริง ไม่ใช่ 0/1
```

### แหล่งค่าจริงของตัวชี้วัด (ใช้ใน Trend page)
```
ค่าจริง (วัน)   : ind_app_d_val, ind_acp_uc_val, ind_acp_cs_val, ind_aip_val  ← indicators.json
ค่าจริง (%)     : rev_pct, exp_pct  ← financial_performance.json
                   ratio_opm, ratio_roa  ← financial_ratios.json
ค่าจริง (บาท)   : qm_op_cost, qm_ip_cost, hgr_lc, hgr_drug, hgr_sci, hgr_nondrug  ← quality_metrics.json
                   ratio_ebitda, ratio_nwc  ← financial_ratios.json
ค่าจริง ratio   : ratio_cash, ratio_cr, ratio_qr  ← financial_ratios.json
ค่าจริง อื่นๆ  : bo_rate (% ครองเตียง), sa_value (adjRW)  ← risk_profile.json
คะแนนเท่านั้น  : ind_trial_bal, ind_bed_occ (→ ใช้ bo_rate แทน), ind_sum_adjrw (→ ใช้ sa_value แทน)
```

---

## แผน Dashboard (3 หน้าหลัก)

### Page 1 — ภาพรวม (Overview) → `/` ✅ เสร็จแล้ว

- **ค่าเริ่มต้น**: ไตรมาส 2/2569 (2569Q2), เขตสุขภาพ 1, ทุกประเภท, ทุกจังหวัด
- **Filter bar (sticky)**: ไตรมาส + เขตสุขภาพ + ประเภท รพ. + จังหวัด
  - จังหวัด dropdown อัปเดตตามเขต/ประเภท, reset อัตโนมัติเมื่อเขต/ประเภทเปลี่ยน
  - filter bar ติด sticky ที่ `top: 72px` (ใต้ header)
- **Summary cards**: จำนวน รพ. / %A+B / TPS เฉลี่ย / จำนวน A
- **Grade distribution** (ชื่อหัวข้อ: "เกรด"): bar A/B/C/D/F + A+B highlight
- **Drill-down Modal**: คลิกเกรด / ตัวชี้วัด / จังหวัด → popup รายชื่อ รพ. แบ่งจังหวัด
  - คลิกชื่อ รพ. ในป๊อปอัป → เปิด `/trend?code=XXXXX` ใน tab ใหม่ (auto-select รพ.)
  - ปิดด้วย X, click นอก modal, หรือ Escape
- **อัตราผ่านตัวชี้วัดย่อย**: 20 ตัวชี้วัด เรียงตามลำดับตาราง TPS (ไม่เรียงตาม pass rate)
  - highlight สีเขียว ≥60%, สีเหลือง 50–59.99%
- **Province table**: 76 จังหวัด + highlight สีเดียวกัน

#### ลำดับ 20 ตัวชี้วัดใน Overview (IND_CONFIG)
```
1  ind_revenue    มิติรายได้              (indicator, 0/1)
2  ind_expense    มิติค่าใช้จ่าย          (indicator, 0/1, binaryOnly=true กัน 3 ไตรมาสแรก)
3  ind_app_d      AP Days                (indicator, 0/1)
4  ind_acp_uc     ACP UC                 (indicator, 0/0.5)
5  ind_acp_cs     ACP CS                 (indicator, 0/0.5)
6  ind_aip        Inventory              (indicator, 0/1)
7  ind_qm_op      Unit Cost OP           (indicator, 0/1)
8  ind_qm_ip      Unit Cost IP           (indicator, 0/1)
9  ind_lc         LC ค่าแรง              (indicator, 0/0.5)
10 ind_drug       MC ยา                  (indicator, 0/0.5)
11 ind_sci_mat    MC วัสดุวิทย์           (indicator, 0/0.5)
12 ind_non_drug   MC เวชภัณฑ์             (indicator, 0/0.5)
13 ind_trial_bal  งบทดลอง               (indicator, 0/1)
14 ind_bed_occ    ครองเตียง              (indicator, 0/1)
15 ind_sum_adjrw  SumAdjRW              (indicator, 0/1)
16 ind_opm        OPM                   (indicator, 0/1)
17 ind_roa        ROA                   (indicator, 0/1)
18 ind_ebitda     EBITDA                (indicator, 0/1)
19 ind_nwc        NWC                   (indicator, 0/1)
20 ind_cash       Cash Ratio            (indicator, 0/1)
```

---

### Page 2 — Trend & Compare → `/trend` ✅ เสร็จแล้ว

- **Hospital selector**: ค้นหา + multi-select สูงสุด 6 แห่ง, chip สีต่างกันต่อ รพ.
- **3 Mode**: TPS คะแนนรวม / ตัวชี้วัดย่อย / อัตราส่วนการเงิน
- **Metric chips**: แสดงตัวชี้วัดทั้งหมดของ mode คลิก multi-select ได้
  - ปุ่ม `↺` Reset ที่ขวาของ tab ที่ active
- **Dual Y-axis อัตโนมัติตามหน่วย**:
  - แกนซ้าย: คะแนน / วัน / % / ratio
  - แกนขวา: บาท และ SumAdjRW (sa_value)
- **X-axis**: แสดงทุกไตรมาส `interval={0}` เอียง -45°
- **โหลด on-demand**: indicator mode โหลด 5 ไฟล์พร้อมกัน (indicators + ratios + quality + finperf + risk_profile)
- **URL parameter**: รับ `?code=XXXXX` → auto-select รพ. นั้น (ใช้ `useSearchParams` + `Suspense` wrapper)

#### MetricDef pattern (สำคัญ — ใช้ใน Trend)
```ts
interface MetricDef {
  key: string       // id สำหรับ selection
  label: string
  field: string     // field จริงในไฟล์ข้อมูล (อาจต่างจาก key)
  source: 'tps' | 'indicator' | 'ratio' | 'quality' | 'finperf' | 'risk'
  unit: 'score' | 'days' | 'pct' | 'ratio' | 'baht'
}
// unit === 'baht' → แกนขวา, อื่นๆ → แกนซ้าย
```

#### การโหลดข้อมูล Trend page
```
รอบ 1 (เสมอ):    hospitals + periods + tps_scores
mode=indicator:   indicators + financial_ratios + quality_metrics + financial_performance + risk_profile
mode=ratio:       financial_ratios
(cache ด้วย loadedSources ref ไม่โหลดซ้ำ)
```

---

### Page 3 — Scorecard รายโรงพยาบาล → `/hospital` ✅ เสร็จแล้ว (nav label = "รายโรงพยาบาล")

- **Filter bar (sticky)**: ไตรมาส + เขตสุขภาพ + จังหวัด (province reset เมื่อเขตเปลี่ยน)
- **ตาราง Matrix**: แถว = โรงพยาบาล, คอลัมน์ = 20 ตัวชี้วัด
  - คอลัมน์ชื่อ รพ. sticky ด้านซ้าย
  - เรียง: จังหวัด (th locale) → ชื่อ รพ.
  - **เส้นกั้นจังหวัด**: แถวสีน้ำเงินแสดงชื่อจังหวัด + จำนวน รพ.
  - Cell: ✓ เขียว = ผ่าน (v > 0 รวม 0.5), ✗ แดง = ไม่ผ่าน, สีเทา = ไม่มีข้อมูล
  - **คะแนน 0.5 นับเป็นผ่าน** (ใช้กับ LC, MC ยา, วัสดุ, เวชภัณฑ์, ACP UC, ACP CS)
- **แถวอัตราผ่าน** (ใต้ header): แสดง `pass/total` บน และ `%` ล่าง, ไฮไลต์สีตามเกณฑ์
- **คอลัมน์สุดท้าย**: นับผ่าน/ทั้งหมดต่อ รพ.
- **โหลด**: hospitals + periods รอบแรก, indicators (14MB) โหลดแยกพร้อม spinner
- **binaryOnly** สำหรับ ind_expense — ตัด 3 ไตรมาสแรกที่เก็บค่าบาทจริง
- **Performance fix**: บังคับเลือกเขต หรือ จังหวัด ก่อนแสดงตาราง (ป้องกัน render 18,060 cell พร้อมกัน)
- **React key fix**: ใช้ `<Fragment key={province}>` แทน `<>` ใน grouped.map()
- **Sticky header 2 แถว** ✅ เสร็จแล้ว
  - scroll container = `<div overflow-auto max-h-[calc(100vh-150px)]>` (ตาราง scroll ภายในกรอบตัวเอง)
  - แถว 1 (ชื่อตัวชี้วัด): `sticky top-0` / แถว 2 (อัตราผ่าน): `sticky top-12` (ใต้แถว 1, แถว 1 สูง `h-12`)
  - z-index: corner cell (left+top) = z-30, header cell (top อย่างเดียว) = z-20, body-left cell = z-10
  - sticky cell ทุกตัวต้องมี `background` ของตัวเอง (ไม่ใช้ bg ของ `<tr>`) ไม่งั้นโปร่งทะลุ

---

## หน้าเก่า (ของเดิม จะ rebuild ทีหลัง)

| หน้า | Route | หมายเหตุ |
|---|---|---|
| เปรียบเทียบ | `/compare` | โค้ดเก่า ยังไม่ rebuild |
| Grade | `/grades` | โค้ดเก่า |
| Matrix | `/matrix` | โค้ดเก่า |
| จัดอันดับ | `/ranking` | โค้ดเก่า |

---

## ⚠️ จุดที่เคยพังมาแล้ว (อย่าทำซ้ำ)

1. **hospital_code type ไม่ตรงกัน** — hospitals.json เก็บ int, ไฟล์อื่นเป็น string
   ทำให้ `Set.has()` ไม่เจอ → filter ทำให้ข้อมูลหายทั้งหมด
   **แก้แล้วใน getHospitals(): `hospital_code: String(h.hospital_code)`**

2. **JSON ค่าตัวเลขเก็บเป็น string** — tps_scores, indicators ทุก field เป็น `"5.5"` ไม่ใช่ `5.5`
   ทำให้ reduce/sum ผิด (string concatenation แทน addition)
   **แก้แล้วด้วย `toNum()` ใน fetchData.ts ทุก getter**

3. **fetchData.ts ต้องเป็น client-only** — ห้ามใช้ `require('fs')` หรือ Node API
   **ทุกหน้าเป็น `'use client'` → ใช้ `fetch('/data/x.json')` อย่างเดียว**

4. **JSON ไฟล์ใหญ่ ห้ามโหลดพร้อมกันทั้งหมดในรอบเดียว**
   **แยกโหลด: รอบ 1 hospitals+periods+tps_scores, รอบ 2 ขึ้นไปค่อยโหลด**

5. **ต้อง sync ข้อมูลหลัง clean** — แก้ไขที่ `/tps_export/` แล้วต้อง copy ไป `/public/data/`
   เคยเจอ zone เป็น string "1.0" ทำให้ filter พัง

6. **ind_expense สามไตรมาสแรก (2563Q4–2564Q2) เป็นค่าบาทจริง ไม่ใช่ 0/1**
   ใช้ `binaryOnly: true` filter ใน Overview เพื่อตัดออก

---

## กฎสำคัญ (ห้ามทำ)

1. **อย่าแก้ไขไฟล์ใน `/public/data/` โดยตรง** — ต้นฉบับอยู่ที่ `/tps_export/`
2. **อย่าเปลี่ยน font** จาก Sarabun โดยไม่ถาม
3. **อย่าเพิ่ม dependency ใหม่** โดยไม่จำเป็น (ใช้ Recharts ที่มีอยู่แล้วก่อน)
4. **อย่าเปลี่ยน grade color scheme** — ใช้สีตาม Design System ด้านบนเสมอ
5. ทุกหน้า **ต้อง responsive** (mobile-first ด้วย Tailwind breakpoints)
6. **filter zone ใช้ `parseInt()`** เทียบเสมอ (กัน edge case string/number)
7. **ทุก numeric field จาก JSON ต้อง normalize ด้วย `toNum()`** ใน fetchData.ts getter

---

## วิธีรัน

```bash
cd "D:/Dashboard AI/TPS-Next.js"
npm run dev      # development (port 3000 หรือ 3002 ถ้า port ถูกใช้)
npm run build    # build static
```

---

## Null Data Policy

- 2563Q4 และ 2564Q1: ตัวชี้วัดย่อยหลายตัวยังไม่เก็บ (structural gap)
- รพ.10795 ไตรมาส 2565Q2: ขาดข้อมูลทุกตาราง
- ควร handle null อย่างสวยงาม (แสดง "–" หรือ "ไม่มีข้อมูล" แทน error)
- `connectNulls={false}` ใน Recharts Line เพื่อไม่ลากเส้นข้ามช่วงที่ขาด

-- =====================================================
-- tbl_EvaluatorNominations: สร้างตารางเสนอแต่งตั้งผู้นิเทศ
-- =====================================================
CREATE TABLE IF NOT EXISTS "tbl_EvaluatorNominations" (
    id SERIAL PRIMARY KEY,
    nominee_people_id VARCHAR(13) NOT NULL,
    nominated_by VARCHAR(13) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disable Row Level Security (RLS)
ALTER TABLE "tbl_EvaluatorNominations" DISABLE ROW LEVEL SECURITY;

-- Add comments for clarity
COMMENT ON TABLE "tbl_EvaluatorNominations" IS 'ตารางบันทึกการเสนอแต่งตั้งผู้นิเทศ/คณะกรรมการประเมิน';
COMMENT ON COLUMN "tbl_EvaluatorNominations".nominee_people_id IS 'เลขบัตรประชาชนผู้ถูกเสนอแต่งตั้ง';
COMMENT ON COLUMN "tbl_EvaluatorNominations".nominated_by IS 'เลขบัตรประชาชนผู้อำนวยการที่เสนอแต่งตั้ง';
COMMENT ON COLUMN "tbl_EvaluatorNominations".status IS 'สถานะการอนุมัติ (pending, approved, rejected)';

-- =====================================================
-- tbl_sendplan: เพิ่มคอลัมน์วันที่ประเมินของกรรมการ
-- และคอลัมน์ข้อเสนอแนะของกรรมการแต่ละคน
-- =====================================================
ALTER TABLE tbl_sendplan
    ADD COLUMN IF NOT EXISTS date_scoring1 DATE,
    ADD COLUMN IF NOT EXISTS date_scoring2 DATE,
    ADD COLUMN IF NOT EXISTS date_scoring3 DATE,
    ADD COLUMN IF NOT EXISTS date_scoring4 DATE,
    ADD COLUMN IF NOT EXISTS date_scoring5 DATE,
    ADD COLUMN IF NOT EXISTS committee1_comment TEXT,
    ADD COLUMN IF NOT EXISTS committee2_comment TEXT,
    ADD COLUMN IF NOT EXISTS committee3_comment TEXT,
    ADD COLUMN IF NOT EXISTS committee4_comment TEXT,
    ADD COLUMN IF NOT EXISTS committee5_comment TEXT;

COMMENT ON COLUMN tbl_sendplan.date_scoring1 IS 'วันที่กรรมการคนที่ 1 ประเมิน';
COMMENT ON COLUMN tbl_sendplan.date_scoring2 IS 'วันที่กรรมการคนที่ 2 ประเมิน';
COMMENT ON COLUMN tbl_sendplan.date_scoring3 IS 'วันที่กรรมการคนที่ 3 ประเมิน';
COMMENT ON COLUMN tbl_sendplan.date_scoring4 IS 'วันที่กรรมการคนที่ 4 ประเมิน';
COMMENT ON COLUMN tbl_sendplan.date_scoring5 IS 'วันที่กรรมการคนที่ 5 ประเมิน';
COMMENT ON COLUMN tbl_sendplan.committee1_comment IS 'ข้อเสนอแนะของกรรมการคนที่ 1';
COMMENT ON COLUMN tbl_sendplan.committee2_comment IS 'ข้อเสนอแนะของกรรมการคนที่ 2';
COMMENT ON COLUMN tbl_sendplan.committee3_comment IS 'ข้อเสนอแนะของกรรมการคนที่ 3';
COMMENT ON COLUMN tbl_sendplan.committee4_comment IS 'ข้อเสนอแนะของกรรมการคนที่ 4';
COMMENT ON COLUMN tbl_sendplan.committee5_comment IS 'ข้อเสนอแนะของกรรมการคนที่ 5';

-- =====================================================
-- RLS FIX & Column updates: ปิด RLS และปรับโครงสร้างตาราง
-- =====================================================
ALTER TABLE tbl_education_year DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_budget_year DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_sendplan DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_sendplan_score DISABLE ROW LEVEL SECURITY;

-- เพิ่มคอลัมน์ signature สำหรับเก็บ URL รูปภาพลายเซ็นต์
ALTER TABLE "tbl_Users" ADD COLUMN IF NOT EXISTS "signature" TEXT;
COMMENT ON COLUMN "tbl_Users".signature IS 'URL หรือที่อยู่ไฟล์รูปภาพลายเซ็นต์';

ALTER TABLE "tbl_Users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_school DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_khet DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_strands DISABLE ROW LEVEL SECURITY;
ALTER TABLE "tbl_learningModel" DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_content_standards DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_indicators DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_config DISABLE ROW LEVEL SECURITY;

-- แจ้ง reload schema cache
NOTIFY pgrst, 'reload schema';

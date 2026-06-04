-- Create table
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


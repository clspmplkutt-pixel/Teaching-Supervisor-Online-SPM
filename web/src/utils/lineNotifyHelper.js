/**
 * LINE Notification & Direct Share Utilities
 * รองรับการสร้างข้อความแจ้งเตือนที่จัดรูปแบบสวยงาม และเปิดแอป LINE ใน 1 คลิก
 */
import Swal from 'sweetalert2';

export const generateTeacherToDirectorMessage = ({
  teacherName,
  schoolName,
  subjectName,
  subjectCode,
  planName,
  planId,
}) => {
  const currentHost = window.location.origin;
  const reviewUrl = `${currentHost}/Plan_Check`;

  return (
    `📌 [ระบบนิเทศออนไลน์ สพม.พิษณุโลก อุตรดิตถ์]\n` +
    `เรียน ท่านผู้อำนวยการโรงเรียน\n\n` +
    `มีครูผู้สอนส่งแผนการจัดการเรียนรู้ใหม่เข้าระบบ:\n` +
    `👤 ครูผู้สอน: ${teacherName || 'ครูผู้สอน'}\n` +
    (schoolName ? `🏫 สถานศึกษา: ${schoolName}\n` : '') +
    `📖 วิชา: ${subjectName || '-'} (${subjectCode || '-'})\n` +
    (planName ? `📝 แผนการสอน: ${planName}\n` : '') +
    (planId ? `🔢 รหัสแผน: #${planId}\n` : '') +
    `\nโปรดตรวจสอบและอนุมัติการใช้แผนได้ที่ลิงก์ด้านล่าง:\n` +
    `🔗 ${reviewUrl}`
  );
};

export const generateDirectorToCommitteeMessage = ({
  directorName,
  schoolName,
  teacherName,
  subjectName,
  subjectCode,
  planName,
  committees = [],
  planId,
}) => {
  const currentHost = window.location.origin;
  const evalUrl = `${currentHost}/Plan_Check`;

  const committeeList = committees
    .filter(Boolean)
    .map((c, idx) => `  ${idx + 1}. ${c}`)
    .join('\n');

  return (
    `🎯 [ระบบนิเทศออนไลน์ สพม.พิษณุโลก อุตรดิตถ์]\n` +
    `เรียน คณะกรรมการนิเทศการศึกษาทุกท่าน\n\n` +
    `ท่านได้รับมอบหมายให้ประเมินแผนการจัดการเรียนรู้:\n` +
    (schoolName ? `🏫 สถานศึกษา: ${schoolName}\n` : '') +
    `👤 ครูผู้สอน: ${teacherName || 'ครูผู้สอน'}\n` +
    `📖 วิชา: ${subjectName || '-'} (${subjectCode || '-'})\n` +
    (planName ? `📝 แผนการสอน: ${planName}\n` : '') +
    (planId ? `🔢 รหัสแผน: #${planId}\n` : '') +
    (committeeList ? `\n👥 คณะกรรมการนิเทศ:\n${committeeList}\n` : '') +
    `\nขอเรียนเชิญเข้าสู่ระบบเพื่อประเมินและให้ข้อเสนอแนะ:\n` +
    `🔗 ${evalUrl}`
  );
};

export const generateEvaluationResultMessage = ({
  teacherName,
  schoolName,
  subjectName,
  subjectCode,
  planName,
  totalScore,
  qualityLabel,
  isPassed,
  planId,
}) => {
  const currentHost = window.location.origin;
  const viewUrl = `${currentHost}/view_scoring?planid=${planId}`;

  return (
    `🎉 [ผลการประเมินแผนการจัดการเรียนรู้]\n` +
    `ระบบนิเทศการศึกษาออนไลน์ สพม.พิษณุโลก อุตรดิตถ์\n\n` +
    `👤 ครูผู้สอน: ${teacherName || 'ครูผู้สอน'}\n` +
    (schoolName ? `🏫 สถานศึกษา: ${schoolName}\n` : '') +
    `📖 วิชา: ${subjectName || '-'} (${subjectCode || '-'})\n` +
    (planName ? `📝 แผนการสอน: ${planName}\n` : '') +
    (totalScore !== undefined ? `📊 คะแนนเฉลี่ยรวม: ${Number(totalScore).toFixed(2)} คะแนน\n` : '') +
    (qualityLabel ? `🏅 ระดับคุณภาพ: ${qualityLabel}\n` : '') +
    (isPassed !== undefined ? `✅ ผลการพิจารณา: ${isPassed ? 'ผ่านเกณฑ์การประเมิน' : 'ไม่ผ่านเกณฑ์การประเมิน'}\n` : '') +
    `\nสามารถเข้าดูรายงานผลการประเมินและเกียรติบัตรฉบับเต็มได้ที่:\n` +
    `🔗 ${viewUrl}`
  );
};

export const generateSchoolFollowUpMessage = ({
  schoolName,
  currentHost = typeof window !== 'undefined' ? window.location.origin : '',
}) => {
  return (
    `📢 [ติดตามการส่งแผนการจัดการเรียนรู้ - สพม.พิษณุโลก อุตรดิตถ์]\n` +
    `เรียน ท่านผู้อำนวยการและคุณครู${schoolName ? ` โรงเรียน${schoolName}` : ''}\n\n` +
    `ระบบนิเทศการศึกษาออนไลน์ สพม.พิษณุโลก อุตรดิตถ์ ขอความอนุเคราะห์ประชาสัมพันธ์และติดตามการจัดส่งแผนการจัดการเรียนรู้ของสถานศึกษาในระบบ\n\n` +
    `เพื่อขับเคลื่อนการประเมินวิทยฐานะ ว.PA และการยกระดับคุณภาพการเรียนรู้ ขอเรียนเชิญเข้าสู่ระบบเพื่อจัดส่งแผนฯ ได้ที่:\n` +
    `🔗 ${currentHost}/sendplan\n\n` +
    `ขอขอบพระคุณสำหรับความร่วมมือในการพัฒนาคุณภาพการศึกษาเป็นอย่างสูง`
  );
};

export const generateCommitteeReminderMessage = ({
  committeeName,
  pendingCount = 1,
  currentHost = typeof window !== 'undefined' ? window.location.origin : '',
}) => {
  return (
    `⏰ [แจ้งเตือนภาระงานประเมินแผนการจัดการเรียนรู้]\n` +
    `เรียน กรรมการนิเทศ ${committeeName || 'ท่านกรรมการ'}\n\n` +
    `ระบบนิเทศการศึกษาออนไลน์ สพม.พิษณุโลก อุตรดิตถ์ ขอเรียนแจ้งเตือนว่า ท่านมีแผนการจัดการเรียนรู้ที่รอการประเมินและให้ข้อเสนอแนะ จำนวน ${pendingCount} แผน\n\n` +
    `ขอความอนุเคราะห์เข้าสู่ระบบเพื่อดำเนินการประเมินตามเกณฑ์ Rubrics ได้ที่:\n` +
    `🔗 ${currentHost}/Plan_Check\n\n` +
    `ขอขอบพระคุณในความอนุเคราะห์ร่วมขับเคลื่อนการนิเทศการศึกษาเป็นอย่างสูง`
  );
};

export const openLineShare = (messageText) => {
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(messageText)}`;
  window.open(lineUrl, '_blank', 'noopener,noreferrer');
};

export const copyToClipboard = async (text) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch {
    return false;
  }
};

/**
 * แสดง Popup เชิญชวนส่งการแจ้งเตือนทาง LINE
 */
export const showLineShareDialog = ({
  title = 'ส่งข้อความแจ้งเตือนผ่าน LINE',
  subtitle = 'แจ้งเตือนผู้เกี่ยวข้องทันที เพื่อความรวดเร็วในการดำเนินงาน',
  messageText = '',
  onClose = () => {},
}) => {
  return Swal.fire({
    title: `<div style="font-size: 20px; font-weight: bold; color: #06C755;">
      <i class="fa-brands fa-line mr-2" style="font-size: 26px;"></i> ${title}
    </div>`,
    html: `
      <p style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">${subtitle}</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 13px; text-align: left; max-height: 200px; overflow-y: auto; white-space: pre-wrap; font-family: sans-serif; line-height: 1.5; color: #1e293b;">${messageText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <div style="margin-top: 15px; display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
        <button id="swal-line-share-btn" class="btn btn-success font-weight-bold px-3 py-2" style="background-color: #06C755; border-color: #06C755; border-radius: 6px;">
          <i class="fa-brands fa-line mr-1"></i> เปิดแอป LINE และส่งข้อความ
        </button>
        <button id="swal-copy-btn" class="btn btn-outline-secondary font-weight-bold px-3 py-2" style="border-radius: 6px;">
          <i class="fa-regular fa-copy mr-1"></i> คัดลอกข้อความ
        </button>
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: 'เสร็จสิ้น / ปิดหน้าต่าง',
    confirmButtonColor: '#4f46e5',
    didOpen: () => {
      const lineBtn = document.getElementById('swal-line-share-btn');
      const copyBtn = document.getElementById('swal-copy-btn');

      if (lineBtn) {
        lineBtn.onclick = () => {
          openLineShare(messageText);
        };
      }

      if (copyBtn) {
        copyBtn.onclick = async () => {
          const success = await copyToClipboard(messageText);
          if (success) {
            copyBtn.innerHTML = '<i class="fa-solid fa-check mr-1 text-success"></i> คัดลอกเรียบร้อยแล้ว!';
            setTimeout(() => {
              if (copyBtn) {
                copyBtn.innerHTML = '<i class="fa-regular fa-copy mr-1"></i> คัดลอกข้อความ';
              }
            }, 2500);
          }
        };
      }
    },
  }).then(() => {
    if (typeof onClose === 'function') onClose();
  });
};

<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "จัดการระดับชั้น";
$tbl = "tbl_system_GradeLevel";
$id = $_GET['id'];
$grade_level_status= $_GET['grade_level_status'];

$result = $database->update($tbl, ["grade_level_status" => $grade_level_status], ["id" => $id]);
if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=grade_level';
</script>
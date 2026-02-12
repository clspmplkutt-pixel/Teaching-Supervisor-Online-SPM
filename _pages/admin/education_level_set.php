<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "จัดการระดับการศึกษา";
$tbl = "tbl_system_EducationLevel";
$id = $_GET['id'];
$educationlevel_status= $_GET['educationlevel_status'];

$result = $database->update($tbl, ["educationlevel_status" => $educationlevel_status], ["id" => $id]);
if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=education_level';
</script>
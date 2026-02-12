<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "แก้ไขข้อมูลประเภทวิชา";
$tbl = "tbl_system_SubjectType";
$id = $_GET['id'];
$subjecttype_status= $_GET['subjecttype_status'];

$result = $database->update($tbl, ["subjecttype_status" => $subjecttype_status], ["id" => $id]);
if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=subject_type';
</script>
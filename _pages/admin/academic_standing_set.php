<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "แก้ไขข้อมูลกลุ่มสาระการเรียนรู้";
$tbl = "tbl_system_Academic_Standing";
$id = $_GET['id'];
$academic_status= $_GET['academic_status'];

$result = $database->update($tbl, ["academic_status" => $academic_status], ["id" => $id]);
if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=academic_standing';
</script>
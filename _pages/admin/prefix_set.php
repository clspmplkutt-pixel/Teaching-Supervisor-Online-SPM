<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "แก้ไขข้อมูลคำนำหน้า";
$tbl = "tbl_system_prefix";
$id = $_GET['id'];
$prefix_status = $_GET['prefix_status'];

$result = $database->update($tbl, ["prefix_status" => $prefix_status], ["id" => $id]);
if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=prefix';
</script>
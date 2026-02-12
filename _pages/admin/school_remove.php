<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "ลบข้อมูลโรงเรียน";
$tbl = "tbl_school";
$school_id = $_GET['school_id'];
$output = array();
$result = $database->delete($tbl, ["school_id" => $school_id]);

if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=school';
</script>
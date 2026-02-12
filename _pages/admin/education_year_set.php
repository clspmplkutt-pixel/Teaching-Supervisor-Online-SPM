<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "ลบข้อมูลสหวิทยาเขต";
$tbl = "tbl_education_year";
$id = $_GET['id'];
$database->update($tbl, ["active" => "0"], ["active" => "1"]);

$result = $database->update($tbl, ["active" => "1"], ["id" => $id]);
if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=education_year';
</script>
<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "ลบข้อมูลสหวิทยาเขต";
$tbl = "tbl_budget_year";
$year = $_GET['year'];
$database->update($tbl, ["active" => "0"], ["active" => "1"]);

$result = $database->update($tbl, ["active" => "1"], ["year" => $year]);
if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=budget_year';
</script>
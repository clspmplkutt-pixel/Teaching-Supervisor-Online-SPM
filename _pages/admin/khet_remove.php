<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "ลบข้อมูลสหวิทยาเขต";
$tbl = "tbl_khet";
$khet_code = $_GET['khet_code'];

$result = $database->delete($tbl, ["khet_code" => $khet_code]);
if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=khet';
</script>
<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "แก้ไขประเภทบุคลากร";
$tbl = "tbl_system_PersonType";
$id = $_GET['id'];
$persontype_status= $_GET['persontype_status'];

$result = $database->update($tbl, ["persontype_status" => $persontype_status], ["id" => $id]);
if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=person_type';
</script>
<?php
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");

$title_page = "ลบข้อมูลสหวิทยาเขต";
$tbl = "tbl_user";
$user = $_GET['user'];

$result = $database->delete($tbl, ["user" => $user]);
if ($result->rowCount() == 0) {
    alert_t('เกิดข้อผิดพลาดในการลบ');
} else {
    alert_t('ลบข้อมูลแล้ว');
}
?>
<script>
    window.location.href = '?module=ManageUserAdmin';
</script>
<?php
include_once("include/config.php");
include_once("include/connect_db.php");

$database->update("tbl_config", [
    "config_value" => "ระบบนิเทศการจัดการเรียนรู้ (LMSS)"
], [
    "config_name" => "APP_NAME"
]);

echo "Updated APP_NAME to LMSS successfully.";
?>

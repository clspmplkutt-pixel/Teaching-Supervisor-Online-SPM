<?php
include_once("include/config.php");
include_once("include/connect_db.php");

if (!isset($_REQUEST["people_id"])) {
    exit();
} else {
    $data = $database->has("tbl_Users",["people_id" => $_REQUEST["people_id"]]);

    // $data=json_encode($data);
    // 
    if ($data) {
        echo "1";
    } else {
        echo "0";
    }
}

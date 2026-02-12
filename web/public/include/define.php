<?php
$result_cfg = $database->select("tbl_config", "*");
foreach ($result_cfg as $r) {
    define($r["config_name"], $r["config_value"]);
}

$arrayProvince = array();
$result = $database->select("tbl_province", "*");
foreach ($result as $rows) {
    $arrayProvince += [$rows['province_id'] => $rows['province_name']];
}

$arrayPrefix = array();
$result = $database->select("tbl_system_prefix", "*",["prefix_status"=>"1"]);
foreach ($result as $rows) {
    $arrayPrefix += [$rows['prefix_id'] => $rows['prefix']];
}
$arrayKhet = array();
$result = $database->select("tbl_khet", "*");
foreach ($result as $rows) {
    $arrayKhet += [$rows['khet_code'] => $rows['khet_name']];
}
$arraySchoolSize = array();
$result = $database->select("tbl_schoolsize", "*");
foreach ($result as $rows) {
    $arraySchoolSize += [$rows['schoolsize_id'] => [$rows['schoolsize_name'], $rows['schoolsize_details']]];
}
$arrayTeach_Subject = array();
$result = $database->select("tbl_system_Teach_Subject", "*");
foreach ($result as $rows) {
    $arrayTeach_Subject += [$rows['teach_subject_id'] => $rows['teach_subject']];
}

$arrayPerson_type = array();
$result = $database->select("tbl_system_PersonType", "*");
foreach ($result as $rows) {
    $arrayPerson_type += [$rows['persontype_id'] => $rows['persontype_name']];
}


$arrayPerson_position = array();
$result = $database->select("tbl_system_PersonPositionType", "*");
foreach ($result as $rows) {
    $arrayPerson_position += [$rows['position_id'] => $rows['position_name']];
}

$arrayAcademic_Standing= array();
$result = $database->select("tbl_system_Academic_Standing", "*");
foreach ($result as $rows) {
    $arrayAcademic_Standing += [$rows['academic_id'] => $rows['academic_standing']];
}

$arrayGradeLevel= array();
$result = $database->select("tbl_system_GradeLevel", "*",["grade_level_status"=>"1"]);
foreach ($result as $rows) {
    $arrayGradeLevel += [$rows['grade_level_id'] => $rows['grade_level_name']];
}

$result = $database->get("tbl_education_year", "*", [
    "active" => "1"
]);
// print_r($result);
define("EDUYEAR", $result["year"]);
define("EDUROUND", $result["section"]);

$result = $database->get("tbl_budget_year", "*", [
    "active" => "1"
]);

define("BUDGET_YEAR", $result["year"]);

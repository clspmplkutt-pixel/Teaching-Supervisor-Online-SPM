<?php
date_default_timezone_set("Asia/Bangkok");
error_reporting(error_reporting() & ~E_NOTICE);
define("DEBUG", true);

$check_session_name = "SyS4ScHoOl_PNS2";
$check_session_value = "7628925990417152595166322344680449631412413065823880303674072961895493996441573501930324644364253226829711453084969938964674118605223270570138271963196118870007328887841472681131082590882264423933798234853883253990678627200388020135419968848221881501047960";
global $secret_key, $secret_iv;
$secret_key = 'PNS2AREA';
$secret_iv = 'SyS4School';

define("db_type", "mysql");

define("db_server", "localhost");
define("tbl_prefix", "");
$localhost = array(
    '127.0.0.1',
    '::1',
    'localhost',
);
$server_name_pbn = array('psn2.sys4school.com');
$server_name_oessplku = array('oessplkutt.com', 'www.oessplkutt.com');

if (in_array($_SERVER['SERVER_NAME'], $localhost)) {
    define("db_user", "root");
    define("db_password", "");
} elseif (in_array($_SERVER['SERVER_NAME'], $server_name_pbn)) {
    define("db_database", "phetcha7_pns2");
    define("db_user", "phetcha7_pns2");
    define("db_password", "QEiXsH9V8");
} elseif (in_array($_SERVER['SERVER_NAME'], $server_name_oessplku)) {
    define("db_database", "oessplku_pns2");
    define("db_user", "oessplku_pns2");
    define("db_password", "cHowsGM2H4");
}else{
    echo "<h1 style='color:red;'>ไม่สามารถเชื่อมฐานข้อมูลได้</h1>";
}

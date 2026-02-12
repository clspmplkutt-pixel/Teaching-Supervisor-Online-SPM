<?php
date_default_timezone_set("Asia/Bangkok");
error_reporting(error_reporting() & ~E_NOTICE);
define("DEBUG", true);

$check_session_name = "SyS4ScHoOl_PNS2";
$check_session_value = "YOUR_SESSION_VALUE_HERE";
global $secret_key, $secret_iv;
$secret_key = 'YOUR_SECRET_KEY';
$secret_iv = 'YOUR_SECRET_IV';

define("db_type", "mysql");

define("db_server", "localhost");
define("tbl_prefix", "");
$localhost = array(
    '127.0.0.1',
    '::1',
    'localhost',
);
$server_name_pbn = array('your-domain.com');
$server_name_oessplku = array('your-other-domain.com');

if (in_array($_SERVER['SERVER_NAME'], $localhost)) {
    define("db_user", "root");
    define("db_password", "");
} elseif (in_array($_SERVER['SERVER_NAME'], $server_name_pbn)) {
    define("db_database", "your_db_name");
    define("db_user", "your_db_user");
    define("db_password", "your_db_password");
} elseif (in_array($_SERVER['SERVER_NAME'], $server_name_oessplku)) {
    define("db_database", "your_db_name");
    define("db_user", "your_db_user");
    define("db_password", "your_db_password");
}else{
    echo "<h1 style='color:red;'>ไม่สามารถเชื่อมฐานข้อมูลได้</h1>";
}

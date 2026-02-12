<?php
include_once("plugins/Medoo/Medoo-master/src/Medoo.php"); 

use Medoo\Medoo;

$database = new Medoo([
    'database_type' => db_type,
    'database_name' => db_database,
    'server' => db_server,
    'username' => db_user,
    'password' => db_password,
    'prefix' => tbl_prefix,
    // [optional]
    'charset' => 'utf8',
    'collation' => 'utf8_general_ci',
    'port' => 3306,
]);

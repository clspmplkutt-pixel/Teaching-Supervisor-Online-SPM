<?php

$module = (isset($_REQUEST['module'])) ? $_REQUEST['module'] : 'info';
$file_load = $module . ".php";

if(isset($_SESSION['level_id'])) {
   
$path_include = "_pages/" . $_SESSION['level_id'];
$sidebar_include = "_pages/" . $_SESSION['level_id'] . "/sidebar_" . $_SESSION['level_id'] . ".php";
$include_file = $path_include . "/" . $file_load; 
}


if (!file_exists($include_file)) {
    $file_load = "info.php";
}




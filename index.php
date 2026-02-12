<?php
session_start();

include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/function.php");
include_once("include/route.php");
include_once("include/define.php");
// if (!DEBUG) {
//     ini_set('display_errors', 1);
//     ini_set('display_startup_errors', 1);
//     error_reporting(E_ALL);
// }

$Appname = APP_NAME;
$AreaName = AREA_NAME;
$AppVersion = APP_VERSION;

$_SESSION[$check_session_name] = $check_session_value;


$mem_id = (isset($_SESSION['user'])) ? $_SESSION['user'] : '0';

if ($mem_id == '0') {
    echo "<meta http-equiv='refresh' content='0;url=logout.php'>";
    echo "<meta http-equiv='refresh' content='0;url=login.php'>";
    exit();
}
if (!isset($_COOKIE['user'])) {
    echo "<meta http-equiv='refresh' content='0;url=logout.php'>";
    echo "<meta http-equiv='refresh' content='0;url=login.php'>";
    exit();
}
?>
<!DOCTYPE html>
<html lang="th">

<head>
    <?php include "include/include-header.php"; ?>
</head>

<body class="hold-transition sidebar-mini layout-fixed layout-footer-fixed pace-minimal">
    <div class="wrapper">

        <?php
        if (!DEBUG) {
            include "include/preload.php";
        }
        ?>
        <?php include "include/nav_bar.php"; ?>

        <!-- Main Sidebar Container -->
        <aside class="main-sidebar sidebar-dark-primary elevation-4 main-sidebar-custom">
            <!-- Brand Logo -->
            <a href="./" class="brand-link">
                <img src="/images/obec.png" alt="" class="brand-image img-circle elevation-3" style="opacity: .8">
                <span class="brand-text font-weight-light">PNS2</span>
            </a>
            <?php include($sidebar_include); ?>
        </aside>

        <!-- Content Wrapper. Contains page content -->
        <div class="content-wrapper">
            <?php include_once "include/content-header.php"; ?>

            <!-- Main content -->
            <section class="content">
                <div class="container-fluid">
                    <!-- เนื้อหา -->
                    <?php include($include_file); ?>
                </div>
            </section>
            <!-- /.content -->
        </div>
        <!-- /.content-wrapper -->
        <?php include "include/footer.php"; ?>

    </div>
    <!-- ./wrapper -->
    <?php include "include/include-footer.php"; ?>
</body>

</html>
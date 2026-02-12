<?php
$tbl_plan = "tbl_sendplan";
$countSendPlan = $database->count($tbl_plan, ["school_code" => $_SESSION['school_code'], "plan_status" => 1]);
$countSendPlanPass = $database->count($tbl_plan, ["AND" =>["school_code" => $_SESSION['school_code'], "plan_status" => ['2', '3']]]);
$countSendPlanClip = $database->count($tbl_plan, ["school_code" => $_SESSION['school_code'], "plan_status" => 5]);
?>
<!-- Sidebar -->
<div class="sidebar">
    <!-- SidebarSearch Form -->
    <div class="form-inline">
        <div class="input-group" data-widget="sidebar-search">
            <input class="form-control form-control-sidebar" type="search" placeholder="Search" aria-label="Search">
            <div class="input-group-append">
                <button class="btn btn-sidebar">
                    <i class="fas fa-search fa-fw"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Sidebar Menu -->
    <nav class="mt-2">
        <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
            <!-- Add icons to the links using the .nav-icon class
       with font-awesome or any other icon font library -->
            <li class="nav-item">
                <a href="./" class="nav-link">
                    <i class="nav-icon fas fa-home text-blue"></i>
                    <p>
                        หน้าหลัก
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=statusplan" class="nav-link">
                    <i class="nav-icon fa-regular fa-clock text-info"></i>
                    <p>
                        ตรวจแผน/แต่งตั้งกรรมการ
                        <?php
                        if ($countSendPlan > 0) {
                            echo "<span class='badge badge-danger'>" . $countSendPlan . "</span>";
                        }
                        ?>
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=statusplan_pass" class="nav-link">
                    <i class="nav-icon fa-regular fa-clock text-info"></i>
                    <p>
                        แผนการสอนตรวจแล้ว
                        <?php
                        if ($countSendPlanPass > 0) {
                            echo "<span class='badge badge-success'>" . $countSendPlanPass . "</span>";
                        }
                        ?>
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=statusplan_clip" class="nav-link">
                    <i class="nav-icon fa-regular fa-clock text-info"></i>
                    <p>
                        คลิปการสอน
                        <?php
                        if ($countSendPlanClip > 0) {
                            echo "<span class='badge badge-success'>" . $countSendPlanClip . "</span>";
                        }
                        ?>
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=editprofile" class="nav-link">
                    <i class="nav-icon fa-solid fa-address-card text-warning"></i>
                    <p>
                        ข้อมูลส่วนตัว
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=chgpasswd" class="nav-link">
                    <i class="nav-icon fa-solid fa-key text-danger"></i>
                    <p>
                        เปลี่ยนรหัสผ่าน
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="./logout.php" class="nav-link">
                    <i class="nav-icon fa-solid fa-arrow-right-from-bracket text-danger"></i>
                    <!-- <i class="fa-solid fa-arrow-right-from-bracket"></i> -->
                    <p>
                        ออกจากระบบ
                    </p>
                </a>
            </li>
        </ul>
    </nav>
    <!-- /.sidebar-menu -->
</div>
<!-- /.sidebar -->
<div class="sidebar-custom">
    <a href="#" class="btn btn-link"><i class="fas fa-cogs"></i> ตั้งค่าระบบ</a><br>
</div>
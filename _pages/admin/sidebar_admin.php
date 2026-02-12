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
            <li class="nav-item">
                <a href="./" class="nav-link">
                    <i class="nav-icon fas fa-home text-blue"></i>
                    <p>
                        หน้าหลัก
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=khet" class="nav-link">
                    <i class="nav-icon fa-solid fa-school-circle-check text-danger"></i>
                    <p>
                        จัดการสหวิทยาเขต
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=school" class="nav-link">
                    <i class="nav-icon fa-solid fa-school text-success"></i>
                    <p>
                        จัดการโรงเรียน
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=budget_year" class="nav-link">
                    <i class="nav-icon fa-solid fa-baht-sign text-warning"></i>
                    <p>
                        จัดการปีงบประมาณ
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=education_year" class="nav-link">
                    <i class="nav-icon fa-solid fa-school-flag text-blue"></i>
                    <p>
                        จัดการปีการศึกษา
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=confirmUser" class="nav-link">
                    <i class="nav-icon fa-solid fa-person-circle-check text-danger"></i>
                    <p>
                        ผู้ใช้งานรอการอนุมัติ
                        <?php
                        $data = $database->count("tbl_Users", ["register_isConfirm" => "0"]);
                        if ($data == 0) {
                            $badge = "badge-info";
                        } else {
                            $badge = "badge-danger";
                        }
                        ?>
                        <span class="badge <?php echo $badge; ?> right"><?php echo $data; ?></span>
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=checkupUser" class="nav-link">
                    <i class="nav-icon fa-solid fa-triangle-exclamation text-danger"></i>
                    <p>
                        ข้อมูลผู้ใช้ผิดพลาด
                        <?php
                        $data1 = $database->count("tbl_Users", ["people_id" => ""]);
                        $year_limit = date("Y") - 18;
                        $sql = "SELECT count(*) as NumErr FROM tbl_Users WHERE YEAR(birthday)>$year_limit";
                        $data2 = $database->query($sql)->fetchAll();
                        $data = $data1 + $data2[0]["NumErr"];
                        if ($data == 0) {
                            $badge = "badge-info";
                        } else {
                            $badge = "badge-danger";
                        }
                        ?>
                        <span class="badge <?php echo $badge; ?> right"><?php echo $data; ?></span>
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=checkupUserduplicate" class="nav-link">
                    <i class="nav-icon fa-solid fa-triangle-exclamation text-danger"></i>
                    <p>
                        เลขประจำตัวประชาชนซ้ำ
                        <?php
                        $sql = "SELECT people_id,COUNT(*) as count FROM tbl_Users WHERE people_id!='' GROUP BY people_id Having COUNT(*) > 1";
                        $row_user = $database->query($sql)->fetchAll();
                        $data = count($row_user);
                        if ($data == 0) {
                            $badge = "badge-info";
                        } else {
                            $badge = "badge-danger";
                        }
                        ?>
                        <span class="badge <?php echo $badge; ?> right"><?php echo $data; ?></span>
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link">
                    <i class="nav-icon fa-solid fa-users-gear text-success"></i>
                    <p>
                        จัดการผู้ใช้งาน
                        <i class="fas fa-angle-left right"></i>
                    </p>
                </a>
                <ul class="nav nav-treeview">
                    <li class="nav-item">
                        <a href="?module=userDistricDirector" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ผู้อำนวยการเขตพื้นที่</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=usersupervision" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ผู้ประเมิน</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=usersupervisor" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ศึกษานิเทศก์</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=userchairman" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ประธานสหวิทยาเขต</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=userdirectorschool" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ผอ.โรงเรียน/รอง ผอ.</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=userheadDepartment" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>หัวหน้ากลุ่มสาระโรงเรียน</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=userteacher" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ครู</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=change_position" class="nav-link">
                            <i class="fa-solid fa-person-booth nav-icon text-blue"></i>
                            <p>เปลี่ยนตำแหน่ง</p>
                        </a>
                    </li>
                </ul>
            </li>



            <li class="nav-item">
                <a href="#" class="nav-link">
                    <i class="nav-icon fa-solid fa-gear text-maroon"></i>
                    <p>
                        ตั้งค่าพื้นฐาน
                        <i class="fas fa-angle-left right"></i>
                    </p>
                </a>

                <ul class="nav nav-treeview">
                    <li class="nav-item">
                        <a href="#" class="nav-link">
                            <i class="far fa-circle nav-icon text-green"></i>
                            <p>
                                แบบประเมิน
                                <i class="right fas fa-angle-left"></i>
                            </p>
                        </a>
                        <ul class="nav nav-treeview">
                            <li class="nav-item">
                                <a href="?module=policy_side" class="nav-link">
                                    <i class="fa-solid fa-square-check nav-icon text-green"></i>
                                    <p>ด้านการประเมิน</p>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a href="?module=policy_number" class="nav-link">
                                    <i class="fa-solid fa-list nav-icon text-green"></i>
                                    <p>ตัวชี้วัด การประเมิน</p>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a href="?module=policy_items" class="nav-link">
                                    <i class="fa-solid fa-clipboard-check nav-icon text-green"></i>
                                    <p>รายละเอียด การประเมิน</p>
                                </a>
                            </li>
                        </ul>
                    </li>
                    <li class="nav-item">
                        <a href="?module=prefix" class="nav-link">
                            <i class="fa-solid fa-mars-double nav-icon"></i>
                            <p>คำนำหน้า</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=gender" class="nav-link">
                            <i class="fa-solid fa-person nav-icon"></i>
                            <p>เพศ</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=school_size" class="nav-link">
                            <i class="fa-solid fa-school nav-icon"></i>
                            <p>ขนาดโรงเรียน</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=teach_subject" class="nav-link">
                            <i class="fa-solid fa-graduation-cap nav-icon"></i>
                            <p>กลุ่มสาระการเรียนรู้</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=academic_standing" class="nav-link">
                            <i class="fa-solid fa-graduation-cap nav-icon"></i>
                            <p>วิทยฐานะทางวิชาการ</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=subject_type" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ประเภทรายวิชา</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=person_position_type" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ชื่อตำแหน่ง</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=person_type" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ประเภทบุคลากร</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=education_level" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ระดับการศึกษา</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=grade_level" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ระดับชั้น</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=type_benchmarks" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ประเภทตัวชี้วัด</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=strands" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>สาระการเรียนรู้</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=content_standards" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>มาตรฐานการเรียนรู้</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=indicators" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ตัวชี้วัด</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=learningModel" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>รูปแบบการจัดการเรียนรู้</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=competency" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>สมรรถนะผู้เรียน</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=ability21" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>ทักษะในศตวรรษที่ 21</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="?module=desirable" class="nav-link">
                            <i class="far fa-circle nav-icon"></i>
                            <p>คุณลักษณะอันพึงประสงค์</p>
                        </a>
                    </li>
                </ul>
            </li>
            <li class="nav-item">
                <a href="?module=tbl_config" class="nav-link">
                    <i class="nav-icon fa-solid fa-gears text-info"></i>
                    <p>
                        ตั้งค่าระบบ
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=profile" class="nav-link">
                    <i class="nav-icon fa-solid fa-user-gear text-info"></i>
                    <p>
                        ปรับปรุงข้อมูลส่วนตัว
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
                <a href="?module=log" class="nav-link">
                    <i class="nav-icon fa-solid fa-anchor-lock text-warning"></i>
                    <p>
                        ข้อมูลการเข้าระบบ
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="?module=importDMC" class="nav-link">
                    <i class="nav-icon fa-solid fa-file-import text-success"></i>
                    <p>
                        Import From DMC
                    </p>
                </a>
            </li>
            <li class="nav-item">
                <a href="./logout.php" class="nav-link">
                    <i class="nav-icon fa-solid fa-arrow-right-from-bracket text-danger"></i>
                    <p>
                        ออกจากระบบ
                    </p>
                </a>
            </li>
        </ul>
    </nav>
</div>
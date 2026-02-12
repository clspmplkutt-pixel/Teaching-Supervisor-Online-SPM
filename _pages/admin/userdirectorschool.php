<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ผู้เข้าใช้งานระบบ ผู้อำนวยการโรงเรียน/รองผู้อำนวยการโรงเรียน";
$tbl = "tbl_Users";


?>

<div class="row">


    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-info card-outline">
            <div class="card-body">
                <div class="row">
                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4">

                        <a class="btn btn-block btn-info" href="?module=directorschool_add&school=<?php echo $school_id; ?>"><i class="fa-solid fa-user-plus"></i> ลงทะเบียนผู้บริหาร</a>
                    </div>

                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                        <select class="form-control form-select-lg select2bs4" name="school_id" id="school_id" onchange="location.href = this.value;" required>
                            <option value="?module=userdirectorschool&&position_id=<?php echo $position_id; ?>">โรงเรียนทั้งหมด</option>
                            <?php
                            $data = $database->select("tbl_school", "*", ["school_id[!]" => "1000650001","ORDER" => ["school_name" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($school_id == $row['school_id']) {
                                    $select_2 = "selected";
                                } else {
                                    $select_2 = "";
                                }
                                echo "<option value=\"?module=userdirectorschool&school_id=" . $row['school_id'] . "&position_id=$position_id\"$select_2>" . $row['school_name'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>

                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                        <select class="form-control form-select-lg select2bs4" name="position_id" id="position_id" onchange="location.href = this.value;" required>
                            <option value="?module=userdirectorschool&school_id=<?php echo $school_id; ?>">ทุกตำแหน่ง</option>
                            <option value="?module=userdirectorschool&school_id=<?php echo $school_id; ?>&position_id=10007" <?php echo ($position_id == "10007" ? " selected" : ""); ?>>ผู้อำนวยการสถานศึกษา</option>
                            <option value="?module=userdirectorschool&school_id=<?php echo $school_id; ?>&position_id=10006" <?php echo ($position_id == "10006" ? " selected" : ""); ?>>รองผู้อำนวยการสถานศึกษา</option>

                        </select>
                    </div>


                </div>
            </div>
        </div>
    </div>

    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>
            </div>
            <div class="card-body">
                <div class="col-sm-12">
                    <span class="float-sm-right">
                        <a class="btn btn-outline-info" href="?module=userDD_add"><i class="fa-solid fa-plus"></i> เพิ่มผู้ใช้งาน</a>
                    </span>
                </div>
                <div class="table-responsive">
                    <table class="table table-bordered table-striped table-hover" id="data" data-page-length='50'>
                        <thead>
                            <tr>
                                <th>ที่</th>
                                <th>เลขประจำตัวประชาชน</th>
                                <th>ชื่อ - นามสกุล</th>
                                <th>ตำแหน่ง</th>
                                <th>วิทยฐานะ</th>
                                <th>โรงเรียน</th>
                                <th>Operation</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $i = 1;

                            $sql_director = "SELECT * FROM $tbl LEFT JOIN tbl_school ON $tbl.school = tbl_school.school_id  ";
                            if (($school_id != "") || ($position_id != "")) {
                                $sql_director .= " WHERE ";
                                if ($school_id != "" && $position_id == "") {
                                    $sql_director .= " school_id = $school_id AND (position_id ='10006' OR position_id ='10007') ";
                                }
                                if ($school_id == "" && $position_id != "") {
                                    $sql_director .= " position_id = $position_id ";
                                }
                                if ($school_id != "" && $position_id != "") {
                                    $sql_director .= " school_id = $school_id AND position_id = $position_id ";
                                }
                            } else {
                                $sql_director .= " WHERE (position_id ='10006' OR position_id ='10007') ";
                            }

                            $sql_director .= " ORDER BY school ASC,position_id DESC,academic_id ASC";
                            $row_user = $database->query($sql_director)->fetchAll();
                            // echo "<pre>";
                            // print_r($row_user);
                            // echo "</pre>";
                            if (count($row_user) != 0) {
                                foreach ($row_user as $data_user) {
                                    echo "<tr>";
                                    $prefix = $database->get("tbl_system_prefix", "*", ["prefix_id" => $data_user['prefix']]);
                                    echo "<td class=\"text-center\">$i</td>";
                                    echo "<td>" . $data_user['people_id'] . "</td>";
                                    echo "<td>" . $prefix['prefix'] . $data_user['name'] . " " . $data_user['lastname'] . "</td>";
                                    $position = $database->get("tbl_system_PersonPositionType", "*", ["position_id" => $data_user['position_id']]);
                                    echo "<td>" . $position['position_name'] . "</td>";
                                    $academic = $database->get("tbl_system_Academic_Standing", "*", ["academic_id" => $data_user['academic_id']]);
                                    echo "<td>" . $academic['academic_standing'] . "</td>";
                                    echo "<td>" . $data_user['school_name'] . "</td>";
                                    echo "<td><div class=\"btn-group\">";
                                    if ($data_user['people_id'] != "") {
                                        echo "<a href=\"?module=directorschool_edit&people_id=" . $data_user['people_id'] . "\" class=\"btn btn-warning btn-sm\"><i class=\"fa-solid fa-pen-to-square\"></i> แก้ไข</a>";
                                    } else {
                                        echo "<a href=\"?module=directorschool_edit&id=" . $data_user['id'] . "\" class=\"btn btn-warning btn-sm\"><i class=\"fa-solid fa-pen-to-square\"></i> แก้ไข</a>";
                                    }
                                    echo "<a href=\"#\" class=\"btn btn-danger btn-sm\" onclick=\"Remove_User('".$data_user['people_id']."','".$module."')\"><i class=\"fa-solid fa-trash\"></i> ลบ</a>";
                                    echo "<a href=\"?module=resetPwd&id=" . $data_user['id'] . "&from_module=$module\" class=\"btn btn-info btn-sm\"><i class=\"fa-solid fa-key\"></i> Reset</a>";
                                    echo "</div></td>";
                                    echo "</tr>\n";
                                    $i++;
                                }
                            } else {
                                echo "<tr><td colspan=\"6\" class=\"text-center\"><h2 class=\"text-danger\">ยังไม่มีข้อมูล</h2></td></tr>";
                            }
                            ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
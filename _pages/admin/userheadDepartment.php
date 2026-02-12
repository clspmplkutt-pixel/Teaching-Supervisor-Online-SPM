<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ผู้เข้าใช้งานระบบ หัวหน้ากลุ่มสาระการเรียนรู้";
$tbl = "tbl_Users";


?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-info card-outline">
            <div class="card-body">
                <div class="row">
                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4">

                        <a class="btn btn-block btn-info" href="?module=teacher_add&school=<?php echo $school_id; ?>"><i class="fa-solid fa-user-plus"></i> ลงทะเบียนครู</a>
                    </div>

                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                        <select class="form-control form-select-lg select2bs4" name="school_id" id="school_id" onchange="location.href = this.value;" required>
                            <option value="?module=userheadDepartment">โรงเรียน</option>
                            <?php
                            $data = $database->select("tbl_school", "*", ["school_id[!]" => "1000650001", "ORDER" => ["school_name" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($school_id == $row['school_id']) {
                                    $select_2 = "selected";
                                } else {
                                    $select_2 = "";
                                }
                                echo "<option value=\"?module=" . $module . "&school_id=" . $row['school_id'] . "&Teach_Subject=$Teach_Subject\"$select_2>" . $row['school_name'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>

                    <div class="col-sm-12 col-md-4 col-xl-4 col-lg-4">

                        <select class="form-control form-select-lg select2bs4" name="Teach_Subject" id="Teach_Subject" onchange="location.href = this.value;" required>
                            <option value="?module=userheadDepartment">กลุ่มสาระ</option>

                            <?php

                            foreach ($arrayTeach_Subject as $key => $value) {
                                if ($Teach_Subject == $key) {
                                    $select_2 = "selected";
                                } else {
                                    $select_2 = "";
                                }
                                echo "<option value=\"?module=" . $module . "&school_id=" . $school_id . "&Teach_Subject=" . $key . "\"$select_2>" . $value . "</option>";
                            }
                            ?>

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
                <div class="table-responsive">
                    <table class="table table-bordered table-striped table-hover" id="data" data-page-length='100'>
                        <thead>
                            <tr>
                                <th>ที่</th>
                                <th>ชื่อ - นามสกุล</th>
                                <th>โรงเรียน</th>
                                <th>กลุ่มสาระ</th>
                                <th>ตำแหน่ง</th>

                                <th>วิทยฐานะ</th>
                                <th>ประเภทบุคลากร</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php

                            $arrayQuery = array();
                            $arrayQuery = ["level" => "teacher", "register_isConfirm" => "1", "headDepartment" => "1", "status" => "1"];
                            if ($school_id != "") {
                                $arrayQuery += ["school" => $school_id];
                            }
                            if ($Teach_Subject != "") {
                                $arrayQuery += ["teach_subject" => $Teach_Subject];
                            }
                            $arrayQuery += ["ORDER" => ["school" => "ASC", "academic_id" => "ASC", "position_id" => "DESC"]];

                            $row_user = $database->select(
                                $tbl,
                                ["[>]tbl_school" => ["school" => "school_id"]],
                                "*",
                                $arrayQuery
                            );

                            $i = 1;
                            if (count($row_user) != 0) {
                                foreach ($row_user as $data_user) {
                                    echo "<tr>";
                                    $prefix = $database->get("tbl_system_prefix", "*", ["prefix_id" => $data_user['prefix']]);
                                    echo "<td class=\"text-center\">$i</td>";
                                    echo "<td>" . $prefix['prefix'] . $data_user['name'] . " " . $data_user['lastname'] . "</td>";

                                    echo "<td>" . $data_user['school_name'] . "</td>";

                                    $teach_subject = $database->get("tbl_system_Teach_Subject", "*", ["teach_subject_id" => $data_user['teach_subject']]);

                                    echo "<td>" . $teach_subject['teach_subject'] . "</td>";



                                    $position = $database->get("tbl_system_PersonPositionType", "*", ["position_id" => $data_user['position_id']]);
                                    echo "<td>" . $position['position_name'] . "</td>";

                                    $academic = $database->get("tbl_system_Academic_Standing", "*", ["academic_id" => $data_user['academic_id']]);
                                    echo "<td>" . $academic['academic_standing'] . "</td>";

                                    $persontype = $database->get("tbl_system_PersonType", "*", ["persontype_id" => $data_user['persontype_id']]);
                                    echo "<td>" . $persontype['persontype_name'] . "</td>";
                                    echo "</tr>";
                                    $i++;
                                }
                            } else {
                                echo "<tr><td colspan=\"7\" class=\"text-center\"><h2 class=\"text-danger\">ยังไม่มีข้อมูล</h2></td></tr>";
                            }
                            ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
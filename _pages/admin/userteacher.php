<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ผู้เข้าใช้งานระบบ ครู";
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
                            <option value="?module=userteacher">โรงเรียน</option>
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
                            <option value="?module=userteacher">กลุ่มสาระ</option>

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
                <!-- <div class="col-sm-12">
                    <span class="float-sm-right">
                        <a class="btn btn-outline-info" href="?module=userDD_add"><i class="fa-solid fa-plus"></i> เพิ่มผู้ใช้งาน</a>
                    </span>
                </div> -->
                <div class="table-responsive">
                    <table class="table table-bordered table-striped table-hover" id="data" data-page-length='100'>
                        <thead>
                            <tr>
                                <th>ที่</th>
                                <th>เลขประจำตัวประชาชน</th>
                                <th>ชื่อ - นามสกุล</th>
                                <th>โรงเรียน</th>
                                <th>กลุ่มสาระ</th>
                                <th>ตำแหน่ง</th>

                                <th>วิทยฐานะ</th>
                                <th>ประเภทบุคลากร</th>
                                <th>Operation</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $arrayQuery = array();
                            $arrayQuery = ["level" => "teacher", "register_isConfirm" => "1",  "status" => "1","school[!]" => "1000650001"];
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


                            // if ($school_id == "") {
                            //     $row_user = $database->select(
                            //         $tbl,
                            //         ["[>]tbl_school" => ["school" => "school_id"]],
                            //         "*",
                            //         [
                            //             "level" => "teacher",
                            //             "register_isConfirm" => "1",
                            //             
                            //             "ORDER" => [
                            //                 "school" => "ASC",
                            //                 "academic_id" => "ASC",
                            //                 "position_id" => "DESC"
                            //             ]
                            //         ]
                            //     );
                            // } else {
                            //     $row_user = $database->select(
                            //         $tbl,
                            //         ["[>]tbl_school" => ["school" => "school_id"]],
                            //         "*",
                            //         [
                            //             "level" => "teacher",
                            //             "register_isConfirm" => "1",
                            //             "school" => $school_id,
                            //             "ORDER" => [
                            //                 "school" => "ASC",
                            //                 "academic_id" => "ASC",
                            //                 "position_id" => "DESC"
                            //             ]
                            //         ]
                            //     );
                            // }
                            $i = 1;
                            if (count($row_user) != 0) {
                                foreach ($row_user as $data_user) {
                                    $prefix = $database->get("tbl_system_prefix", "prefix", ["prefix_id" => $data_user['prefix']]);
                                    $teach_subject = $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $data_user['teach_subject']]);
                                    $position = $database->get("tbl_system_PersonPositionType", "position_name", ["position_id" => $data_user['position_id']]);
                                    $academic = $database->get("tbl_system_Academic_Standing", "academic_standing", ["academic_id" => $data_user['academic_id']]);
                                    $persontype = $database->get("tbl_system_PersonType", "persontype_name", ["persontype_id" => $data_user['persontype_id']]);
                            ?>
                                    <tr>

                                        <td class="text-center"><?php echo $i; ?></td>
                                        <td><?php echo $data_user['people_id']; ?></td>
                                        <td><?php echo $prefix . $data_user['name'] . " " . $data_user['lastname']; ?></td>
                                        <td><?php echo $data_user['school_name']; ?></td>
                                        <td><?php echo $teach_subject; ?></td>
                                        <td><?php echo $position; ?></td>
                                        <td><?php echo $academic; ?></td>
                                        <td><?php echo $persontype; ?></td>
                                        <td>
                                            <div class="btn-group">
                                                <?php if ($data_user['people_id'] != "") { ?>
                                                    <a href="?module=teacher_edit&people_id=<?php echo $data_user['people_id']; ?>" class="btn btn-warning btn-sm"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</a>
                                                <?php } else { ?>
                                                    <a href="?module=teacher_edit&id=<?php echo $data_user['id']; ?>" class="btn btn-warning btn-sm"><i class="fa-solid fa-pen-to-square"></i> แก้ไข</a>
                                                <?php } ?>
                                                <a href="#" class="btn btn-danger btn-sm" onclick="Remove_User('<?php echo $data_user['people_id']; ?>','<?php echo $module;?>')"><i class="fa-solid fa-trash"></i> ลบ</a>
                                                <a href="?module=resetPwd&id=<?php echo $data_user['id']; ?>&from_module=<?php echo $module; ?>" class="btn btn-info btn-sm"><i class="fa-solid fa-key"></i> Reset</a>
                                            </div>
                                        </td>
                                    </tr>
                            <?php
                                    $i++;
                                }
                            } else {
                                echo "<tr><td colspan=\"9\" class=\"text-center\"><h2 class=\"text-danger\">ยังไม่มีข้อมูล</h2></td></tr>";
                            }
                            ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
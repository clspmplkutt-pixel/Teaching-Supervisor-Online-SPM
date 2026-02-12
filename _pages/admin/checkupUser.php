<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ผู้ใช้งานข้อมูลผิดพลาด";
$tbl = "tbl_Users";
$limit_year = date("Y") - 18;



?>

<div class="row">
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
                                <th>Level</th>
                                <th>ความผิดพลาด</th>
                                <th>แก้ไขข้อมูล</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $sql = "SELECT * FROM $tbl LEFT JOIN tbl_school ON $tbl.school=tbl_school.school_id WHERE ((people_id='') OR (YEAR(birthday)>$limit_year)) ORDER BY school ASC,academic_id ASC,position_id DESC";
                            $row_user = $database->query($sql)->fetchAll();
                            $i = 1;
                            if (count($row_user) != 0) {
                                foreach ($row_user as $data_user) {
                                    echo "<tr>";
                                    $prefix = $database->get("tbl_system_prefix", "prefix", ["prefix_id" => $data_user['prefix']]);
                                    echo "<td class=\"text-center\">$i</td>";
                                    echo "<td>" . $prefix . $data_user['name'] . " " . $data_user['lastname'] . "</td>";
                                    echo "<td>" . $data_user['school_name'] . "</td>";
                                    if ($data_user['level'] == "teacher") {
                                        $module_edit = "teacher_edit";
                                    } elseif ($data_user['level'] == "directorschool") {
                                        $module_edit = "directorschool_edit";
                                    }
                                    echo "<td>" . $data_user['level'] . "</td>";
                                    if ($data_user['people_id'] == "") {
                                        $error_text = "ไม่มีเลขประจำตัวประชาชน";
                                    } else {
                                        $error_text = "ปีเกิดผิดพลาด " . $data_user['birthday'] . " ข้าราชการต้องอายุมากกว่า 18 ปี";
                                    }

                            ?>
                                    <td><span class="text-danger"><?php echo $error_text; ?></span></td>
                                    <td>
                                        <a href="?module=<?php echo $module_edit; ?>&id=<?php echo $data_user['id']; ?>&peopleid_error=peopleidError" class="btn btn-danger"><i class="fa-regular fa-edit"></i> แก้ไข</a>
                                    </td>
                                    </tr>
                            <?php
                                    $i++;
                                }
                            } else {
                                echo "<tr><td colspan=\"8\" class=\"text-center\"><h2 class=\"text-danger\">ยังไม่มีข้อมูล</h2></td></tr>";
                            }
                            ?>

                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
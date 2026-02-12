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
                                <th>เลขประจำตัวประชาชน</th>
                                <th>ชื่อ - นามสกุล</th>
                                <th>โรงเรียน</th>
                                <th>Level</th>
                                <th>ความผิดพลาด</th>
                                <th>แก้ไขข้อมูล</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $sql = "SELECT people_id,COUNT(*) as count FROM tbl_Users WHERE people_id!='' GROUP BY people_id Having COUNT(*) > 1";
                            $row_user = $database->query($sql)->fetchAll();
                            $i = 1;
                            if (count($row_user) != 0) {
                                foreach ($row_user as $data_user) {
                                    $dup_people = $database->select($tbl, ["[>]tbl_school" => ["school" => "school_id"]], "*", ["people_id" => $data_user["people_id"]]);
                                    // echo "<pre>";
                                    // print_r($dup_people);
                                    // echo "</pre>";
                                    foreach ($dup_people as $row_dup) {
                                        echo "<tr>";
                                        $prefix = $database->get("tbl_system_prefix", "prefix", ["prefix_id" => $row_dup['prefix']]);
                                        echo "<td class=\"text-center\">$i</td>";
                                        echo "<td>" . $row_dup['people_id'] . "</td>";
                                        echo "<td>" . $prefix . $row_dup['name'] . " " . $row_dup['lastname'] . "</td>";
                                        echo "<td>" . $row_dup['school_name'] . "</td>";
                                        echo "<td>" . $row_dup['level'] . "</td>";
                                        if ($row_dup['level'] == "teacher") {
                                            $module_edit = "teacher_edit";
                                        }elseif ($row_dup['level'] == "directorschool") {
                                            $module_edit = "directorschool_edit";
                                        }

                            ?>
                                        <td><span class="text-danger">เลขประจำตัวประชาชนซ้ำ</span></td>

                                        <td>

                                            <a href="?module=<?php echo $module_edit; ?>&id=<?php echo $row_dup['id']; ?>&peopleid_error=peopleidDup" class="btn btn-danger"><i class="fa-regular fa-edit"></i> แก้ไข</a>


                                        </td>
                                        </tr>
                            <?php

                                        $i++;
                                    }
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
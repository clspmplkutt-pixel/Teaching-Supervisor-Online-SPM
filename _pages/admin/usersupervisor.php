<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ผู้เข้าใช้งานระบบ ศึกษานิเทศ";
$tbl = "tbl_Users";
$row_user = $database->select(
    $tbl,
    "*",
    [
        "level" => "supervisor",
        "ORDER" => [
            "position_id" => "DESC",
            "academic_id"=>"ASC"

        ]
    ]
);

?>

<div class="row">
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
                    <table class="table table-bordered table-striped table-hover" id="data">
                        <thead>
                            <tr>
                                <th>ที่</th>
                                <th>ชื่อ - นามสกุล</th>
                                <th>ตำแหน่ง</th>
                                <th>วิทยฐานะ</th>
                                <th>สหวิทยาเขตรับผิดชอบ</th>
                                <th>Operation</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $i=1;
                            if (count($row_user) != 0) {
                                foreach ($row_user as $data_user) {
                                    echo "<tr>";
                                    $prefix = $database->get("tbl_system_prefix", "*", ["prefix_id" => $data_user['prefix']]);
                                    echo "<td class=\"text-center\">$i</td>";
                                    echo "<td>" . $prefix['prefix'] . $data_user['name'] . " " . $data_user['lastname'] . "</td>";
                                    $position = $database->get("tbl_system_PersonPositionType", "*", ["position_id" => $data_user['position_id']]);
                                    echo "<td>" . $position['position_name'] . "</td>";
                                    $academic = $database->get("tbl_system_Academic_Standing", "*", ["academic_id" => $data_user['academic_id']]);
                                    echo "<td>" . $academic['academic_standing'] . "</td>";
                                    $khet_name = $database->get("tbl_khet", "*", ["khet_code" => $data_user['khet_code']]);
                                    echo "<td>" . $khet_name['khet_name'] . "</td>";
                                    echo "<td><div class=\"btn-group\">";
                                    if ($data_user['people_id'] != "") {
                                        echo "<a href=\"?module=supervisor_edit&people_id=" . $data_user['people_id'] . "\" class=\"btn btn-warning btn-sm\"><i class=\"fa-solid fa-pen-to-square\"></i> แก้ไข</a>";
                                    } else {
                                        echo "<a href=\"?module=supervisor_edit&id=" . $data_user['id'] . "\" class=\"btn btn-warning btn-sm\"><i class=\"fa-solid fa-pen-to-square\"></i> แก้ไข</a>";
                                    }
                                    echo "<a href=\"#\" class=\"btn btn-danger btn-sm\" onclick=\"Remove_User('".$data_user['people_id']."','".$module."')\"><i class=\"fa-solid fa-trash\"></i> ลบ</a>";
                                    echo "<a href=\"?module=resetPwd&id=".$data_user['id']."&from_module=$module\" class=\"btn btn-info btn-sm\"><i class=\"fa-solid fa-key\"></i> Reset</a>";
                                    echo "</div></td>";
                                    echo "</tr>";
                                    $i++;
                                }
                            } else {
                                echo "<tr><td colspan=\"5\" class=\"text-center\"><h2 class=\"text-danger\">ยังไม่มีข้อมูล</h2></td></tr>";
                            }
                            ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
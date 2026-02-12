<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ยืนยันผู้ใช้งาน";
$tbl = "tbl_Users";
$row_user = $database->select(
    $tbl,
    ["[>]tbl_school" => ["school" => "school_id"]],
    "*",
    [
        "level" => "teacher",
        "register_isConfirm" => "0",
        "ORDER" => [
            "school" => "ASC",
            "academic_id" => "ASC",
            "position_id" => "DESC"
        ]
    ]
);
if ($ope == "confirm") {
    $data = $database->update($tbl, ["register_isConfirm" => "1"], ["id" => $id]);
    if($data->rowCount()!=0){
        location_to("?module=".$module,0);
    }else{
        alert_t("ผิดพลาดในการยืนยัน");
        location_to("?module=".$module,3);
    }
    exit;
}

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
                                <th>กลุ่มสาระ</th>
                                <th>ตำแหน่ง</th>
                                <th>วิทยฐานะ</th>
                                <th>ประเภทบุคลากร</th>
                                <th>Operation</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $i = 1;
                            if (count($row_user) != 0) {
                                foreach ($row_user as $data_user) {
                                    echo "<tr>";
                                    $prefix = $database->get("tbl_system_prefix", "*", ["prefix_id" => $data_user['prefix']]);
                                    echo "<td class=\"text-center\">$i</td>";
                                    echo "<td>" . $prefix['prefix'] . $data_user['name'] . " " . $data_user['lastname'] . "</td>";

                                    echo "<td>" . $data_user['school_name'] . "</td>";

                                    $position = $database->get("tbl_system_Teach_Subject", "*", ["teach_subject_id" => $data_user['teach_subject']]);
                                    echo "<td>" . $position['position_name'] . "</td>";



                                    $position = $database->get("tbl_system_PersonPositionType", "*", ["position_id" => $data_user['position_id']]);
                                    echo "<td>" . $position['position_name'] . "</td>";

                                    $academic = $database->get("tbl_system_Academic_Standing", "*", ["academic_id" => $data_user['academic_id']]);
                                    echo "<td>" . $academic['academic_standing'] . "</td>";

                                    $persontype = $database->get("tbl_system_PersonType", "*", ["persontype_id" => $data_user['persontype_id']]);
                                    echo "<td>" . $persontype['persontype_name'] . "</td>";

                                    echo "<td>";
                            ?>
                                    <a href="?module=<?php echo $module; ?>&ope=confirm&id=<?php echo $data_user['id']; ?>" class="btn btn-success"><i class="fa-regular fa-circle-check"></i> ยืนยัน</a>
                            <?
                                    echo "</td>";
                                    echo "</tr>";
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
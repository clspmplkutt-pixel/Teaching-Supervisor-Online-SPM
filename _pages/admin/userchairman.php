<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ผู้เข้าใช้งานระบบ ประธานสหวิทยาเขต";
$tbl = "tbl_Users";
$row_user = $database->select(
    $tbl,
    [
        "[>]tbl_school" => ["school" => "school_id"],
        "[>]tbl_khet" => ["tbl_school.khet_code" => "khet_code"]
    ],

    "*",

    [
        "level" => "directorschool",
        "chairman" => "1",
        "ORDER" => [
            "school" => "ASC",
            "position_id" => "DESC",
            "academic_id" => "ASC",

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

                <div class="table-responsive">
                    <table class="table table-bordered table-striped table-hover" id="data" data-page-length='50'>
                        <thead>
                            <tr>
                                <th>ที่</th>
                                <th>ชื่อ - นามสกุล</th>
                                <th>ตำแหน่ง</th>
                                <th>วิทยฐานะ</th>
                                <th>โรงเรียน</th>
                                <th>สหวิทยาเขต</th>
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
                                    $position = $database->get("tbl_system_PersonPositionType", "*", ["position_id" => $data_user['position_id']]);
                                    echo "<td>" . $position['position_name'] . "</td>";
                                    $academic = $database->get("tbl_system_Academic_Standing", "*", ["academic_id" => $data_user['academic_id']]);
                                    echo "<td>" . $academic['academic_standing'] . "</td>";
                                    echo "<td>" . $data_user['school_name'] . "</td>";
                                    echo "<td>" . $data_user['khet_name'] . "</td>";
                                    echo "</tr>";
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
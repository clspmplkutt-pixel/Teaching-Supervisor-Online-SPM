<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "จัดการข้อมูลโรงเรียน";
?>
<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> จัดการข้อมูลโรงเรียน</h3>

            </div>
            <div class="card-body">

                <div class="col-sm-12">
                    <span class="float-sm-right">
                        <a class="btn btn-outline-info" href="?module=school_add">เพิ่มโรงเรียน</a>
                    </span>
                </div>
                <div class=" table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data">
                        <thead>
                            <tr>
                                <th>รหัส MOECODE</th>
                                <th>ชื่อโรงเรียน</th>
                                <th>ผู้อำนวยการ</th>
                                <th>สหวิทยาเขต</th>
                                <th>จังหวัด</th>
                                <th>ขนาดโรงเรียน</th>
                                <th>ผอ.</th>
                                <th>รอง.ผอ.</th>
                                <th>ครู</th>
                                <th>นักเรียน</th>
                                <th>Operator</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php


                            $result = $database->select(
                                "tbl_school",
                                [
                                    "[>]tbl_school_DMCdata" =>
                                    [
                                        "school_code8" => "school_code8",
                                        "AND" => [
                                            "tbl_school_DMCdata.education_year" => EDUYEAR,
                                            "tbl_school_DMCdata.education_section" => EDUROUND
                                        ]
                                    ]
                                ],
                                "*",
                                ["school_flag" => "1"]
                            );
                            foreach ($result as $row) {
                                $std_a = $row['a1m'] + $row['a1f'] + $row['a2m'] + $row['a2f'];
                                $std_p = $row['p1m'] + $row['p1f'] + $row['p2m'] + $row['p2f'] + $row['p3m'] + $row['p3f'] + $row['p4m'] + $row['p4f'] + $row['p5m'] + $row['p5f'] + $row['p6m'] + $row['p6f'];
                                $std_m = $row['m1m'] + $row['m1f'] + $row['m2m'] + $row['m2f'] + $row['m3m'] + $row['m3f'] + $row['m4m'] + $row['m4f'] + $row['m5m'] + $row['m5f'] + $row['m6m'] + $row['m6f'];
                                $std_v = $row['v1m'] + $row['v1f'] + $row['v2m'] + $row['v2f'] + $row['v2m'] + $row['v2f'];
                            ?>
                                <tr>
                                    <td class="text-center"><?php echo $row["school_id"]; ?></td>
                                    <td><?php echo $row["school_name"]; ?></td>
                                    <td>
                                        <?php
                                            $data_boss = $database->get("tbl_Users","*",['school'=>$row['school_id'],"position_id"=>"10007"]);
                                            
                                            echo $database->get("tbl_system_prefix","prefix",['prefix_id'=>$data_boss['prefix']]) . $data_boss['name'] . " " . $data_boss['lastname'];
                                        ?>
                                    </td>
                                    <td><?php echo $arrayKhet[$row["khet_code"]]; ?></td>
                                    <td><?php echo $arrayProvince[$row["school_province"]]; ?></td>
                                    <td><?php echo $arraySchoolSize[$row["school_size"]]['0']; ?></td>
                                    <td>
                                        <?php
                                        $result_count_teacher = $database->count("tbl_Users", ['school'], ["school" => $row["school_id"], "position_id" => "10007"]);
                                        echo $result_count_teacher;
                                        ?>
                                    </td>
                                    <td>
                                        <?php
                                        $result_count_teacher = $database->count("tbl_Users", ['school'], ["school" => $row["school_id"], "position_id" => "10006"]);
                                        echo $result_count_teacher;
                                        ?>
                                    </td>
                                    <td>
                                        <?php
                                        $result_count_teacher = $database->count(
                                            "tbl_Users",
                                            ['school'],
                                            [
                                                "school" => $row["school_id"],
                                                "OR" =>
                                                [
                                                    "position_id" =>
                                                    [10000, 10001]
                                                ]

                                            ]
                                        );
                                        echo number_format($result_count_teacher, 0);
                                        ?>
                                    </td>
                                    <td><?php echo number_format($std_a + $std_p + $std_m + $std_p, 0); ?></td>
                                    <td>
                                        <div class="btn-group">
                                            <a href="?module=school_edit&school_id=<?php echo $row["school_id"]; ?>" class="btn btn-sm btn-warning"><i class="fa-regular fa-pen-to-square"></i></a>
                                            <a href="#" class="btn btn-sm btn-danger" onclick='Remove_school("<?php echo $row["school_id"]; ?>")'><i class="fa-regular fa-trash-can"></i></a>
                                        </div>
                                    </td>
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
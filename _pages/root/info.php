<?php
$title_page = "หนัาหลัก";

// echo encrypt_decrypt("decrypt", "cFh4N1B6SmcyRFZnVmEwSjZpbmNvQT09");

?>
<div class="row">
    <div class="col-12 col-lg-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title">ข้อมูลสหวิทยาเขต</h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-bordered table-hover table-striped">
                        <thead>
                            <tr>
                                <!-- <th>รหัสสหวิทยาเขต</th> -->
                                <th>ชื่อสหวิทยาเขต</th>
                                <th>จังหวัด</th>
                                <th>จำนวนโรงเรียน</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $rows = $database->select("viewCountschKhet", "*");
                            $total_School = 0;
                            foreach ($rows as $a) {
                                echo "<tr class=\"text-center\">";
                                echo "<td class=\"text-left\">" . $arrayKhet[$a['khet_code']] . "</td>";
                                echo "<td>" . $arrayProvince[$a['school_province']] . "</td>";
                                echo "<td>" . $a['khet_num'] . "</td>";

                                echo "</tr>";
                                $total_School = $total_School + $a['khet_num'];
                            }
                            ?>
                            <tr class="text-center">
                                <td colspan="2">รวม</td>
                                <td><?php echo $total_School; ?></td>
                            </tr>
                        </tbody>

                    </table>
                </div>
            </div>
        </div>
    </div>
    <div class="col-12 col-lg-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title">ข้อมูลขนาดโรงเรียน</h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-bordered table-hover table-striped">
                        <thead>
                            <tr>

                                <th>ขนาดโรงเรียน</th>
                                <th>จำนวนโรงเรียน</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $rows = $database->select("viewCountSchholSize", "*");
                            $total_School = 0;
                            foreach ($rows as $a) {
                                echo "<tr class=\"text-center\">";
                                echo "<td>" . $arraySchoolSize[$a['school_size']][0] . "</td>";
                                echo "<td>" . $a['num_school_size'] . "</td>";

                                echo "</tr>";
                                $total_School = $total_School + $a['num_school_size'];
                            }
                            ?>
                            <tr class="text-center">
                                <td>รวม</td>
                                <td><?php echo $total_School; ?></td>
                            </tr>
                        </tbody>

                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-12 col-lg-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title">ข้อมูลนักเรียน ปีการศึกษา <?php echo EDUYEAR; ?> ภาคเรียนที่ <?php echo EDUROUND; ?></h3>
            </div>
            <div class="card-body">
                <?php
                // echo AREA_CODE8;
                $rows = $database->select(
                    "tbl_school",
                    [
                        "[>]tbl_school_DMCdata" =>
                        [
                            "school_code8" => "school_code8",
                            // "school_area[!]" => null,
                            "AND" => [
                                "tbl_school_DMCdata.education_year" => EDUYEAR,
                                "tbl_school_DMCdata.education_section" => EDUROUND,
                                "tbl_school.school_area" => AREA_CODE8
                            ]
                        ]
                    ],
                    "*",
                    ["school_flag" => "1"]
                );

                ?>
                <div class="table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data" data-page-length='10'>
                        <thead>
                            <tr>
                                <th rowspan="2">รหัสโรงเรียน</th>
                                <th rowspan="2">ชื่อโรงเรียน</th>
                                <th rowspan="2">จังหวัด</th>
                                <th rowspan="2">สหวิทยาเขต</th>
                                <th colspan="4">จำนวนนักเรียน</th>
                                <th rowspan="2">ขนาดโรงเรียน</th>
                            </tr>
                            <tr>
                                <!-- <th>อนุบาล</th> -->
                                <!-- <th>ประถม</th> -->
                                <th>ม.ต้น</th>
                                <th>ม.ปลาย</th>
                                <th>ปวส.</th>
                                <th>รวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            foreach ($rows as $data) {
                                $std_a = $data['a1m'] + $data['a1f'] + $data['a2m'] + $data['a2f'];
                                $std_p = $data['p1m'] + $data['p1f'] + $data['p2m'] + $data['p2f'] + $data['p3m'] + $data['p3f'] + $data['p4m'] + $data['p4f'] + $data['p5m'] + $data['p5f'] + $data['p6m'] + $data['p6f'];
                                $std_m_1 = $data['m1m'] + $data['m1f'] + $data['m2m'] + $data['m2f'] + $data['m3m'] + $data['m3f'];
                                $std_m_2 = $data['m4m'] + $data['m4f'] + $data['m5m'] + $data['m5f'] + $data['m6m'] + $data['m6f'];
                                $std_v = $data['v1m'] + $data['v1f'] + $data['v2m'] + $data['v2f'] + $data['v2m'] + $data['v2f'];
                            ?>
                                <tr>
                                    <td><?php echo $data['school_id']; ?></td>
                                    <td><?php echo $data['school_name']; ?></td>
                                    <td><?php echo $arrayProvince[$data['school_province']]; ?></td>
                                    <td><?php echo $arrayKhet[$data['khet_code']]; ?></td>
                                    <!-- <td><?php echo number_format($std_a, 0); ?></td> -->
                                    <!-- <td><?php echo number_format($std_p, 0); ?></td> -->
                                    <td><?php echo number_format($std_m_1, 0); ?></td>
                                    <td><?php echo number_format($std_m_2, 0); ?></td>
                                    <td><?php echo number_format($std_v, 0); ?></td>
                                    <td><?php echo number_format($std_a + $std_p + $std_m_1 + $std_m_2 + $std_p, 0); ?></td>
                                    <td><?php echo $arraySchoolSize[$data['school_size']][0]; ?></td>
                                </tr>
                            <?php } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
<?php
$title_page = "หนัาหลัก";
?>
<div class="row">
    <div class="col-6">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title">ข้อมูลสหวิทยาเขต</h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-bordered table-hover table-striped">
                        <thead>
                            <tr>
                                <th>รหัสสหวิทยาเขต</th>
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
                                echo "<td>" . $a['khet_code'] . "</td>";
                                echo "<td class=\"text-left\">" . $arrayKhet[$a['khet_code']] . "</td>";
                                echo "<td>" . $arrayProvince[$a['school_province']] . "</td>";
                                echo "<td>" . $a['khet_num'] . "</td>";

                                echo "</tr>";
                                $total_School = $total_School + $a['khet_num'];
                            }
                            ?>
                            <tr class="text-center">
                                <td colspan="3">รวม</td>
                                <td><?php echo $total_School; ?></td>
                            </tr>
                        </tbody>

                    </table>
                </div>
            </div>
        </div>
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
    <div class="col-6">
        <!-- <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title">ข้อมูลนักเรียน <?php echo EDUYEAR; ?> ภาคเรียนที่ </h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-bordered table-hover table-striped">
                        <thead>
                            <tr>
                                <th>โรงเรียน</th>
                                <th>จำนวนนักเรียน</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            // $sql = "SELECT * FROM tbl_school as sch LEFT JOIN viewStudentNum25661 AS view ON sch.school_code8=view.school_id";
                            // $result = $database->query($sql)->fetchAll();

                            // print_r($result);
                            ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div> -->
    </div>
</div>
<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "สถานะแผนการส่ง";
$tbl_plan = "tbl_sendplan";
?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>

            </div>
            <div class="card-body">
                <div class=" table-responsive">
                    <table class="table table-bordered table-hover table-striped" id="data">
                        <thead>
                            <tr>
                                <th>ที่</th>
                                <th>กลุ่มสาระ (ย่อ)</th>
                                <th>ระดับชั้น</th>
                                <!-- <th>ชื่อวิชา (รหัสวิชา)</th> -->
                                <th>หน่วยการเรียนรู้</th>
                                <th>ชื่อแผนการสอน</th>
                                <th>ปีการศึกษา/ภาคเรียน (ปีงบประมาณ)</th>
                                <th>วันที่ส่ง</th>
                                <th>แผน</th>
                                <th>คลิป</th>
                                <th>ผลประเมิน</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php

                            $data = $database->select($tbl_plan, "*", ["people_id" => $_SESSION['user']]);
                            // echo count($data);
                            if (count($data) != 0) {
                                foreach ($data as $row) {
                            ?>
                                    <tr>
                                        <td class="text-center"><?php echo $row["planid"]; ?></td>
                                        <td><?php echo $database->get("tbl_system_Teach_Subject", "teach_subject_1", ["teach_subject_id" => $row["teach_subject_id"]]); ?></td>
                                        <td><?php echo $database->get("tbl_system_GradeLevel", "grade_level_name", ["grade_level_id" => $row["grade_level_id"]]); ?></td>
                                        <td><?php echo $row["subject_content"]; ?></td>
                                        <td><?php echo $row["subject_name_plan"]; ?></td>
                                        <td><?php echo $row["edu_year"]; ?>/<?php echo $row["edu_term"]; ?><br>(ปีงบ <?php echo $row["budget_year"]; ?>)</td>
                                        <td><?php echo $row["plan_senddate"]; ?></td>
                                        <td class="text-center"><a href="<?php echo $row["plan_file"]; ?>" title="แผน" target="_blank"><i class="fa-regular fa-file-pdf fa-lg"></i></a></td>
                                        <td class="text-center">
                                            <?php if ($row["plan_clip"] != "") { ?>
                                                <a href="https://www.youtube.com/watch?v=<?php echo $row["plan_clip"]; ?>" title="ดูคลิปการสอน" target="_blank">
                                                    <i class="fa-brands fa-youtube text-danger"></i>
                                                </a>
                                            <?php } ?>

                                        </td>

                                        <td class="text-center">
                                            <?php
                                            $sql = "select count(DISTINCT(supervision)) AS num_scoring from tbl_sendplan_score WHERE planid='" . $row["planid"] . "'";
                                            $num_commitee = $database->query($sql)->fetchAll();
                                            $count = $database->count("tbl_sendplan_score", ["planid" => $row["planid"]]);
                                            $count_committe = 0;
                                            for ($com = 1; $com <= 5; $com++) {
                                                if ($row['committee' . $com] != "" || $row['committee' . $com] != null) {
                                                    $count_committe++;
                                                }
                                            }
                                            if ($num_commitee[0]['num_scoring'] > 0) {
                                            ?>
                                                <a href="?module=view_scoring&planid=<?php echo $row["planid"]; ?>" title="ดูผลการประเมิน">
                                                    <i class="fa-solid fa-check-circle text-success"></i><br>
                                                    ประเมินแล้ว <?php echo $num_commitee[0]['num_scoring']; ?> คน
                                                </a> / <?php echo $count_committe; ?> คน

                                            <?php } else {
                                            ?>
                                                <i class="fa-solid fa-circle text-danger"></i>
                                            <?php } ?>
                                        </td>

                                        <td>
                                            <?php
                                            if ($row["plan_status"] == 1) {
                                                $class_status = "badge-warning";
                                            } else if ($row["plan_status"] == 2) {
                                                $class_status = "badge-success";
                                            } else if ($row["plan_status"] == 3) {
                                                $class_status = "badge-danger";
                                                $msg_reject = $row['plan_ds_comment'];
                                            } else {
                                                $class_status = "badge-info";
                                            }
                                            echo "<span class='badge " . $class_status . "'>";
                                            echo $database->get("tbl_sendplan_status", "status_name", ["id" => $row["plan_status"]]);

                                            echo "</span>";
                                            if ($row["plan_status"] == 3) {
                                                echo "<br>";
                                                echo "หมายเหตุ: " . html_entity_decode($msg_reject);
                                            }
                                            ?>
                                        </td>

                                    </tr>
                                <?php } ?>
                            <?php } else { ?>
                                <tr>
                                    <td colspan="11">
                                        <h1 class="text-center text-danger">ยังไม่ได้ส่งแผนการสอน</h1>
                                    </td>
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
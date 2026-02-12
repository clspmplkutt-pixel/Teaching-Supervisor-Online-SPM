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
                                <th>ชื่อวิชา (รหัสวิชา)</th>
                                <th>หน่วยการเรียนรู้</th>
                                <th>ชื่อแผนการสอน</th>

                                <!-- <th>สถานะ</th> -->
                                <th><i class="fa-brands fa-youtube text-danger"></i></th>
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
                                        <td><?php echo $row["subject_name"]; ?> (<?php echo $row["subject_code"]; ?>)</td>
                                        <td><?php echo $row["subject_content"]; ?></td>
                                        <td><?php echo $row["subject_name_plan"]; ?></td>
                                        <td>
                                            <?php echo $database->get("tbl_sendplan_status", "status_name", ["id" => $row["plan_status"]]); ?>
                                            <br>
                                            <?php if ($row["plan_status"] == "2") { ?>
                                                <a href="?module=send_clip&planid=<?php echo $row["planid"]; ?>" title="ส่งคลิปการสอน" class="btn btn-danger btn-xs">
                                                    <i class="fa-regular fa-paper-plane"></i>
                                                </a>
                                            <?php   } elseif ($row["plan_status"] == "5") { ?>
                                                <a href="https://www.youtube.com/watch?v=<?php echo $row["plan_clip"]; ?>" title="ดูคลิปการสอน" target="_blank">
                                                    <i class="fa-brands fa-youtube text-danger"></i>
                                                </a>
                                            <?php } ?>
                                        </td>
                                    </tr>
                                <?php } ?>
                            <?php } else { ?>
                                <tr>
                                    <td colspan="10">
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
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
                                <th>ปีการศึกษา/ภาคเรียน (ปีงบประมาณ)</th>
                                <th>วันที่ส่ง</th>
                                <th>ไฟล์แผนการสอน</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php

                            $data = $database->select($tbl_plan, "*", ["school_code" => $_SESSION['school_code'],"plan_status"=>"5"]);
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
                                        <td><?php echo $row["edu_year"]; ?>/<?php echo $row["edu_term"]; ?> (ปีงบประมาณ <?php echo $row["budget_year"]; ?>)</td>
                                        <td><?php echo $row["plan_senddate"]; ?></td>
                                        <td class="text-center"><a href="<?php echo $row["plan_file"]; ?>" target="_blank"><i class="fa-regular fa-file-pdf fa-2xl"></i></a></td>
                                        <td><a href="?module=plan_clip&planid=<?php echo $row['planid'];?>">คลิปการสอน</a></td>
                                    </tr>
                                <?php } ?>
                            <?php } else { ?>
                                <tr>
                                    <td colspan="10">
                                        <h1 class="text-center text-danger">ยังไม่มี</h1>
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
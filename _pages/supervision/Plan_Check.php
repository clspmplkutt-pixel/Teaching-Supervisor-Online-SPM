<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "รายการตรวจแผนการสอน";
$tbl = "tbl_sendplan";
?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-list-check"></i> <?php echo $title_page; ?></h3>
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
                                <th>แผน</th>
                                <th>คลิป</th>
                                <th>ดำเนินการ</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $data = $database->select($tbl, "*", ["OR" => [
                                "committee1" => $_SESSION['user'],
                                "committee2" => $_SESSION['user'],
                                "committee3" => $_SESSION['user'],
                                "committee4" => $_SESSION['user'],
                                "committee5" => $_SESSION['user']
                            ]]);

                            
                            if (count($data) != 0) {
                                if($data[0]["committee1"] == $_SESSION['user']){
                                    $committee = "committee1";
                                }
                                if($data[0]["committee2"] == $_SESSION['user']){
                                    $committee = "committee2";
                                }
                                if($data[0]["committee3"] == $_SESSION['user']){
                                    $committee = "committee3";
                                }
                                if($data[0]["committee4"] == $_SESSION['user']){
                                    $committee = "committee4";
                                }
                                if($data[0]["committee5"] == $_SESSION['user']){
                                    $committee = "committee5";
                                }
                                foreach ($data as $row) {
                            ?>
                                    <tr>
                                        <td class="text-center"><?php echo $row["planid"]; ?></td>
                                        <td><?php echo $database->get("tbl_system_Teach_Subject", "teach_subject_1", ["teach_subject_id" => $row["teach_subject_id"]]); ?></td>
                                        <td><?php echo $database->get("tbl_system_GradeLevel", "grade_level_name", ["grade_level_id" => $row["grade_level_id"]]); ?></td>
                                        <td><?php echo $row["subject_name"]; ?> (<?php echo $row["subject_code"]; ?>)</td>
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
                                        <td>
                                            <?php
                                            $check_scoring = $database->count("tbl_sendplan_score", ["planid" => $row["planid"], "supervision" => $_SESSION["user"]]);
                                            if ($check_scoring == 0) {
                                                echo "<span class='text-danger'><a href=\"?module=Plan_scoring&committee=$committee&planid=" . $row["planid"] . "\">ยังไม่ประเมิน</a></span>";
                                            } else {
                                                echo "<span class='text-success'><a href=\"?module=view_scoring&planid=" . $row["planid"] . "\">ดูผลการประเมิน</a></span>";
                                            }
                                            ?>

                                        </td>
                                        <td><?php echo $database->get("tbl_sendplan_status", "status_name", ["id" => $row["plan_status"]]); ?></td>

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
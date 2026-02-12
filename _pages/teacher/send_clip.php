<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ส่งคลิปการสอน";
$tbl = "tbl_sendplan";

if ($operation == $module . "_save") {
    // echo "<pre>";
    // print_r($_POST);
    // echo "</pre>";
    // exit;
    $plan_after_teaching = mysqli_escape_mimic(brtospace($plan_after_teaching));

    $data_plan_update = $database->update(
        $tbl,
        [
            "plan_clip" => $id_clip,
            "plan_after_teaching" => $plan_after_teaching,
            "plan_status" => "5",

        ],
        [
            "planid" => $planid
        ]
    );

    if ($data_plan_update->rowCount() != 0) {
        echo "<h1 class=text-success mx-auto>ส่งคลิปการสอนเรียบร้อย<br>กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=statusplan", "3");
    } else {
        echo "<h1 class=text-danger>ไม่สามารถส่งแผนได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=statusplan", "3");
    }
    exit;
} else {
    $data_plan = $database->get($tbl, "*", ["planid" => $planid]);
}

?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>
            </div>
            <div class="card-body">
                <div class="card card-teal">
                    <div class="card-header">
                        <h4 class="card-title">ข้อมูลแผนการสอน</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-lg-6">
                                <?php $teach_subject = $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $data_plan['teach_subject_id']]); ?>
                                กลุ่มสาระ : <span class="text-success"> <?php echo $teach_subject; ?></span>

                            </div>
                            <div class="col-lg-6">
                                <?php $grade_level_name = $database->get("tbl_system_GradeLevel", "grade_level_name", ["grade_level_id" => $data_plan['grade_level_id']]); ?>
                                ระดับชั้นที่ทำการสอน : <span class="text-success"> <?php echo $grade_level_name; ?></span>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-lg-6">
                                รหัสวิชา : <span class="text-success"><?php echo $data_plan['subject_code']; ?></span>
                            </div>
                            <div class="col-lg-6">
                                ชื่อวิชา : <span class="text-success"><?php echo $data_plan['subject_name']; ?></span>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-lg-6">
                                หน่วยการเรียนรู้ : <span class="text-success"><?php echo $data_plan['subject_content']; ?></span>
                            </div>
                            <div class="col-lg-6">
                                ชื่อแผนการสอน : <span class="text-success"><?php echo $data_plan['subject_name_plan']; ?></span>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-lg-3">
                                วันที่สอน : <span class="text-success"><?php echo thai_date_full($data_plan['teach_date'], 1); ?></span>
                            </div>
                            <div class="col-lg-3">
                                เริ่มเวลา : <span class="text-success"><?php echo $data_plan['teach_timestart']; ?> น.</span>
                            </div>
                            <div class="col-lg-3">
                                เสร็จเวลา : <span class="text-success"><?php echo $data_plan['teach_timeend']; ?> น.</span>
                            </div>
                            <div class="col-lg-3">
                                จำนวนนาที : <span class="text-success"><?php echo $data_plan['teach_minute']; ?> นาที</span>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-lg-2">
                                วิธีการสอน :
                            </div>
                            <div class="col-lg-4">
                                <span class="text-success"><?php echo $database->get("tbl_learningModel", "model_name", ["model_id" => $data_plan['learning_model']]); ?></span>
                            </div>
                            <div class="col-lg-2">
                                สมรรถนะ :
                            </div>
                            <div class="col-lg-4">
                                <span class="text-success">
                                    <?php
                                    $competency = explode(",", $data_plan['competency']);
                                    $i = 1;
                                    if (count($competency) == 1) {
                                        echo "<span class=\"text-success\">" . $database->get("tbl_system_Competency", "competency_name", ["competency_id" => $competency]) . "</span>";
                                    } else {
                                        foreach ($competency as $co) {
                                            echo "<span class=\"text-success\">" . $i . ". " . $database->get("tbl_system_Competency", "competency_name", ["competency_id" => $co]) . "</span><br>";
                                            $i++;
                                        }
                                    }
                                    ?>
                                </span>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-lg-2">ทักษะในศตวรรษที่ 21 : </div>
                            <div class="col-lg-4">
                                <span class="text-success">
                                    <?php
                                    $ability21 = explode(",", $data_plan['ability21']);
                                    $i = 1;
                                    if (count($ability21) == 1) {
                                        echo "<span class=\"text-success\">" . $database->get("tbl_ability21", "ability21_name_th", ["ability21_id" => $ability21]) . "</span>";
                                    } else {
                                        foreach ($ability21 as $co) {
                                            echo "<span class=\"text-success\">" . $i . ". " . $database->get("tbl_ability21", "ability21_name_th", ["ability21_id" => $co]) . "</span><br>";
                                            $i++;
                                        }
                                    }
                                    ?>
                                </span>
                            </div>
                            <div class="col-lg-2">คุณลักษณะอันพึงประสงค์ : </div>
                            <div class="col-lg-4">
                                <span class="text-success">
                                    <?php
                                    $desirable = explode(",", $data_plan['desirable']);
                                    $i = 1;
                                    if (count($desirable) == 1) {
                                        echo "<span class=\"text-success\">" . $database->get("tbl_system_Desirable", "desirable_name", ["desirable_id" => $desirable]) . "</span>";
                                    } else {
                                        foreach ($desirable as $co) {
                                            echo "<span class=\"text-success\">" . $i . ". " . $database->get("tbl_system_Desirable", "desirable_name", ["desirable_id" => $co]) . "</span><br>";
                                            $i++;
                                        }
                                    }
                                    ?>
                                </span>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-lg-4">ผลการเรียนรู้ที่คาดหวัง : <br><span class="text-success"><?php echo $data_plan['learning_outcomes']; ?></span></div>
                            <div class="col-lg-4">เนื้อหาการจัดการเรียนรู้ : <br><span class="text-success"><?php echo $data_plan['learning_content']; ?></span></div>
                            <div class="col-lg-4">กิจกรรมการเรียนรู้ : <br><span class="text-success"><?php echo $data_plan['learning_activities']; ?></span></div>
                        </div>
                        <div class="row">
                            <div class="col-lg-6">การวัดผลประเมินผล : <br><span class="text-success"><?php echo $data_plan['assessment']; ?></span></div>
                            <div class="col-lg-6">สื่อที่ใช้ : <br><span class="text-success"><?php echo $data_plan['instructional_media']; ?></span></div>
                        </div>

                        <div class="row">
                            <div class="col-lg-6">ตัวชี้วัดระหว่างทาง : <br>
                                <span class="text-success">
                                    <?php
                                    $indicators_mid = explode(",", $data_plan['indicators_mid']);
                                    $i = 1;
                                    if (count($indicators_mid) == 1) {
                                        $ind = $database->get("tbl_indicators", ["indicators_name", "indicators_details"], ["indicators_name" => $indicators_mid]);
                                        echo "<span class=\"text-success\">" . $ind['indicators_name'] . " : " . $ind['indicators_details'] . "</span>";
                                    } else {
                                        foreach ($indicators_mid as $co) {
                                            $ind = $database->get("tbl_indicators", ["indicators_name", "indicators_details"], ["indicators_name" => $co]);
                                            echo "<span class=\"text-success\">" . $ind['indicators_name'] . " : " . $ind['indicators_details'] . "</span><br>";
                                            $i++;
                                        }
                                    }
                                    ?>
                                </span>
                            </div>
                            <div class="col-lg-6">ตัวชี้วัดปลายทาง : <br>
                                <span class="text-success">
                                    <?php
                                    $indicators_final = explode(",", $data_plan['indicators_final']);
                                    $i = 1;
                                    if (count($indicators_final) == 1) {
                                        $ind = $database->get("tbl_indicators", ["indicators_name", "indicators_details"], ["indicators_name" => $indicators_final]);
                                        echo "<span class=\"text-success\">" . $ind['indicators_name'] . " : " . $ind['indicators_details'] . "</span>";
                                    } else {
                                        foreach ($indicators_final as $co) {
                                            $ind = $database->get("tbl_indicators", ["indicators_name", "indicators_details"], ["indicators_name" => $co]);
                                            echo "<span class=\"text-success\">" . $ind['indicators_name'] . " : " . $ind['indicators_details'] . "</span><br>";
                                            $i++;
                                        }
                                    }
                                    ?>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <form action="?module=<?php echo $module; ?>" method="POST">
                    <div class="row">
                        <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                            <div class="mb-3">
                                <label for="plan_after_teaching">บันทึกหลังสอน : </label>
                                <textarea name="plan_after_teaching" id="plan_after_teaching" class="summernote" height="10" width="100%"></textarea>
                            </div>

                        </div>
                        <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                            <div class="mb-3">
                                <label for="plan_clip">คลิปการสอน : นำมาจาก URL ของ Youtube</label>
                                <input type="text" class="form-control" id="plan_clip" placeholder="คลิปการสอน" name="plan_clip" oninput="show_clip()">
                            </div>



                            <div id="clip_div" class="mx-auto">
                                <iframe id="iframe_clip" width="560" height="315" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                        <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
                            <div class="mb-3">
                                <input type="hidden" name="module" value="<?php echo $module; ?>">
                                <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                                <input type="hidden" name="planid" value="<?php echo $planid; ?>">
                                <input type="hidden" id="id_clip" name="id_clip" value="">
                                <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                                <a href="./" class="btn btn-danger mt-3">ยกเลิก</a>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
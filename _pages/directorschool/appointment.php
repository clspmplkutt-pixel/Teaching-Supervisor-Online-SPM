<?php
session_start();

$title_page = "ตรวจแผนการสอน/แต่งตั้งกรรมการตรวจแผน";
$tbl = "tbl_Users";
$tbl_plan = "tbl_sendplan";
// ini_set('upload_max_filesize', '5M');




if ($operation == $module . "_save") {
    // echo "<pre>";
    // print_r($_POST);
    // echo "</pre>";
    // exit;
    $committee1 = (isset($_POST['committee1']) && $_POST['committee1'] != "")  ? $committee1 : NULL;
    $committee2 = (isset($_POST['committee2']) && $_POST['committee2'] != "") ? $committee2 : NULL;
    $committee3 = (isset($_POST['committee3']) && $_POST['committee3'] != "") ? $committee3 : NULL;
    $committee4 = (isset($_POST['committee4']) && $_POST['committee4'] != "") ? $committee4 : NULL;
    $committee5 = (isset($_POST['committee5']) && $_POST['committee5'] != "") ? $committee5 : NULL;
    $plan_ds_comment = test_input($_POST['plan_ds_comment']);


    if ($plan_approve == "1") {
        $data_update = [
            "plan_approve" => $plan_approve,
            "plan_ds_comment" => $plan_ds_comment,
            "plan_status" => "2",
            "committee1" => $committee1,
            "committee2" => $committee2,
            "committee3" => $committee3,
            "committee4" => $committee4,
            "committee5" => $committee5,
            "director" => $_SESSION['user']
        ];
    } elseif ($plan_approve == "0") {
        $data_update = [
            "plan_approve" => $plan_approve,
            "plan_status" => "3",
            "plan_ds_comment" => $plan_ds_comment,
            "director" => $_SESSION['user']
        ];
    }

    $data_plan_update = $database->update(
        $tbl_plan,
        $data_update,
        [
            "planid" => $planid
        ]
    );

    if ($data_plan_update->rowCount() != 0) {
        echo "<h1 class=text-success mx-auto>แต่งตั้งกรรมการและตรวจแผนการจัดการเรียบร้อย<br>กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=statusplan", "3");
    } else {
        echo "<h1 class=text-danger>ไม่สามารถตรวจแผน และแต่งตั้งกรรมการได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=statusplan", "3");
    }
    exit;
} else {


    $data_plan = $database->get($tbl_plan, "*", ["planid" => $planid]);

    $data_teacher = $database->get($tbl, "*", ["people_id" => $data_plan['people_id']]);
}




?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h4 class="card-title">ข้อมูลแผนการสอน</h4>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-lg-6">
                        <?php $prefix = $database->get("tbl_system_prefix", "prefix", ["prefix_id" => $data_teacher['prefix']]); ?>
                        <strong>ชื่อผู้จัดทำแผน</strong> : <span class="text-success underline"> <?php echo $prefix . $data_teacher['name'] . " " . $data_teacher['lastname']; ?> (<?php echo $data_teacher['people_id']; ?>)</span>
                    </div>
                    <div class="col-lg-6">
                        <?php $position = $database->get("tbl_system_PersonPositionType", "position_name", ["position_id" => $data_teacher['position_id']]); ?>
                        <?php $academic = $database->get("tbl_system_Academic_Standing", "academic_standing", ["academic_id" => $data_teacher['academic_id']]); ?>
                        <strong>ตำแหน่ง</strong> : <span class="text-success underline"> <?php echo $position; ?> (วิทยฐานะ <?php echo $academic; ?>)</span>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-6">
                        <?php $school = $database->get("tbl_school", "school_name", ["school_id" => $data_teacher['school']]); ?>
                        <strong>โรงเรียน</strong> : <span class="text-success underline"> <?php echo $school; ?> </span>
                    </div>
                    <div class="col-lg-6">
                        <?php $teach_subject = $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $data_teacher['teach_subject']]); ?>
                        <strong>กลุ่มสาระ</strong> : <span class="text-success underline"> <?php echo $teach_subject; ?> </span>
                    </div>
                </div>
            </div>
        </div>


        <div class="card card-teal">
            <div class="card-header">
                <h4 class="card-title">ข้อมูลแผนการสอน</h4>
            </div>
            <div class="card-body">
                <div class="row mt-3">
                    <div class="col-lg-6">
                        <?php $teach_subject = $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $data_plan['teach_subject_id']]); ?>
                        <strong>กลุ่มสาระ : </strong><span class="text-success"> <?php echo $teach_subject; ?></span>

                    </div>
                    <div class="col-lg-6">
                        <?php $grade_level_name = $database->get("tbl_system_GradeLevel", "grade_level_name", ["grade_level_id" => $data_plan['grade_level_id']]); ?>
                        <strong>ระดับชั้นที่ทำการสอน : </strong><span class="text-success"> <?php echo $grade_level_name; ?></span>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-lg-3">
                        <strong>รหัสวิชา : </strong><span class="text-success"><?php echo $data_plan['subject_code']; ?></span>
                    </div>
                    <div class="col-lg-3">
                        <strong>ชื่อวิชา : </strong><span class="text-success"><?php echo $data_plan['subject_name']; ?></span>
                    </div>
                    <div class="col-lg-3">
                        <strong>หน่วยการเรียนรู้ : </strong><span class="text-success"><?php echo $data_plan['subject_content']; ?></span>
                    </div>
                    <div class="col-lg-3">
                        <strong>ชื่อแผนการสอน : </strong><span class="text-success"><?php echo $data_plan['subject_name_plan']; ?></span>
                    </div>
                </div>

                <div class="row mt-3">
                    <div class="col-lg-3">
                        <strong>วันที่สอน : </strong><span class="text-success"><?php echo thai_date_full($data_plan['teach_date'], 1); ?></span>
                    </div>
                    <div class="col-lg-3">
                        <strong>เริ่มเวลา : </strong><span class="text-success"><?php echo $data_plan['teach_timestart']; ?> น.</span>
                    </div>
                    <div class="col-lg-3">
                        <strong>เสร็จเวลา : </strong><span class="text-success"><?php echo $data_plan['teach_timeend']; ?> น.</span>
                    </div>
                    <div class="col-lg-3">
                        <strong>เวลาที่ใช้ในการสอน (จำนวนนาที) : </strong><span class="text-success"><?php echo $data_plan['teach_minute']; ?> นาที</span>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-lg-1">
                        <strong> วิธีการสอน :</strong>
                    </div>
                    <div class="col-lg-4">
                        <span class="text-success">
                            <?php echo $data_plan['learning_model']; ?>
                        </span>
                    </div>
                    <div class="col-lg-1">
                        <strong>สมรรถนะ :</strong>
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


                <div class="row mt-3 border">
                    <div class="col-lg-2"><strong>ทักษะในศตวรรษที่ 21 : </strong></div>
                    <div class="col-lg-4 ">
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
                    <div class="col-lg-2"><strong>คุณลักษณะอันพึงประสงค์ : </strong></div>
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
                <div class="row mt-3 border">
                    <div class="col-lg-12"><strong>จุดประสงค์การเรียนรู้</strong></div>
                    <div class="col-lg-4">
                        <strong>1. ด้านความรู้ (K) :</strong><br>
                        <span class="text-success"><?php echo $data_plan['objectives_knowledge']; ?></span>
                    </div>
                    <div class="col-lg-4">
                        <strong>2. ด้านทักษะ/กระบวนการ (P) :</strong><br>
                        <span class="text-success"><?php echo $data_plan['objectives_process']; ?></span>
                    </div>
                    <div class="col-lg-4">
                        <strong>3. ด้านคุณลักษณะ (A) :</strong><br>
                        <span class="text-success"><?php echo $data_plan['objectives_attribute']; ?></span>
                    </div>
                </div>


                <div class="row mt-3">
                    <div class="col-lg-6 border"><strong>มาตรฐานการเรียนรู้ ตัวชี้วัด/ผลการเรียนรู้ : </strong><br><span class="text-success"><?php echo $data_plan['learning_outcomes']; ?></span></div>
                    <div class="col-lg-6 border"><strong>สาระการเรียนรู้ : </strong><br><span class="text-success"><?php echo $data_plan['learning_content']; ?></span></div>

                </div>
                <div class="row mt-3">
                    <div class="col-lg-6 border"><strong>ขั้นตอนการจัดกิจกรรมการเรียนรู้/เวลา (นาที) : </strong><br><span class="text-success"><?php echo $data_plan['learning_activities']; ?></span></div>
                    <div class="col-lg-6 border"><strong>สื่อ/แหล่งเรียนรู้ : </strong><br><span class="text-success"><?php echo $data_plan['instructional_media']; ?></span></div>
                </div>

                <div class="row mt-3 ">
                    <div class="col-lg-6 border"><strong>ตัวชี้วัดระหว่างทาง : </strong><br>
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
                    <div class="col-lg-6 border"><strong>ตัวชี้วัดปลายทาง : </strong><br>
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
    </div>
</div>
<div class="row">
    <div class="col-lg-12">
        <div class="card card-info">
            <div class="card-header">
                <h4 class="card-title"><strong>ไฟล์แผนการสอน</strong></h4>
            </div>
            <div class="card-body">
                <iframe src="<?php echo $data_plan['plan_file']; ?>" frameborder="0" width="100%" height="800px" type="application/pdf">Not Support</iframe>
            </div>
        </div>
    </div>
</div>
<form method="POST" id="AppointmentCommittee">
    <div class="row">
        <div class="col-lg-12">
            <div class="card card-navy">
                <div class="card-header">
                    <h4 class="card-title"><strong>อนุมัติใช้แผน</strong></h4>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="plan_approve"><strong>อนุมัติใช้แผนการสอน : </strong></label>
                                <select class="select2bs4" data-placeholder="อนุมัติใช้แผนการสอน" id="plan_approve" name="plan_approve" style="width: 100%;">
                                    <option></option>
                                    <option value="1">อนุมัติใช้แผน</option>
                                    <option value="0">ไม่อนุมัติใช้แผน</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <label for="plan_ds_comment"><strong>ข้อเสนอแนะ : </strong></label>
                            <textarea name="plan_ds_comment" id="plan_ds_comment" class="summernote" height="5" width="100%"></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col-lg-12">
            <div class="card card-pink">
                <div class="card-header">
                    <h4 class="card-title"><strong>แต่งตั้งกรรมการ</strong></h4>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <div class="form-group">
                                    <label for="committee1"><strong>กรรมการท่านที่ 1 : </strong></label>
                                    <select class="form-select committee" data-placeholder="กรรมการท่านที่ 1" name="committee1" id="committee1" style="width: 100%;" disabled>
                                        <option value=""></option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <div class="form-group">
                                    <label for="committee2"><strong>กรรมการท่านที่ 2 : </strong></label>
                                    <select class="form-select committee" data-placeholder="กรรมการท่านที่ 2" name="committee2" id="committee2" style="width: 100%;" disabled>
                                        <option></option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <div class="form-group">
                                    <label for="committee3"><strong>กรรมการท่านที่ 3 : </strong></label>
                                    <select class="form-select committee" data-placeholder="กรรมการท่านที่ 3" name="committee3" id="committee3" style="width: 100%;" disabled>
                                        <option></option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <div class="form-group">
                                    <label for="committee4"><strong>กรรมการท่านที่ 4 : </strong></label>
                                    <select class="form-select committee " data-placeholder="กรรมการท่านที่ 4" name="committee4" id="committee4" style="width: 100%;" disabled>
                                        <option></option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <div class="form-group">
                                    <label for="committee5"><strong>กรรมการท่านที่ 5 : </strong></label>
                                    <select class="form-select committee" data-placeholder="กรรมการท่านที่ 5" name="committee5" id="committee5" style="width: 100%;" disabled>
                                        <option></option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer text-center">
                    <button type="button" class="btn btn-success" id="btn_submit"><i class="fa-regular fa-paper-plane"></i> แต่งตั้งกรรมการ</button>
                    <a href="?module=statusplan" class="btn btn-danger"><i class="fa-solid fa-ban"></i> ยกเลิก</a>
                    <input type="hidden" name="module" value="<?php echo $module; ?>">
                    <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                    <input type="hidden" name="planid" value="<?php echo $planid; ?>">
                </div>
            </div>
        </div>
    </div>
</form>
<script>
    let removeElement = (array, n) => {
        let newArray = [];

        for (let i = 0; i < array.length; i++) {
            if (array[i] !== n) {
                newArray.push(array[i]);
            }
        }
        return newArray;
    };

    let checkDuplicate = (array) => {
        let valuesSoFar = Object.create(null);
        for (let i = 0; i < array.length; ++i) {
            let value = array[i];
            if (value in valuesSoFar) {
                return false;
            }
            valuesSoFar[value] = true;
        }
        return true;
    };

    var committee = [
        <?php
        $data = $database->select("tbl_Users", "*", ["register_isConfirm" => "1", "ORDER" => ["school" => "ASC", "name" => "ASC"]]);
        foreach ($data as $row) {
            echo "{id: '" . $row['people_id'] . "', text: '" . $arrayPrefix[$row['prefix']] . $row['name'] . "  " . $row['lastname'] . "(" . $database->get("tbl_school", "school_name", ["school_id" => $row['school']]) . ")'},";
        }
        ?>
    ];
    $(document).ready(function() {
        $('#plan_ds_comment').summernote('disable')
        $("#plan_approve").change(function() {
            var plan_approve = $('#plan_approve').val();
            if (plan_approve == "0") {
                $("#committee1").attr("disabled", "disabled");
                $("#committee2").attr("disabled", "disabled");
                $("#committee3").attr("disabled", "disabled");
                $("#committee4").attr("disabled", "disabled");
                $("#committee5").attr("disabled", "disabled");
                $('#plan_ds_comment').summernote('enable');
                $('#plan_ds_comment').summernote('code', '<font style="color:red">ไม่อนุมัติใช้แผน เนื่องจาก................</font>');
            } else {
                $("#committee1").removeAttr("disabled");
                $('#plan_ds_comment').summernote('enable');
                $('#plan_ds_comment').summernote('code', '<font style="color:green">แผนการสอนนี้สามารถนำไปใช้งานได้ มีเทคนิควิธีการสอนที่.............<br>มีการวัดผลประเมินผลที่หลากหลาย................<br>...................</font>');
            }
        });


        $(".committee").select2({
            theme: 'bootstrap4',
            width: '100%',
            data: committee,
        });

        $("#committee1").change(function(){
            if($("#committee1").val() != ""){
                $("#committee2").removeAttr("disabled");
            }else{
                $("#committee2").attr("disabled","disabled");
            }
        });

        $("#committee2").change(function(){
            if($("#committee2").val() != ""){
                $("#committee3").removeAttr("disabled");
            }else{
                $("#committee3").attr("disabled","disabled");
            }
        });

        $("#committee3").change(function(){
            if($("#committee3").val() != ""){
                $("#committee4").removeAttr("disabled");
            }else{
                $("#committee4").attr("disabled","disabled");
            }
        });

        $("#committee4").change(function(){
            if($("#committee4").val() != ""){
                $("#committee5").removeAttr("disabled");
            }else{
                $("#committee5").attr("disabled","disabled");
            }
        });



    });
    document.getElementById('btn_submit').addEventListener('click', function() {
        var committee1 = $('#committee1').val();
        var committee2 = $('#committee2').val();
        var committee3 = $('#committee3').val();
        var committee4 = $('#committee4').val();
        var committee5 = $('#committee5').val();
        var plan_approve = $('#plan_approve').val();

        if (plan_approve == "") {
            Swal.fire({
                icon: 'error',
                title: 'กรุณาเลือกอนุมัติใช้แผนการสอน',
                showConfirmButton: true,
                timer: 1500
            });
            plan_approve.focus();
            return false;
        } else if (plan_approve == "0") {
            console.log("ไม่ผ่าน ไม่แต่งตั้งกรรมการ");
            formsubmit();
            return true;
        } else if (plan_approve == "1") {
            console.log("ผ่าน แต่งตั้งกรรมการ");
            committee = [committee1, committee2, committee3, committee4, committee5];
            let element_to_be_removed = "";
            let committeeAA = removeElement(committee, element_to_be_removed);
            if (committeeAA.length == 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'กรุณาเลือกกรรมการอย่างน้อย 1 ท่าน',
                    showConfirmButton: true,
                    timer: 1500
                });
                return false;
            }
            if (!checkDuplicate(committeeAA)) {
                console.log("กรรมการซ้ำ");
                Swal.fire({
                    icon: 'error',
                    title: 'กรุณาเลือกกรรมการไม่ซ้ำกัน',
                    showConfirmButton: true,
                    timer: 1500
                });

                return false;
            } else {
                console.log("กรรมการไม่ซ้ำ");
                formsubmit();
                return true;
            }
        }
    });






    function formsubmit() {
        document.getElementById('AppointmentCommittee').submit();
    }
</script>
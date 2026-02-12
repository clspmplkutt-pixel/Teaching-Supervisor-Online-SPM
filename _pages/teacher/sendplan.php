<style>
    .ui-autocomplete {
        max-height: 150px;
        overflow-y: auto;
        overflow-x: hidden;
    }

    * html .ui-autocomplete {
        height: 150px;
        background-color: #000000;
    }

    textarea {
        width: 100%;
    }

    .textwrapper {
        border: 1px solid #999999;
        margin: 5px 0;
        padding: 3px;
    }
</style>
<?php
session_start();

$title_page = "ส่งแผนการสอน";
$tbl = "tbl_Users";
$tbl_plan = "tbl_sendplan";
ini_set('upload_max_filesize', '100M');
ini_set('post_max_size', '100M');
$data_edit = $database->get($tbl, "*", ["people_id" => $_SESSION['user']]);
// print_r($data_edit);
// echo "<pre>";
// print_r($_POST);
// echo "</pre>";
// exit;

// $database->query("DELETE FROM tbl_sendplan WHERE people_id='3670800508318'")->fetchAll();

if ($operation == $module . "_save") {
    // echo "<pre>";
    // print_r($_POST);
    // echo "</pre>";
    // exit;
    // exit;
    $fileplan_name = $_SESSION['user'] . "_" . date('dmYHis') . ".pdf";
    //ตั้งโฟล์เดอร์สำหรับเก็บไฟล์
    $target_dir = "fileupload/" . $edu_year . "_" . $edu_term . "/";
    //ถ้าไม่มีให้ทำการสร้างโฟลเดอร์ใหม่
    file_exists($target_dir) or mkdir($target_dir, 0777, true);


    $uploadOk = 1;
    $document_file = $target_dir . $fileplan_name;
    $FileType = strtolower(pathinfo($_FILES["plan_file"]["name"], PATHINFO_EXTENSION));

    // echo $FileType;
    // exit;
    // Allow certain file formats
    if ($FileType != "pdf") {
        echo "ไม่ใช่ไฟล์ประเภท PDF ไม่สามารถ Upload ได้.<br>";
        $uploadOk = 0;
    }


    // if ($_FILES["plan_file"]["size"] > 5242880) {
    if ($_FILES["plan_file"]["size"] > 104857600) {
        echo "ขนาดไฟล์ใหญ่มากกว่า 5 เมกกะไบต์<br>";
        $uploadOk = 0;
    }
    if (file_exists($document_file)) {
        unlink($document_file);
    }


    if ($uploadOk == 0) {
        echo "Sorry, your file was not uploaded.<br>";
        exit;
    } else {

        if (move_uploaded_file($_FILES["plan_file"]["tmp_name"], $document_file)) {
            $plan_senddate = date("Y-m-d H:i:s");

            $people_id = trim($people_id);

            $teach_date = cv_year_th2en($_POST['teach_date']);
            // $teach_date = explode("-", $_POST['teach_date']);
            // $teach_date = $teach_date[2] - 543 . "-" . $teach_date[1] . "-" . $teach_date[0];


            $competency = implode(",", $_POST['competency']);

            $ability21 = implode(",", $_POST['ability21']);
            $desirable = implode(",", $_POST['desirable']);
            $indicators_mid = implode(",", $_POST['indicators_mid']);
            $indicators_final = implode(",", $_POST['indicators_final']);


            $result = $database->insert(
                $tbl_plan,
                [
                    "people_id" => $people_id,
                    "school_code" => $school_code,
                    "teach_subject_id" => $teach_subject_id,
                    "grade_level_id" => $grade_level_id,
                    "edu_year" => $edu_year,
                    "edu_term" => $edu_term,
                    "budget_year" => $budget_year,
                    "subject_code" => $subject_code,
                    "subject_name" => $subject_name,
                    "subject_content" => $subject_content,
                    "subject_name_plan" => $subject_name_plan,
                    "teach_date" => $teach_date,
                    "teach_timestart" => $teach_timestart,
                    "teach_timeend" => $teach_timeend,
                    "teach_minute" => $teach_minute,
                    "learning_model" => trim($learning_model),
                    "competency" => $competency,
                    "ability21" => $ability21,
                    "desirable" => $desirable,


                    "learning_outcomes" => $learning_outcomes,
                    "learning_content" => $learning_content,
                    "learning_activities" => $learning_activities,
                    // "assessment" => $assessment,
                    "instructional_media" => $instructional_media,
                    "indicators_mid" => $indicators_mid,
                    "indicators_final" => $indicators_final,

                    "Measurement_how" => $Measurement_how,
                    "Measurement_tools" => $Measurement_tools,
                    "Measurement_scoring" => $Measurement_scoring,
                    "Measurement_outcomes" => $Measurement_outcomes,

                    "objectives_knowledge" => $objectives_knowledge,
                    "objectives_process" => $objectives_process,
                    "objectives_attribute" => $objectives_attribute,

                    "plan_file" => $document_file,
                    "plan_senddate" => $plan_senddate,
                    "plan_status" => "1",
                    "plan_clip" => "",
                    "committee1" => "",
                    "date_scoring1" => "0000-00-00",
                    "committee2" => "",
                    "date_scoring2" => "0000-00-00",
                    "committee3" => "",
                    "date_scoring3" => "0000-00-00",
                    "committee4" => "",
                    "date_scoring4" => "0000-00-00",
                    "committee5" => "",
                    "date_scoring5" => "0000-00-00",
                ]
            );



            if ($result->rowCount() != 0) {
                echo "<h1 class=text-success mx-auto>ส่งสำเร็จแล้ว</h1>";
                echo "<script>";
                echo "Swal.fire({";
                echo "title: 'ส่งสำเร็จแล้ว',";
                echo "text: 'ระบบกำลังนำท่านกลับไปหน้าแรก',";
                echo "icon: 'success',";
                echo "showCancelButton: false,";
                echo "confirmButtonColor: '#3085d6',";
                echo "cancelButtonColor: '#d33',";
                echo "confirmButtonText: 'OK'";
                echo "}).then((result) => {";
                echo "if (result.isConfirmed) {";
                echo "window.location = '?module=statusplan';";
                echo "}";
                echo "})";

                echo "</script>";
                location_to("?module=statusplan", "3");
            } else {
                echo "<h1 class=text-danger>ไม่สามารถส่งแผนได้ เกิดข้อผิดพลาด</h1>";
                location_to("?module=sendplan", "3");
            }
            exit;
        } else {
            echo "Sorry, there was an error uploading your file.";
        }
    }
}

?>
<script>
    $(function() {
        var subject_code = [
            <?php
            $sql_subject = "SELECT DISTINCT subject_code FROM tbl_sendplan WHERE people_id = " . $_SESSION['user'] . " ORDER BY subject_code ASC";
            $data_subject = $database->query($sql_subject)->fetchAll();

            foreach ($data_subject as $key => $value) {
                echo "'" . $value["subject_code"] . "',";
            }
            ?>
        ];
        var subject_name = [
            <?php
            $sql_subject = "SELECT DISTINCT subject_name FROM tbl_sendplan WHERE people_id = " . $_SESSION['user'] . " ORDER BY subject_name ASC";
            // echo $sql_subject;
            $data_subject = $database->query($sql_subject)->fetchAll();
            foreach ($data_subject as $key => $value) {
                echo "'" . $value["subject_name"] . "',";
            }
            ?>
        ];

        var learning_model = [
            <?php
            $sql_subject = "SELECT DISTINCT model_name FROM tbl_learningModel WHERE model_status='1' ORDER BY model_name ASC";
            // echo $sql_subject;
            $data_subject = $database->query($sql_subject)->fetchAll();
            foreach ($data_subject as $key => $value) {
                echo "'" . $value["model_name"] . "',";
            }
            ?>
        ];
        $("#subject_name").autocomplete({
            source: subject_name
        });
        $("#subject_code").autocomplete({
            source: subject_code,
        });
        $("#learning_model").autocomplete({
            source: learning_model,
        });
    });
</script>
<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <form method="POST" enctype="multipart/form-data" autocomplete="off" class="form-horizontal was-validated">
            <div class="card card-success">
                <div class="card-header">
                    <h4 class="card-title">ข้อมูลผู้จัดทำแผน</h4>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-6">
                            <?php $prefix = $database->get("tbl_system_prefix", "prefix", ["prefix_id" => $data_edit['prefix']]); ?>
                            ชื่อผู้จัดทำแผน : <span class="text-success"> <?php echo $prefix . $data_edit['name'] . " " . $data_edit['lastname']; ?> (<?php echo $data_edit['people_id']; ?>)</span>
                        </div>
                        <div class="col-lg-6">
                            <?php $position = $database->get("tbl_system_PersonPositionType", "position_name", ["position_id" => $data_edit['position_id']]); ?>
                            <?php $academic = $database->get("tbl_system_Academic_Standing", "academic_standing", ["academic_id" => $data_edit['academic_id']]); ?>
                            ตำแหน่ง : <span class="text-success"> <?php echo $position; ?> (วิทยฐานะ <?php echo $academic; ?>)</span>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <?php $school = $database->get("tbl_school", "school_name", ["school_id" => $data_edit['school']]); ?>
                            โรงเรียน : <span class="text-success"> <?php echo $school; ?> </span>
                        </div>
                        <div class="col-lg-6">
                            <?php $teach_subject = $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $data_edit['teach_subject']]); ?>
                            กลุ่มสาระ : <span class="text-success"> <?php echo $teach_subject; ?> </span>
                        </div>
                    </div>
                </div>
            </div>


            <div class="card card-teal">
                <div class="card-header">
                    <h4 class="card-title">กลุ่มสาระ/ระดับชั้น</h4>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="teach_subject_id">กลุ่มสาระ :</label>
                                <select name="teach_subject_id" id="teach_subject_id" class="select2bs4" data-placeholder="กลุ่มสาระ" onchange="location.href = this.value;" style="width:100%;" required>
                                    <option value=""></option>
                                    <?php
                                    $data = $database->select("tbl_system_Teach_Subject", "*", ["teach_subject_status" => "1", "ORDER" => ["teach_subject_id" => "ASC"]]);
                                    foreach ($data as $row) {
                                        if ($teach_subject_id == $row['teach_subject_id']) {
                                            $select_1 = " selected ";
                                        } else {
                                            $select_1 = "";
                                        }
                                    ?>
                                        <option value="?module=<?php echo $module; ?>&teach_subject_id=<?php echo $row['teach_subject_id']; ?>&teach_level=<?php echo $teach_level; ?>" <?php echo $select_1; ?>> <?php echo $row['teach_subject']; ?></option>
                                    <?php
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="grade_level_id">ระดับชั้นที่ทำการสอน : </label>
                                <select name="grade_level_id" id="grade_level_id" class="select2bs4" data-placeholder="ระดับชั้นที่ทำการสอน" onchange="location.href = this.value;" style="width:100%;" required>
                                    <option value=""></option>
                                    <?php
                                    $data = $database->select("tbl_system_GradeLevel", "*", ["grade_level_status" => "1", "grade_level_id[!]" => "499", "ORDER" => ["grade_level_id" => "ASC"]]);
                                    foreach ($data as $row) {
                                        if ($grade_level_id == $row['grade_level_id']) {
                                            $select_2 = "selected";
                                        } else {
                                            $select_2 = "";
                                        }
                                    ?>
                                        <option value="?module=<?php echo $module; ?>&teach_subject_id=<?php echo $teach_subject_id; ?>&grade_level_id=<?php echo $row['grade_level_id']; ?>" <?php echo $select_2; ?>> <?php echo $row['grade_level_name']; ?></option>
                                    <?php
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>






            <div class="card card-info">
                <div class="card-header">
                    <h4 class="card-title">ข้อมูลแผนการสอน</h4>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-1">
                            <div class="mb-3 mt-3">
                                <label for="subject_code">รหัสวิชา : </label>
                                <input type="text" id="subject_code" name="subject_code" class="form-control" placeholder="รหัสวิชา" required autocomplete="off">
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="subject_name">ชื่อวิชา : </label>
                                <input type="text" id="subject_name" name="subject_name" class="form-control" placeholder="ชื่อวิชา" required>
                            </div>
                        </div>
                        <div class="col-lg-2">
                            <div class="mb-3 mt-3">
                                <label for="subject_content">หน่วยการเรียนรู้ : </label>
                                <input type="text" id="subject_content" name="subject_content" class="form-control" placeholder="หน่วยการเรียนรู้" required>
                            </div>
                        </div>
                        <div class="col-lg-5">
                            <div class="mb-3 mt-3">
                                <label for="subject_name_plan">ชื่อแผนการสอน : </label>
                                <input type="text" id="subject_name_plan" name="subject_name_plan" class="form-control" placeholder="ชื่อแผนการสอน" required>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-3">
                            <div class="mb-3 mt-3">
                                <label for="teach_date">วันที่ทำการสอน : </label>
                                <input class="form-control datethai" type="text" id="teach_date" name="teach_date" required>
                            </div>
                        </div>
                        <div class="col-lg-3">
                            <div class="mb-3 mt-3">
                                <label for="teach_timestart">เริ่มเวลา : </label>
                                <input type="time" id="teach_timestart" name="teach_timestart" class="form-control" min="07:00" max="17:00" required>
                            </div>
                        </div>
                        <div class="col-lg-3">
                            <div class="mb-3 mt-3">
                                <label for="teach_timeend">เสร็จเวลา : </label>
                                <input type="time" id="teach_timeend" name="teach_timeend" class="form-control" min="07:00" max="17:00" required>
                            </div>
                        </div>
                        <div class="col-lg-3">
                            <div class="mb-3 mt-3">
                                <label for="teach_minute">เวลาที่ใช้ในการสอน (จำนวนนาที) : </label>
                                <input type="number" id="teach_minute" name="teach_minute" class="form-control" min="0" max="240" step="1" required>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3 ui-widget">
                                <label for="learning_model">วิธีการสอน : </label>
                                <input type="text" id="learning_model" name="learning_model" class="form-control" placeholder="วิธีการสอน" required autocomplete="off">
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="competency[]">สมรรถนะ : </label>
                                <select name="competency[]" id="competency" class="custom-select select2bs4" multiple="multiple" data-placeholder="สมรรถนะ" required>
                                    <option value=""></option>
                                    <?php
                                    $data = $database->select("tbl_system_Competency", "*", ["competency_status" => "1", "ORDER" => ["competency_id" => "ASC"]]);
                                    foreach ($data as $row) {

                                        echo "<option value='" . $row['competency_id'] . "'>" . $row['competency_id'] . " : " . $row['competency_name'] . "</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <div class="form-group">
                                    <label for="ability21[]">ทักษะในศตวรรษที่ 21 : </label>
                                    <select class="select2bs4" multiple="multiple" data-placeholder="ทักษะในศตวรรษที่ 21" name="ability21[]" style="width: 100%;">
                                        <?php
                                        $data = $database->select("tbl_ability21", "*", ["ability21_status" => "1", "ORDER" => ["id" => "ASC"]]);
                                        foreach ($data as $row) {

                                            echo "<option value='" . $row['ability21_id'] . "'>" . $row['ability21_id'] . " : " . $row['ability21_name_th'] . "</option>";
                                        }
                                        ?>

                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <div class="form-group">
                                    <label for="desirable[]">คุณลักษณะอันพึงประสงค์ : </label>
                                    <select class="select2bs4" multiple="multiple" data-placeholder="คุณลักษณะอันพึงประสงค์" name="desirable[]" style="width: 100%;">
                                        <?php
                                        $data = $database->select("tbl_system_Desirable", "*", ["desirable_status" => "1", "ORDER" => ["desirable_id" => "ASC"]]);
                                        foreach ($data as $row) {

                                            echo "<option value='" . $row['desirable_id'] . "'>" . $row['desirable_id'] . " : " . $row['desirable_name'] . "</option>";
                                        }
                                        ?>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <hr>
                    <div class="row">
                        <div class="col-lg-12">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title">จุดประสงค์การเรียนรู้</h4>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-lg-12">
                                            <div class="mb-3 mt-3">
                                                <label for="objectives_knowledge">1. ด้านความรู้ (K) : </label>
                                                <textarea class="form-control notemini" name="objectives_knowledge" id="objectives_knowledge" cols="30" rows="10"></textarea>
                                            </div>
                                        </div>
                                        <div class="col-lg-12">
                                            <div class="mb-3 mt-3">
                                                <label for="objectives_process">2. ด้านทักษะ/กระบวนการ (P) : </label>
                                                <textarea class="form-control notemini" name="objectives_process" id="objectives_process" cols="30" rows="10"></textarea>
                                            </div>
                                        </div>
                                        <div class="col-lg-12">
                                            <div class="mb-3 mt-3">
                                                <label for="objectives_attribute">3. ด้านคุณลักษณะ (A) : </label>
                                                <textarea class="form-control notemini" name="objectives_attribute" id="objectives_attribute" cols="30" rows="10"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="learning_outcomes">มาตรฐานการเรียนรู้ ตัวชี้วัด/ผลการเรียนรู้ : </label>
                                <textarea class="form-control notemini" name="learning_outcomes" id="learning_outcomes" cols="30" rows="10"></textarea>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="learning_content">สาระการเรียนรู้ : </label>
                                <textarea class="form-control notemini" name="learning_content" id="learning_content" cols="30" rows="10"></textarea>
                            </div>
                        </div>

                    </div>
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="learning_activities">ขั้นตอนการจัดกิจกรรมการเรียนรู้/เวลา (นาที) : </label>
                                <textarea class="form-control notemini" name="learning_activities" id="learning_activities" cols="500" rows="10"></textarea>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="instructional_media">สื่อ/แหล่งเรียนรู้ : </label>
                                <textarea class="form-control notemini" name="instructional_media" id="instructional_media" cols="30" rows="10"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card card-navy">
                <div class="card-header">
                    <h4 class="card-title">การวัดผลประเมินผล</h4>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="Measurement_how">1. วิธีการวัดและประเมินผล : </label>
                                <textarea class="form-control notemini" name="Measurement_how" id="Measurement_how" cols="30" rows="10"></textarea>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="Measurement_tools">2. เครื่องมือวัดและประเมินผล : </label>
                                <textarea class="form-control notemini" name="Measurement_tools" id="Measurement_tools" cols="30" rows="10"></textarea>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="Measurement_scoring">3.เกณฑ์การให้คะแนน : </label>
                                <textarea class="form-control notemini" name="Measurement_scoring" id="Measurement_scoring" cols="30" rows="10"></textarea>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="Measurement_outcomes">4. การตัดสินผลการเรียนรู้ : </label>
                                <textarea class="form-control notemini" name="Measurement_outcomes" id="Measurement_outcomes" cols="30" rows="10"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <?php
            if ($teach_subject_id != "" && $grade_level_id != "") {
                $data = $database->select("tbl_indicators", "*", ["teach_subject_id" => $teach_subject_id, "grade_level_id" => $grade_level_id, "indicator_id" => "1", "ORDER" => ["indicators_name" => "ASC"]]);
                if (count($data) == 0) {
                    $data = $database->select("tbl_indicators", "*", ["teach_subject_id" => $teach_subject_id, "grade_level_id" => "499", "indicator_id" => "1", "ORDER" => ["indicators_name" => "ASC"]]);
                }
            ?>
                <!-- <div class="row"> -->
                <div class="card card-pink">
                    <div class="card-header">
                        <h4 class="card-title">ตัวชี้วัดระหว่างทาง</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <?php
                            foreach ($data as $ind) {
                            ?>
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <input type="checkbox" name="indicators_mid[]" id="indicators_mid" value="<?php echo $ind['indicators_name']; ?>"> <?php echo $ind['indicators_name'] . "(" . $ind['indicator_group'] . ")" . " : " . $ind['indicators_details']; ?>
                                    </div>
                                </div>
                            <?php } ?>
                        </div>
                    </div>
                </div>
                <!-- </div> -->
            <?php } ?>


            <?php
            if ($teach_subject_id != "" && $grade_level_id != "") {
                $data = $database->select("tbl_indicators", "*", ["teach_subject_id" => $teach_subject_id, "grade_level_id" => $grade_level_id, "indicator_id" => "2", "ORDER" => ["indicators_name" => "ASC"]]);
                if (count($data) == 0) {
                    $data = $database->select("tbl_indicators", "*", ["teach_subject_id" => $teach_subject_id, "grade_level_id" => "499", "indicator_id" => "2", "ORDER" => ["indicators_name" => "ASC"]]);
                }
            ?>
                <!-- <div class="row"> -->
                <div class="card card-purple">
                    <div class="card-header">
                        <h4 class="card-title">ตัวชี้วัดปลายทาง</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <?php
                            foreach ($data as $ind) {
                            ?>
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <input type="checkbox" name="indicators_final[]" id="indicators_final" value="<?php echo $ind['indicators_name']; ?>"> <?php echo $ind['indicators_name'] . "(" . $ind['indicator_group'] . ")" . " : " . $ind['indicators_details']; ?>
                                    </div>
                                </div>
                            <?php } ?>
                        </div>

                    </div>
                </div>
                <!-- </div> -->
            <?php } ?>

            <!-- <div class="row"> -->
            <!-- <div class="col-lg-12"> -->
            <div class="card card-olive">
                <div class="card-header">
                    <h4 class="card-title text-white">แนบไฟล์แผนการสอน : </h4>
                </div>
                <div class="card-body">
                    <input type="file" name="plan_file" id="plan_file" required>
                </div>


                <div class="card-footer text-center">
                    <button type="submit" class="btn btn-success" id="btn_submit"><i class="fa-regular fa-paper-plane"></i> ส่งแผนการสอน</button>
                    <a href="?module=userteacher" class="btn btn-danger"><i class="fa-solid fa-ban"></i> ยกเลิก</a>

                    <input type="hidden" name="module" value="<?php echo $module; ?>">
                    <input type="hidden" name="people_id" value="<?php echo $data_edit['people_id']; ?>">
                    <input type="hidden" name="school_code" value="<?php echo $data_edit['school']; ?>">
                    <input type="hidden" name="teach_subject_id" value="<?php echo $teach_subject_id; ?>">
                    <input type="hidden" name="grade_level_id" value="<?php echo $grade_level_id; ?>">
                    <input type="hidden" name="edu_year" value="<?php echo EDUYEAR; ?>">
                    <input type="hidden" name="edu_term" value="<?php echo EDUROUND; ?>">
                    <input type="hidden" name="budget_year" value="<?php echo BUDGET_YEAR; ?>">

                    <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                </div>
            </div>
            <!-- </div> -->
            <!-- </div> -->

        </form>
    </div>
</div>
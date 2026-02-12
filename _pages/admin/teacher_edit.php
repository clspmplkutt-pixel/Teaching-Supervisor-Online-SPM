<?php
session_start();

$title_page = "แก้ไขข้อมูลครู";
$tbl = "tbl_Users";

if ($people_id != "") {
    $data_edit = $database->get($tbl, "*", ["people_id" => $people_id]);
    $has_people_id = 1;
} elseif ($id != "") {
    $data_edit = $database->get($tbl, "*", ["id" => $id]);
    $has_people_id = 0;
}

//หากมีการกดปุ่มบันทึกมาให้ทำในนี้
if ($operation == $module . "_save") {
    // echo $position_id;
    // exit;
    //ตรวจสอบการเปลี่ยนตำแหน่ง
    if ($position_id == "10008" || $position_id == "10009") {
        //เปลี่ยนตำแหน่งเป็น ผอ.เขต
        $level = "districdirector";
        $school = AREA_CODE10;
    } elseif ($position_id == "10010") {
        //เปลี่ยนตำแหน่งเป็น ศน.
        $level = "supervisor";
        $school = AREA_CODE10;
    } elseif ($position_id == "10007" || $position_id == "10006") {
        //เปลี่ยนตำแหน่งเป็นรอง ผอ.
        $level = "directorschool";
    } elseif ($position_id == "10000" || $position_id == "10001" || $position_id == "10999") {
        //เปลี่ยนตำแหน่งครู
        $level = "teacher";
    }

    $lastupdate = date("Y-m-d H:i:s");
    //ไม่มีเลขประจำตัวประชาชน ให้บันทึกด้วย id
    if ($has_people_id == "0") {
        $people_id = trim($people_id);
        $has_people_id_u = $database->has($tbl, ["people_id" => $people_id]);
        if ($has_people_id_u) {
            echo "มีสมาชิกท่านนี้อยู่แล้วครับ มีอยู่แล้วครับ ";
            location_to("?module=userteacher", "2");
        } else {
            $result = $database->update(
                $tbl,
                [
                    "people_id" => $people_id,
                    "prefix" => $prefix,
                    "name" => $name,
                    "lastname" => $lastname,
                    "persontype_id" => $persontype_id,
                    "position_id" => $position_id,
                    "academic_id" => $academic_id,
                    "gender" => $gender,
                    "birthday" => $birthday,
                    "school" => $school,
                    "edu_level" => $edu_level,
                    "headDepartment" => $headDepartment,
                    "chairman" => "0",
                    "teach_subject" => $teach_subject,
                    "teach_subject_name" => $teach_subject_name,
                    "teach_level" => $teach_level,
                    "phone" => $phone,
                    "email" => $email,
                    "level" => $level,
                    "lastupdate" => $lastupdate,
                    "update_by" => $_SESSION['user']
                ],
                ["id" => $id]
            );
        }
    } elseif ($has_people_id == "1") {
        //ถ้ามีเลขประจำตัวประชาชนให้ทำการ update ข้อมูลอื่น ๆ โดยอ้างอิงเลขประจำตัวประชาชน ไม่แก้ไขเลขประจำตัวประชาชน
        $people_id = trim($people_id);

        $result = $database->update(
            $tbl,
            [
                "prefix" => $prefix,
                "name" => $name,
                "lastname" => $lastname,
                "persontype_id" => $persontype_id,
                "position_id" => $position_id,
                "academic_id" => $academic_id,
                "gender" => $gender,
                "birthday" => $birthday,
                "school" => $school,
                "edu_level" => $edu_level,
                "headDepartment" => $headDepartment,
                "chairman" => "0",
                "teach_subject" => $teach_subject,
                "teach_subject_name" => $teach_subject_name,
                "teach_level" => $teach_level,
                "phone" => $phone,
                "email" => $email,
                "level" => $level,
                "lastupdate" => $lastupdate,
                "update_by" => $_SESSION['user']
            ],
            ["people_id" => $people_id]
        );
    }
    if ($result->rowCount() != 0) {
        echo "<h1 class=text-success mx-auto>เพิ่มข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=userteacher", "0");
    } else {
        echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=userteacher", "0");
    }
    exit;
} //จบการบันทึก


?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">

        <form method="POST">

            <div class="card card-success">
                <div class="card-header">
                    <h4 class="card-title">แก้ไขข้อมูล</h4>
                </div>
                <div class="card-body">
                    <div class="mb-3 mt-3">
                        <?php
                        $text_peopleid_error = "";
                        // echo "เลขประชาชนคือ : " . $data_edit['people_id'];
                        if ($data_edit['people_id'] == null &&  $peopleid_error == "peopleidError") {
                            $readonly_text = "";
                            $text_peopleid_error = "ไม่ได้ระบุเลขประจำตัวประชาชน";
                        } elseif (!checkPID($data_edit['people_id'])) {
                            $readonly_text = "";
                            $text_peopleid_error = "เลขประจำตัวประชาชนไม่ถูกต้อง";
                        } elseif ($data_edit['people_id'] != null &&  $peopleid_error == "peopleidDup") {
                            $readonly_text = "";
                            $text_peopleid_error = "เลขประจำตัวประชาชนซ้ำ";
                        } else {
                            $readonly_text = " readonly='true' ";
                            $text_peopleid_error = "";
                        }
                        ?>
                        <label for="people_id">เลขประจำตัวประชาชน ** <span id="msg_people_id" class="text-danger"><?php echo $text_peopleid_error; ?></span></label>

                        <input type="text" class="form-control" id="people_id" name="people_id" value="<?php echo $data_edit['people_id']; ?>" <?php echo $readonly_text; ?> required>
                    </div>
                    <div class="row">
                        <div class="col-lg-2">
                            <div class="mb-3 mt-3">
                                <label for="prefix">คำนำหน้า</label>
                                <select name="prefix" id="prefix" class="custom-select select2bs4" required>
                                    <option value="">คำนำหน้า</option>
                                    <?php
                                    $data = $database->select("tbl_system_prefix", "*", ["prefix_status" => "1", "ORDER" => ["id" => "ASC"]]);
                                    foreach ($data as $row) {
                                        if ($data_edit['prefix'] == $row['prefix_id']) {
                                            $sel = " selected";
                                        } else {
                                            $sel = "";
                                        }
                                        echo "<option value='" . $row['prefix_id'] . "'$sel>" . $row['prefix'] . "</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-5">
                            <div class="mb-3 mt-3">
                                <label for="name">ชื่อ</label>
                                <input type="text" class="form-control" id="name" name="name" value="<?php echo $data_edit['name']; ?>" required>
                            </div>
                        </div>
                        <div class="col-lg-5">
                            <div class="mb-3 mt-3">
                                <label for="lastname">นามสกุล</label>
                                <input type="text" class="form-control" id="lastname" name="lastname" value="<?php echo $data_edit['lastname']; ?>" required>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="gender">เพศ</label>
                                <select name="gender" id="gender" class="custom-select select2bs4" required>
                                    <option value="">เพศ</option>
                                    <?php
                                    $data = $database->select("tbl_system_gender", "*", ["ORDER" => ["id" => "ASC"]]);
                                    foreach ($data as $row) {
                                        if ($data_edit['gender'] == $row['gender_id']) {
                                            $sel = " selected";
                                        } else {
                                            $sel = "";
                                        }
                                        echo "<option value='" . $row['gender_id'] . "'$sel>" . $row['gender'] . "</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="birthday">วันเกิด</label> <span class="text-success">(<?php echo thai_date_full($data_edit['birthday'], 5); ?>) </span><span class="text-danger">เช่น 19 ก.ค. 2522 กรอก 1979-07-19</span>
                                <input class="form-control" type="text" id="birthday" name="birthday" data-provide="datepicker" data-date-language="th" value="<?php echo $data_edit['birthday']; ?>" required>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="edu_level">วุฒิการศึกษาสูงสุด</label>
                                <select name="edu_level" id="edu_level" class="custom-select select2bs4" required>
                                    <option value="">วุฒิการศึกษาสูงสุด</option>
                                    <?php
                                    $data = $database->select("tbl_system_EducationLevel", "*", ["educationlevel_status" => "1", "ORDER" => ["id" => "ASC"]]);
                                    foreach ($data as $row) {
                                        if ($data_edit['edu_level'] == $row['educationlevel_id']) {
                                            $sel = " selected";
                                        } else {
                                            $sel = "";
                                        }
                                        echo "<option value='" . $row['educationlevel_id'] . "'$sel>" . $row['educationlevel_name'] . "</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="phone">เบอร์โทรศัพท์</label>
                                <input class="form-control" type="text" id="phone" name="phone" placeholder="เบอร์โทรศัพท์" value="<?php echo $data_edit['phone']; ?>">
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="mb-3 mt-3">
                                <label for="email">Email</label>
                                <input class="form-control" type="email" id="email" name="email" placeholder="E-mail" value="<?php echo $data_edit['email']; ?>">
                            </div>
                        </div>

                    </div>

                    <div class="row">
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="persontype_id">ประเภทบุคลากร</label>
                                <select name="persontype_id" id="persontype_id" class="custom-select select2bs4" required>
                                    <option value="">ประเภทบุคลากร</option>
                                    <?php
                                    $data = $database->select("tbl_system_PersonType", "*", ["persontype_status" => "1", "ORDER" => ["persontype_id" => "ASC"]]);
                                    foreach ($data as $row) {
                                        if ($data_edit['persontype_id'] == $row['persontype_id']) {
                                            $sel = " selected";
                                        } else {
                                            $sel = "";
                                        }

                                        echo "<option value='" . $row['persontype_id'] . "'$sel>" . $row['persontype_name'] . "</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="position_id">ตำแหน่ง</label>
                                <select name="position_id" id="position_id" class="custom-select select2bs4" required>
                                    <option value="">ตำแหน่ง</option>
                                    <?php
                                    $data = $database->select("tbl_system_PersonPositionType", "*", ["position_status" => "1", "ORDER" => ["position_name" => "ASC"]]);
                                    foreach ($data as $row) {
                                        if ($data_edit['position_id'] == $row['position_id']) {
                                            $sel = " selected";
                                        } else {
                                            $sel = "";
                                        }
                                        echo "<option value='" . $row['position_id'] . "'$sel>" . $row['position_name'] . "</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="academic_id">วิทยฐานะ</label>
                                <select name="academic_id" id="academic_id" class="custom-select select2bs4" required>
                                    <option value="">วิทยฐานะ</option>
                                    <?php
                                    $data = $database->select("tbl_system_Academic_Standing", "*", ["academic_status" => "1", "ORDER" => ["academic_id" => "ASC"]]);
                                    foreach ($data as $row) {
                                        if ($data_edit['academic_id'] == $row['academic_id']) {
                                            $sel = " selected";
                                        } else {
                                            $sel = "";
                                        }
                                        echo "<option value='" . $row['academic_id'] . "'$sel>" . $row['academic_standing'] . "</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="school">โรงเรียน</label>
                                <select name="school" id="school" class="custom-select select2bs4" required>
                                    <option value="">โรงเรียน</option>
                                    <?php
                                    $data = $database->select("tbl_school", "*", ["ORDER" => ["school_name" => "ASC", "khet_code" => "ASC"]]);

                                    foreach ($data as $row) {
                                        if ($data_edit['school'] == $row['school_id']) {
                                            $sel = " selected";
                                        } else {
                                            $sel = "";
                                        }
                                        echo "<option value='" . $row['school_id'] . "'$sel>" . $row['school_name'] . "</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="teach_subject">กลุ่มสาระ</label>
                                <select name="teach_subject" id="teach_subject" class="custom-select select2bs4" required>
                                    <option value="">กลุ่มสาระ</option>
                                    <?php
                                    $data = $database->select("tbl_system_Teach_Subject", "*", ["teach_subject_status" => "1", "ORDER" => ["teach_subject_id" => "ASC"]]);
                                    foreach ($data as $row) {
                                        if ($data_edit['teach_subject'] == $row['teach_subject_id']) {
                                            $sel = " selected";
                                        } else {
                                            $sel = "";
                                        }
                                        echo "<option value='" . $row['teach_subject_id'] . "'$sel>" . $row['teach_subject'] . "</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="headDepartment">หัวหน้ากลุ่มสาระ</label>
                                <select name="headDepartment" id="headDepartment" class="custom-select select2bs4" required>
                                    <option value=""></option>
                                    <option value="0" <?php echo (($data_edit['headDepartment'] == "0" || $data_edit['headDepartment'] == "" || $data_edit['headDepartment'] == null) ? " selected" : ""); ?>>ไม่ได้เป็นหัวหน้ากลุ่มสาระ</option>
                                    <option value="1" <?php echo ($data_edit['headDepartment'] == "1" ? " selected" : ""); ?>>เป็นหัวหน้ากลุ่มสาระ</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="teach_subject_name">วิชาที่ทำการสอน</label>
                                <input class="form-control" type="text" id="teach_subject_name" name="teach_subject_name" placeholder="วิชาที่ทำการสอน" value="<?php echo $data_edit['teach_subject_name']; ?>" required>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="teach_level">ระดับชั้นที่ทำการสอน</label>
                                <select name="teach_level" id="teach_level" class="custom-select select2bs4" required>
                                    <option value="">ระดับชั้นที่ทำการสอน</option>
                                    <?php
                                    $data = $database->select("tbl_system_GradeLevel", "*", ["grade_level_status" => "1", "grade_level_id[!]" => "499", "ORDER" => ["grade_level_id" => "ASC"]]);
                                    foreach ($data as $row) {
                                        if ($data_edit['teach_level'] == $row['grade_level_id']) {
                                            $sel = " selected";
                                        } else {
                                            $sel = "";
                                        }
                                        echo "<option value='" . $row['grade_level_id'] . "'$sel>" . $row['grade_level_name'] . "</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>

                    </div>

                </div>
                <div class="card-footer text-center">
                    <button type="submit" class="btn btn-success" id="btn_submit"><i class="fa-solid fa-user-pen"></i> แก้ไขข้อมูล</button>
                    <a href="?module=userteacher" class="btn btn-danger"><i class="fa-solid fa-ban"></i> ยกเลิก</a>

                    <input type="hidden" name="module" value="<?php echo $module; ?>">
                    <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                    <?php if ($data_edit['people_id'] != "") { ?>
                        <input type="hidden" name="people_id" value="<?php echo $people_id; ?>">
                    <?php } else { ?>
                        <input type="hidden" name="id" value="<?php echo $id; ?>">
                    <?php } ?>
                    <input type="hidden" name="has_people_id" value="<?php echo $has_people_id; ?>">
                </div>
            </div>
        </form>
    </div>
</div>

<script language="javascript">
    //เมื่อมีการคลิกฟังก์ชัน
    $(function() {

        $('#people_id').keyup(function() {
            if ($('#people_id').val().length == 13) {
                if ($('#people_id').val().trim() == '') {
                    $('#msg_people_id').text('(กรุณากรอกเลขประจำตัวประชาชน)');
                } else {
                    if (!checkID($('#people_id').val().trim())) {
                        $('#msg_people_id').text('(เลขประจำตัวประชาชนไม่ถูกต้อง)');
                        $('#people_id').removeClass("is-valid");
                        $('#people_id').addClass("is-invalid");
                    } else {
                        $('#msg_people_id').text('เลขประจำตัวประชาชนถูกต้อง');
                        $('#people_id').removeClass("is-invalid");
                        $('#people_id').addClass("is-valid");
                        people_id = $('#people_id').val().trim();
                        var getData = $.ajax({
                            type: "POST",
                            data: "rev=1",
                            async: false,
                            url: "data_member.php",
                            data: {
                                people_id: people_id
                            },
                            success: function(data) {
                                // console.log(data);
                                if (data == 1) {
                                    $("span#msg_people_id").html("เป็นสมาชิกอยู่แล้ว ไม่สามารถสมัครได้");
                                    document.getElementById('btn_submit').disabled = true;
                                } else {
                                    $("span#msg_people_id").html("ไม่ได้เป็นสมาชิกสามารถสมัครได้");
                                    document.getElementById('btn_submit').disabled = false;
                                }
                            }
                        });
                        return false;
                    }
                }
            }
            if ($('#people_id').val.length != 13) {
                $('#msg_people_id').text('');
                document.getElementById('btn_submit').disabled = true;
            }
        });

    });
</script>
<?php
session_start();

$title_page = "แก้ไขข้อมูลครู";
$tbl = "tbl_Users";

// print_r($data_edit);

// if ($people_id == "" || $people_id == NULL || $) {
//     location_to("?module=userteacher", "0");
// }
if ($operation == $module . "_save") {
    // echo "<pre>";
    // print_r($_REQUEST);
    // echo "</pre>";
    // exit;

    $lastupdate = date("Y-m-d H:i:s");

    $people_id = trim($people_id);
    // $has_people_id = $database->has($tbl, ["people_id" => $people_id]);
    // if ($has_people_id) {
    //     echo "มีสมาชิกท่านนี้อยู่แล้วครับ มีอยู่แล้วครับ ";
    //     location_to("register_1.php", "2");
    // } else {
    $birthday = cv_year_th2en($birthday);

    $result = $database->update(
        $tbl,
        [
            "people_id" => $people_id,
            "prefix" => $prefix,
            "name" => $name,
            "lastname" => $lastname,
            "academic_id" => $academic_id,
            "gender" => $gender,
            "birthday" => $birthday,
            "edu_level" => $edu_level,
            "chairman" => "0",
            "teach_subject" => $teach_subject,
            "teach_subject_name" => $teach_subject_name,
            "teach_level" => $teach_level,
            "phone" => $phone,
            "email" => $email,
            "lastupdate" => $lastupdate,
            // "update_by" => $_SESSION['user']
        ],
        ["people_id" => $_SESSION['user']]
    );
    if ($result->rowCount() != 0) {
        echo "<h1 class=text-success mx-auto>แก้ไขข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=editprofile", "3");
    } else {
        echo "<h1 class=text-danger>ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=editprofile", "3");
    }
    // }
    exit;
}

$data_edit = $database->get($tbl, "*", ["people_id" => $_SESSION['user']]);

$birthday = cv_year_en2th($data_edit['birthday']);
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
                        if ($data_edit['people_id'] == "" || $data_edit['people_id'] == null || !checkPID($data_edit['people_id'])) {
                            $readonly_text = "";
                            $text_peopleid_error = "เลขประจำตัวประชาชนไม่ถูกต้อง หรือไม่มี";
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
                                <select name="prefix" id="prefix" class="custom-select" required>
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
                                <label for="birthday">วันเกิด</label> <span class="text-success">(<?php echo thai_date_full($data_edit['birthday'], 2); ?>) </span>
                                <input class="form-control datethai" type="text" id="birthday"  value="<?php echo $birthday; ?>" required>
                                <span class="text-danger">เช่น 19 ก.ค. 2522 กรอก 1979-07-19</span>
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
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="phone">เบอร์โทรศัพท์</label>
                                <input class="form-control" type="text" id="phone" name="phone" placeholder="เบอร์โทรศัพท์" value="<?php echo $data_edit['phone']; ?>">
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="email">Email</label>
                                <input class="form-control" type="email" id="email" name="email" placeholder="E-mail" value="<?php echo $data_edit['email']; ?>">
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3 mt-3">
                                <label for="ประธานสหวิทยาเขต">ประธานสหวิทยาเขต</label>
                                <select name="chairman" id="chairman" class="custom-select select2bs4" required>
                                    <option value=""></option>
                                    <option value="0" <?php echo (($data_edit['chairman'] == "0" || $data_edit['chairman'] == "" || $data_edit['chairman'] == null) ? " selected" : ""); ?>>ไม่ได้เป็นประธานสหวิทยาเขต</option>
                                    <option value="1" <?php echo ($data_edit['chairman'] == "1" ? " selected" : ""); ?>>เป็นประธานสหวิทยาเขต</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        
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
<?php
session_start();
include("include/config.php");
include("include/connect_db.php");
if (file_exists("include/function.php")) {
    include("include/function.php");
} else {
    echo "ไม่เจอ file function.php";
}
include("include/route.php");
include("include/define.php");
$title_page = "";
$tbl = "tbl_Users";
if ($people_id == "" || $people_id == NULL) {
    location_to("register_1.php", "0");
}
if ($operation == $module . "_save") {
    // echo "<pre>";
    // print_r($_REQUEST);
    // echo "</pre>";
    if ($position_id == 10001 || $position_id == 10000 || $position_id == 10999) {
        $level = 'teacher';
    } else if ($position_id == 10006 || $position_id == 10007) {
        $level = 'directorschool';
    } else if ($position_id == 10008 || $position_id == 10009) {
        $level = 'districdirector';
        $school = '1000650001';
    } else if ($position_id == 10010) {
        $level = 'supervisor';
        $school = '1000650001';
    }

    $register_isConfirm = 0;
    $register_date = date("Y-m-d H:i:s");



    $birthday = cv_year_th2en($_REQUEST['birthday']);

    $birthday_array = explode("-", $birthday);
    $birthday_pwd = $birthday_array[0] . $birthday_array[1] . $birthday_array[2];
    $pwd = encrypt_decrypt("encrypt", $birthday_pwd);

    $people_id = trim($people_id);

    $has_people_id = $database->has($tbl, ["people_id" => $people_id]);
    if ($has_people_id) {
        echo "มีสมาชิกท่านนี้อยู่แล้วครับ มีอยู่แล้วครับ ";
        echo "<script>setTimeout(function(){window.location.href='register_1.php'},3000);</script>";
        // location_to("register_1.php", "2");
    } else {
        $result = $database->insert(
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
                "passwd" => $pwd,
                "school" => $school,
                "edu_level" => $edu_level,
                "headDepartment" => $headDepartment,
                "chairman" => "0",
                "teach_subject" => $teach_subject,
                "teach_subject_name" => $teach_subject_name,
                "teach_level" => $teach_level,
                "picture" => null,
                "phone" => $phone,
                "email" => $email,
                "level" => $level,
                "register_isConfirm" => $register_isConfirm,
                "register_date" => $register_date
            ]
        );
        // exit;
        if ($result->rowCount() != 0) {
            echo "<h1 class=text-success mx-auto>เพิ่มข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
            echo "<script>setTimeout(function(){window.location.href='index.php'},3000);</script>";
            // location_to("/", "3");
        } else {
            echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
            echo "<script>setTimeout(function(){window.location.href='register_1.php'},3000);</script>";
            // location_to("register_1.php", "3");
        }
    }
    exit;
}
?>

<!DOCTYPE html>
<html lang="th">

<head>
    <?php include "include/include-header.php"; ?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="plugins/bootstrap-datepicker-thai-thai/css/datepicker.css" rel="stylesheet" media="screen">
</head>

<body>
    <div class="container-fluid mx-auto bg-primary text-white text-center">
        <h1 class="p-3"><i class="fa-solid fa-user-pen fa-xl"></i> สมัครสมาชิก</h1>
    </div>
    <div class="container mt-5">
        <div class="row">
            <div class="col-lg-12">
                <form method="POST">

                    <div id="breadcrumb-item"></div>
                    <div class="card">
                        <div class="card-header bg-success text-white">
                            <h4 class="card-title">สมัครสมาชิก (คุณครู)</h4>
                        </div>
                        <div class="card-body">
                            <div class="mb-3 mt-3">
                                <label for="people_id">เลขประจำตัวประชาชน ** <span id="msg_people_id" class="text-danger"></span></label>
                                <input type="text" class="form-control" id="people_id" name="people_id" value="<?php echo $people_id; ?>" readonly="true" required>
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
                                                echo "<option value='" . $row['prefix_id'] . "'>" . $row['prefix'] . "</option>";
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-lg-5">
                                    <div class="mb-3 mt-3">
                                        <label for="name">ชื่อ</label>
                                        <input type="text" class="form-control" id="name" name="name" required>
                                    </div>
                                </div>
                                <div class="col-lg-5">
                                    <div class="mb-3 mt-3">
                                        <label for="lastname">นามสกุล</label>
                                        <input type="text" class="form-control" id="lastname" name="lastname" required>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <label for="gender">เพศ</label>
                                        <select name="gender" id="gender" class="custom-select" required>
                                            <option value="">เพศ</option>
                                            <?php
                                            $data = $database->select("tbl_system_gender", "*", ["ORDER" => ["id" => "ASC"]]);
                                            foreach ($data as $row) {
                                                echo "<option value='" . $row['gender_id'] . "'>" . $row['gender'] . "</option>";
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <label for="birthday">วันเกิด</label> <span class="text-danger">เช่น เกิดวันที่ 19 กรกฎาคม 2522 กรอก 19-07-2522</span>
                                        <input class="form-control datethai" type="text" id="birthday" name="birthday" data-provide="datepicker" data-date-language="th" required>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <label for="edu_level">วุฒิการศึกษาสูงสุด</label>
                                        <select name="edu_level" id="edu_level" class="custom-select" required>
                                            <option value="">วุฒิการศึกษาสูงสุด</option>
                                            <?php
                                            $data = $database->select("tbl_system_EducationLevel", "*", ["educationlevel_status" => "1", "ORDER" => ["id" => "ASC"]]);
                                            foreach ($data as $row) {
                                                echo "<option value='" . $row['educationlevel_id'] . "'>" . $row['educationlevel_name'] . "</option>";
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
                                        <input class="form-control" type="text" id="phone" name="phone" placeholder="เบอร์โทรศัพท์" required>
                                    </div>
                                </div>
                                <div class="col-lg-6">
                                    <div class="mb-3 mt-3">
                                        <label for="email">Email</label>
                                        <input class="form-control" type="email" id="email" name="email" placeholder="E-mail" required>
                                    </div>
                                </div>

                            </div>

                            <div class="row">
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <label for="persontype_id">ประเภทบุคลากร</label>
                                        <select name="persontype_id" id="persontype_id" class="custom-select" required>
                                            <option value="">ประเภทบุคลากร</option>
                                            <?php
                                            $data = $database->select("tbl_system_PersonType", "*", ["persontype_status" => "1", "ORDER" => ["persontype_id" => "ASC"]]);
                                            foreach ($data as $row) {
                                                echo "<option value='" . $row['persontype_id'] . "'>" . $row['persontype_name'] . "</option>";
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <label for="position_id">ตำแหน่ง</label>
                                        <select name="position_id" id="position_id" class="custom-select" required>
                                            <option value="">ตำแหน่ง</option>
                                            <?php
                                            $data = $database->select("tbl_system_PersonPositionType", "*", ["position_status" => "1", "ORDER" => ["position_name" => "ASC"]]);
                                            foreach ($data as $row) {
                                                echo "<option value='" . $row['position_id'] . "'>" . $row['position_name'] . "</option>\n";
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <label for="academic_id">วิทยฐานะ</label>
                                        <select name="academic_id" id="academic_id" class="custom-select" required>
                                            <option value="">วิทยฐานะ</option>
                                            <?php
                                            $data = $database->select("tbl_system_Academic_Standing", "*", ["academic_status" => "1", "ORDER" => ["academic_id" => "ASC"]]);
                                            foreach ($data as $row) {
                                                echo "<option value='" . $row['academic_id'] . "'>" . $row['academic_standing'] . "</option>";
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
                                        <select name="school" id="school" class="custom-select" required>
                                            <option value="">โรงเรียน</option>
                                            <?php
                                            $data = $database->select("tbl_school", "*", ["school_flag[!]" => 0, "ORDER" => ["school_name" => "ASC"]]);
                                            foreach ($data as $row) {
                                                echo "<option value='" . $row['school_id'] . "'>" . $row['school_name'] . "</option>";
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <label for="teach_subject">กลุ่มสาระ</label>
                                        <select name="teach_subject" id="teach_subject" class="custom-select" required>
                                            <option value="">กลุ่มสาระ</option>
                                            <?php
                                            $data = $database->select("tbl_system_Teach_Subject", "*", ["teach_subject_status" => "1", "ORDER" => ["teach_subject_id" => "ASC"]]);
                                            foreach ($data as $row) {
                                                echo "<option value='" . $row['teach_subject_id'] . "'>" . $row['teach_subject'] . "</option>";
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <label for="headDepartment">หัวหน้ากลุ่มสาระ</label>
                                        <select name="headDepartment" id="headDepartment" class="custom-select" required>
                                            <option value=""></option>
                                            <option value="0" selected>ไม่ได้เป็นหัวหน้ากลุ่มสาระ</option>
                                            <option value="1">เป็นหัวหน้ากลุ่มสาระ</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <label for="teach_subject_name">วิชาที่ทำการสอน</label>
                                        <input class="form-control" type="text" id="teach_subject_name" name="teach_subject_name" placeholder="วิชาที่ทำการสอน" required>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="mb-3 mt-3">
                                        <label for="teach_level">ระดับชั้นที่ทำการสอน</label>
                                        <select name="teach_level" id="teach_level" class="custom-select" required>
                                            <option value="">ระดับชั้นที่ทำการสอน</option>
                                            <?php
                                            $data = $database->select("tbl_system_GradeLevel", "*", ["grade_level_status" => "1", "grade_level_id[!]" => "499", "ORDER" => ["grade_level_id" => "ASC"]]);
                                            foreach ($data as $row) {
                                                echo "<option value='" . $row['grade_level_id'] . "'>" . $row['grade_level_name'] . "</option>";
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>

                            </div>

                        </div>
                        <div class="card-footer text-center">
                            <button type="submit" class="btn btn-success" id="btn_submit"><i class="fa-solid fa-user-pen"></i> สมัครสมาชิก</button>
                            <a href="/" class="btn btn-danger"><i class="fa-solid fa-ban"></i> ยกเลิก</a>
                            <input type="hidden" name="module" value="register">
                            <input type="hidden" name="level" value="">
                            <input type="hidden" name="operation" value="register_save">
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <?php include "include/include-footer.php"; ?>
    <script src="plugins/bootstrap-datepicker-thai-thai/js/bootstrap-datepicker.js"></script>
    <script src="plugins/bootstrap-datepicker-thai-thai/js/bootstrap-datepicker-thai.js"></script>
    <script src="plugins/bootstrap-datepicker-thai-thai/js/locales/bootstrap-datepicker.th.js"></script>
</body>

</html>



<script language="javascript">
    //เมื่อมีการคลิกฟังก์ชัน
    $(function() {
        $('#birthday').datepicker({
            format: 'yyyy-mm-dd',
        });

        $('#position_id').change(function() {
            var position_id = $('#position_id').val();

            if (position_id == 10001 || position_id == 10000 || position_id == 10999) {
                $('#level').val('teacher');
                $('#school').prop('required', true);
                $('#teach_subject').prop('required', true);
                $('#headDepartment').prop('required', true);
                $('#teach_subject_name').prop('required', true);
                $('#teach_level').prop('required', true);

            } else if (position_id == 10006 || position_id == 10007) {
                $('#level').val('directorschool');
                $('#school').prop('required', true);
                $('#teach_subject').prop('required', true);
                $('#headDepartment').prop('required', true);
                $('#teach_subject_name').prop('required', true);
                $('#teach_level').prop('required', true);
            } else if (position_id == 10008 || position_id == 10009) {
                $('#level').val('districdirector');
                $('#school').prop('required', false);
                $('#teach_subject').prop('required', false);
                $('#headDepartment').prop('required', false);
                $('#teach_subject_name').prop('required', false);
                $('#teach_level').prop('required', false);
            } else if (position_id == 10010) {
                $('#level').val('supervisor');
                $('#school').prop('required', false);
                $('#teach_subject').prop('required', false);
                $('#headDepartment').prop('required', false);
                $('#teach_subject_name').prop('required', false);
                $('#teach_level').prop('required', false);
            }
        });

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
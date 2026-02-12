<?php
session_start();
include("include/config.php");
include("include/connect_db.php");
include("include/function.php");
include("include/route.php");
include("include/define.php");
$title_page = "";
?>

<!DOCTYPE html>
<html lang="th">

<head>
    <?php include "include/include-header.php"; ?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body>
    <div class="container-fluid mx-auto bg-primary text-white text-center">
        <h1 class="p-3"><i class="fa-solid fa-user-pen fa-xl"></i> สมัครสมาชิก</h1>
    </div>
    <div class="container mt-5">
        <div class="row">
            <div class="col-lg-12">
                <form method="POST" action="register_2.php">

                    <div id="breadcrumb-item"></div>
                    <div class="card">
                        <div class="card-header bg-success text-white">
                            <h4 class="card-title">สมัครสมาชิก (คุณครู)</h4>
                        </div>
                        <div class="card-body">
                            <div class="mb-3 mt-3">
                                <label for="people_id">เลขประจำตัวประชาชน ** <span id="msg_people_id" class="text-danger"></span></label>
                                <input type="text" class="form-control" id="people_id" name="people_id">
                            </div>

                        </div>
                        <div class="card-footer text-center">
                            <button type="submit" class="btn btn-success" id="btn_submit" disabled><i class="fa-solid fa-user-pen"></i> ต่อไป</button>
                            <a href="/" class="btn btn-danger"><i class="fa-solid fa-ban"></i> ยกเลิก</a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <?php include "include/include-footer.php"; ?>
</body>

</html>
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
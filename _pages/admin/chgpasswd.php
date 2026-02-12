<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "เปลี่ยนรหัสผ่าน";
$tbl = "tbl_user";

if ($operation == $module . "_save") {
    if ($oldpwd != "") {
        $rowold_user = $database->get(
            $tbl,
            "*",
            [
                "user" => $_SESSION['user']
            ]
        );

        $oldpwd = encrypt_decrypt("encrypt", $oldpwd);

        if ($rowold_user['passwd'] == $oldpwd) {

            if ($newpwd1 == $newpwd2) {
                $newpwd = encrypt_decrypt("encrypt", $newpwd1);
                $result = $database->update(
                    $tbl,
                    [
                        "passwd" => $newpwd
                    ],
                    [
                        "user" => $_SESSION['user']
                    ]
                );
            } else {
                echo "<h1 class=text-danger>รหัสผ่านใหม่ไม่ตรงกัน</h1>";
                location_to("?module=chgpasswd", "3");
            }
        } else {
            echo "<h1 class=text-danger>รหัสผ่านเก่าไม่ถูกต้อง</h1>";
            location_to("?module=chgpasswd", "3");
        }
    } else {
        echo "<h1 class=text-danger>กรุณากรอกรหัสผ่านเก่า</h1>";
        location_to("?module=chgpasswd", "3");
    }


    if ($result->rowCount() != 0) {
        echo "<h1 class=text-success>แก้ไขข้อมูลสำเร็จกรุณาเข้าสู่ระบบใหม่</h1>";
        location_to("logout.php", "3");
    } else {
        echo "<h1 class=text-danger>ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=chgpasswd", "3");
    }
    exit;
}
?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>
            </div>
            <div class="card-body">
                <form action="?module=<?php echo $module; ?>" method="POST" onsubmit="return chk_change_pwd();">
                    <div class="mb-3">
                        <label for="oldpwd">รหัสผ่านเดิม :</label>
                        <input type="password" class="form-control" id="oldpwd" placeholder="รหัสผ่านเดิม" name="oldpwd">
                    </div>
                    <div class="mb-3">
                        <label for="newpwd1">รหัสผ่านใหม่ :</label>
                        <input type="password" class="form-control" id="newpwd1" placeholder="รหัสผ่านใหม่" name="newpwd1">
                    </div>
                    <div class="mb-3">
                        <label for="newpwd2">ยืนยันรหัสผ่านใหม่ :</label>
                        <input type="password" class="form-control" id="newpwd2" placeholder="ยืนยันรหัสผ่านใหม่" name="newpwd2">
                    </div>

                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="./" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<script>
    function chk_change_pwd() {
        oldpassword = document.getElementById("oldpwd").value;
        newpwd1 = document.getElementById("newpwd1").value;
        newpwd2 = document.getElementById("newpwd2").value;
        if (oldpassword == "") {
            Swal.fire("Warning", "กรุณากรอกรหัสผ่านเก่า", "info");
            return false;
        } else if (newpwd1 == "") {
            Swal.fire("Warning", "กรุณากรอกรหัสผ่านใหม่", "info");
            return false;
        } else if (newpwd2 == "") {
            Swal.fire("Warning", "กรุณากรอกยืนยันรหัสผ่านใหม่", "info");
            return false;
        } else if (newpwd1 != newpwd2) {
            Swal.fire("Error", "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน", "error");
            return false;
        } else {
            return true;
        }
    }
</script>
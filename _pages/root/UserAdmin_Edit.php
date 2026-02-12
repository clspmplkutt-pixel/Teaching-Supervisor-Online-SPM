<script src="<?php echo $path_include; ?>/app.js"></script>

<?php


$title_page = "ปรับปรุงข้อมูลส่วนตัว";
$tbl = "tbl_user";
$main_module = "ManageUserAdmin";
$row_data = $database->get($tbl, "*", ["user" => $user]);
// print_r($row_data);
if ($operation == $module . "_save") {
    $passwd = encrypt_decrypt("encrypt", $passwd);
    $lastupdate = date("Y-m-d H:i:s");
    $result = $database->update(
        $tbl,
        [
            "name" => $name,
            "email" => $email,
            "telephone" => $telephone,
            "lastupdate" => $lastupdate,
        ],
        ["user" => $user]
    );


    if ($result->rowCount() != 0) {
        echo "<h1 class=text-success>แก้ไขข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=$main_module", "3");
    } else {
        echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=$main_module", "3");
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
                <form action="?module=<?php echo $module; ?>" method="POST">
                    <div class="mb-3 mt-3">
                        <label for="user">ชื่อผู้ใช้งาน:</label>
                        <input type="text" class="form-control" id="user" placeholder="ชื่อผู้ใช้งาน" name="user" value="<?php echo $row_data['user']; ?>" required readonly>
                    </div>
                    <div class="mb-3">
                        <label for="name">ชื่อ - นามสกุล :</label>
                        <input type="text" class="form-control" id="name" placeholder="ชื่อ - นามสกุล" name="name" value="<?php echo $row_data['name']; ?>" required>
                    </div>
                    <div class="mb-3">
                        <label for="email">Email :</label>
                        <input type="email" class="form-control" id="email" placeholder="email" name="email" value="<?php echo $row_data['email']; ?>">
                    </div>
                    <div class="mb-3">
                        <label for="telephone">เบอร์โทรศัพท์ :</label>
                        <input type="text" class="form-control" id="telephone" placeholder="เบอร์โทรศัพท์" name="telephone" value="<?php echo $row_data['telephone']; ?>">
                    </div>
                    
                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="user" value="<?php echo $row_data['user']; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="?module=<?php echo $main_module; ?>" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
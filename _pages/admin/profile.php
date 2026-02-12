<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ปรับปรุงข้อมูลส่วนตัว";
$tbl = "tbl_user";
$row = $database->get(
    $tbl,
    "*",
    [
        "user" => $_SESSION['user']
    ]
);
if ($operation == $module . "_save") {
    $result = $database->update(
        $tbl,
        [
            "name" => $name,
            "email" => $email,
            "telephone" => $telephone,
            "line_token" => $line_token
        ],
        [
            "user" => $_SESSION['user']
        ]
    );


    if ($result->rowCount() != 0) {
        if (!$changpwd) {
            echo "<h1 class=text-success>แก้ไขข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
            location_to("?module=profile", "0");
        } else {
            location_to("logout.php", "0");
        }
    } else {
        echo "<h1 class=text-danger>ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=profile", "0");
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
                <form action="?module=<?php echo $module; ?>" method="POST" onsubmit="return chk_pwd();">
                    <div class="mb-3 mt-3">
                        <label for="user">ชื่อผู้ใช้งาน:</label>
                        <input type="text" class="form-control" id="user" placeholder="ชื่อผู้ใช้งาน" name="user" value="<?php echo $row['user']; ?>" readonly required>
                    </div>
                    <div class="mb-3">
                        <label for="name">ชื่อ - นามสกุล:</label>
                        <input type="text" class="form-control" id="name" placeholder="ชื่อ - นามสกุล" name="name" value="<?php echo $row['name']; ?>" required>
                    </div>
                    <div class="mb-3">
                        <label for="email">Email:</label>
                        <input type="email" class="form-control" id="email" placeholder="email" name="email" value="<?php echo $row['email']; ?>" required>
                    </div>
                    <div class="mb-3">
                        <label for="telephone">เบอร์โทรศัพท์:</label>
                        <input type="text" class="form-control" id="telephone" placeholder="เบอร์โทรศัพท์" name="telephone" value="<?php echo $row['telephone']; ?>" required>
                    </div>
                    <div class="mb-3">
                        <label for="line_token">line token:</label>
                        <input type="text" class="form-control" id="line_token" placeholder="line token" name="line_token" value="<?php echo $row['line_token']; ?>">
                    </div>
                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="?module=khet" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "เพิ่มข้อมูลสหวิทยาเขต";
$tbl = "tbl_khet";
if ($operation == $module . "_save") {
    $has_khetCode = $database->has($tbl, ["khet_code" => $khet_code]);

    if ($has_khetCode) {
        echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เนื่องจากรหัสสหวิทยาเขตซ้ำ</h1>";
        location_to("?module=khet", "3");
        // exit;
    } else {
        $khet_code_add = $database->insert($tbl, [
            "khet_code" => $khet_code,
            "khet_name" => $khet_name,
            "khet_province" => $khet_province,
        ]);
        if ($khet_code_add->rowCount() != 0) {
            echo "<h1 class=text-success mx-auto>เพิ่มข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
            location_to("?module=khet", "0");
        } else {
            echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
            location_to("?module=khet", "0");
        }
    }
    exit;
}
?>


<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page;?></h3>
            </div>
            <div class="card-body">
                <form action="?module=<?php echo $module; ?>" method="POST" onsubmit="return chk_khet_code();">
                    <div class="mb-3 mt-3">
                        <label for="khet_province">ตั้งอยู่จังหวัด:</label>
                        <select class="form-control form-select-lg" name="khet_province" id="khet_province" onchange="province_sel(this.value);" autofocus>
                            <option value="">เลือกจังหวัดที่สหวิทยาเขตตั้งอยู่</option>
                            <option value="53">อุตรดิตถ์</option>
                            <option value="65">พิษณุโลก</option>

                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="khet_code1">รหัสสหวิทยาเขต:</label>
                        <input type="text" class="form-control" id="khet_code1" placeholder="รหัสสหวิทยาเขต ห้ามซ้ำกับที่มีอยู่" name="khet_code" maxlength="4" required>
                    </div>
                    <div class="mb-3">
                        <label for="khet_name">ชื่อสหวิทยาเขต:</label>
                        <input type="text" class="form-control" id="khet_name" placeholder="ชื่อสหวิทยาเขต" name="khet_name" required>
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
<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "แก้ไขข้อมูลสหวิทยาเขต";
$tbl = "tbl_khet";
$row = $database->get($tbl, "*", ["khet_code" => $khet_code]);
if ($row['khet_province'] == 53) {
    $sel_53 = " selected";
}
if ($row['khet_province'] == 65) {
    $sel_65 = " selected";
}
if ($operation == $module . "_save") {
    $result = $database->update(
        $tbl,
        [
            "khet_name" => $khet_name
        ],
        [
            "khet_code" => $khet_code
        ]
    );

    if ($result->rowCount() != 0) {
        echo "<h1 class=text-success>แก้ไขข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=khet", "0");
    } else {
        echo "<h1 class=text-danger>ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=khet", "0");
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
                <form action="?module=<?php echo $module; ?>" method="POST">
                    <div class="mb-3 mt-3">
                        <label for="khet_province">ตั้งอยู่จังหวัด:</label>
                        <select class="form-control form-select-lg" name="khet_province" id="khet_province" onchange="province_sel(this.value);" readonly disabled>
                            <option value="">เลือกจังหวัดที่สหวิทยาเขตตั้งอยู่</option>
                            <option value="53" <?php echo $sel_53; ?>>อุตรดิตถ์</option>
                            <option value="65" <?php echo $sel_65; ?>>พิษณุโลก</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="khet_code1">รหัสสหวิทยาเขต:</label>
                        <input type="text" class="form-control" id="khet_code1" placeholder="รหัสสหวิทยาเขต ห้ามซ้ำกับที่มีอยู่" name="khet_code" maxlength="4" onblur="chk_khet_code(this.value);" value="<?php echo $row['khet_code']; ?>" readonly>
                    </div>
                    <div class="mb-3">
                        <label for="khet_name">ชื่อสหวิทยาเขต:</label>
                        <input type="text" class="form-control" id="khet_name" placeholder="ชื่อสหวิทยาเขต" name="khet_name" value="<?php echo $row['khet_name']; ?>">
                    </div>

                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <input type="hidden" name="khet_province" value="<?php echo $row['khet_province']; ?>">
                        <input type="hidden" name="khet_code" value="<?php echo $row['khet_code']; ?>">

                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="?module=khet" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<!-- <script>
    function province_sel(str) {
        document.getElementById("khet_code").value = str;
        document.getElementById("khet_code").focus();
    }

    function chk_khet_code(str) {
        if (str.length == 0) {
            return false;
        } else {
            if (str.length != 4) {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'รหัสสหวิทยาเขตต้องมี 4 หลัก',
                });
                document.getElementById("khet_code").classList.remove("is-valid");
                document.getElementById("khet_code").classList.add("is-invalid");
                return false;
            } else {
                document.getElementById("khet_code").classList.remove("is-invalid");
                document.getElementById("khet_code").classList.add("is-valid");
                return true;
            }
        }
    }
</script> -->
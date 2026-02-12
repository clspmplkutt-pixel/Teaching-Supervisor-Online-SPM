<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "เพิ่มข้อมูลโรงเรียน";
$tbl = "tbl_school";
if ($operation == $module . "_save") {
    $has_School = $database->has($tbl, ["school_id" => $school_id]);

    if ($has_School) {
        echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เนื่องจากรหัสซ้ำ</h1>";
        location_to("?module=school", "3");
    } else {
        $khet_code_add = $database->insert($tbl, [
            "school_id" => $school_id,
            "school_code6" => $school_code6,
            "school_code8" => $school_code8,
            "school_id_onet" => $school_id_onet,
            "school_name" => $school_name,
            "school_add" => $school_add,
            "school_trok" => $school_trok,
            "school_soi" => $school_soi,
            "school_street" => $school_street,
            "district_name" => $district_name,
            "subdistrict_name" => $subdistrict_name,
            "school_province" => $school_province,
            "school_postcode" => $school_postcode,
            "school_telephone1" => $school_telephone1,
            "school_telephone2" => $school_telephone2,
            "school_fax" => $school_fax,
            "school_email" => $school_email,
            "school_website" => $school_website,
            "school_area" => "00650001",
            "school_size" => $school_size,
            "khet_code" => $khet_code,

        ]);
        if ($khet_code_add->rowCount() != 0) {
            echo "<h1 class=text-success>เพิ่มข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
            location_to("?module=school", "0");
        } else {
            echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
            location_to("?module=school", "0");
        }
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
                    <div class="row">
                        <div class="mb-3 col-6">
                            <label for="school_id">รหัส MOECODE (รหัสกระทรวง)<span class="text-danger">จำเป็นต้องกรอก ** </span>:</label>
                            <input type="text" class="form-control" id="school_id" placeholder="รหัส MOECODE" name="school_id" maxlength="10" minlength="10" required>
                        </div>
                        <div class="mb-3 col-6">
                            <label for="school_code6">รหัสโรงเรียน 6 หลัก (รหัส Obec):</label>
                            <input type="text" class="form-control" id="school_code6" placeholder="รหัสโรงเรียน 6 หลัก (Obec Code ของ สพฐ.)" name="school_code6" maxlength="6" minlength="6">
                        </div>

                    </div>
                    <div class="row">
                        <div class="mb-3 col-6">
                            <label for="school_code8">รหัสโรงเรียน 8 หลัก (รหัส SMIS):</label>
                            <input type="text" class="form-control" id="school_code8" placeholder="รหัสโรงเรียน 8 หลัก (รหัส SMIS)" name="school_code8" maxlength="8" minlength="8">
                        </div>
                        <div class="mb-3 col-6">
                            <label for="school_id_onet">รหัสโรงเรียน 10 หลัก ONET:</label>
                            <input type="text" class="form-control" id="school_id_onet" placeholder="รหัสโรงเรียน 10 หลัก ONET" name="school_id_onet" maxlength="10" minlength="10">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="school_name">ชื่อโรงเรียน:</label>
                        <input type="text" class="form-control" id="school_name" placeholder="ชื่อโรงเรียน" name="school_name" required>
                    </div>
                    <div class="row">
                        <div class="mb-3 col-4">
                            <label for="school_add">ที่อยู่ (เลขที่ หมู่ที่):</label>
                            <input type="text" class="form-control" id="school_add" placeholder="ที่อยู่โรงเรียน (เลขที่ หมู่ที่)" name="school_add">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="school_trok">ตรอก:</label>
                            <input type="text" class="form-control" id="school_trok" placeholder="ตรอก" name="school_trok">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="school_soi">ซอย:</label>
                            <input type="text" class="form-control" id="school_soi" placeholder="ซอย" name="school_soi">
                        </div>
                    </div>
                    <div class="row">

                        <div class="mb-3 col-4">
                            <label for="school_street">ถนน:</label>
                            <input type="text" class="form-control" id="school_street" placeholder="ถนน" name="school_street">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="subdistrict_name">ตำบล:</label>
                            <input type="text" class="form-control" id="subdistrict_name" placeholder="ตำบล" name="subdistrict_name">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="district_name">อำเภอ:</label>
                            <input type="text" class="form-control" id="district_name" placeholder="อำเภอ" name="district_name">
                        </div>
                    </div>
                    <div class="row">
                        <div class="mb-3 col-6">
                            <label for="school_province">จังหวัด:</label>
                            <select class="form-control form-select-lg" name="school_province" id="school_province" required>
                                <option value=""></option>
                                <?php
                                $key = array_keys($arrayProvince);
                                for ($i = 0; $i < count($key); $i++) {
                                    echo '<option value="' . $key[$i] . '">' . $arrayProvince[$key[$i]] . '</option>' . "\n";
                                }
                                ?>

                            </select>
                        </div>
                        <div class="mb-3 col-6">
                            <label for="school_postcode">รหัสไปรษณีย์:</label>
                            <input type="text" class="form-control" id="school_postcode" placeholder="รหัสไปรษณีย์" name="school_postcode" maxlength="5" minlength="5" required>
                        </div>
                    </div>
                    <div class="row">

                        <div class="mb-3 col-4">
                            <label for="school_telephone1">เบอร์โทรศัพท์ 1:</label>
                            <input type="text" class="form-control" id="school_telephone1" placeholder="เบอร์โทรศัพท์ 1" name="school_telephone1">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="school_telephone2">เบอร์โทรศัพท์ 2:</label>
                            <input type="text" class="form-control" id="school_telephone2" placeholder="เบอร์โทรศัพท์ 2" name="school_telephone2">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="school_fax">โทรสาร (FAX):</label>
                            <input type="text" class="form-control" id="school_fax" placeholder="โทรสาร (FAX)" name="school_fax">
                        </div>
                    </div>
                    <div class="row">

                        <div class="mb-3 col-6">
                            <label for="school_email">Email:</label>
                            <input type="email" class="form-control" id="school_email" placeholder="Email" name="school_email">
                        </div>
                        <div class="mb-3 col-6">
                            <label for="school_website">Website:</label>
                            <input type="url" class="form-control" id="school_website" placeholder="Website โรงเรียน" name="school_website">
                        </div>
                    </div>

                    <div class="row">
                        <div class="mb-3 col-6">
                            <label for="khet_code">สหวิทยาเขต:</label>
                            <select class="form-control form-select-lg" name="khet_code" id="khet_code" required>
                                <option value=""></option>
                                <?php
                                $key = array_keys($arrayKhet);
                                for ($i = 0; $i < count($key); $i++) {
                                    echo '<option value="' . $key[$i] . '">' . $arrayKhet[$key[$i]] . '</option>' . "\n";
                                }
                                ?>

                            </select>
                        </div>
                        <div class="mb-3 col-6">
                            <label for="school_size">ขนาดโรงเรียน:</label>
                            <select class="form-control form-select-lg" name="school_size" id="school_size" required>
                                <option value=""></option>
                                <?php
                                $key = array_keys($arraySchoolSize);
                                for ($i = 0; $i < count($key); $i++) {
                                    echo '<option value="' . $key[$i] . '">' . $arraySchoolSize[$key[$i]]['0'] . ' (' . $arraySchoolSize[$key[$i]]['1'] . ')</option>' . "\n";
                                }
                                ?>

                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="?module=school" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
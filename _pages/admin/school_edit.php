<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "แก้ไขข้อมูลขนาดโรงเรียน";
$tbl = "tbl_school";
$rows = $database->get($tbl, "*", ["school_id" => $school_id]);
// print_r($rows);
if ($operation == $module . "_save") {
    $result = $database->update(
        $tbl,
        [
            "school_name" => $school_name,
            "school_code6" => $school_code6,
            "school_code8" => $school_code8,
            "school_id_onet" => $school_id_onet,
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
            "school_size" => $school_size,
            "khet_code" => $khet_code
        ],
        [
            "school_id" => $school_id
        ]
    );

    if ($result->rowCount() != 0) {
        echo "<h1 class=text-success>แก้ไขข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=school", "0");
    } else {
        echo $database->error;
        echo "<h1 class=text-danger>ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=school", "5");
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
                    <div class="row">
                        <div class="mb-3 col-6">
                            <label for="school_id">รหัส MOECODE (รหัสกระทรวง):</label>
                            <?php
                            if ($rows['school_id'] != "") {
                                $readonly = " readonly";
                            } else {
                                $readonly = "";
                            }
                            ?>
                            <input type="text" class="form-control" id="school_id" placeholder="รหัส MOECODE" name="school_id" maxlength="10" minlength="10" value="<?php echo $rows['school_id']; ?>" <?php echo $readonly; ?>>
                        </div>
                        <div class="mb-3 col-6">
                            <label for="school_code6">รหัสโรงเรียน 6 หลัก (รหัส Obec):</label>
                            <?php
                            if ($rows['school_code6'] != "") {
                                $readonly = " readonly";
                            } else {
                                $readonly = "";
                            }
                            ?>
                            <input type="text" class="form-control" id="school_code6" placeholder="รหัสโรงเรียน 6 หลัก (Obec Code ของ สพฐ.)" name="school_code6" maxlength="6" minlength="6"  value="<?php echo $rows['school_code6']; ?>" <?php echo $readonly; ?>>
                        </div>

                    </div>
                    <div class="row">
                        <div class="mb-3 col-6">
                            <label for="school_code8">รหัสโรงเรียน 8 หลัก (รหัส SMIS):</label>
                            <?php
                            if ($rows['school_code8'] != "") {
                                $readonly = " readonly";
                            } else {
                                $readonly = "";
                            }
                            ?>
                            <input type="text" class="form-control" id="school_code8" placeholder="รหัสโรงเรียน 8 หลัก (รหัส SMIS)" name="school_code8" maxlength="8" minlength="8" value="<?php echo $rows['school_code8']; ?>" <?php echo $readonly; ?>>
                        </div>
                        <div class="mb-3 col-6">
                            <label for="school_id">รหัสโรงเรียน 10 หลัก ONET:</label>
                            <?php
                            if ($rows['school_id_onet'] != "") {
                                $readonly = " readonly";
                            } else {
                                $readonly = "";
                            }
                            ?>
                            <input type="text" class="form-control" id="school_id_onet" placeholder="รหัสโรงเรียน 10 หลัก ห้ามซ้ำกับที่มีอยู่" name="school_id_onet" maxlength="10" minlength="10" value="<?php echo $rows['school_id_onet']; ?>" <?php echo $readonly; ?>>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="school_name">ชื่อโรงเรียน:</label>
                        <input type="text" class="form-control" id="school_name" placeholder="ชื่อโรงเรียน" name="school_name" value="<?php echo $rows['school_name']; ?>" required>
                    </div>
                    <div class="row">
                        <div class="mb-3 col-4">
                            <label for="school_add">ที่อยู่ (เลขที่ หมู่ที่):</label>
                            <input type="text" class="form-control" id="school_add" placeholder="ที่อยู่โรงเรียน (เลขที่ หมู่ที่)" name="school_add" value="<?php echo $rows['school_add']; ?>">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="school_trok">ตรอก:</label>
                            <input type="text" class="form-control" id="school_trok" placeholder="ตรอก" name="school_trok" value="<?php echo $rows['school_trok']; ?>">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="school_soi">ซอย:</label>
                            <input type="text" class="form-control" id="school_soi" placeholder="ซอย" name="school_soi" value="<?php echo $rows['school_soi']; ?>">
                        </div>
                    </div>
                    <div class="row">

                        <div class="mb-3 col-4">
                            <label for="school_street">ถนน:</label>
                            <input type="text" class="form-control" id="school_street" placeholder="ถนน" name="school_street" value="<?php echo $rows['school_street']; ?>">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="subdistrict_name">ตำบล:</label>
                            <input type="text" class="form-control" id="subdistrict_name" placeholder="ตำบล" name="subdistrict_name" value="<?php echo $rows['subdistrict_name']; ?>">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="district_name">อำเภอ:</label>
                            <input type="text" class="form-control" id="district_name" placeholder="อำเภอ" name="district_name" value="<?php echo $rows['district_name']; ?>">
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
                                    if ($key[$i] != $rows['school_province']) {
                                        echo '<option value="' . $key[$i] . '">' . $arrayProvince[$key[$i]] . '</option>' . "\n";
                                    } else {
                                        echo '<option value="' . $key[$i] . '" selected>' . $arrayProvince[$key[$i]] . '</option>' . "\n";
                                    }
                                }
                                ?>

                            </select>
                        </div>
                        <div class="mb-3 col-6">
                            <label for="school_postcode">รหัสไปรษณีย์:</label>
                            <input type="text" class="form-control" id="school_postcode" placeholder="รหัสไปรษณีย์" name="school_postcode" maxlength="5" minlength="5" value="<?php echo $rows['school_postcode']; ?>" required>
                        </div>
                    </div>
                    <div class="row">

                        <div class="mb-3 col-4">
                            <label for="school_telephone1">เบอร์โทรศัพท์ 1:</label>
                            <input type="text" class="form-control" id="school_telephone1" placeholder="เบอร์โทรศัพท์ 1" name="school_telephone1" value="<?php echo $rows['school_telephone1']; ?>">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="school_telephone2">เบอร์โทรศัพท์ 2:</label>
                            <input type="text" class="form-control" id="school_telephone2" placeholder="เบอร์โทรศัพท์ 2" name="school_telephone2" value="<?php echo $rows['school_telephone2']; ?>">
                        </div>
                        <div class="mb-3 col-4">
                            <label for="school_fax">โทรสาร (FAX):</label>
                            <input type="text" class="form-control" id="school_fax" placeholder="โทรสาร (FAX)" name="school_fax" value="<?php echo $rows['school_fax']; ?>">
                        </div>
                    </div>
                    <div class="row">

                        <div class="mb-3 col-6">
                            <label for="school_email">Email:</label>
                            <input type="email" class="form-control" id="school_email" placeholder="Email" name="school_email" value="<?php echo $rows['school_email']; ?>">
                        </div>
                        <div class="mb-3 col-6">
                            <label for="school_website">Website:</label>
                            <input type="url" class="form-control" id="school_website" placeholder="Website โรงเรียน" name="school_website" value="<?php echo $rows['school_website']; ?>">
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
                                    if ($key[$i] != $rows['khet_code']) {
                                        echo '<option value="' . $key[$i] . '">' . $arrayKhet[$key[$i]] . '</option>' . "\n";
                                    } else {
                                        echo '<option value="' . $key[$i] . '" selected>' . $arrayKhet[$key[$i]] . '</option>' . "\n";
                                    }
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
                                    if ($key[$i] != $rows['school_size']) {
                                        echo '<option value="' . $key[$i] . '">' . $arraySchoolSize[$key[$i]]['0'] . ' (' . $arraySchoolSize[$key[$i]]['1'] . ')</option>' . "\n";
                                    } else {
                                        echo '<option value="' . $key[$i] . '" selected>' . $arraySchoolSize[$key[$i]]['0'] . ' (' . $arraySchoolSize[$key[$i]]['1'] . ')</option>' . "\n";
                                    }
                                }
                                ?>

                            </select>
                        </div>
                        <div class="mb-3">
                            <input type="hidden" name="module" value="<?php echo $module; ?>">
                            <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                            <input type="hidden" name="school_id" value="<?php echo $school_id; ?>">
                            <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                            <a href="?module=school" class="btn btn-danger mt-3">ยกเลิก</a>
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
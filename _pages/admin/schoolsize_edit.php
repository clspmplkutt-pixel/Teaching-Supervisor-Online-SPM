<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "แก้ไขข้อมูลขนาดโรงเรียน";
$tbl = "tbl_schoolsize";
$rows = $database->get($tbl, "*", ["schoolsize_id" => $schoolsize_id]);
// print_r($rows);
if ($operation == $module . "_save") {
    $result = $database->update(
        $tbl,
        [
            "schoolsize_name" => $schoolsize_name,
            "schoolsize_details" => $schoolsize_details,
            "schoolsize_min" => $schoolsize_min,
            "schoolsize_max" => $schoolsize_max,

        ],
        [
            "schoolsize_id" => $schoolsize_id
        ]
    );

    if ($result->rowCount() != 0) {
        echo "<h1 class=text-success>แก้ไขข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=school_size", "2");
    } else {
        echo $database->error;
        echo "<h1 class=text-danger>ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=school_size", "3");
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
                <form action="?module=<?php echo $module; ?>" method="POST" onsubmit="return check_form();">
                    <div class="row">

                        <div class="mb-3 col-6">
                            <label for="schoolsize_id">ID:</label>
                            <input type="text" class="form-control" id="schoolsize_id" placeholder="ID" name="schoolsize_id" value="<?php echo $rows['schoolsize_id']; ?>" readonly>
                        </div>
                        <div class="mb-3 col-6">
                            <label for="schoolsize_name">ชื่อขนาดโรงเรียน:</label>
                            <input type="text" class="form-control" id="schoolsize_name" placeholder="ชื่อขนาดโรงเรียน" name="schoolsize_name" value="<?php echo $rows['schoolsize_name']; ?>" readonly>
                        </div>
                    </div>

                    <div class="mb-3 col-12">
                        <label for="schoolsize_details">คำอธิบาย:</label>
                        <input type="text" class="form-control" id="schoolsize_details" placeholder="คำอธิบาย" name="schoolsize_details" value="<?php echo $rows['schoolsize_details']; ?>">
                    </div>

                    <div class="mb-3 col-12">
                        <label for="schoolsize_min">จำนวนนักเรียนที่น้อยที่สุด:</label>
                        <input type="number" class="form-control" id="schoolsize_min" placeholder="คำอธิบาย" name="schoolsize_min" value="<?php echo $rows['schoolsize_min']; ?>">
                    </div>
                    <div class="mb-3 col-12">
                        <label for="schoolsize_max">จำนวนนักเรียนที่มากที่สุด <span class="text-danger">(** หากใส่ 0 หมายถึงมากกว่าขึ้นไป ให้ใส่เฉพาะโรงเรียนขนาดใหญ่พิเศษเท่านั้น **)</span>:</label>
                        <input type="number" class="form-control" id="schoolsize_max" placeholder="คำอธิบาย" name="schoolsize_max" value="<?php echo $rows['schoolsize_max']; ?>">

                        </select>
                    </div>
                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <input type="hidden" name="schoolsize_id" value="<?php echo $schoolsize_id; ?>">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="?module=school_size" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<script>
    function check_form() {
        let schoolsize_min, schoolsize_max;
        schoolsize_min = document.getElementById("schoolsize_min").value;
        schoolsize_max = document.getElementById("schoolsize_max").value;
        if (schoolsize_max != 0) {
            if (schoolsize_min > schoolsize_max) {
                Swal.fire('ผิดพลาด', 'จำนวนนักเรียนที่น้อยที่สุด มากกว่า จำนวนนักเรียนที่มากที่สุดไม่ได้', 'error');
                return false;
            } else {
                return true;
            }
        }
    }
</script>
<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "เพิ่มข้อมูลสาระการเรียนรู้รายวิชา";
$tbl = "tbl_strands";


if ($operation == $module . "_save") {
    $has_data = $database->has($tbl, ["strands_id" => $strands_id]);
    if ($has_data) {
        echo "สาระการเรียนรู้ $strands_id : $strands_name มีอยู่แล้วครับ ";
        location_to("?module=strands", "2");
    } else {
        $data = $database->insert($tbl, [
            "strands_id" => $strands_id,
            "teach_subject_id" => $teach_subject_id,
            "strands_order" => $strands_order,
            "strands_name" => $strands_name,
        ]);
        if ($data->rowCount() != 0) {
            echo "<h1 class=text-success mx-auto>เพิ่มข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
            location_to("?module=strands", "0");
        } else {
            echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
            location_to("?module=strands", "0");
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
                    <div class="mb-3">
                        <label for="teach_subject_id">กลุ่มสาระการเรียนรู้ : </label>
                        <select class="form-control form-select-lg" name="teach_subject_id" id="teach_subject_id" onchange="clear_txt();" required>
                            <option value="">เลือกกลุ่มสาระการเรียนรู้</option>
                            <?php
                            $data = $database->select("tbl_system_Teach_Subject", "*", ["teach_subject_status" => "1"], ["ORDER" => ["teach_subject_id" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($Teach_Subject == $row['teach_subject_id']) {
                                    $select = "selected";
                                    $short_s = $row['teach_subject_short'];
                                } else {
                                    $select = "";
                                }
                                echo "<option value=\"" . $row['teach_subject_id'] . "\"$select>" . $row['teach_subject'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="strands_order">ลำดับที่ : </label>
                        <input type="number" class="form-control" id="strands_order" placeholder="ลำดับที่" name="strands_order" step="1" onblur="add_strands_id();" onchange="add_strands_id();" required>
                    </div>
                    <div class="mb-3">
                        <label for="strands_id">รหัสสาระการเรียนรู้ : </label>
                        <input type="number" class="form-control" id="strands_id" placeholder="รหัสสาระการเรียนรู้" name="strands_id" required readonly>
                    </div>
                    <div class="mb-3">
                        <label for="strands_name">สาระการเรียนรู้: </label>
                        <input type="text" class="form-control" id="strands_name" placeholder="สาระการเรียนรู้" name="strands_name" value="<?php echo $data['strands_name']; ?>" required>
                    </div>

                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <input type="hidden" name="id" value="<?php echo $data['id']; ?>">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="?module=strands" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<script>
    function add_strands_id() {
        document.getElementById("strands_id").value = document.getElementById("teach_subject_id").value + document.getElementById("strands_order").value;
    }

    function clear_txt() {
        document.getElementById("strands_id").value = "";
        document.getElementById("strands_order").value = "";
    }
</script>
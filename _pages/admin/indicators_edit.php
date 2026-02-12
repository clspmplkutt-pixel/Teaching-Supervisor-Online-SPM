<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "แก้ไขตัวชี้วัดรายวิชา";
$tbl = "tbl_indicators";
if ($operation == $module . "_save") {
    // echo "<pre>";
    // print_r($_REQUEST);
    // echo "</pre>";
    $indicators_name = trim($indicators_name);



    $indicators_details = preg_replace("/\r|\n/", "", $indicators_details);

    $indicators_edit = $database->update($tbl, [
        "indicator_group" => $indicator_group,
        "indicator_id" => $indicator_id,
        "indicators_details" => trim($indicators_details)]
        ,["id"=>$id]);
    if ($indicators_edit->rowCount() != 0) {
        echo "<h1 class=text-success mx-auto>แก้ไขข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=indicators&teach_subject_id=$teach_subject_id&grade_level_id=$grade_level_id", "0");
    } else {
        echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=indicators", "0");
    }
    exit;
}
$data_edit = $database->get($tbl, "*", ["id" => $id]);
// print_r($data_edit);
?>


<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>
            </div>
            <div class="card-body">
                <form action="?module=<?php echo $module; ?>" method="POST">
                    <div class="mb-3 mt-3">
                        <strong>กลุ่มสาระการเรียนรู้ : </strong> <span class="text-success"><?php echo $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $data_edit['teach_subject_id']]); ?></span>
                    </div>
                    <div class="mb-3 mt-3">
                        <strong>ระดับชั้น : </strong>
                        <span class="text-success">
                            <?php echo $database->get("tbl_system_GradeLevel", "grade_level_name", ["grade_level_id" => $data_edit['grade_level_id']]); ?>
                        </span>

                    </div>
                    <div class="mb-3">
                        <strong>มาตรฐานการเรียนรู้ : </strong> <span class="text-success">
                            <?php
                            $data_cs = $database->get("tbl_content_standards", "*", ["content_s_name" => $data_edit['content_s_name']]);
                            echo $data_cs['content_s_name'] . " " . $data_cs['content_s_detail'];
                            ?>
                        </span>
                    </div>
                    <div class="mb-3">
                        <strong>ชื่อตัวชี้วัดการเรียนรู้ : </strong>
                        <span class="text-success"><?php echo $data_edit['indicators_name']; ?></span>
                    </div>

                    <div class="mb-3">
                        <label for="indicator_id">ประเภทตัวชี้วัด: </label>
                        <select class="form-control form-select-lg" name="indicator_id" id="indicator_id" required>
                            <option value="">ประเภทตัวชี้วัด</option>
                            <?php
                            $data = $database->select("tbl_type_indicators", "*", ["indicator_status" => "1"], ["ORDER" => ["indicator_id" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($data_edit['indicator_id'] == $row['indicator_id']) {
                                    $select = "selected";
                                } else {
                                    $select = "";
                                }
                                echo "<option value=\"" . $row['indicator_id'] . "\"$select>" . $row['indicator_name'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="indicator_group">กลุ่มตัวชี้วัดการเรียนรู้ : </label>
                        <input type="number" class="form-control" id="indicator_group" placeholder="กลุ่มตัวชี้วัดการเรียนรู้" name="indicator_group" step="1" value="<?php echo $data_edit['indicator_group']; ?>" required>
                    </div>



                    <div class="mb-3">
                        <label for="indicators_details">คำอธิบายตัวชี้วัดการเรียนรู้: <span class="text-danger">ไม่ต้องกดปุ่ม Enter เพื่อขึ้นบรรทัดใหม่</span></label>
                        <textarea name="indicators_details" id="indicators_details" cols="30" rows="10" class="form-control"><?php echo $data_edit['indicators_details']; ?></textarea>
                    </div>
                    <div class="mb-3">

                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <input type="hidden" name="teach_subject_id" id="teach_subject_id_hidden" value="<?php echo $data_edit['teach_subject_id']; ?>">
                        <input type="hidden" name="grade_level_id" id="grade_level_id" value="<?php echo $data_edit['grade_level_id']; ?>">
                        <input type="hidden" name="id" id="id" value="<?php echo $id; ?>">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="?module=indicators&teach_subject_id=<?php echo $data_edit['teach_subject_id']; ?>&grade_level_id=<?php echo $data_edit['grade_level_id']; ?>" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<script>
    function content_s_sel(val) {
        if (val != "") {
            document.getElementById("grade_level_id").removeAttribute("disabled");
        } else {
            document.getElementById("grade_level_id").setAttribute("disabled");
        }
    }


    function name_indicator(level) {
        const grade_level = [];
        <?php
        $data = $database->select("tbl_system_GradeLevel", "*", ["grade_level_status" => "1"], ["ORDER" => ["grade_level_id" => "ASC"]]);
        foreach ($data as $row) {
        ?>
            grade_level["<?php echo $row['grade_level_id']; ?>"] = '<?php echo $row['grade_level_shortname']; ?>'
        <?php
        }
        ?>
        content_s_name = document.getElementById("content_s_name").value

        document.getElementById("indicators_name").value = content_s_name + ' ' + grade_level[level] + '/';
    }
</script>
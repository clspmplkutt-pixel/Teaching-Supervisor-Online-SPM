<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "เพิ่มตัวชี้วัดรายวิชา";
$tbl = "tbl_indicators";
if ($operation == $module . "_save") {
    // echo "<pre>";
    // print_r($_REQUEST);
    // echo "</pre>";
    $indicators_name = trim($indicators_name);

    $has_indicators_name = $database->has($tbl, ["indicators_name" => $indicators_name]);

    if ($has_indicators_name) {
        echo "ชื่อตัวชี้วัดการเรียนรู้ $indicators_name มีอยู่แล้วครับ ";
        location_to("?module=indicators&teach_subject_id=$teach_subject_id&grade_level_id=$grade_level_id", "2");
    } else {
        $indicators_details = preg_replace("/\r|\n/", "", $indicators_details);

        $indicators_add = $database->insert($tbl, [
            "teach_subject_id" => $teach_subject_id,
            "grade_level_id" => $grade_level_id,
            "content_s_name" => $content_s_name,
            "indicators_name"=>trim($indicators_name),
            "indicator_group"=>$indicator_group,
            "indicator_id"=>$indicator_id,
            "indicators_details"=>trim($indicators_details)
        ]);
        if ($indicators_add->rowCount() != 0) {
            echo "<h1 class=text-success mx-auto>เพิ่มข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
            location_to("?module=indicators&teach_subject_id=$teach_subject_id&grade_level_id=$grade_level_id", "0");
        } else {
            echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
            location_to("?module=indicators", "0");
        }
    }
    exit;
}
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
                        <label for="teach_subject_id">กลุ่มสาระการเรียนรู้:</label>
                        <select class="form-control form-select-lg" name="teach_subject_id" id="teach_subject_id" onchange="location.href = this.value;" required>
                            <option value="?module=indicators_add">เลือกกลุ่มสาระการเรียนรู้</option>
                            <?php
                            $data = $database->select("tbl_system_Teach_Subject", "*", ["teach_subject_status" => "1"], ["ORDER" => ["teach_subject_id" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($teach_subject_id == $row['teach_subject_id']) {
                                    $select = "selected";
                                } else {
                                    $select = "";
                                }
                                echo "<option value=\"?module=indicators_add&teach_subject_id=" . $row['teach_subject_id'] . "\"$select>" . $row['teach_subject'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>
                    <?php
                    if ($teach_subject_id != "") {
                        $strands_enable = "";
                    } else {
                        $strands_enable = " disabled";
                    }
                    ?>
                    <div class="mb-3">
                        <label for="strands_id">สาระการเรียนรู้:</label>
                        <select class="form-control form-select-lg" name="strands_id" id="strands_id" onchange="location.href = this.value;" required <?php echo $strands_enable; ?>>
                            <option value="">สาระการเรียนรู้</option>
                            <?php
                            if ($teach_subject_id != "") {
                                $data = $database->select("tbl_strands", "*", ["teach_subject_id" => $teach_subject_id, "ORDER" => ["strands_id" => "ASC"]]);

                                foreach ($data as $row) {
                                    if ($strands_id == $row['strands_id']) {
                                        $select = "selected";
                                    } else {
                                        $select = "";
                                    }
                                    echo "<option value=\"?module=indicators_add&teach_subject_id=" . $row['teach_subject_id'] . "&strands_id=" . $row['strands_id'] . "\"$select>สาระที่ " . $row['strands_order'] . " " . $row['strands_name'] . "</option>";
                                }
                            }
                            ?>

                        </select>
                    </div>
                    <?php
                    if ($strands_id != "") {
                        $content_s_enable = "";
                    } else {
                        $content_s_enable = " disabled";
                    }
                    ?>
                    <div class="mb-3">
                        <label for="content_s_name">มาตรฐานการเรียนรู้:</label>
                        <select class="form-control form-select-lg" name="content_s_name" id="content_s_name" required <?php echo $content_s_enable; ?> onchange="content_s_sel(this.value)">
                            <option value="">สาระการเรียนรู้</option>
                            <?php
                            if ($teach_subject_id != "") {
                                $data = $database->select("tbl_content_standards", "*", ["strands_id" => $strands_id, "ORDER" => ["content_s_name" => "ASC"]]);
                                if ($content_s_name == $row['content_s_name']) {
                                    $select = "selected";
                                } else {
                                    $select = "";
                                }
                                foreach ($data as $row) {
                                    echo "<option value=\"" . $row['content_s_name'] . "\">" . $row['content_s_name'] . " " . $row['content_s_detail'] . "</option>";
                                }
                            }
                            ?>

                        </select>
                    </div>

                    <div class="mb-3 mt-3">
                        <label for="grade_level_id">ระดับชั้น:</label>
                        <select class="form-control form-select-lg" name="grade_level_id" id="grade_level_id" onchange="name_indicator(this.value);" required disabled>
                            <option value="">เลือกระดับชั้น</option>
                            <?php
                            $data = $database->select("tbl_system_GradeLevel", "*", ["grade_level_status" => "1"], ["ORDER" => ["grade_level_id" => "ASC"]]);
                            foreach ($data as $row) {

                                echo "<option value=\"" . $row['grade_level_id'] . "\">" . $row['grade_level_name'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="indicator_id">ประเภทตัวชี้วัด: </label>
                        <select class="form-control form-select-lg" name="indicator_id" id="indicator_id" required>
                            <option value="">ประเภทตัวชี้วัด</option>
                            <?php
                            $data = $database->select("tbl_type_indicators", "*", ["indicator_status" => "1"], ["ORDER" => ["indicator_id" => "ASC"]]);
                            foreach ($data as $row) {

                                echo "<option value=\"" . $row['indicator_id'] . "\">" . $row['indicator_name'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="indicator_group">กลุ่มตัวชี้วัดการเรียนรู้ : </label>
                        <input type="number" class="form-control" id="indicator_group" placeholder="กลุ่มตัวชี้วัดการเรียนรู้" name="indicator_group" step="1" required>
                    </div>
                    <div class="mb-3">
                        <label for="indicators_name">ชื่อตัวชี้วัดการเรียนรู้ : </label>
                        <input type="text" class="form-control" id="indicators_name" placeholder="ชื่อตัวชี้วัดการเรียนรู้" name="indicators_name" required>
                    </div>
                    

                    <div class="mb-3">
                        <label for="indicators_details">คำอธิบายตัวชี้วัดการเรียนรู้: <span class="text-danger">ไม่ต้องกดปุ่ม Enter เพื่อขึ้นบรรทัดใหม่</span></label>
                        <textarea name="indicators_details" id="indicators_details" cols="30" rows="10" class="form-control"></textarea>
                    </div>
                    <div class="mb-3">

                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <input type="hidden" name="teach_subject_id" id="teach_subject_id_hidden" value="<?php echo $teach_subject_id; ?>">
                        <input type="hidden" name="strands_id" id="strands_id_hidden" value="<?php echo $strands_id; ?>">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="?module=indicators" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<script>
    function content_s_sel(val) {
        if(val!=""){
            document.getElementById("grade_level_id").removeAttribute("disabled");
        }else{
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
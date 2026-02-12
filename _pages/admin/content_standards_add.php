<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "เพิ่มข้อมูลมาตรฐานการเรียนรู้รายวิชา";
$tbl = "tbl_content_standards";
if ($operation == $module . "_save") {
    $content_s_name = trim($content_s_name);

    $has_content_s_name = $database->has($tbl, ["content_s_name" => $content_s_name]);

    if ($has_content_s_name) {
        echo "ชื่อมาตรฐานการเรียนรู้ $content_s_name มีอยู่แล้วครับ ";
        location_to("?module=content_standards_add", "2");
    } else {
        $content_s_detail = preg_replace("/\r|\n/", "", $content_s_detail);

        $content_standards_add = $database->insert($tbl, [
            "strands_id" => $strands_id,
            "content_s_name" => $content_s_name,
            "content_s_detail" => $content_s_detail,
        ]);
        if ($content_standards_add->rowCount() != 0) {
            echo "<h1 class=text-success mx-auto>เพิ่มข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
            location_to("?module=content_standards", "0");
        } else {
            echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
            location_to("?module=content_standards", "0");
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
                    <div class="mb-3 mt-3">
                        <label for="Teach_Subject">กลุ่มสาระการเรียนรู้:</label>
                        <select class="form-control form-select-lg" name="Teach_Subject" id="Teach_Subject" onchange="location.href = this.value;" required>
                            <option value="">เลือกกลุ่มสาระการเรียนรู้</option>
                            <?php
                            $data = $database->select("tbl_system_Teach_Subject", "*", ["ORDER" => ["teach_subject_id" => "ASC"]]);
                            foreach ($data as $row) {
                                if ($Teach_Subject == $row['teach_subject_id']) {
                                    $select = "selected";
                                    $short_s = $row['teach_subject_short'];
                                } else {
                                    $select = "";
                                }
                                echo "<option value=\"?module=content_standards_add&Teach_Subject=" . $row['teach_subject_id'] . "\"$select>" . $row['teach_subject'] . "</option>";
                            }
                            ?>

                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="strands_id">สาระการเรียนรู้:</label>
                        <select class="form-control form-select-lg" name="strands_id" id="strands_id" required onchange="add_order('<?php echo $short_s; ?>',this.value)">
                            <option value="">สาระการเรียนรู้</option>
                            <?php
                            if ($Teach_Subject != "") {
                                $data = $database->select("tbl_strands", "*", ["teach_subject_id" => $Teach_Subject, "ORDER" => ["strands_id" => "ASC"]]);
                                if ($Teach_Subject == $row['teach_subject_id']) {
                                    $select = "selected";
                                } else {
                                    $select = "";
                                }
                                foreach ($data as $row) {
                                    echo "<option value=\"" . $row['strands_id'] . "\">สาระที่ " . $row['strands_order'] . " " . $row['strands_name'] . "</option>";
                                }
                            }
                            ?>

                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="content_s_name">ชื่อสาระการเรียนรู้: <span class="text-danger">ยกตัวอย่างเช่น ท 1.1,ค 1.1 ระหว่างตัวอักษรและตัวเลขให้เว้นเพียง 1 ข่อง และตามด้วยลำดับที่ของสาระ</span></label>
                        <input type="text" class="form-control" id="content_s_name" placeholder="ชื่อสาระการเรียนรู้" name="content_s_name" value="<?php echo $short_s; ?> " required>
                    </div>
                    <div class="mb-3">
                        <label for="content_s_detail">คำอธิบายมาตรฐานการเรียนรู้รายวิชา: <span class="text-danger">ไม่ต้องกดปุ่ม Enter เพื่อขึ้นบรรทัดใหม่</span></label>
                        <textarea name="content_s_detail" id="content_s_detail" cols="30" rows="10" class="form-control"></textarea>
                    </div>
                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="?module=content_standards" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<script>
    function add_order(short, id) {
        id = id.substr(4, 1);
        document.getElementById("content_s_name").value = short + ' ' + id + '.';
    }

    // function remove_newline(txt) {
    //     var str = "";
    //     for (var i = 0; i < txt.length; i++) {
    //         if (txt[i] != "\n") {
    //             str += txt[i];
    //         }
    //     }
    //     return str.trim();
    // }

    // $(document).ready(function() {
    //     $("#content_s_detail").blur(function() {
    //         var num = $("#content_s_detail").val();
    //         $("#content_s_detail").val(remove_newline(num));
    //     });
    // });
</script>
<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "แก้ไขข้อมูลสาระการเรียนรู้รายวิชา";
$tbl = "tbl_strands";


if ($operation == $module . "_save") {
    $data = $database->update($tbl, ["strands_name" => $strands_name], ["id" => $id]);

    if ($data->rowCount() != 0) {
        echo "<h1 class=text-success mx-auto>เพิ่มข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
        location_to("?module=strands", "0");
    } else {
        echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
        location_to("?module=strands", "0");
    }
    exit;
}

$data = $database->get($tbl, "*", ["id" => $id]);
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
                        <label for="teach_subject_id">กลุ่มสาระการเรียนรู้ : <?php echo $database->get("tbl_system_Teach_Subject", "teach_subject", ["teach_subject_id" => $data["teach_subject_id"]]); ?></label>
                    </div>
                    <div class="mb-3">
                        <label for="teach_subject_id">ลำดับที่ : <?php echo $data["strands_order"]; ?></label>
                    </div>
                    <div class="mb-3">
                        <label for="teach_subject_id">รหัสสาระการเรียนรู้ : <?php echo $data["strands_id"]; ?></label>
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
<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "เพิ่มรูปแบบการจัดการเรียนรู้";
$tbl = "tbl_learningModel";


if ($operation == $module . "_save") {
    $has_data = $database->has($tbl, ["model_id" => $model_id]);
    if ($has_data) {
        echo "สาระการเรียนรู้ $model_id : $model_name มีอยู่แล้วครับ ";
        location_to("?module=learningModel", "2");
    } else {
        $data = $database->insert($tbl, [
            "model_id" => $model_id,
            "model_name" => $model_name,
            "model_status" => "1"
        ]);
        if ($data->rowCount() != 0) {
            echo "<h1 class=text-success mx-auto>เพิ่มข้อมูลสำเร็จรอสักครู่กำลังกลับไปหน้าหลัก</h1>";
            location_to("?module=learningModel", "0");
        } else {
            echo "<h1 class=text-danger>ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด</h1>";
            location_to("?module=learningModel", "0");
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
                        <label for="model_id">รหัสรูปแบบ : </label>
                        <input type="number" class="form-control" id="model_id" placeholder="รหัสรูปแบบ" name="model_id" required>
                    </div>
                    <div class="mb-3">
                        <label for="model_name">รูปแบบการจัดการเรียนรู้: </label>
                        <input type="text" class="form-control" id="model_name" placeholder="รูปแบบการจัดการเรียนรู้" name="model_name" required>
                    </div>

                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <button type="submit" class="btn btn-primary mt-3">บันทึก</button>
                        <a href="?module=learningModel" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
